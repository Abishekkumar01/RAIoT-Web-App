export type QuestionType = 'mcq' | 'checkbox' | 'short_answer' | 'long_answer';
export type KeywordMatchMode = 'any' | 'all';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Applicable for 'mcq' and 'checkbox'
  optionsAreImages?: boolean;
  optionImageUrls?: string[]; // Parallel array to options when optionsAreImages is true
  correctAnswer?: string | string[];
  imageUrl?: string;
  keywords?: string[]; // Applicable for short/long answer auto-evaluation
  keywordMatchMode?: KeywordMatchMode;
  allowManualReview?: boolean;
  points: number;
  negativePoints?: number;
}

export type TestStatus = 'upcoming' | 'live' | 'previous';

export interface ExamTest {
  id?: string;
  title: string;
  description: string;
  status: TestStatus;
  resultPublished?: boolean;
  startTime: string;    // Registration window OPEN (ISO String)
  endTime: string;      // Registration window CLOSE (ISO String)
  examStartTime: string; // Test goes LIVE at this time (ISO String)
  examEndTime: string;   // Test closes for submissions at this time (ISO String)
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
  answers: Record<string, string | string[]>; // questionId -> user's answer
  score?: number; // Nullable if manual grading is required
  submittedAt: string;
}
