import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

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

const evaluateKeywordAnswer = (
    answerValue: unknown,
    keywords: string[],
    matchMode: 'any' | 'all'
): boolean => {
    const answer = String(answerValue ?? '').toLowerCase();
    const expected = keywords.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
    if (expected.length === 0) return false;
    return matchMode === 'all'
        ? expected.every((kw) => answer.includes(kw))
        : expected.some((kw) => answer.includes(kw));
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

const roundMarks = (value: number): number => {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const computeFinalScore = (examQuestions: any[], submission: any): number | null => {
    const answers = submission?.answers || {};
    const manualGrades = submission?.manualGrades || {};
    const hasManualGrades = manualGrades && Object.keys(manualGrades).length > 0;

    if (!hasManualGrades && typeof submission?.score === 'number') {
        return roundMarks(submission.score);
    }

    let total = 0;

    for (const question of examQuestions || []) {
        const questionId = String(question?.id || '');
        if (!questionId) continue;

        const manualGrade = manualGrades?.[questionId];
        if (manualGrade && Number.isFinite(Number(manualGrade.marks))) {
            total += Number(manualGrade.marks);
            continue;
        }

        if (manualGrade && ['correct', 'incorrect', 'unattempted'].includes(String(manualGrade.status || ''))) {
            const overrideStatus = String(manualGrade.status);
            total += overrideStatus === 'correct'
                ? Number(question.points || 0)
                : overrideStatus === 'incorrect'
                    ? -Math.abs(Number(question.negativePoints || 0))
                    : 0;
            continue;
        }

        const userAnswer = answers?.[questionId];
        const hasAnswer = Array.isArray(userAnswer)
            ? userAnswer.length > 0
            : typeof userAnswer === 'string'
                ? userAnswer.trim().length > 0
                : userAnswer !== undefined && userAnswer !== null;

        if (!hasAnswer) continue;

        if (question.type === 'mcq') {
            const isCorrect = String(userAnswer ?? '').trim() === String(question.correctAnswer ?? '').trim();
            total += isCorrect ? Number(question.points || 0) : -Math.abs(Number(question.negativePoints || 0));
            continue;
        }

        if (question.type === 'checkbox') {
            total += computeCheckboxMarks(userAnswer, question.correctAnswer, Number(question.points || 0), Number(question.negativePoints || 0));
            continue;
        }

        if (question.type === 'short_answer' || question.type === 'long_answer') {
            const keywords = Array.isArray(question.keywords)
                ? question.keywords.map((v: any) => String(v).trim()).filter(Boolean)
                : [];
            const matchMode: 'any' | 'all' = question.keywordMatchMode === 'all' ? 'all' : 'any';
            const allowManualReview = question.allowManualReview !== false;

            if (keywords.length > 0) {
                const isKeywordMatch = evaluateKeywordAnswer(userAnswer, keywords, matchMode);
                if (isKeywordMatch) {
                    total += Number(question.points || 0);
                } else if (!allowManualReview) {
                    total -= Math.abs(Number(question.negativePoints || 0));
                }
            } else if (!allowManualReview) {
                total -= Math.abs(Number(question.negativePoints || 0));
            }
        }
    }

    return roundMarks(total);
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const testId = params.id;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const examDoc = await adminDb.collection('exams').doc(testId).get();
        if (!examDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const examData = examDoc.data();
        if (!examData?.resultPublished) {
            return NextResponse.json({ error: 'Results are not published yet.' }, { status: 403 });
        }

        const subSnapshot = await adminDb.collection('examSubmissions')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (subSnapshot.empty) {
            return NextResponse.json({ error: 'No submission found for this test.' }, { status: 404 });
        }

        const submissions = subSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
        submissions.sort((a, b) => {
            const aHasManualGrades = !!a?.manualGrades && Object.keys(a.manualGrades).length > 0;
            const bHasManualGrades = !!b?.manualGrades && Object.keys(b.manualGrades).length > 0;
            const aFinal = typeof a?.score === 'number' || aHasManualGrades || a?.manualReviewedAt || a?.requiresManualReview === false ? 1 : 0;
            const bFinal = typeof b?.score === 'number' || bHasManualGrades || b?.manualReviewedAt || b?.requiresManualReview === false ? 1 : 0;
            if (aFinal !== bFinal) return bFinal - aFinal;

            const aUpdated = new Date(a?.updatedAt || a?.submittedAt || 0).getTime();
            const bUpdated = new Date(b?.updatedAt || b?.submittedAt || 0).getTime();
            return bUpdated - aUpdated;
        });

        const submission = submissions[0];
        const examQuestions = Array.isArray(examData?.questions) ? examData.questions : [];
        const finalScore = computeFinalScore(examQuestions, submission);
        const hasFinalManualReview = !!submission?.manualReviewedAt || submission?.requiresManualReview === false || (!!submission?.manualGrades && Object.keys(submission.manualGrades).length > 0);
        return NextResponse.json({
            submission: {
                ...submission,
                score: finalScore !== null ? finalScore : submission?.score ?? null,
                finalScore: finalScore !== null ? finalScore : submission?.score ?? null,
                resultState: hasFinalManualReview ? 'final' : 'provisional',
                resultPublished: true
            }
        });
    } catch (error: any) {
        console.error('Error fetching test result:', error);
        return NextResponse.json({ error: 'Failed to fetch test result' }, { status: 500 });
    }
}
