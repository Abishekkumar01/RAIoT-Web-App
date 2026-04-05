"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { ExamTest } from "@/types/examination";

export default function TestsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Partial<ExamTest>[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchTests();
    // Re-fetch every 30s so tests automatically move to Live/Previous tabs
    const interval = setInterval(fetchTests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTests = async () => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/tests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setExams(data.exams || []);
        setRegistrations(data.registrations || []);
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const registerForTest = async (testId: string) => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      
      const res = await fetch('/api/tests/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testId })
      });

      if (res.ok) {
        fetchTests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isRegistered = (testId: string) => registrations.some(r => r.testId === testId);
  const isSubmitted = (testId: string) => submissions.some(s => s.testId === testId);

  const upcomingTests = exams.filter(e => e.status === 'upcoming');
  const liveTests = exams.filter(e => e.status === 'live');
  const previousTests = exams.filter(e => {
    if (e.status === 'previous') return true;
    if (!e.id) return false;
    return isSubmitted(e.id);
  });

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const TestCard = ({ test, actionType }: { test: Partial<ExamTest>, actionType: 'upcoming' | 'live' | 'previous' }) => {
    const registered = isRegistered(test.id!);
    const submitted = isSubmitted(test.id!);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>{test.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Reg. Start: {new Date(test.startTime!).toLocaleString()}</div>
            <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Reg. End: {new Date(test.endTime!).toLocaleString()}</div>
            {test.examStartTime && <div className="flex items-center text-green-500"><Clock className="w-4 h-4 mr-2" /> Exam Opens: {new Date(test.examStartTime).toLocaleString()}</div>}
            {test.examEndTime && <div className="flex items-center text-orange-400"><Clock className="w-4 h-4 mr-2" /> Last Time to Start: {new Date(test.examEndTime).toLocaleString()}</div>}
            <div className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Duration: {test.durationMinutes} mins</div>
          </div>
        </CardContent>
        <CardFooter>
          {actionType === 'upcoming' && (
            registered ? (
               <Button variant="outline" disabled className="w-full"><CheckCircle2 className="w-4 h-4 mr-2" /> Registered</Button>
            ) : (
               <Button onClick={() => registerForTest(test.id!)} className="w-full">Register for Test</Button>
            )
          )}
          {actionType === 'live' && (
            registered ? (
               submitted ? (
                  <Button variant="outline" disabled className="w-full">Submitted</Button>
               ) : (
                  <Button onClick={() => window.location.href=`/dashboard/tests/${test.id}`} className="w-full">Take Test</Button>
               )
            ) : (
               <Button onClick={() => registerForTest(test.id!).then(() => window.location.href=`/dashboard/tests/${test.id}`)} className="w-full">Register & Take Test</Button>
            )
          )}
          {actionType === 'previous' && (
            submitted ? (
              test.resultPublished ? (
                <Button variant="secondary" className="w-full" onClick={() => window.location.href=`/dashboard/tests/results/${test.id}`}>View Results</Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>Result Not Published Yet</Button>
              )
            ) : (
              <Button variant="outline" className="w-full" disabled>Not Attempted</Button>
            )
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Examinations</h1>
      
      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="previous">Previous</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTests.length === 0 ? <p className="text-muted-foreground">No upcoming tests.</p> :
              upcomingTests.map(t => <TestCard key={t.id} test={t} actionType="upcoming" />)
            }
          </div>
        </TabsContent>
        
        <TabsContent value="live" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveTests.length === 0 ? <p className="text-muted-foreground">No live tests currently.</p> :
              liveTests.map(t => <TestCard key={t.id} test={t} actionType="live" />)
            }
          </div>
        </TabsContent>

        <TabsContent value="previous" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previousTests.length === 0 ? <p className="text-muted-foreground">No previous tests.</p> :
              previousTests.map(t => <TestCard key={t.id} test={t} actionType="previous" />)
            }
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
