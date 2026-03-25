"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send } from "lucide-react";
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

  useEffect(() => {
    fetchTest();
  }, [id]);

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
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitTest = async () => {
    if (!confirm("Are you sure you want to submit your answers? You cannot change them later.")) return;
    
    setSubmitting(true);
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      
      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testId: id, answers })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Test submitted successfully!");
        router.push('/dashboard/tests');
      } else {
        alert(data.error || "Submission failed");
      }
    } catch (err) {
      console.error(err);
      alert("Submission failed");
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold text-primary">{test.title}</h1>
          <p className="text-muted-foreground mt-2">{test.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-red-500 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Duration: {test.durationMinutes} mins
          </p>
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
        <Button onClick={submitTest} size="lg" disabled={submitting} className="shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
          Submit Final Answers
        </Button>
      </div>
    </div>
  );
}
