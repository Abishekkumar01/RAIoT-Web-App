"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function TestResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`/api/tests/results/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.submission) {
        setSubmission(data.submission);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (!submission) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">No Results Found</h2>
        <p className="text-muted-foreground">You have not submitted this test yet or results are unavailable.</p>
        <Button onClick={() => router.push('/dashboard/tests')}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Tests</Button>
      </div>
    );
  }

  const hasFinalScore = typeof submission.score === "number";
  const hasAutoScore = typeof submission.autoScore === "number";
  const isFinalized = submission.resultState === "final" || hasFinalScore;
  const totalMarks = Number(submission.totalMarks || submission.maxMarks || submission.totalPossibleMarks || 0);
  const displayedScore = hasFinalScore
    ? submission.score
    : hasAutoScore
      ? submission.autoScore
      : null;
  const isProvisionalScore = !isFinalized && hasAutoScore;
  const displayedPercentage = displayedScore !== null && totalMarks > 0
    ? ((Number(displayedScore) / totalMarks) * 100).toFixed(2)
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CheckCircle className="text-green-500 w-8 h-8" />
            Test Completed
          </h1>
          <p className="text-muted-foreground mt-2">
            Submitted on {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Score</p>
          <p className="text-4xl font-black text-primary">
            {displayedScore !== null ? `${displayedScore}/${totalMarks || "-"}` : "Pending Grading"}
          </p>
          {displayedPercentage && (
            <p className="text-xs text-cyan-300 mt-1">{displayedPercentage}%</p>
          )}
          {isProvisionalScore && (
            <p className="text-xs text-amber-400 mt-1">Provisional (auto-evaluated)</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
          <CardDescription>Your responses have been recorded successfully.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Note: If the test contained short or long answers, the final score may be updated by an administrator. Auto-grading was applied to objective questions.
          </p>
          {isProvisionalScore && (
            <p className="text-sm text-amber-400 mt-2">
              Your current score is auto-evaluated and will be replaced once manual grading is completed.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center pt-8">
        <Button onClick={() => router.push('/dashboard/tests')} variant="outline" size="lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
