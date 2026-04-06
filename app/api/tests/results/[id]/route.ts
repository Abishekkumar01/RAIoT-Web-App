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

const getRankedScore = (submission: any): number => {
    const hasManualGrades = !!submission?.manualGrades && Object.keys(submission.manualGrades).length > 0;
    const hasFinalReview = !!submission?.manualReviewedAt || submission?.requiresManualReview === false || hasManualGrades;
    if (hasFinalReview) {
        return roundMarks(Number(submission?.finalScore ?? submission?.score ?? 0));
    }
    if (typeof submission?.score === 'number') {
        return roundMarks(submission.score);
    }
    return 0;
};

const isLeaderboardEligibleRole = (role: unknown): boolean => {
    const normalized = String(role || '').toLowerCase();
    const isMember = ['member', 'junior_developer', 'senior_developer'].includes(normalized);
    const isTrainee = normalized === 'trainee';
    return isMember || isTrainee;
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
        const examQuestions = Array.isArray(examData?.questions) ? examData.questions : [];
        const totalMarks = examQuestions.reduce((sum: number, question: any) => sum + Number(question?.points || 0), 0);
        if (!examData?.resultPublished) {
            return NextResponse.json({ error: 'Results are not published yet.' }, { status: 403 });
        }

        const subSnapshot = await adminDb.collection('examSubmissions')
            .where('testId', '==', testId)
            .get();

        if (subSnapshot.empty) {
            return NextResponse.json({ error: 'No submission found for this test.' }, { status: 404 });
        }

        const userIds = new Set<string>();
        subSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data?.userId) {
                userIds.add(String(data.userId));
            }
        });

        const userMap = new Map<string, { name: string; email: string; role: string }>();
        await Promise.all(Array.from(userIds).map(async (uid) => {
            try {
                const userDoc = await adminDb.collection('users').doc(uid).get();
                const userData = userDoc.data();
                userMap.set(uid, {
                    name: userData?.displayName || userData?.name || userData?.profileData?.name || '',
                    email: userData?.email || '',
                    role: userData?.role || 'guest'
                });
            } catch {
                userMap.set(uid, { name: '', email: '', role: 'guest' });
            }
        }));

        const submissions = subSnapshot.docs.map((doc) => {
            const data = doc.data();
            const userInfo = userMap.get(data.userId) || { name: '', email: '', role: 'guest' };
            const storedScore = typeof data?.score === 'number' ? roundMarks(data.score) : null;
            const finalScore = storedScore !== null ? storedScore : computeFinalScore(examQuestions, data);
            const hasManualGrades = !!data?.manualGrades && Object.keys(data.manualGrades).length > 0;
            const hasFinalManualReview = !!data?.manualReviewedAt || data?.requiresManualReview === false || hasManualGrades;
            const displayName = userInfo.name || data?.userName || data?.displayName || data?.name || 'Unknown User';
            const displayEmail = userInfo.email || data?.userEmail || data?.email || '';

            return {
                id: doc.id,
                ...data,
                userName: displayName,
                userEmail: displayEmail,
                userRole: userInfo.role,
                finalScore: finalScore !== null ? finalScore : null,
                score: finalScore !== null ? finalScore : (typeof data?.score === 'number' ? roundMarks(data.score) : null),
                totalMarks,
                resultState: hasFinalManualReview ? 'final' : 'provisional',
                resultPublished: true
            };
        }) as any[];

        const leaderboard = submissions
            .slice()
            .filter((submission: any) => isLeaderboardEligibleRole(submission?.userRole))
            .sort((a: any, b: any) => {
                const scoreDiff = getRankedScore(b) - getRankedScore(a);
                if (scoreDiff !== 0) return scoreDiff;

                const aTime = new Date(a.submittedAt || 0).getTime();
                const bTime = new Date(b.submittedAt || 0).getTime();
                return aTime - bTime;
            })
            .map((submission: any, index: number) => ({
                ...submission,
                rank: index + 1,
                percentage: totalMarks > 0 ? roundMarks((getRankedScore(submission) / totalMarks) * 100) : 0
            }));
        const userSubmissions = submissions.filter((submission: any) => String(submission.userId) === authUser.uid);

        userSubmissions.sort((a, b) => {
            const aHasManualGrades = !!a?.manualGrades && Object.keys(a.manualGrades).length > 0;
            const bHasManualGrades = !!b?.manualGrades && Object.keys(b.manualGrades).length > 0;
            const aFinal = typeof a?.score === 'number' || aHasManualGrades || a?.manualReviewedAt || a?.requiresManualReview === false ? 1 : 0;
            const bFinal = typeof b?.score === 'number' || bHasManualGrades || b?.manualReviewedAt || b?.requiresManualReview === false ? 1 : 0;
            if (aFinal !== bFinal) return bFinal - aFinal;

            const aUpdated = new Date(a?.updatedAt || a?.submittedAt || 0).getTime();
            const bUpdated = new Date(b?.updatedAt || b?.submittedAt || 0).getTime();
            return bUpdated - aUpdated;
        });

        const submission = userSubmissions[0] || submissions.find((row: any) => String(row.userId) === authUser.uid) || submissions[0];
        const finalScore = computeFinalScore(examQuestions, submission);
        const hasFinalManualReview = !!submission?.manualReviewedAt || submission?.requiresManualReview === false || (!!submission?.manualGrades && Object.keys(submission.manualGrades).length > 0);
        const currentUserRank = leaderboard.find((row) => row.userId === authUser.uid)?.rank ?? null;
        return NextResponse.json({
            submission: {
                ...submission,
                score: finalScore !== null ? finalScore : submission?.score ?? null,
                finalScore: finalScore !== null ? finalScore : submission?.score ?? null,
                totalMarks,
                resultState: hasFinalManualReview ? 'final' : 'provisional',
                resultPublished: true,
                rank: currentUserRank
            },
            leaderboard: leaderboard.map(({ rank, percentage, userName, userEmail, userRole, finalScore, score, totalMarks, submittedAt, userId }) => ({
                rank,
                percentage,
                userName,
                userEmail,
                userRole,
                finalScore,
                score,
                totalMarks,
                submittedAt,
                userId
            })),
            currentUserRank
        });
    } catch (error: any) {
        console.error('Error fetching test result:', error);
        return NextResponse.json({ error: 'Failed to fetch test result' }, { status: 500 });
    }
}
