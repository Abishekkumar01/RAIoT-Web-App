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
        return Number.isNaN(parsed.getTime()) ? null : parsed;
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
        return value.map((item) => String(item).trim()).filter(Boolean).sort();
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

const evaluateKeywordAnswer = (
    answerValue: unknown,
    keywords: string[],
    matchMode: 'any' | 'all'
): boolean => {
    const answer = String(answerValue ?? '').toLowerCase();
    const expected = keywords.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    if (expected.length === 0) return false;
    return matchMode === 'all'
        ? expected.every((kw) => answer.includes(kw))
        : expected.some((kw) => answer.includes(kw));
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
        if (correctSet.has(idx)) selectedCorrectCount += 1;
        else selectedWrongCount += 1;
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
        const { testId, answers } = body || {};

        if (!testId || typeof answers !== 'object' || answers === null) {
            return NextResponse.json({ error: 'Test ID and answers are required' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
        const userRole = String(userDoc.data()?.role || '').toLowerCase();

        const testDoc = await adminDb.collection('exams').doc(String(testId)).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data() || {};
        if (!isExamVisibleToUser(testData, authUser.uid, userRole)) {
            return NextResponse.json({ error: 'This test is not published for your account' }, { status: 403 });
        }

        const now = new Date();
        const examStart = toDateSafe(testData?.examStartTime);
        const examEnd = toDateSafe(testData?.examEndTime);
        const effectiveStatus = examStart && examEnd
            ? (now < examStart ? 'upcoming' : now <= examEnd ? 'live' : 'previous')
            : testData?.status;

        if (effectiveStatus !== 'live') {
            return NextResponse.json({ error: 'Live progress is only available while the exam is live' }, { status: 400 });
        }

        const questions = Array.isArray(testData?.questions) ? testData.questions : [];
        let liveScore = 0;
        let attemptedCount = 0;

        for (const q of questions) {
            const questionId = String(q?.id || '');
            if (!questionId) continue;

            const userAnswer = answers[questionId];
            const attempted = isAttemptedAnswer(userAnswer);
            if (!attempted) continue;

            attemptedCount += 1;

            if (q.type === 'mcq') {
                const normalizedUserAnswer = String(userAnswer).trim();
                const normalizedCorrect = String(q.correctAnswer ?? '').trim();
                if (normalizedCorrect && normalizedUserAnswer === normalizedCorrect) {
                    liveScore += Number(q.points || 0);
                } else {
                    liveScore -= Math.abs(Number(q.negativePoints || 0));
                }
                continue;
            }

            if (q.type === 'checkbox') {
                liveScore += computeCheckboxMarks(userAnswer, q.correctAnswer, Number(q.points || 0), Number(q.negativePoints || 0));
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
                        liveScore += Number(q.points || 0);
                    } else if (!allowManualReview) {
                        liveScore -= Math.abs(Number(q.negativePoints || 0));
                    }
                } else if (!allowManualReview) {
                    liveScore -= Math.abs(Number(q.negativePoints || 0));
                }
            }
        }

        const docId = `${String(testId)}_${authUser.uid}`;
        const updatedAt = new Date().toISOString();
        await adminDb.collection('examLiveProgress').doc(docId).set({
            testId: String(testId),
            userId: authUser.uid,
            answers,
            attemptedCount,
            liveScore: roundMarks(liveScore),
            updatedAt,
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating live test progress:', error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }
}
