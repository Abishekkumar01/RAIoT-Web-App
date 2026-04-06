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
                    name: userData?.displayName || userData?.name || userData?.profileData?.name || '',
                    email: userData?.email || '',
                    role: userData?.role || 'guest'
                });
            } catch {
                userMap.set(uid, { name: '', email: '', role: 'guest' });
            }
        }));

        const submissions = submissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const manualGrades = (data?.manualGrades && typeof data.manualGrades === 'object') ? data.manualGrades : {};
            const userInfo = userMap.get(data.userId) || { name: '', email: '', role: 'guest' };
            const totalQuestions = examQuestions.length;
            const totalMarks = examQuestions.reduce((sum: number, q: any) => sum + Number(q?.points || 0), 0);
            const displayName = userInfo.name || data?.userName || data?.displayName || data?.name || 'Unknown User';
            const displayEmail = userInfo.email || data?.userEmail || data?.email || '';

            let attemptedCount = 0;
            let correctCount = 0;
            let incorrectCount = 0;

            const questionBreakdown = examQuestions.map((question: any, index: number) => {
                const userAnswer = data?.answers?.[question.id];
                const manualGrade = manualGrades?.[question.id];

                let attempted = isAttemptedAnswer(userAnswer);
                let isCorrect = false;
                let status: 'correct' | 'incorrect' | 'unattempted' = 'unattempted';
                let obtainedMarks = 0;

                // Apply auto-evaluation first.
                if (attempted) {
                    if (question.type === 'mcq') {
                        isCorrect = String(userAnswer ?? '').trim() === String(question.correctAnswer ?? '').trim();
                        obtainedMarks = isCorrect
                            ? Number(question.points || 0)
                            : -Math.abs(Number(question.negativePoints || 0));
                    } else if (question.type === 'checkbox') {
                        const selectedIndexes = normalizeIndexAnswer(userAnswer);
                        const correctIndexes = normalizeIndexAnswer(question.correctAnswer);
                        isCorrect =
                            selectedIndexes.length > 0 &&
                            selectedIndexes.length === correctIndexes.length &&
                            selectedIndexes.every((value, idx) => value === correctIndexes[idx]);
                        obtainedMarks = computeCheckboxMarks(
                            userAnswer,
                            question.correctAnswer,
                            Number(question.points || 0),
                            Number(question.negativePoints || 0)
                        );
                    } else if (question.type === 'short_answer' || question.type === 'long_answer') {
                        const keywords = Array.isArray(question.keywords)
                            ? question.keywords.map((v: any) => String(v).trim()).filter(Boolean)
                            : [];
                        const matchMode: 'any' | 'all' = question.keywordMatchMode === 'all' ? 'all' : 'any';
                        isCorrect = keywords.length > 0 && evaluateKeywordAnswer(userAnswer, keywords, matchMode);
                        obtainedMarks = isCorrect
                            ? Number(question.points || 0)
                            : -Math.abs(Number(question.negativePoints || 0));
                    }
                }

                status = !attempted ? 'unattempted' : (isCorrect ? 'correct' : 'incorrect');

                // Manual override supports three states: correct | incorrect | unattempted.
                if (manualGrade) {
                    const hasNumericManualMarks = Number.isFinite(Number(manualGrade.marks));
                    if (manualGrade.status === 'correct' || manualGrade.status === 'incorrect' || manualGrade.status === 'unattempted') {
                        status = manualGrade.status;
                    } else if (typeof manualGrade.isCorrect === 'boolean') {
                        // Backward compatibility with older manualGrades format.
                        status = manualGrade.isCorrect ? 'correct' : 'incorrect';
                    } else if (hasNumericManualMarks) {
                        // If only manual marks are provided, infer status from marks.
                        const numericMarks = Number(manualGrade.marks);
                        status = numericMarks > 0 ? 'correct' : (numericMarks < 0 ? 'incorrect' : 'unattempted');
                    }

                    if (hasNumericManualMarks) {
                        obtainedMarks = Number(manualGrade.marks);
                    }

                    if (status === 'unattempted') {
                        attempted = false;
                        isCorrect = false;
                        if (!hasNumericManualMarks) {
                            obtainedMarks = 0;
                        }
                    } else {
                        attempted = true;
                        isCorrect = status === 'correct';
                        if (!hasNumericManualMarks) {
                            obtainedMarks = status === 'correct'
                                ? Number(question.points || 0)
                                : -Math.abs(Number(question.negativePoints || 0));
                        }
                    }
                }

                if (attempted) attemptedCount += 1;
                if (status === 'correct') correctCount += 1;
                if (status === 'incorrect') incorrectCount += 1;

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
                    status,
                    userAnswer: userAnswerText,
                    correctAnswer: correctAnswerText,
                    points: Number(question.points || 0),
                    negativePoints: Math.abs(Number(question.negativePoints || 0)),
                    obtainedMarks: roundMarks(obtainedMarks)
                };
            });

            const storedScore = typeof data?.score === 'number' ? roundMarks(data.score) : null;
            const hasManualGradesForSubmission = !!data?.manualGrades && Object.keys(data.manualGrades).length > 0;
            const computedScore = computeFinalScore(examQuestions, data);
            const resolvedScore = hasManualGradesForSubmission
                ? computedScore
                : (storedScore !== null ? storedScore : computedScore);

            return {
                id: doc.id,
                ...data,
                userName: displayName,
                userEmail: displayEmail,
                userRole: userInfo.role,
                totalQuestions,
                totalMarks,
                attemptedCount,
                unattemptedCount: Math.max(0, totalQuestions - attemptedCount),
                correctCount,
                incorrectCount,
                score: resolvedScore,
                finalScore: resolvedScore,
                obtainedMarks: resolvedScore,
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
