"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { ExamTest, Question, QuestionType } from "@/types/examination";

export default function AdminExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/exams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error("Error fetching exams", err);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        text: "",
        type: "mcq",
        options: ["", "", "", ""],
        correctAnswer: "",
        points: 1,
        negativePoints: 0
      }
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options![optIndex] = value;
    }
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options!.push("");
    }
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options!.splice(optIndex, 1);
    }
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const submitExam = async () => {
    if (!title || !description || !startTime || !endTime || !duration) {
      alert("Please fill all test details (Title, Description, Dates, and Duration).");
      return;
    }

    try {
      const { auth } = await import("@/lib/firebase");
      if (!auth.currentUser) {
        alert("Authentication lost. Please refresh the page.");
        return;
      }
      
      const token = await auth.currentUser.getIdToken(true);

      let stDate, enDate;
      try {
        stDate = new Date(startTime).toISOString();
        enDate = new Date(endTime).toISOString();
      } catch (e) {
        alert("Invalid Date format selected.");
        return;
      }

      if (questions.length === 0) {
        alert("Please add at least one question.");
        return;
      }

      const newExam = {
        title,
        description,
        startTime: stDate,
        endTime: enDate,
        durationMinutes: parseInt(duration),
        status: "upcoming",
        questions
      };

      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newExam)
      });

      const data = await res.json();
      if (res.ok) {
        alert("Test created successfully!");
        setIsCreating(false);
        fetchExams();
        // Reset form
        setTitle(""); setDescription(""); setStartTime(""); setEndTime(""); setQuestions([]);
      } else {
        alert(data.error || "Failed to create test.");
      }
    } catch (err: any) {
      console.error("Error submitting test:", err);
      alert("An error occurred while saving: " + err.message);
    }
  };

  const deleteExam = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/admin/exams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExams();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

  if (isCreating) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Create New Test</h1>
          <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
        </div>
        
        <Card>
          <CardHeader><CardTitle>Test Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Selection Test" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Registration Start</label>
                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Registration End</label>
                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (mins)</label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-8">
          <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
          <Button onClick={addQuestion}><Plus className="w-4 h-4 mr-2" /> Add Question</Button>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="relative">
            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => removeQuestion(qIndex)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-bold">Q{qIndex + 1}.</span>
                <Input className="flex-1" placeholder="Question Text" value={q.text} onChange={e => updateQuestion(qIndex, 'text', e.target.value)} />
                <Select value={q.type} onValueChange={(val) => updateQuestion(qIndex, 'type', val as QuestionType)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="short_answer">Short</SelectItem>
                    <SelectItem value="long_answer">Long</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Pts" className="w-16" value={q.points} onChange={e => updateQuestion(qIndex, 'points', Number(e.target.value))} title="Positive Marks" />
                <Input type="number" placeholder="-Pts" className="w-16 text-red-500" value={q.negativePoints || 0} onChange={e => updateQuestion(qIndex, 'negativePoints', Number(e.target.value))} title="Negative Marks" />
              </div>

              {q.type === 'mcq' && q.options && (
                <div className="pl-8 space-y-2">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name={`correct-${qIndex}`} 
                        checked={q.correctAnswer === String(optIndex)} 
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', String(optIndex))}
                      />
                      <Input placeholder={`Option ${optIndex + 1}`} value={opt} onChange={e => updateOption(qIndex, optIndex, e.target.value)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => removeOption(qIndex, optIndex)} disabled={q.options!.length <= 2}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addOption(qIndex)} className="mt-2 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={submitExam} size="lg"><Save className="w-4 h-4 mr-2" /> Save Test</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exam Management</h1>
        <Button onClick={() => setIsCreating(true)}><Plus className="w-4 h-4 mr-2" /> Create Test</Button>
      </div>

      <div className="grid gap-4">
        {exams.length === 0 ? (
          <p className="text-muted-foreground">No exams found.</p>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{exam.title}</h3>
                  <div className="text-sm text-muted-foreground space-x-4">
                    <span>Status: <span className="uppercase text-primary">{exam.status}</span></span>
                    <span>Qns: {exam.questions?.length || 0}</span>
                    <span>Start: {new Date(exam.startTime).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Status Toggle or Delete */}
                  <Button variant="destructive" size="icon" onClick={() => deleteExam(exam.id!)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
