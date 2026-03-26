"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send, Clock } from "lucide-react";
import { ExamTest } from "@/types/examination";

export default function TakeTestPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState<ExamTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
        const viols = parseInt(localStorage.getItem(`test_violations_${id}`) || '0') + 1;
        localStorage.setItem(`test_violations_${id}`, viols.toString());
        setViolationWarning(`Warning: You switched tabs or minimized the window! This action has been recorded. Violation count: ${viols}`);
        
        // Optional: Auto submit on 3 violations
        if (viols >= 3) {
          alert('Maximum violations reached. Submitting test automatically.');
          submitTest(true);
        }
      }
    };

    // Anticheat: Fullscreen monitoring
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
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
        setTest(data.test);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
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

  return (
    <div id="exam-fullscreen-container" className={testStarted ? "fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto" : "relative w-full"}>
      
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
                  <li>Three (3) violations will trigger an automatic submission of your test.</li>
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

      <div className="space-y-6">
        {test.questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader className="bg-zinc-900 border-b border-zinc-800 pb-4">
              <CardTitle className="text-lg leading-relaxed">
                <span className="mr-2 text-muted-foreground font-mono">{index + 1}.</span> {q.text}
              </CardTitle>
              <CardDescription className="text-primary font-medium">{q.points} points</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {q.type === 'mcq' && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt, optIndex) => (
                    <label key={optIndex} className="flex items-center space-x-3 p-4 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-all">
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={optIndex.toString()} 
                        checked={answers[q.id] === optIndex.toString()}
                        onChange={() => handleAnswerChange(q.id, optIndex.toString())}
                        className="w-4 h-4 text-primary bg-zinc-900 border-zinc-700 focus:ring-primary focus:ring-offset-zinc-900"
                      />
                      <span className="font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'short_answer' && (
                <Input 
                  placeholder="Your answer..." 
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="bg-zinc-900"
                />
              )}
              {q.type === 'long_answer' && (
                <Textarea 
                  placeholder="Your detailed answer..." 
                  className="min-h-[150px] bg-zinc-900 resize-y"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        ))}
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
