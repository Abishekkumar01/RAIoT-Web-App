"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/ui/CloudinaryUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { ExamTest, KeywordMatchMode, Question, QuestionType } from "@/types/examination";

export default function AdminExamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<ExamTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [resultsLoadingByExam, setResultsLoadingByExam] = useState<Record<string, boolean>>({});
  const [resultsByExam, setResultsByExam] = useState<Record<string, any[]>>({});
  const [expandedSubmissionRows, setExpandedSubmissionRows] = useState<Record<string, boolean>>({});
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [takeActionLoadingByExam, setTakeActionLoadingByExam] = useState<Record<string, boolean>>({});
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [examStartTime, setExamStartTime] = useState("");
  const [examEndTime, setExamEndTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [keywordDraftByQuestion, setKeywordDraftByQuestion] = useState<Record<string, string>>({});
  const [importingQuestions, setImportingQuestions] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchMyTestState();
  }, []);

  useEffect(() => {
    const role = (user?.role || '').toLowerCase();
    setIsSuperAdmin(role === 'superadmin');
    setIsAdminUser(role === 'superadmin' || role === 'admin');
  }, [user]);

  const computeStatus = (exam: Partial<ExamTest>): 'upcoming' | 'live' | 'previous' => {
    const now = new Date();
    const examStart = exam.examStartTime ? new Date(exam.examStartTime) : null;
    const examEnd = exam.examEndTime ? new Date(exam.examEndTime) : null;
    if (examStart && examEnd) {
      if (now < examStart) return 'upcoming';
      if (now >= examStart && now <= examEnd) return 'live';
      return 'previous';
    }
    return (exam.status as 'upcoming' | 'live' | 'previous') || 'upcoming';
  };

  const toDateTimeLocal = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setExamStartTime("");
    setExamEndTime("");
    setDuration("60");
    setQuestions([]);
    setKeywordDraftByQuestion({});
    setIsEditing(false);
    setEditingExamId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEditExam = (exam: ExamTest) => {
    setIsEditing(true);
    setEditingExamId(exam.id || null);
    setTitle(exam.title || "");
    setDescription(exam.description || "");
    setStartTime(toDateTimeLocal(exam.startTime));
    setEndTime(toDateTimeLocal(exam.endTime));
    setExamStartTime(toDateTimeLocal(exam.examStartTime));
    setExamEndTime(toDateTimeLocal(exam.examEndTime));
    setDuration(String(exam.durationMinutes || 60));
    setQuestions(
      (exam.questions || []).map((q) => ({
        ...q,
        id: q.id || crypto.randomUUID(),
        options: q.type === "mcq" || q.type === "checkbox"
          ? (q.options && q.options.length > 0 ? [...q.options] : ["", ""])
          : undefined,
        optionsAreImages: q.optionsAreImages === true,
        optionImageUrls: q.type === "mcq" || q.type === "checkbox"
          ? (q.optionImageUrls && q.optionImageUrls.length > 0
              ? [...q.optionImageUrls]
              : Array((q.options && q.options.length > 0 ? q.options.length : 2)).fill(""))
          : undefined,
        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(",") : (q.correctAnswer ?? ""),
        keywords: Array.isArray(q.keywords) ? q.keywords : [],
        keywordMatchMode: q.keywordMatchMode || "any",
        allowManualReview: q.allowManualReview !== false,
        imageUrl: q.imageUrl || "",
        negativePoints: q.negativePoints ?? 0,
      }))
    );
    setIsCreating(true);
  };

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

  const fetchMyTestState = async () => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/tests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMyRegistrations(data.registrations || []);
        setMySubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Error fetching test state", err);
    }
  };

  const isRegisteredForTest = (testId: string) => myRegistrations.some((r: any) => r.testId === testId);
  const getSubmissionForTest = (testId: string) => mySubmissions.find((s: any) => s.testId === testId);

  const registerForTest = async (testId: string) => {
    const auth = (await import("@/lib/firebase")).auth;
    const token = await auth.currentUser?.getIdToken(true);
    const res = await fetch('/api/tests/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ testId }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  const handleAdminTakeTest = async (exam: ExamTest) => {
    const examId = exam.id;
    if (!examId) return;

    setTakeActionLoadingByExam((prev) => ({ ...prev, [examId]: true }));
    try {
      const status = computeStatus(exam);
      const registered = isRegisteredForTest(examId);
      const submission = getSubmissionForTest(examId);

      if (isSuperAdmin) {
        router.push(`/dashboard/tests/${examId}`);
        return;
      }

      if (status === 'upcoming') {
        if (!registered) {
          const result = await registerForTest(examId);
          if (!result.ok && !String(result.data?.error || '').toLowerCase().includes('already registered')) {
            alert(result.data?.error || 'Failed to register for test.');
            return;
          }
          await fetchMyTestState();
        }
        alert('Registered successfully. The test is not live yet.');
        return;
      }

      if (status === 'live') {
        if (!registered) {
          const result = await registerForTest(examId);
          if (!result.ok && !String(result.data?.error || '').toLowerCase().includes('already registered')) {
            alert(result.data?.error || 'Failed to register for test.');
            return;
          }
        }

        if (submission) {
          alert('You have already submitted this test.');
          return;
        }

        router.push(`/dashboard/tests/${examId}`);
        return;
      }

      if (submission && exam.resultPublished) {
        router.push(`/dashboard/tests/results/${examId}`);
      } else if (submission && !exam.resultPublished) {
        alert('You already attempted this test. Result is not published yet.');
      } else {
        alert('Test is closed. You did not attempt it during the live window.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process test action.');
    } finally {
      setTakeActionLoadingByExam((prev) => ({ ...prev, [examId]: false }));
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
        optionsAreImages: false,
        optionImageUrls: ["", "", "", ""],
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

  const parseSelectedIndexes = (value: Question["correctAnswer"]) => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value.split(/[|,]/).map((v) => v.trim()).filter(Boolean);
    }
    return [];
  };

  const handleQuestionTypeChange = (qIndex: number, type: QuestionType) => {
    const updated = [...questions];
    const current = updated[qIndex];
    const next: Question = {
      ...current,
      type,
    };

    if (type === "mcq" || type === "checkbox") {
      next.options = current.options && current.options.length > 0 ? [...current.options] : ["", "", "", ""];
      next.optionsAreImages = current.optionsAreImages === true;
      next.optionImageUrls = current.optionImageUrls && current.optionImageUrls.length > 0
        ? [...current.optionImageUrls]
        : Array(next.options.length).fill("");
      next.correctAnswer = type === "mcq" ? "" : "";
      next.keywords = undefined;
      next.keywordMatchMode = undefined;
      next.allowManualReview = undefined;
    } else {
      next.options = undefined;
      next.optionsAreImages = undefined;
      next.optionImageUrls = undefined;
      next.correctAnswer = undefined;
      next.keywords = current.keywords || [];
      next.keywordMatchMode = current.keywordMatchMode || "any";
      next.allowManualReview = current.allowManualReview !== false;
    }

    updated[qIndex] = next;
    setQuestions(updated);
  };

  const toggleCheckboxCorrectOption = (qIndex: number, optIndex: number, checked: boolean) => {
    const updated = [...questions];
    const question = updated[qIndex];
    const current = new Set(parseSelectedIndexes(question.correctAnswer));
    const indexStr = String(optIndex);
    if (checked) current.add(indexStr);
    else current.delete(indexStr);
    updated[qIndex] = { ...question, correctAnswer: Array.from(current).sort().join(",") };
    setQuestions(updated);
  };

  const setKeywordDraft = (questionId: string, value: string) => {
    setKeywordDraftByQuestion((prev) => ({ ...prev, [questionId]: value }));
  };

  const addKeywordToQuestion = (qIndex: number) => {
    const updated = [...questions];
    const question = updated[qIndex];
    const questionId = question.id;
    const draft = (keywordDraftByQuestion[questionId] || "").trim();
    if (!draft) return;

    const existing = new Set((question.keywords || []).map((kw) => kw.trim().toLowerCase()));
    if (!existing.has(draft.toLowerCase())) {
      updated[qIndex] = {
        ...question,
        keywords: [...(question.keywords || []), draft],
      };
    }

    setKeywordDraftByQuestion((prev) => ({ ...prev, [questionId]: "" }));
    setQuestions(updated);
  };

  const removeKeywordFromQuestion = (qIndex: number, keyword: string) => {
    const updated = [...questions];
    updated[qIndex] = {
      ...updated[qIndex],
      keywords: (updated[qIndex].keywords || []).filter((kw) => kw !== keyword),
    };
    setQuestions(updated);
  };

  const updateKeywordMatchMode = (qIndex: number, mode: KeywordMatchMode) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], keywordMatchMode: mode };
    setQuestions(updated);
  };

  const updateAllowManualReview = (qIndex: number, checked: boolean) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], allowManualReview: checked };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options![optIndex] = value;
    }
    setQuestions(updated);
  };

  const updateOptionImage = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    if (!updated[qIndex].optionImageUrls) {
      updated[qIndex].optionImageUrls = Array(updated[qIndex].options?.length || 0).fill("");
    }
    updated[qIndex].optionImageUrls![optIndex] = value;
    setQuestions(updated);
  };

  const toggleOptionsAreImages = (qIndex: number, checked: boolean) => {
    const updated = [...questions];
    const q = updated[qIndex];
    const optionCount = q.options?.length || 0;
    updated[qIndex] = {
      ...q,
      optionsAreImages: checked,
      optionImageUrls: checked
        ? (q.optionImageUrls && q.optionImageUrls.length > 0
            ? [...q.optionImageUrls]
            : Array(optionCount).fill(""))
        : q.optionImageUrls,
    };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options!.push("");
      if (updated[qIndex].optionImageUrls) {
        updated[qIndex].optionImageUrls!.push("");
      }
    }
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options!.splice(optIndex, 1);
      if (updated[qIndex].optionImageUrls) {
        updated[qIndex].optionImageUrls!.splice(optIndex, 1);
      }
    }
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const splitCsvRow = (line: string) => {
    const regex = /("(?:[^"]|"")*"|[^,]+)/g;
    const matches = line.match(regex) || [];
    return matches.map((part) => part.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
  };

  const normalizeQuestion = (raw: any, index: number): Question => {
    const rawType = String(raw.type || raw.questionType || "mcq").toLowerCase().trim();
    const type: QuestionType = rawType === "short_answer" || rawType === "long_answer" || rawType === "checkbox" ? rawType : "mcq";
    const text = String(raw.text || raw.question || "").trim();
    if (!text) throw new Error(`Question ${index + 1}: text is required`);

    let options: string[] | undefined = undefined;
    if (type === "mcq" || type === "checkbox") {
      if (Array.isArray(raw.options)) options = raw.options.map((o: any) => String(o).trim()).filter(Boolean);
      else if (typeof raw.options === "string") options = raw.options.split("|").map((o: string) => o.trim()).filter(Boolean);
      if (!options || options.length < 2) throw new Error(`Question ${index + 1}: ${type === "mcq" ? "MCQ" : "Checkbox"} requires at least 2 options`);
    }

    const optionsAreImages =
      raw.optionsAreImages === true ||
      String(raw.optionsAreImages || "").toLowerCase() === "true";

    const optionImageUrls = (type === "mcq" || type === "checkbox")
      ? (Array.isArray(raw.optionImageUrls)
          ? raw.optionImageUrls.map((v: any) => String(v).trim())
          : String(raw.optionImageUrls || "")
              .split("|")
              .map((v) => v.trim()))
      : undefined;

    let correctAnswer: string | undefined;
    if (type === "checkbox") {
      const selected = Array.isArray(raw.correctAnswer)
        ? raw.correctAnswer.map((v: any) => String(v).trim()).filter(Boolean)
        : String(raw.correctAnswer ?? "")
            .split(/[|,]/)
            .map((v) => v.trim())
            .filter(Boolean);
      correctAnswer = selected.join(",");
    } else {
      correctAnswer = raw.correctAnswer !== undefined && raw.correctAnswer !== null
        ? String(raw.correctAnswer).trim()
        : undefined;
    }

    const points = Number(raw.points ?? 1);
    const negativePoints = Number(raw.negativePoints ?? 0);

    return {
      id: crypto.randomUUID(),
      text,
      type,
      options,
      optionsAreImages,
      optionImageUrls: optionImageUrls && optionImageUrls.length > 0 ? optionImageUrls : undefined,
      correctAnswer,
      imageUrl: raw.imageUrl ? String(raw.imageUrl).trim() : undefined,
      keywords: (type === "short_answer" || type === "long_answer")
        ? (Array.isArray(raw.keywords)
            ? raw.keywords.map((v: any) => String(v).trim()).filter(Boolean)
            : String(raw.keywords ?? "")
                .split(/[|,]/)
                .map((v) => v.trim())
                .filter(Boolean))
        : undefined,
      keywordMatchMode: raw.keywordMatchMode === "all" ? "all" : "any",
      allowManualReview: raw.allowManualReview === undefined
        ? true
        : ["true", "1", "yes"].includes(String(raw.allowManualReview).toLowerCase()),
      points: Number.isFinite(points) ? points : 1,
      negativePoints: Number.isFinite(negativePoints) ? negativePoints : 0,
    };
  };

  const parseQuestionsFromFile = async (file: File): Promise<Question[]> => {
    const content = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === "json") {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(arr)) throw new Error("JSON must be an array or an object with a questions array");
      return arr.map((q, idx) => normalizeQuestion(q, idx));
    }

    if (ext === "csv") {
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV needs a header row and at least one question row");

      const headers = splitCsvRow(lines[0]).map((h) => h.toLowerCase());
      const rows = lines.slice(1).map(splitCsvRow);
      const objects = rows.map((cols) => {
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] ?? "";
        });
        return {
          text: obj.text || obj.question,
          type: obj.type,
          options: obj.options,
          optionsAreImages: obj.optionsareimages,
          optionImageUrls: obj.optionimageurls,
          correctAnswer: obj.correctanswer,
          imageUrl: obj.imageurl,
          keywords: obj.keywords,
          keywordMatchMode: obj.keywordmatchmode,
          allowManualReview: obj.allowmanualreview,
          points: obj.points,
          negativePoints: obj.negativepoints,
        };
      });
      return objects.map((q, idx) => normalizeQuestion(q, idx));
    }

    throw new Error("Unsupported file type. Use .json or .csv");
  };

  const handleQuestionFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingQuestions(true);
    try {
      const importedQuestions = await parseQuestionsFromFile(file);
      setQuestions((prev) => [...prev, ...importedQuestions]);
      alert(`Imported ${importedQuestions.length} questions successfully.`);
    } catch (err: any) {
      alert(err?.message || "Failed to import questions from file.");
    } finally {
      setImportingQuestions(false);
      event.target.value = "";
    }
  };

  const submitExam = async () => {
    if (!title || !description || !startTime || !endTime || !examStartTime || !examEndTime || !duration) {
      alert("Please fill all test details (Title, Description, Registration Dates, Exam Dates, and Duration).");
      return;
    }

    try {
      const { auth } = await import("@/lib/firebase");
      if (!auth.currentUser) {
        alert("Authentication lost. Please refresh the page.");
        return;
      }
      
      const token = await auth.currentUser.getIdToken(true);

      let stDate, enDate, exStDate, exEnDate;
      try {
        stDate = new Date(startTime).toISOString();
        enDate = new Date(endTime).toISOString();
        exStDate = new Date(examStartTime).toISOString();
        exEnDate = new Date(examEndTime).toISOString();
      } catch (e) {
        alert("Invalid Date format selected.");
        return;
      }

      if (questions.length === 0) {
        alert("Please add at least one question.");
        return;
      }

      const preparedQuestions = questions.map((q) => ({
        ...q,
        imageUrl: q.imageUrl?.trim() || undefined,
        keywords: (q.keywords || []).map((kw) => kw.trim()).filter(Boolean),
        optionImageUrls: (q.optionImageUrls || []).map((url) => url.trim()),
      }));

      const newExam = {
        title,
        description,
        startTime: stDate,
        endTime: enDate,
        examStartTime: exStDate,
        examEndTime: exEnDate,
        durationMinutes: parseInt(duration),
        status: "upcoming",
        questions: preparedQuestions
      };

      const isUpdate = isEditing && !!editingExamId;
      const endpoint = isUpdate ? `/api/admin/exams/${editingExamId}` : '/api/admin/exams';
      const method = isUpdate ? 'PUT' : 'POST';
      const body = isUpdate ? { ...newExam, resultPublished: false } : newExam;

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        if (isUpdate) {
          alert("Test updated successfully. Results are now unpublished. Review changes and publish again.");
        } else {
          alert("Test created successfully!");
        }
        setIsCreating(false);
        fetchExams();
        resetForm();
      } else {
        alert(data.error || (isUpdate ? "Failed to update test." : "Failed to create test."));
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

  const updateResultPublished = async (id: string, nextValue: boolean) => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`/api/admin/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ resultPublished: nextValue })
      });
      if (res.ok) {
        setExams(prev => prev.map(exam => exam.id === id ? { ...exam, resultPublished: nextValue } : exam));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update publish status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExamResultsData = async (examId: string): Promise<any[] | null> => {
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`/api/admin/exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to fetch member results");
        return null;
      }
      return data.submissions || [];
    } catch (err) {
      console.error(err);
      alert("Failed to fetch member results");
      return null;
    }
  };

  const loadExamResults = async (examId: string) => {
    if (resultsByExam[examId]) {
      setResultsByExam(prev => {
        const next = { ...prev };
        delete next[examId];
        return next;
      });
      return;
    }

    setResultsLoadingByExam(prev => ({ ...prev, [examId]: true }));
    try {
      const submissions = await fetchExamResultsData(examId);
      if (submissions) {
        setResultsByExam(prev => ({ ...prev, [examId]: submissions }));
      }
    } finally {
      setResultsLoadingByExam(prev => ({ ...prev, [examId]: false }));
    }
  };

  const toggleSubmissionDetails = (examId: string, submissionId: string) => {
    const key = `${examId}:${submissionId}`;
    setExpandedSubmissionRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportExamResultsToExcel = async (exam: ExamTest) => {
    const examId = exam.id;
    if (!examId) return;

    const cached = resultsByExam[examId];
    const submissions = cached || (await fetchExamResultsData(examId)) || [];
    if (submissions.length === 0) {
      alert("No submission data available to export.");
      return;
    }

    if (!cached) {
      setResultsByExam((prev) => ({ ...prev, [examId]: submissions }));
    }

    const summaryRows = submissions.map((row: any, index: number) => ({
      SNo: index + 1,
      Member: row.userName || "Unknown User",
      Email: row.userEmail || "",
      Role: row.userRole || "",
      Score: row.score ?? "Pending",
      Attempted: row.attemptedCount ?? 0,
      Correct: row.correctCount ?? 0,
      Incorrect: row.incorrectCount ?? 0,
      SubmittedAt: row.submittedAt ? new Date(row.submittedAt).toLocaleString() : ""
    }));

    const questionRows = submissions.flatMap((row: any, rowIndex: number) =>
      (row.questionBreakdown || []).map((q: any) => ({
        SubmissionSNo: rowIndex + 1,
        Member: row.userName || "Unknown User",
        Email: row.userEmail || "",
        QuestionNo: q.questionNo,
        QuestionType: q.questionType,
        Question: q.questionText,
        Status: q.status,
        UserAnswer: q.userAnswer || "",
        CorrectAnswer: q.correctAnswer || "",
        Points: q.points ?? 0,
        NegativePoints: q.negativePoints ?? 0
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(questionRows), "Question Breakdown");
    XLSX.writeFile(workbook, `${(exam.title || "exam-results").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.xlsx`);
  };

  const setManualScore = async (examId: string, submissionId: string, currentScore: number | null | undefined) => {
    const entered = prompt("Enter final manual score", currentScore === null || currentScore === undefined ? "0" : String(currentScore));
    if (entered === null) return;
    const score = Number(entered);
    if (!Number.isFinite(score) || score < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }

    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`/api/admin/exams/${examId}/results/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ score }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update manual score");
        return;
      }
      setResultsByExam((prev) => ({
        ...prev,
        [examId]: (prev[examId] || []).map((row: any) =>
          row.id === submissionId ? { ...row, score, requiresManualReview: false } : row
        ),
      }));
      alert("Manual score updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to update manual score");
    }
  };

  const deleteSubmissionData = async (examId: string, submissionId: string) => {
    if (!confirm('Delete this submission data permanently?')) return;
    try {
      const auth = (await import("@/lib/firebase")).auth;
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`/api/admin/exams/${examId}/results/${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete submission data');
        return;
      }
      setResultsByExam((prev) => ({
        ...prev,
        [examId]: (prev[examId] || []).filter((row: any) => row.id !== submissionId),
      }));
      alert('Submission data deleted successfully.');
      await fetchMyTestState();
    } catch (err) {
      console.error(err);
      alert('Failed to delete submission data');
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + (Number.isFinite(Number(q.points)) ? Number(q.points) : 0), 0);

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

  if (isCreating) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Test' : 'Create New Test'}</h1>
          <Button variant="outline" onClick={() => { setIsCreating(false); resetForm(); }}>Cancel</Button>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">📅 Exam Start Time (Test goes Live)</label>
                <Input type="datetime-local" value={examStartTime} onChange={e => setExamStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">📅 Exam End Time (Last time to Start the test)</label>
                <Input type="datetime-local" value={examEndTime} onChange={e => setExamEndTime(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-8">
          <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
          <Input
            type="file"
            accept=".json,.csv"
            onChange={handleQuestionFileUpload}
            disabled={importingQuestions}
            className="w-[240px]"
          />
        </div>
        <p className="text-xs text-muted-foreground -mt-4">
          Bulk import format: JSON array (or object with questions[]) or CSV with headers: text,type,options,correctAnswer,imageUrl,keywords,keywordMatchMode,allowManualReview,points,negativePoints.
          For MCQ/Checkbox CSV, put options separated by | (example: A|B|C|D). For checkbox correctAnswer, use comma-separated indexes like 0,2.
        </p>

        <Card className="border-zinc-800 bg-zinc-950/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Example Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-1">JSON example</p>
              <pre className="rounded-md border border-zinc-800 bg-zinc-950 p-3 overflow-x-auto text-zinc-200">
{`[
  {
    "text": "What is 2 + 2?",
    "type": "mcq",
    "options": ["1", "2", "3", "4"],
    "correctAnswer": "3",
    "points": 1,
    "negativePoints": 0
  },
  {
    "text": "Select all prime numbers below 10",
    "type": "checkbox",
    "options": ["2", "3", "4", "5"],
    "correctAnswer": "0,1,3",
    "points": 2,
    "negativePoints": 0.5
  },
  {
    "text": "Define IoT in one line.",
    "type": "short_answer",
    "keywords": ["internet", "things"],
    "keywordMatchMode": "all",
    "allowManualReview": true,
    "points": 2,
    "negativePoints": 0
  }
]`}
              </pre>
            </div>

            <div>
              <p className="text-muted-foreground mb-1">CSV example</p>
              <pre className="rounded-md border border-zinc-800 bg-zinc-950 p-3 overflow-x-auto text-zinc-200">
{`text,type,options,correctAnswer,imageUrl,keywords,keywordMatchMode,allowManualReview,points,negativePoints
What is 2 + 2?,mcq,1|2|3|4,3,,,,,1,0
Select all prime numbers below 10,checkbox,2|3|4|5,"0,1,3",,,,2,0.5
Define IoT in one line.,short_answer,,,https://example.com/iot.png,internet|things,all,true,2,0`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="relative">
            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => removeQuestion(qIndex)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-bold">Q{qIndex + 1}.</span>
                <Input className="flex-1" placeholder="Question Text" value={q.text} onChange={e => updateQuestion(qIndex, 'text', e.target.value)} />
                <Select value={q.type} onValueChange={(val) => handleQuestionTypeChange(qIndex, val as QuestionType)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="short_answer">Short</SelectItem>
                    <SelectItem value="long_answer">Long</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Pts" className="w-16" value={q.points} onChange={e => updateQuestion(qIndex, 'points', Number(e.target.value))} title="Positive Marks" />
                <Input type="number" placeholder="-Pts" className="w-16 text-red-500" value={q.negativePoints || 0} onChange={e => updateQuestion(qIndex, 'negativePoints', Number(e.target.value))} title="Negative Marks" />
              </div>

              <div className="pl-8 space-y-2">
                <p className="text-xs text-muted-foreground">Question image upload (Cloudinary)</p>
                <CloudinaryUpload
                  folderName="raiot_exams"
                  currentImageUrl={q.imageUrl}
                  onUploadSuccess={(url) => updateQuestion(qIndex, 'imageUrl', url)}
                />
              </div>

              {(q.type === 'mcq' || q.type === 'checkbox') && q.options && (
                <div className="pl-8 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                    <input
                      type="checkbox"
                      checked={q.optionsAreImages === true}
                      onChange={(e) => toggleOptionsAreImages(qIndex, e.target.checked)}
                    />
                    Options are images
                  </label>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-start gap-2">
                      {q.type === 'mcq' ? (
                        <input 
                          type="radio" 
                          name={`correct-${qIndex}`} 
                          checked={q.correctAnswer === String(optIndex)} 
                          onChange={() => updateQuestion(qIndex, 'correctAnswer', String(optIndex))}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={parseSelectedIndexes(q.correctAnswer).includes(String(optIndex))}
                          onChange={(e) => toggleCheckboxCorrectOption(qIndex, optIndex, e.target.checked)}
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <Input placeholder={`Option ${optIndex + 1}`} value={opt} onChange={e => updateOption(qIndex, optIndex, e.target.value)} />
                        {q.optionsAreImages && (
                          <CloudinaryUpload
                            folderName="raiot_exams/options"
                            currentImageUrl={q.optionImageUrls?.[optIndex]}
                            onUploadSuccess={(url) => updateOptionImage(qIndex, optIndex, url)}
                          />
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => removeOption(qIndex, optIndex)} disabled={q.options!.length <= 2}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {q.type === 'mcq'
                      ? 'Select one correct option.'
                      : 'Select all correct options. Exact match is required for full marks.'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => addOption(qIndex)} className="mt-2 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}

              {(q.type === 'short_answer' || q.type === 'long_answer') && (
                <div className="pl-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type keyword and click Add"
                      value={keywordDraftByQuestion[q.id] || ""}
                      onChange={(e) => setKeywordDraft(q.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKeywordToQuestion(qIndex);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => addKeywordToQuestion(qIndex)}>
                      Add Keyword
                    </Button>
                  </div>
                  {(q.keywords || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(q.keywords || []).map((keyword, keywordIndex) => (
                        <span key={`${keyword}-${keywordIndex}`} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
                          {keyword}
                          <button
                            type="button"
                            className="text-zinc-400 hover:text-red-400"
                            onClick={() => removeKeywordFromQuestion(qIndex, keyword)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Select value={q.keywordMatchMode || 'any'} onValueChange={(val) => updateKeywordMatchMode(qIndex, val as KeywordMatchMode)}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Match Any Keyword</SelectItem>
                        <SelectItem value="all">Match All Keywords</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={q.allowManualReview !== false}
                        onChange={(e) => updateAllowManualReview(qIndex, e.target.checked)}
                      />
                      Allow manual marking when keyword check fails
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If keywords match, full points are auto-awarded. If they do not match and manual marking is enabled, submission stays pending for admin review.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="sticky bottom-4 z-20 pt-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                Questions: {questions.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                Total Marks: {totalMarks}
              </span>
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-2" /> Add Question
              </Button>
            </div>
            <Button onClick={submitExam} size="lg"><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Save Changes' : 'Save Test'}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exam Management</h1>
        <Button onClick={openCreateForm}><Plus className="w-4 h-4 mr-2" /> Create Test</Button>
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
                    <span>Qns: {exam.questions?.length || 0}</span>
                    <span>Reg. Start: {new Date(exam.startTime).toLocaleString()}</span>
                    {exam.examStartTime && <span className="text-green-500">Exam: {new Date(exam.examStartTime).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdminUser && (
                    <Button
                      variant="secondary"
                      onClick={() => handleAdminTakeTest(exam)}
                      disabled={!!takeActionLoadingByExam[exam.id!]}
                    >
                      {takeActionLoadingByExam[exam.id!] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Take Test
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button variant="outline" onClick={() => startEditExam(exam)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Test
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button
                      variant={exam.resultPublished ? "secondary" : "default"}
                      onClick={() => updateResultPublished(exam.id!, !exam.resultPublished)}
                    >
                      {exam.resultPublished ? 'Unpublish Result' : 'Publish Result'}
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button variant="outline" onClick={() => loadExamResults(exam.id!)}>
                      {resultsByExam[exam.id!] ? 'Hide Member Results' : 'View Member Results'}
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button variant="outline" onClick={() => exportExamResultsToExcel(exam)}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                  )}
                  <Button variant="destructive" size="icon" onClick={() => deleteExam(exam.id!)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
              {isSuperAdmin && (resultsLoadingByExam[exam.id!] || resultsByExam[exam.id!]) && (
                <CardContent className="pt-0 pb-4">
                  <div className="rounded-md border border-zinc-800 overflow-hidden">
                    <div className="grid grid-cols-16 gap-2 p-3 bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                      <div className="col-span-2">Member</div>
                      <div className="col-span-3">Email</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-2">Score</div>
                      <div className="col-span-2">Attempt/Corr/Inc</div>
                      <div className="col-span-2">Submitted At</div>
                      <div className="col-span-3">Action</div>
                    </div>
                    {resultsLoadingByExam[exam.id!] && (
                      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading results...
                      </div>
                    )}
                    {!resultsLoadingByExam[exam.id!] && resultsByExam[exam.id!].length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">No member submissions yet.</div>
                    )}
                    {!resultsLoadingByExam[exam.id!] && resultsByExam[exam.id!].map((row: any) => {
                      const expandKey = `${exam.id!}:${row.id}`;
                      const isExpanded = !!expandedSubmissionRows[expandKey];
                      return (
                        <div key={row.id} className="border-t border-zinc-800">
                          <div className="grid grid-cols-16 gap-2 p-3 text-sm items-center">
                            <div className="col-span-2 truncate">{row.userName || 'Unknown User'}</div>
                            <div className="col-span-3 truncate text-zinc-400">{row.userEmail || '-'}</div>
                            <div className="col-span-2 capitalize text-zinc-400">{row.userRole || '-'}</div>
                            <div className="col-span-2 font-semibold">{row.score === null || row.score === undefined ? 'Pending' : row.score}</div>
                            <div className="col-span-2 text-zinc-300">
                              {(row.attemptedCount ?? 0)}/{(row.correctCount ?? 0)}/{(row.incorrectCount ?? 0)}
                            </div>
                            <div className="col-span-2 text-zinc-400">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '-'}</div>
                            <div className="col-span-3">
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                <Button size="sm" variant="outline" onClick={() => toggleSubmissionDetails(exam.id!, row.id)}>
                                  {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                                  Details
                                </Button>
                                {(row.score === null || row.requiresManualReview) ? (
                                  <Button size="sm" variant="outline" onClick={() => setManualScore(exam.id!, row.id, row.score)}>
                                    Manual Score
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={() => setManualScore(exam.id!, row.id, row.score)}>
                                    Edit Score
                                  </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => deleteSubmissionData(exam.id!, row.id)}>
                                  Delete Data
                                </Button>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3">
                              <div className="rounded-md border border-zinc-800 bg-zinc-950/50 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-300 border-b border-zinc-800">
                                  <span>
                                    Attempted: {row.attemptedCount ?? 0} | Correct: {row.correctCount ?? 0} | Incorrect: {row.incorrectCount ?? 0}
                                  </span>
                                  <span className="text-zinc-400">Question-wise Responses</span>
                                </div>
                                <div className="max-h-[380px] overflow-auto">
                                  {(row.questionBreakdown || []).map((detail: any) => (
                                    <div key={`${row.id}-${detail.questionId}`} className="border-b border-zinc-800/70 p-3 text-xs space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-zinc-100 font-medium">Q{detail.questionNo}. {detail.questionText}</p>
                                        <span className={`uppercase text-[10px] px-2 py-0.5 rounded ${detail.status === 'correct' ? 'bg-emerald-900/40 text-emerald-300' : detail.status === 'incorrect' ? 'bg-red-900/40 text-red-300' : 'bg-zinc-800 text-zinc-300'}`}>
                                          {detail.status}
                                        </span>
                                      </div>
                                      <p className="text-zinc-400">Type: {detail.questionType}</p>
                                      <p className="text-zinc-300"><span className="text-zinc-500">User Answer:</span> {detail.userAnswer || '-'}</p>
                                      <p className="text-zinc-300"><span className="text-zinc-500">Correct Answer:</span> {detail.correctAnswer || '-'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
