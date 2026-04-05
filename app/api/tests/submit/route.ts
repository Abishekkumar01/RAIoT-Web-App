import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

const toDateSafe = (value: any): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value?.toDate === 'function') {
        const parsed = value.toDate();
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;

        if (typeof value === 'string') {
            const match = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (match) {
                const day = Number(match[1]);
                const month = Number(match[2]);
                const year = Number(match[3]);
                const hour = Number(match[4] || 0);
                const minute = Number(match[5] || 0);
                const second = Number(match[6] || 0);
                const fallback = new Date(year, month - 1, day, hour, minute, second);
                return Number.isNaN(fallback.getTime()) ? null : fallback;
            }
        }
        return null;
    }

    if (typeof value === 'object') {
        const seconds = value.seconds ?? value._seconds;
        const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
        if (typeof seconds === 'number') {
            const parsed = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
    }

    return null;
};

const isExamVisibleToUser = (
    examData: any,
    uid: string,
    userRole: string
): boolean => {
    const target = String(examData?.publishTarget || 'all').toLowerCase();
    const selectedUsers = Array.isArray(examData?.publishToUserIds) ? examData.publishToUserIds.map((v: any) => String(v)) : [];
    const normalizedRole = String(userRole || '').toLowerCase().trim();
    const isMemberRole = normalizedRole !== '' && !['trainee', 'guest', 'public'].includes(normalizedRole);

    if (target === 'all') return true;
    if (target === 'trainee') return normalizedRole === 'trainee';
    if (target === 'member') return isMemberRole;
    if (target === 'selected') return selectedUsers.includes(uid);
    return true;
};

const normalizeIndexAnswer = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean)
            .sort();
    }
    if (typeof value === 'string') {
        return value
            .split(/[|,]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .sort();
    }
    return [];
};

const isAttemptedAnswer = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return false;
};

const normalizeKeyword = (value: string): string => value.trim().toLowerCase();

const evaluateKeywordAnswer = (
    answerValue: unknown,
    keywords: string[],
    matchMode: 'any' | 'all'
): boolean => {
    const answer = String(answerValue ?? '').toLowerCase();
    const expected = keywords.map(normalizeKeyword).filter(Boolean);
    if (expected.length === 0) return false;

    if (matchMode === 'all') {
        return expected.every((kw) => answer.includes(kw));
    }
    return expected.some((kw) => answer.includes(kw));
};

