"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send, Clock, ChevronLeft, ChevronRight, Eraser } from "lucide-react";
import { ExamTest, Question } from "@/types/examination";

type AnswerValue = string | string[];

// Fisher-Yates shuffle algorithm to randomize question order
const shuffleQuestions = (questions: Question[]): Question[] => {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function TakeTestPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState<ExamTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // seconds
  const [testStarted, setTestStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);

  const submitTest = useCallback(async (auto = false) => {
    if (auto && hasAutoSubmitted.current) return;
    if (auto) hasAutoSubmitted.current = true;
    if (!auto && !confirm("Are you sure you want to submit your answers? You cannot change them later.")) return;

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testId: id, answers })
      });

      const data = await res.json();
      
      // Cleanup locally regardless of exact outcome so they cannot linger
      localStorage.removeItem(`test_start_${id}`);
      localStorage.removeItem(`test_violations_${id}`);
      localStorage.removeItem(`test_answers_${id}`);
      
      router.replace('/dashboard/tests');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [id, answers, router]);

  useEffect(() => {
    fetchTest();
    const saved = localStorage.getItem(`test_answers_${id}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch (e) {}
    }
  }, [id]);

  // Start countdown once test loaded and user has clicked start
  useEffect(() => {
    if (!test || !testStarted) return;
    const MAX_SWITCH_VIOLATIONS = 1;

    const registerSwitchViolation = () => {
      if (hasAutoSubmitted.current) return;
      const viols = parseInt(localStorage.getItem(`test_violations_${id}`) || '0') + 1;
      localStorage.setItem(`test_violations_${id}`, viols.toString());
      setViolationWarning(`Switching tabs/apps is not allowed during the test. Violation count: ${viols}`);

      if (viols >= MAX_SWITCH_VIOLATIONS) {
        alert('Tab/app switch detected. Submitting test automatically.');
        submitTest(true);
      }
    };
    
    // Anticheat: Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Anticheat: Disable Keyboard Shortcuts (Refresh, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F5, Ctrl+R, Cmd+R
      if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r') || (e.metaKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        setViolationWarning("Refreshing the page is not allowed during the test!");
      }
      // Best-effort prevention for F11 fullscreen toggle.
      if (e.key === 'F11') {
        e.preventDefault();
        setViolationWarning('F11 fullscreen toggle is disabled during the test.');
      }
      // Best-effort prevention for Alt+Tab; browsers cannot fully block OS-level shortcuts.
      if (e.altKey && e.key.toLowerCase() === 'tab') {
        e.preventDefault();
        registerSwitchViolation();
      }
      // Prevent DevTools: F12, Ctrl+Shift+I/J, Cmd+Option+I/J
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    };

    // Anticheat: Prevent accidental tab closure/reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Triggers the browser's native "Leave site?" warning
    };

    // Anticheat: Tab switch warning
    const handleVisibilityChange = () => {
      if (document.hidden && !hasAutoSubmitted.current) {
        registerSwitchViolation();
      }
    };

    // Anticheat: Window focus loss (covers app switching, including Alt+Tab)
    const handleWindowBlur = () => {
      if (!hasAutoSubmitted.current && document.hidden) {
        registerSwitchViolation();
      }
    };

    // Anticheat: Fullscreen monitoring
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        if (!hasAutoSubmitted.current) {
          setViolationWarning('Fullscreen exit detected. Submitting test automatically.');
          alert('Fullscreen exit detected. Your test will be submitted automatically.');
          submitTest(true);
        }
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Timer persistence logic
    const durationMs = (test.durationMinutes || 60) * 60 * 1000;
    const storageKey = `test_start_${id}`;
    
    let startTime = localStorage.getItem(storageKey);
    if (!startTime) {
      startTime = Date.now().toString();
      localStorage.setItem(storageKey, startTime);
    }

    const updateTimer = () => {
      const elapsed = Date.now() - parseInt(startTime!);
      const remainingSecs = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
      
      setTimeLeft(remainingSecs);
      
      if (remainingSecs <= 0 && !hasAutoSubmitted.current) {
        clearInterval(timerRef.current!);
        submitTest(true);
      }
    };

    updateTimer(); // Initial call
    timerRef.current = setInterval(updateTimer, 1000);
    
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [test, testStarted, id, submitTest]);

  const handleStartTest = () => {
    const elem = document.getElementById("exam-fullscreen-container") || document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log('Fullscreen failed:', err));
      setIsFullscreen(true);
    }
    setTestStarted(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const fetchTest = async () => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(`/api/tests/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        // Shuffle questions for randomized order
        const shuffledQuestions = shuffleQuestions(data.test.questions || []);
        setTest({
          ...data.test,
          questions: shuffledQuestions
        });
        setCurrentQuestionIndex(0);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      localStorage.setItem(`test_answers_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCheckboxAnswerChange = (questionId: string, optionIndex: string, checked: boolean) => {
    setAnswers((prev) => {
      const existing = prev[questionId];
      const selected = Array.isArray(existing)
        ? [...existing]
        : (typeof existing === "string" && existing.trim()
            ? existing.split(/[|,]/).map((v) => v.trim()).filter(Boolean)
            : []);

      const asSet = new Set(selected);
      if (checked) asSet.add(optionIndex);
      else asSet.delete(optionIndex);

      const updated = { ...prev, [questionId]: Array.from(asSet).sort() };
      localStorage.setItem(`test_answers_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const getSelectedOptionIndexes = (value: AnswerValue | undefined) => {
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === "string" && value.trim()) {
      return value.split(/[|,]/).map((v) => v.trim()).filter(Boolean);
    }
    return [];
  };

  const isQuestionAnswered = (questionId: string) => {
    const value = answers[questionId];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return false;
  };

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const clearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      localStorage.setItem(`test_answers_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (error) {
    return (
      <div className="p-8 text-center space-y-4 mt-20">
        <h2 className="text-2xl font-bold text-red-500">Notice</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/tests')}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Tests</Button>
      </div>
    );
  }

  if (!test) return null;

  const existingSession = typeof window !== 'undefined' && !!localStorage.getItem(`test_start_${id}`);
  const isWarning = timeLeft !== null && timeLeft <= 300; // last 5 mins
  const totalQuestions = test.questions.length;
  const attemptedQuestions = test.questions.filter((q) => isQuestionAnswered(q.id)).length;
  const unattendedQuestions = totalQuestions - attemptedQuestions;
  const currentQuestion = test.questions[currentQuestionIndex];

  return (
    <div id="exam-fullscreen-container" className={testStarted ? "exam-fullscreen-cursor fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto" : "relative w-full"}>
      
      {!testStarted ? (
        <div className="p-8 max-w-2xl mx-auto mt-10 relative z-50">
          <Card className="border-zinc-800 bg-zinc-900 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{test.title}</CardTitle>
              <CardDescription className="text-lg mt-2">{test.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-950 p-4 rounded-lg flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div className="text-zinc-300">
                  Duration: <span className="font-bold text-white">{test.durationMinutes} Minutes</span>
                </div>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg space-y-2 mt-4">
                <h3 className="font-bold text-red-400">Important Instructions:</h3>
                <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1 ml-4">
                  <li>Upon starting, the test will enter fullscreen mode.</li>
                  <li>Do NOT switch tabs or minimize the browser window. Doing so will be recorded as a violation.</li>
                  <li>Any tab/app switch or fullscreen exit can trigger automatic submission.</li>
                  <li>Right-click is disabled during the test.</li>
                  <li>Ensure you have a stable internet connection.</li>
                </ul>
              </div>

              <Button 
                onClick={handleStartTest} 
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg h-12"
              >
                {existingSession ? 'Resume Fullscreen Test' : 'Start Fullscreen Test'}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Fullscreen Enforcer Overlay */}
          {!isFullscreen && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-zinc-900 border border-red-500/50 p-8 rounded-xl max-w-md w-full shadow-2xl">
                <h2 className="text-2xl font-bold text-red-500 mb-4">Warning: Fullscreen Exited</h2>
                <p className="text-zinc-300 mb-6">
                  You must remain in fullscreen mode to continue your test. The timer is still running!
                </p>
                <Button 
                  size="lg" 
                  onClick={handleStartTest}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
                >
                  Resume Fullscreen
                </Button>
              </div>
            </div>
          )}

          {/* Violation Toasts/Banners */}
          {violationWarning && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl font-medium animate-in fade-in slide-in-from-top-4 flex items-center justify-between min-w-[300px]">
              <span>{violationWarning}</span>
              <button onClick={() => setViolationWarning(null)} className="ml-4 hover:opacity-70 font-bold">×</button>
            </div>
          )}

          <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold text-primary">{test.title}</h1>
          <p className="text-muted-foreground mt-2">{test.description}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold font-mono flex items-center gap-2 ${isWarning ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : `${test.durationMinutes}:00`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Time Remaining</p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Question Navigator</CardTitle>
          <CardDescription>
            Jump to any question. Green = answered, gray = unanswered.
            Attempted: {attemptedQuestions}/{totalQuestions} | Unattempted: {unattendedQuestions}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {test.questions.map((q, index) => {
              const answered = isQuestionAnswered(q.id);
              return (
                <Button
                  key={`nav-${q.id}`}
                  type="button"
                  variant={answered ? "default" : "secondary"}
                  className="h-9 px-0"
                  onClick={() => jumpToQuestion(index)}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-zinc-400">
            Progress: {attemptedQuestions}/{totalQuestions} attempted, {unattendedQuestions} unattended.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {currentQuestion && (
          <Card key={currentQuestion.id} id={`question-${currentQuestion.id}`}>
            <CardHeader className="bg-zinc-900 border-b border-zinc-800 pb-4">
              <CardTitle className="text-lg leading-relaxed">
                <span className="mr-2 text-muted-foreground font-mono">{currentQuestionIndex + 1}.</span> {currentQuestion.text}
              </CardTitle>
              <CardDescription className="text-primary font-medium flex items-center justify-between">
                <span>{currentQuestion.points} points</span>
                <span className={isQuestionAnswered(currentQuestion.id) ? "text-emerald-400" : "text-zinc-400"}>
                  {isQuestionAnswered(currentQuestion.id) ? "Answered" : "Unanswered"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {currentQuestion.imageUrl && (
                <div className="mb-4">
                  <img
                    src={currentQuestion.imageUrl}
                    alt={`Question ${currentQuestionIndex + 1} reference`}
                    className="max-h-72 w-auto rounded-md border border-zinc-800 object-contain"
                  />
                </div>
              )}
              {currentQuestion.type === 'mcq' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, optIndex) => (
                    <label key={optIndex} className="flex items-center space-x-3 p-4 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-all">
                      <input 
                        type="radio" 
                        name={`q-${currentQuestion.id}`} 
                        value={optIndex.toString()} 
                        checked={typeof answers[currentQuestion.id] === "string" && answers[currentQuestion.id] === optIndex.toString()}
                        onChange={() => handleAnswerChange(currentQuestion.id, optIndex.toString())}
                        className="w-4 h-4 text-primary bg-zinc-900 border-zinc-700 focus:ring-primary focus:ring-offset-zinc-900"
                      />
                      <div className="space-y-2">
                        {currentQuestion.optionsAreImages && currentQuestion.optionImageUrls?.[optIndex] ? (
                          <img
                            src={currentQuestion.optionImageUrls[optIndex]}
                            alt={`Option ${optIndex + 1}`}
                            className="max-h-40 w-auto rounded-md border border-zinc-800 object-contain"
                          />
                        ) : null}
                        <span className="font-medium">{opt}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {currentQuestion.type === 'checkbox' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, optIndex) => {
                    const selected = getSelectedOptionIndexes(answers[currentQuestion.id]).includes(optIndex.toString());
                    return (
                      <label key={optIndex} className="flex items-center space-x-3 p-4 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-all">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => handleCheckboxAnswerChange(currentQuestion.id, optIndex.toString(), e.target.checked)}
                          className="w-4 h-4 text-primary bg-zinc-900 border-zinc-700 focus:ring-primary focus:ring-offset-zinc-900"
                        />
                        <div className="space-y-2">
                          {currentQuestion.optionsAreImages && currentQuestion.optionImageUrls?.[optIndex] ? (
                            <img
                              src={currentQuestion.optionImageUrls[optIndex]}
                              alt={`Option ${optIndex + 1}`}
                              className="max-h-40 w-auto rounded-md border border-zinc-800 object-contain"
                            />
                          ) : null}
                          <span className="font-medium">{opt}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {currentQuestion.type === 'short_answer' && (
                <Input 
                  placeholder="Your answer..." 
                  value={typeof answers[currentQuestion.id] === "string" ? answers[currentQuestion.id] : ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="bg-zinc-900 text-zinc-100 caret-zinc-100 placeholder:text-zinc-500"
                />
              )}
              {currentQuestion.type === 'long_answer' && (
                <Textarea 
                  placeholder="Your detailed answer..." 
                  className="min-h-[150px] bg-zinc-900 resize-y text-zinc-100 caret-zinc-100 placeholder:text-zinc-500"
                  value={typeof answers[currentQuestion.id] === "string" ? answers[currentQuestion.id] : ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                />
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <Button type="button" variant="ghost" onClick={() => clearAnswer(currentQuestion.id)}>
                  <Eraser className="w-4 h-4 mr-2" /> Clear Answer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end pt-4 sticky bottom-8">
        <Button onClick={() => submitTest()} size="lg" disabled={submitting} className="shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
          Submit Final Answers
        </Button>
      </div>
          </div>
        </>
      )}
    </div>
  );
}
