export type QuestionType = 'mcq' | 'short_answer' | 'long_answer';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Applicable only for 'mcq'
  correctAnswer?: string;
  points: number;
  negativePoints?: number;
}

export type TestStatus = 'upcoming' | 'live' | 'previous';

export interface ExamTest {
  id?: string;
  title: string;
  description: string;
  status: TestStatus;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  durationMinutes: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface ExamRegistration {
  id?: string;
  testId: string;
  userId: string;
  registeredAt: string;
}

export interface ExamSubmission {
  id?: string;
  testId: string;
  userId: string;
  answers: Record<string, string>; // questionId -> user's answer
  score?: number; // Nullable if manual grading is required
  submittedAt: string;
}