const roundMarks = (value: number): number => {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const computeCheckboxMarks = (
    selectedAnswer: unknown,
    correctAnswer: unknown,
    points: number,
    negativePoints: number
): number => {
    const selectedIndexes = normalizeIndexAnswer(selectedAnswer);
    if (selectedIndexes.length === 0) return 0;

    const correctIndexes = normalizeIndexAnswer(correctAnswer);
    if (correctIndexes.length === 0) return 0;

    const correctSet = new Set(correctIndexes);
    const selectedSet = new Set(selectedIndexes);

    let selectedCorrectCount = 0;
    let selectedWrongCount = 0;

    selectedSet.forEach((idx) => {
        if (correctSet.has(idx)) {
            selectedCorrectCount += 1;
        } else {
            selectedWrongCount += 1;
        }
    });

    const divisor = correctIndexes.length;
    const positive = (selectedCorrectCount / divisor) * Number(points || 0);
    const negative = (selectedWrongCount / divisor) * Math.abs(Number(negativePoints || 0));
    return positive - negative;
};

export async function POST(request: Request) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { testId, answers } = body;
        
        if (!testId || !answers) {
            return NextResponse.json({ error: 'Test ID and answers are required' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const superAdminEmails = new Set(['chouhanchetan066@gmail.com', 'amanchoudhary.1502@gmail.com']);
        let isSuperAdmin = !!authUser.email && superAdminEmails.has(authUser.email.toLowerCase());
        let userRole = '';
        if (!isSuperAdmin) {
            const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
            userRole = String(userDoc.data()?.role || '').toLowerCase();
            isSuperAdmin = userRole === 'superadmin';
        }

        // Verify test is live
        const testDoc = await adminDb.collection('exams').doc(testId).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data();
        if (!isSuperAdmin && !isExamVisibleToUser(testData, authUser.uid, userRole)) {
            return NextResponse.json({ error: 'This test is not published for your account' }, { status: 403 });
        }

        // Compute real-time status from examStartTime/examEndTime
        const now = new Date();
        const examStart = toDateSafe(testData?.examStartTime);
        const examEnd = toDateSafe(testData?.examEndTime);
        const effectiveStatus = examStart && examEnd
            ? (now < examStart ? 'upcoming' : now <= examEnd ? 'live' : 'previous')
            : testData?.status;

        // Block if not started yet
        if (!isSuperAdmin && effectiveStatus === 'upcoming') {
            return NextResponse.json({ error: 'Test has not started yet' }, { status: 400 });
        }
        // Note: Allow submission even after examEndTime because a user who started
        // before the deadline is entitled to their full duration window.

        // Check if already submitted
        const existingSub = await adminDb.collection('examSubmissions')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (!isSuperAdmin && !existingSub.empty) {
            return NextResponse.json({ error: 'Already submitted this test' }, { status: 400 });
        }

        // Auto-grade MCQs
        let score = 0;
        let requiresManualGrading = false;
        const manualReviewRequired: Array<{
            questionId: string;
            type: string;
            answer: string | string[];
            reason: string;
        }> = [];

        const questions = testData?.questions || [];
        for (const q of questions) {
            const userAnswer = answers[q.id];
            const attempted = isAttemptedAnswer(userAnswer);

            // Unattempted questions contribute zero marks by default.
            if (!attempted) continue;

            if (q.type === 'mcq') {
                const normalizedUserAnswer = String(userAnswer).trim();
                const normalizedCorrect = String(q.correctAnswer ?? '').trim();
                if (normalizedCorrect && normalizedUserAnswer === normalizedCorrect) {
                    score += q.points || 0;
                } else {
                    // Negative marking only for attempted and incorrect answers.
                    // Use Math.abs to ensure negativePoints is always positive (guards against -1 being stored)
                    score -= Math.abs(q.negativePoints || 0);
                }
                continue;
            }

            if (q.type === 'checkbox') {
                score += computeCheckboxMarks(userAnswer, q.correctAnswer, Number(q.points || 0), Number(q.negativePoints || 0));
                continue;
            }

            if (q.type === 'short_answer' || q.type === 'long_answer') {
                const keywords = Array.isArray(q.keywords)
                    ? q.keywords.map((v: any) => String(v).trim()).filter(Boolean)
                    : [];
                const matchMode: 'any' | 'all' = q.keywordMatchMode === 'all' ? 'all' : 'any';
                const allowManualReview = q.allowManualReview !== false;

                if (keywords.length > 0) {
                    const isKeywordMatch = evaluateKeywordAnswer(userAnswer, keywords, matchMode);
                    if (isKeywordMatch) {
                        score += q.points || 0;
                    } else if (allowManualReview) {
                        requiresManualGrading = true;
                        manualReviewRequired.push({
                            questionId: q.id,
                            type: q.type,
                            answer: Array.isArray(userAnswer) ? userAnswer : String(userAnswer),
                            reason: `Keyword check failed (${matchMode.toUpperCase()} match)`
                        });
                    } else {
                        // Use Math.abs to ensure negativePoints is always positive (guards against -1 being stored)
                        score -= Math.abs(q.negativePoints || 0);
                    }
                } else if (allowManualReview) {
                    requiresManualGrading = true;
                    manualReviewRequired.push({
                        questionId: q.id,
                        type: q.type,
                        answer: Array.isArray(userAnswer) ? userAnswer : String(userAnswer),
                        reason: 'No keywords configured; requires manual review'
                    });
                } else {
                    // Use Math.abs to ensure negativePoints is always positive (guards against -1 being stored)
                    score -= Math.abs(q.negativePoints || 0);
                }
                continue;
            }
        }

        const finalScore = roundMarks(score);

        // Create submission
        const submissionRef = await adminDb.collection('examSubmissions').add({
            testId,
            userId: authUser.uid,
            answers,
            autoScore: finalScore,
            score: requiresManualGrading ? null : finalScore,
            requiresManualReview: requiresManualGrading,
            manualReviewRequired,
            submittedAt: new Date().toISOString()
        });

        return NextResponse.json({ 
            success: true, 
             message: 'Submitted successfully',
            score: requiresManualGrading ? null : finalScore
        });
    } catch (error: any) {
        console.error('Error submitting test:', error);
        return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
    }
}
