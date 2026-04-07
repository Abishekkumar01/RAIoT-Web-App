"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send, Clock, ChevronLeft, ChevronRight, Eraser, Calculator, X } from "lucide-react";
import { ExamTest, Question } from "@/types/examination";

type AnswerValue = string | string[];

const hasAttemptedValue = (value: AnswerValue | undefined): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
};

const calculatorButtons = [
  ["sin", "cos", "tan", "(", ")"],
  ["log", "ln", "sqrt", "pi", "e"],
  ["7", "8", "9", "/", "^"],
  ["4", "5", "6", "*", "%"],
  ["1", "2", "3", "-", "abs"],
  ["0", ".", "ANS", "+", "="],
];

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
  const [lockedQuestions, setLockedQuestions] = useState<Record<string, boolean>>({});
  const [viewedQuestions, setViewedQuestions] = useState<Record<string, boolean>>({});
  const [reviewMarkedQuestions, setReviewMarkedQuestions] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // seconds
  const [testStarted, setTestStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(true);
  const [calculatorInput, setCalculatorInput] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("0");
  const [calculatorMode, setCalculatorMode] = useState<'DEG' | 'RAD'>('DEG');
  const [calculatorLastAnswer, setCalculatorLastAnswer] = useState("0");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);
  const lastViolationTsRef = useRef(0);
  const maxViolations = 3;

  const submitTest = useCallback(async (auto = false) => {
    if (auto && hasAutoSubmitted.current) return;
    if (auto) hasAutoSubmitted.current = true;

    setSubmitting(true);
    setShowSubmitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      const lockedAnswers = Object.entries(answers).reduce((acc, [questionId, value]) => {
        if (lockedQuestions[questionId] && hasAttemptedValue(value)) {
          acc[questionId] = value;
        }
        return acc;
      }, {} as Record<string, AnswerValue>);

      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ testId: id, answers: lockedAnswers })
      });

      const data = await res.json();
      
      // Cleanup locally regardless of exact outcome so they cannot linger
      localStorage.removeItem(`test_start_${id}`);
      localStorage.removeItem(`test_violations_${id}`);
      localStorage.removeItem(`test_answers_${id}`);
      localStorage.removeItem(`test_locked_${id}`);
      localStorage.removeItem(`test_viewed_${id}`);
      localStorage.removeItem(`test_review_${id}`);
      
      router.replace('/dashboard/tests');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [id, answers, lockedQuestions, router]);

  useEffect(() => {
    fetchTest();
    const saved = localStorage.getItem(`test_answers_${id}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch (e) {}
    }

    const savedViewed = localStorage.getItem(`test_viewed_${id}`);
    if (savedViewed) {
      try { setViewedQuestions(JSON.parse(savedViewed)); } catch (e) {}
    }

    const savedReview = localStorage.getItem(`test_review_${id}`);
    if (savedReview) {
      try { setReviewMarkedQuestions(JSON.parse(savedReview)); } catch (e) {}
    }

    const savedLocked = localStorage.getItem(`test_locked_${id}`);
    if (savedLocked) {
      try { setLockedQuestions(JSON.parse(savedLocked)); } catch (e) {}
    }
  }, [id]);

  useEffect(() => {
    if (!testStarted || !test?.questions?.length) return;
    const q = test.questions[currentQuestionIndex];
    if (!q?.id) return;

    setViewedQuestions((prev) => {
      if (prev[q.id]) return prev;
      const updated = { ...prev, [q.id]: true };
      localStorage.setItem(`test_viewed_${id}`, JSON.stringify(updated));
      return updated;
    });
  }, [testStarted, test, currentQuestionIndex, id]);

  // Start countdown once test loaded and user has clicked start
  useEffect(() => {
    if (!test || !testStarted) return;
    const VIOLATION_COOLDOWN_MS = 1200;
    setViolationCount(parseInt(localStorage.getItem(`test_violations_${id}`) || '0'));

    const registerViolation = (reason: string, attemptReenterFullscreen = false) => {
      if (hasAutoSubmitted.current) return;

      const now = Date.now();
      if (now - lastViolationTsRef.current < VIOLATION_COOLDOWN_MS) return;
      lastViolationTsRef.current = now;

      const viols = parseInt(localStorage.getItem(`test_violations_${id}`) || '0') + 1;
      localStorage.setItem(`test_violations_${id}`, viols.toString());
      setViolationCount(viols);
      setViolationWarning(`${reason} Violation count: ${viols}/${maxViolations}`);

      if (attemptReenterFullscreen) {
        const elem = document.getElementById("exam-fullscreen-container") || document.documentElement;
        if (document.fullscreenElement !== elem && elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {
            setViolationWarning(`Could not re-enter fullscreen automatically. Click "Resume Fullscreen" now. Violation count: ${viols}/${maxViolations}`);
          });
        }
      }

      if (viols >= maxViolations) {
        setViolationWarning('Maximum violations reached. Submitting test automatically.');
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
        registerViolation('F11 fullscreen toggle attempt detected.', true);
      }
      // Best-effort prevention for Escape fullscreen exit.
      if (e.key === 'Escape') {
        e.preventDefault();
        registerViolation('Escape key fullscreen-exit attempt detected.', true);
      }
      // Best-effort prevention for Alt+Tab; browsers cannot fully block OS-level shortcuts.
      if (e.altKey && e.key.toLowerCase() === 'tab') {
        e.preventDefault();
        registerViolation('Tab/app switch detected.');
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

    const syncFullscreenState = (reason: string, countViolation = false) => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && !hasAutoSubmitted.current && countViolation) {
        registerViolation(reason, true);
      }
    };

    // Anticheat: Tab switch warning
    const handleVisibilityChange = () => {
      if (document.hidden && !hasAutoSubmitted.current) {
        registerViolation('Tab/app switch detected.');
      } else if (!document.hidden) {
        // On return to the tab, always verify fullscreen state from the browser API.
        syncFullscreenState('Returned to test without fullscreen.', true);
      }
    };

    // Anticheat: Window focus loss (covers app switching, including Alt+Tab)
    const handleWindowBlur = () => {
      if (!hasAutoSubmitted.current) {
        // Count blur regardless of document.hidden because some browsers/OS paths
        // (notably Alt+Tab/task switch overlays) may not set hidden reliably.
        registerViolation('Window focus lost (possible app switch).');
      }
    };

    // Anticheat: when window regains focus (e.g., Alt+Tab back), enforce fullscreen state.
    const handleWindowFocus = () => {
      // On return, re-validate fullscreen and force user back if they exited.
      syncFullscreenState('Window focused without fullscreen.', true);
    };

    // Anticheat: Fullscreen monitoring
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        if (!hasAutoSubmitted.current) {
          registerViolation('Fullscreen exit detected.', true);
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
    window.addEventListener("focus", handleWindowFocus);
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
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [test, testStarted, id, submitTest, maxViolations]);

  const handleStartTest = async () => {
    const elem = document.getElementById("exam-fullscreen-container") || document.documentElement;
    if (elem.requestFullscreen) {
      try {
        await elem.requestFullscreen();
      } catch (err) {
        console.log('Fullscreen failed:', err);
      }
      setIsFullscreen(!!document.fullscreenElement);
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
        const sequentialMode = !!data?.test?.sequentialNavigationOnly;
        const questionsForSession = sequentialMode
          ? [...(data.test.questions || [])]
          : shuffleQuestions(data.test.questions || []);
        setTest({
          ...data.test,
          questions: questionsForSession
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
    if (lockedQuestions[questionId]) return;
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      localStorage.setItem(`test_answers_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCheckboxAnswerChange = (questionId: string, optionIndex: string, checked: boolean) => {
    if (lockedQuestions[questionId]) return;
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
    return hasAttemptedValue(answers[questionId]);
  };

  const isQuestionLocked = (questionId: string) => !!lockedQuestions[questionId];

  const jumpToQuestion = (index: number) => {
    if (test?.sequentialNavigationOnly && !isQuestionLocked(test.questions[currentQuestionIndex]?.id || '')) return;
    setCurrentQuestionIndex(index);
  };

  const clearAnswer = (questionId: string) => {
    if (lockedQuestions[questionId]) return;
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      localStorage.setItem(`test_answers_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleMarkForReview = (questionId: string) => {
    if (lockedQuestions[questionId]) return;
    setReviewMarkedQuestions((prev) => {
      const updated = { ...prev, [questionId]: !prev[questionId] };
      localStorage.setItem(`test_review_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const syncLiveProgress = useCallback(async (answersSnapshot: Record<string, AnswerValue>) => {
    if (!testStarted || !test?.id || submitting) return;

    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      await fetch('/api/tests/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testId: id, answers: answersSnapshot })
      });
    } catch {
      // Silent by design: progress sync should not interrupt the test flow.
    }
  }, [id, submitting, test?.id, testStarted]);

  const getLockedAnswersSnapshot = useCallback(
    (
      answersSnapshot: Record<string, AnswerValue> = answers,
      lockedSnapshot: Record<string, boolean> = lockedQuestions
    ) => {
      return Object.entries(answersSnapshot).reduce((acc, [questionId, value]) => {
        if (lockedSnapshot[questionId] && hasAttemptedValue(value)) {
          acc[questionId] = value;
        }
        return acc;
      }, {} as Record<string, AnswerValue>);
    },
    [answers, lockedQuestions]
  );

  const submitAnswerForQuestion = async (questionId: string) => {
    if (lockedQuestions[questionId]) return;

    const nextLocked = { ...lockedQuestions, [questionId]: true };
    setLockedQuestions(nextLocked);
    localStorage.setItem(`test_locked_${id}`, JSON.stringify(nextLocked));

    const lockedSnapshot = getLockedAnswersSnapshot(answers, nextLocked);
    await syncLiveProgress(lockedSnapshot);

    if (test?.sequentialNavigationOnly) {
      const currentIndex = test.questions.findIndex((question) => question.id === questionId);
      if (currentIndex >= 0) {
        const nextIndex = Math.min(test.questions.length - 1, currentIndex + 1);
        setCurrentQuestionIndex(nextIndex);
      }
    }
  };

  useEffect(() => {
    if (!testStarted) return;
    if (progressSyncTimerRef.current) clearTimeout(progressSyncTimerRef.current);

    progressSyncTimerRef.current = setTimeout(() => {
      syncLiveProgress(getLockedAnswersSnapshot(answers, lockedQuestions));
    }, 1200);

    return () => {
      if (progressSyncTimerRef.current) clearTimeout(progressSyncTimerRef.current);
    };
  }, [answers, lockedQuestions, getLockedAnswersSnapshot, syncLiveProgress, testStarted]);

  const getQuestionTileStyle = (questionId: string, index: number) => {
    const isCurrent = currentQuestionIndex === index;
    const isReviewed = !!reviewMarkedQuestions[questionId];
    const isAnswered = isQuestionLocked(questionId) && isQuestionAnswered(questionId);
    const isLockedUnattempted = isQuestionLocked(questionId) && !isQuestionAnswered(questionId);
    const isViewed = !!viewedQuestions[questionId];

    let base = "h-9 px-0 border transition-colors";

    if (isReviewed) {
      base += " bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30";
    } else if (isAnswered) {
      base += " bg-emerald-500/20 border-emerald-400 text-emerald-200 hover:bg-emerald-500/30";
    } else if (isLockedUnattempted) {
      base += " bg-orange-500/20 border-orange-400 text-orange-200 hover:bg-orange-500/30";
    } else if (isViewed) {
      base += " bg-red-500/20 border-red-400 text-red-200 hover:bg-red-500/30";
    } else {
      base += " bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800/60";
    }

    if (isCurrent) {
      base += " ring-2 ring-primary/70";
    }

    return base;
  };

  const evaluateCalculatorExpression = (expression: string) => {
    const cleaned = expression.replace(/\s+/g, "");
    if (!cleaned) return "0";
    if (!/^[0-9+\-*/%^().,a-zA-Z]+$/.test(cleaned)) return "Error";

    const transformed = cleaned
      .replace(/\^/g, "**")
      .replace(/\bpi\b/gi, "pi")
      .replace(/\bANS\b/g, calculatorLastAnswer);

    const toRadians = (value: number) => calculatorMode === 'DEG' ? (value * Math.PI) / 180 : value;
    const scope: Record<string, (...args: number[]) => number> = {
      sin: (x: number) => Math.sin(toRadians(x)),
      cos: (x: number) => Math.cos(toRadians(x)),
      tan: (x: number) => Math.tan(toRadians(x)),
      log: (x: number) => Math.log10(x),
      ln: (x: number) => Math.log(x),
      sqrt: (x: number) => Math.sqrt(x),
      abs: (x: number) => Math.abs(x),
      pow: (x: number, y: number) => Math.pow(x, y),
      floor: (x: number) => Math.floor(x),
      ceil: (x: number) => Math.ceil(x),
      round: (x: number) => Math.round(x),
      exp: (x: number) => Math.exp(x),
    };

    try {
      const fn = Function(
        ...Object.keys(scope),
        'pi',
        'e',
        `"use strict"; return (${transformed});`
      );
      const computed = fn(...Object.values(scope), Math.PI, Math.E);
      if (typeof computed !== "number" || !Number.isFinite(computed)) return "Error";
      return Number.isInteger(computed) ? String(computed) : String(Number(computed.toFixed(8)));
    } catch {
      return "Error";
    }
  };

  const handleCalculatorButton = (value: string) => {
    if (["sin", "cos", "tan", "log", "ln", "sqrt", "abs"].includes(value)) {
      setCalculatorInput((prev) => `${prev}${value}(`);
      return;
    }

    if (value === 'pi') {
      setCalculatorInput((prev) => `${prev}pi`);
      return;
    }

    if (value === 'ANS') {
      setCalculatorInput((prev) => `${prev}${calculatorLastAnswer}`);
      return;
    }

    if (value === "=") {
      const evaluated = evaluateCalculatorExpression(calculatorInput);
      setCalculatorResult(evaluated);
      if (evaluated !== "Error") {
        setCalculatorLastAnswer(evaluated);
        setCalculatorInput(evaluated);
      }
      return;
    }

    setCalculatorInput((prev) => `${prev}${value}`);
  };

  const handleCalculatorClear = () => {
    setCalculatorInput("");
    setCalculatorResult("0");
  };

  const handleCalculatorBackspace = () => {
    setCalculatorInput((prev) => prev.slice(0, -1));
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
  const isSequentialOneWay = !!test.sequentialNavigationOnly;
  const isWarning = timeLeft !== null && timeLeft <= 300; // last 5 mins
  const totalQuestions = test.questions.length;
  const attemptedQuestions = test.questions.filter((q) => isQuestionLocked(q.id) && isQuestionAnswered(q.id)).length;
  const unattendedQuestions = totalQuestions - attemptedQuestions;
  const reviewedQuestions = test.questions.filter((q) => !!reviewMarkedQuestions[q.id]).length;
  const currentQuestion = test.questions[currentQuestionIndex];
  const isCurrentQuestionLocked = currentQuestion ? isQuestionLocked(currentQuestion.id) : false;
  const isCurrentQuestionAnswered = currentQuestion ? isQuestionAnswered(currentQuestion.id) : false;
  const canNavigateAway = !isSequentialOneWay || isCurrentQuestionLocked;

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
                  <li>After 3 violations (tab/app switch or fullscreen exit), your test is auto-submitted.</li>
                  <li>Right-click is disabled during the test.</li>
                  {isSequentialOneWay && <li>Until you submit the current answer, you cannot leave that question or edit it after submission.</li>}
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
          {/* Floating Calculator Utility */}
          <div className="fixed bottom-6 left-6 z-[115]">
            {!showCalculator ? (
              <Button
                type="button"
                onClick={() => setShowCalculator(true)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculator
              </Button>
            ) : (
              <Card className="w-80 bg-zinc-900/95 border-zinc-700 shadow-2xl">
                <CardHeader className="py-3 px-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-zinc-100">
                      <Calculator className="w-4 h-4" />
                      Scientific Calculator
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2 text-[10px] border-zinc-700"
                        onClick={() => setCalculatorMode((prev) => prev === 'DEG' ? 'RAD' : 'DEG')}
                      >
                        {calculatorMode}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setShowCalculator(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="rounded-md border border-zinc-700 bg-zinc-950 p-2">
                    <p className="text-[11px] text-zinc-400 min-h-4 break-all">{calculatorInput || "0"}</p>
                    <p className="text-lg font-semibold text-zinc-100 break-all">{calculatorResult}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">ANS: {calculatorLastAnswer}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="border-zinc-700" onClick={handleCalculatorClear}>C</Button>
                    <Button type="button" variant="outline" className="border-zinc-700" onClick={handleCalculatorBackspace}>DEL</Button>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {calculatorButtons.flat().map((btn) => (
                      <Button
                        key={btn}
                        type="button"
                        variant={btn === "=" ? "default" : "outline"}
                        className={btn === "=" ? "bg-primary hover:bg-primary/90" : "border-zinc-700"}
                        onClick={() => handleCalculatorButton(btn)}
                      >
                        {btn}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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

          {showSubmitConfirm && (
            <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-zinc-100">Submit Test?</h3>
                <p className="mt-3 text-zinc-300">
                  Are you sure you want to submit your answers? You cannot change them later.
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSubmitConfirm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => submitTest()}
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Yes, Submit
                  </Button>
                </div>
              </div>
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
          <p className={`text-xs mt-1 font-medium ${violationCount >= maxViolations - 1 ? 'text-red-400' : 'text-amber-300'}`}>
            Violations: {violationCount}/{maxViolations}
          </p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isSequentialOneWay ? 'Question Lock Mode' : 'Question Navigator'}</CardTitle>
          <CardDescription>
            {isSequentialOneWay ? 'You can move only after submitting the current answer. Submitted questions remain locked.' : 'Jump to any question.'}
            Attempted: {attemptedQuestions}/{totalQuestions} | Unattempted: {unattendedQuestions} | Review: {reviewedQuestions}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-zinc-300">
            <span className="px-2 py-1 rounded border border-zinc-700 bg-transparent">Not Viewed</span>
            <span className="px-2 py-1 rounded border border-red-400 bg-red-500/20 text-red-200">Viewed Unattempted</span>
            <span className="px-2 py-1 rounded border border-emerald-400 bg-emerald-500/20 text-emerald-200">Locked Attempted</span>
            <span className="px-2 py-1 rounded border border-orange-400 bg-orange-500/20 text-orange-200">Locked Unattempted</span>
            <span className="px-2 py-1 rounded border border-amber-400 bg-amber-500/20 text-amber-200">Marked for Review</span>
          </div>
          {!isSequentialOneWay || canNavigateAway ? (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {test.questions.map((q, index) => {
                return (
                  <Button
                    key={`nav-${q.id}`}
                    type="button"
                    variant="outline"
                    className={getQuestionTileStyle(q.id, index)}
                    onClick={() => jumpToQuestion(index)}
                    disabled={isSequentialOneWay && !canNavigateAway && index !== currentQuestionIndex}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300">
              Current question: <span className="font-semibold text-zinc-100">{currentQuestionIndex + 1}</span> / {totalQuestions}
            </div>
          )}
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
                <span className={isCurrentQuestionLocked ? "text-emerald-400" : "text-zinc-400"}>
                  {isCurrentQuestionLocked
                    ? (isCurrentQuestionAnswered ? "Answer Locked" : "Locked as Unattempted")
                    : (isCurrentQuestionAnswered ? "Draft Answer" : "Unanswered")}
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
                        disabled={isCurrentQuestionLocked}
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
                          disabled={isCurrentQuestionLocked}
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
                  disabled={isCurrentQuestionLocked}
                  className="bg-zinc-900 text-zinc-100 caret-zinc-100 placeholder:text-zinc-500"
                />
              )}
              {currentQuestion.type === 'long_answer' && (
                <Textarea 
                  placeholder="Your detailed answer..." 
                  className="min-h-[150px] bg-zinc-900 resize-y text-zinc-100 caret-zinc-100 placeholder:text-zinc-500"
                  value={typeof answers[currentQuestion.id] === "string" ? answers[currentQuestion.id] : ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  disabled={isCurrentQuestionLocked}
                />
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!isSequentialOneWay || canNavigateAway ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={!canNavigateAway || currentQuestionIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    disabled={isSequentialOneWay && !canNavigateAway}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isCurrentQuestionLocked ? "secondary" : "default"}
                    onClick={() => submitAnswerForQuestion(currentQuestion.id)}
                    disabled={isCurrentQuestionLocked}
                    className={isCurrentQuestionLocked ? "border border-emerald-500/50 text-emerald-200" : ""}
                  >
                    {isCurrentQuestionLocked ? "Answer Submitted" : "Submit Answer"}
                  </Button>
                  <Button
                    type="button"
                    variant={reviewMarkedQuestions[currentQuestion.id] ? "secondary" : "ghost"}
                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                    disabled={isCurrentQuestionLocked}
                    className={reviewMarkedQuestions[currentQuestion.id] ? "border border-amber-400/70 text-amber-200" : ""}
                  >
                    {reviewMarkedQuestions[currentQuestion.id] ? "Unmark Review" : "Mark for Review"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => clearAnswer(currentQuestion.id)} disabled={isCurrentQuestionLocked}>
                    <Eraser className="w-4 h-4 mr-2" /> Clear Answer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end pt-4 sticky bottom-8">
        <Button onClick={() => setShowSubmitConfirm(true)} size="lg" disabled={submitting} className="shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
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
