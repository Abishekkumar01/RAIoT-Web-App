import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

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

const formatChoiceAnswer = (value: unknown, options?: string[]): string => {
    if (!options || options.length === 0) {
        if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
        return String(value ?? '');
    }

    const indexes = normalizeIndexAnswer(value);
    if (indexes.length === 0) return '';

    return indexes
        .map((idx) => {
            const optionText = options[Number(idx)];
            return optionText !== undefined ? `${idx}: ${optionText}` : idx;
        })
        .join(' | ');
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const testId = params.id;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const examDoc = await adminDb.collection('exams').doc(testId).get();
        if (!examDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }
        const examData = examDoc.data() || {};
        const examQuestions = Array.isArray(examData.questions) ? examData.questions : [];

        const submissionsSnapshot = await adminDb.collection('examSubmissions')
            .where('testId', '==', testId)
            .get();

        const userIds = new Set<string>();
        submissionsSnapshot.docs.forEach(doc => {
            const sub = doc.data();
            if (sub.userId) userIds.add(sub.userId);
        });

        const userMap = new Map<string, { name: string; email: string; role: string }>();
        await Promise.all(Array.from(userIds).map(async (uid) => {
            try {
                const userDoc = await adminDb.collection('users').doc(uid).get();
                const userData = userDoc.data();
                userMap.set(uid, {
                    name: userData?.displayName || userData?.name || userData?.profileData?.name || 'Unknown User',
                    email: userData?.email || '',
                    role: userData?.role || 'guest'
                });
            } catch {
                userMap.set(uid, { name: 'Unknown User', email: '', role: 'guest' });
            }
        }));

        const submissions = submissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const manualGrades = (data?.manualGrades && typeof data.manualGrades === 'object') ? data.manualGrades : {};
            const userInfo = userMap.get(data.userId) || { name: 'Unknown User', email: '', role: 'guest' };
            const totalQuestions = examQuestions.length;
            const totalMarks = examQuestions.reduce((sum: number, q: any) => sum + Number(q?.points || 0), 0);

            let attemptedCount = 0;
            let correctCount = 0;
            let incorrectCount = 0;

            const questionBreakdown = examQuestions.map((question: any, index: number) => {
                const userAnswer = data?.answers?.[question.id];
                const attempted = isAttemptedAnswer(userAnswer);
                if (attempted) attemptedCount += 1;

                let isCorrect = false;
                if (attempted) {
                    if (question.type === 'mcq') {
                        isCorrect = String(userAnswer ?? '').trim() === String(question.correctAnswer ?? '').trim();
                    } else if (question.type === 'checkbox') {
                        const selectedIndexes = normalizeIndexAnswer(userAnswer);
                        const correctIndexes = normalizeIndexAnswer(question.correctAnswer);
                        isCorrect =
                            selectedIndexes.length > 0 &&
                            selectedIndexes.length === correctIndexes.length &&
                            selectedIndexes.every((value, idx) => value === correctIndexes[idx]);
                    } else if (question.type === 'short_answer' || question.type === 'long_answer') {
                        const keywords = Array.isArray(question.keywords)
                            ? question.keywords.map((v: any) => String(v).trim()).filter(Boolean)
                            : [];
                        const matchMode: 'any' | 'all' = question.keywordMatchMode === 'all' ? 'all' : 'any';
                        isCorrect = keywords.length > 0 && evaluateKeywordAnswer(userAnswer, keywords, matchMode);
                    }

                    // If a question has been manually graded, manual grade always wins.
                    const manualGrade = manualGrades?.[question.id];
                    if (manualGrade && typeof manualGrade.isCorrect === 'boolean') {
                        isCorrect = manualGrade.isCorrect;
                    }
                }

                if (attempted) {
                    if (isCorrect) correctCount += 1;
                    else incorrectCount += 1;
                }

                const correctAnswerText = question.type === 'mcq' || question.type === 'checkbox'
                    ? formatChoiceAnswer(question.correctAnswer, question.options)
                    : String(question.correctAnswer ?? (Array.isArray(question.keywords) ? question.keywords.join(', ') : ''));

                const userAnswerText = question.type === 'mcq' || question.type === 'checkbox'
                    ? formatChoiceAnswer(userAnswer, question.options)
                    : String(userAnswer ?? '');

                return {
                    questionId: question.id,
                    questionNo: index + 1,
                    questionText: question.text || '',
                    questionType: question.type || 'unknown',
                    attempted,
                    isCorrect,
                    status: !attempted ? 'unattempted' : (isCorrect ? 'correct' : 'incorrect'),
                    userAnswer: userAnswerText,
                    correctAnswer: correctAnswerText,
                    points: Number(question.points || 0),
                    negativePoints: Math.abs(Number(question.negativePoints || 0))
                };
            });

            const calculatedObtainedMarks = questionBreakdown.reduce((sum: number, question: any) => {
                if (!question.attempted) return sum;
                if (question.status === 'correct') return sum + Number(question.points || 0);
                return sum - Math.abs(Number(question.negativePoints || 0));
            }, 0);

            return {
                id: doc.id,
                ...data,
                userName: userInfo.name,
                userEmail: userInfo.email,
                userRole: userInfo.role,
                totalQuestions,
                totalMarks,
                attemptedCount,
                unattemptedCount: Math.max(0, totalQuestions - attemptedCount),
                correctCount,
                incorrectCount,
                obtainedMarks: typeof data?.score === 'number' ? data.score : calculatedObtainedMarks,
                questionBreakdown
            };
        }).sort((a: any, b: any) => {
            const aTime = new Date(a.submittedAt || 0).getTime();
            const bTime = new Date(b.submittedAt || 0).getTime();
            return bTime - aTime;
        });

        return NextResponse.json({
            exam: {
                id: examDoc.id,
                title: examData?.title || 'Untitled Test',
                resultPublished: examData?.resultPublished === true
            },
            submissions
        });
    } catch (error: any) {
        console.error('Error fetching exam submissions:', error);
        return NextResponse.json({ error: 'Failed to fetch exam submissions' }, { status: 500 });
    }
}
