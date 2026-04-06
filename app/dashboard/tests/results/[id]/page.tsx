"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle, Trophy, Sparkles } from "lucide-react";

export default function TestResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

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
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        setCurrentUserRank(typeof data.currentUserRank === "number" ? data.currentUserRank : data.submission.rank ?? null);
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

  const leaderboardRows = leaderboard.slice().sort((a, b) => {
    const aScore = Number(a.finalScore ?? a.score ?? 0);
    const bScore = Number(b.finalScore ?? b.score ?? 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
  });
  const podiumRows = leaderboardRows.slice(0, 3);
  const getScore = (row: any) => Number(row.finalScore ?? row.score ?? 0);
  const getPercent = (row: any) => {
    const marks = Number(row.totalMarks || totalMarks || 0);
    return marks > 0 ? ((getScore(row) / marks) * 100).toFixed(2) : "0.00";
  };
  const podiumMeta = [
    {
      border: "border-amber-400/70",
      bg: "bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-zinc-950",
      glow: "shadow-[0_0_25px_rgba(251,191,36,0.28)]",
      badge: "text-amber-300",
      accent: "from-amber-300 via-yellow-200 to-amber-500",
    },
    {
      border: "border-slate-300/70",
      bg: "bg-gradient-to-br from-slate-300/15 via-slate-200/10 to-zinc-950",
      glow: "shadow-[0_0_22px_rgba(148,163,184,0.22)]",
      badge: "text-slate-200",
      accent: "from-slate-100 via-slate-300 to-slate-500",
    },
    {
      border: "border-orange-600/70",
      bg: "bg-gradient-to-br from-orange-600/20 via-orange-500/10 to-zinc-950",
      glow: "shadow-[0_0_22px_rgba(249,115,22,0.22)]",
      badge: "text-orange-300",
      accent: "from-orange-200 via-orange-400 to-orange-700",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
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

      <Card className="border-zinc-800 bg-zinc-950/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-300" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            Ranked by marks, then submission time. {currentUserRank ? `Your rank: #${currentUserRank}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {leaderboardRows.length === 0 ? (
            <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
              No leaderboard entries yet. Once more members or trainees publish results, the ranking will appear here.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {podiumRows.map((row, index) => {
                  const meta = podiumMeta[index];
                  return (
                    <div
                      key={`podium-${row.id || row.userId || index}`}
                      className={`relative overflow-hidden rounded-xl border ${meta.border} ${meta.bg} ${meta.glow} p-4 transition-transform duration-300 hover:-translate-y-1`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[pulse_3s_ease-in-out_infinite]" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className={`h-10 w-10 min-w-10 rounded-full aspect-square bg-gradient-to-br ${meta.accent} text-zinc-950 font-black flex items-center justify-center shadow-lg`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-100">{row.userName || 'Unknown User'}</p>
                              <p className="text-xs text-zinc-400">{row.userRole || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-zinc-50">{getScore(row)}</p>
                          <p className="text-xs text-zinc-400">/{Number(row.totalMarks || totalMarks || 0)}</p>
                          <p className="text-xs text-cyan-300 mt-1">{getPercent(row)}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md border border-zinc-800 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3 bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-4">Participant</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-2">Score</div>
                  <div className="col-span-2 text-right">%</div>
                </div>
                {leaderboardRows.map((row, index) => {
                  const rank = index + 1;
                  const rowTone = rank === 1
                    ? 'border-l-4 border-amber-400 bg-amber-500/5'
                    : rank === 2
                      ? 'border-l-4 border-slate-300 bg-slate-500/5'
                      : rank === 3
                        ? 'border-l-4 border-orange-600 bg-orange-500/5'
                        : 'border-l-4 border-zinc-800 bg-zinc-950/40';

                  return (
                    <div key={`leader-${row.id || row.userId || rank}`} className={`grid grid-cols-12 gap-2 p-3 items-center text-sm ${rowTone}`}>
                      <div className="col-span-1 flex items-center gap-2">
                        <span className={`inline-flex h-7 w-7 min-w-7 aspect-square items-center justify-center rounded-full text-xs font-black ${rank === 1 ? 'bg-amber-400 text-zinc-950' : rank === 2 ? 'bg-slate-300 text-zinc-950' : rank === 3 ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-800 text-zinc-200'}`}>
                          {rank}
                        </span>
                      </div>
                      <div className="col-span-4 truncate text-zinc-100 flex items-center gap-2">
                        {row.userName || 'Unknown User'}
                        {currentUserRank === rank && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-200">
                            <Sparkles className="h-3 w-3" />
                            You
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 truncate text-zinc-400">{row.userRole || '-'}</div>
                      <div className="col-span-2 text-zinc-100 font-semibold">{getScore(row)}/{Number(row.totalMarks || totalMarks || 0)}</div>
                      <div className="col-span-2 text-right text-cyan-300 font-semibold">{getPercent(row)}%</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
