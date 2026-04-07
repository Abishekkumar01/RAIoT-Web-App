import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

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
    if (matchMode === 'all') return expected.every((kw) => answer.includes(kw));
    return expected.some((kw) => answer.includes(kw));
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

const computeFinalScoreFromManualGrades = (
    questions: any[],
    answers: Record<string, any>,
    manualGrades: Record<string, any>
): number => {
    let total = 0;

    for (const question of questions || []) {
        const questionId = String(question?.id || '');
        if (!questionId) continue;

        const override = manualGrades?.[questionId];
        if (override && Number.isFinite(Number(override.marks))) {
            total += Number(override.marks);
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

export async function PUT(
    request: Request,
    { params }: { params: { id: string; submissionId: string } }
) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const { id: testId, submissionId } = params;
        const body = await request.json();
        const { score, manualGrades } = body;

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const submissionRef = adminDb.collection('examSubmissions').doc(submissionId);
        const submissionDoc = await submissionRef.get();
        if (!submissionDoc.exists) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const submissionData = submissionDoc.data();
        if (submissionData?.testId !== testId) {
            return NextResponse.json({ error: 'Submission does not belong to this test' }, { status: 400 });
        }

        const examDoc = await adminDb.collection('exams').doc(testId).get();
        const examData = examDoc.exists ? examDoc.data() : null;
        const examQuestions = Array.isArray(examData?.questions) ? examData?.questions : [];

        const updateData: any = {
            updatedAt: new Date().toISOString(),
        };

        // Handle manual score update (for overall submission score)
        if (score !== undefined && score !== null) {
            const manualScore = Number(score);
            if (!Number.isFinite(manualScore)) {
                return NextResponse.json({ error: 'Valid numeric score is required' }, { status: 400 });
            }
            updateData.score = manualScore;
            updateData.requiresManualReview = false;
            updateData.manualReviewedBy = authUser.uid;
            updateData.manualReviewedAt = new Date().toISOString();
        }

        let nextManualGrades: Record<string, any> = { ...(submissionData?.manualGrades || {}) };

        // Handle manual grade update for specific questions
        if (manualGrades && typeof manualGrades === 'object') {
            const sanitizedManualGrades = Object.entries(manualGrades).reduce((acc: Record<string, any>, [questionId, grade]: [string, any]) => {
                if (!grade || typeof grade !== 'object') return acc;

                const nextGrade: Record<string, any> = { ...grade };
                if (nextGrade.status && !['correct', 'incorrect', 'unattempted'].includes(String(nextGrade.status))) {
                    delete nextGrade.status;
                }
                if (nextGrade.marks !== undefined) {
                    const numericMarks = Number(nextGrade.marks);
                    if (!Number.isFinite(numericMarks)) {
                        return acc;
                    }
                    nextGrade.marks = numericMarks;
                    // Manual marks are authoritative for status.
                    nextGrade.status = numericMarks > 0 ? 'correct' : (numericMarks < 0 ? 'incorrect' : 'unattempted');
                    delete nextGrade.isCorrect;
                }

                acc[questionId] = nextGrade;
                return acc;
            }, {});

            if (Object.keys(sanitizedManualGrades).length > 0) {
                nextManualGrades = {
                    ...nextManualGrades,
                    ...sanitizedManualGrades
                };
                updateData.manualGrades = nextManualGrades;
            }
        }

        // Recompute final score from current answers + merged manual grades when manualGrades are provided.
        if (manualGrades && typeof manualGrades === 'object') {
            const computedScore = computeFinalScoreFromManualGrades(
                examQuestions,
                (submissionData?.answers || {}) as Record<string, any>,
                nextManualGrades
            );

            updateData.score = computedScore;

            const requiredQuestionIds = Array.isArray(submissionData?.manualReviewRequired)
                ? submissionData.manualReviewRequired.map((item: any) => String(item?.questionId || '')).filter(Boolean)
                : [];

            const allRequiredGraded = requiredQuestionIds.length > 0
                ? requiredQuestionIds.every((questionId) => {
                    const grade = nextManualGrades?.[questionId];
                    return !!grade && (
                        Number.isFinite(Number(grade.marks)) ||
                        ['correct', 'incorrect', 'unattempted'].includes(String(grade.status || ''))
                    );
                })
                : true;

            updateData.requiresManualReview = !allRequiredGraded;
            if (allRequiredGraded) {
                updateData.manualReviewedBy = authUser.uid;
                updateData.manualReviewedAt = new Date().toISOString();
            }
        }

        if (Object.keys(updateData).length === 1) {
            // Only updatedAt is present
            return NextResponse.json(
                { error: 'No valid update fields provided' },
                { status: 400 }
            );
        }

        // Update the submission
        await submissionRef.update(updateData);

        return NextResponse.json({
            success: true,
            message: 'Submission updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating submission:', error);
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string; submissionId: string } }
) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const { id: testId, submissionId } = params;
        const url = new URL(request.url);
        const hardDelete = ['1', 'true', 'yes'].includes((url.searchParams.get('hardDelete') || '').toLowerCase());
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const submissionRef = adminDb.collection('examSubmissions').doc(submissionId);
        const submissionDoc = await submissionRef.get();
        if (!submissionDoc.exists) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const submissionData = submissionDoc.data();
        if (submissionData?.testId !== testId) {
            return NextResponse.json({ error: 'Submission does not belong to this test' }, { status: 400 });
        }

        if (hardDelete) {
            const archivedCopies = await adminDb
                .collection('deletedExamSubmissions')
                .where('testId', '==', testId)
                .where('originalSubmissionId', '==', submissionId)
                .get();

            const batch = adminDb.batch();
            archivedCopies.docs.forEach((doc) => batch.delete(doc.ref));
            batch.delete(submissionRef);
            await batch.commit();

            return NextResponse.json({ success: true, message: 'Submission permanently deleted' });
        }

        await adminDb.collection('deletedExamSubmissions').add({
            testId,
            originalSubmissionId: submissionId,
            deletedAt: new Date().toISOString(),
            deletedBy: authUser.uid,
            submissionData,
        });

        await submissionRef.delete();
        return NextResponse.json({ success: true, message: 'Submission deleted successfully (moved to recycle bin)' });
    } catch (error: any) {
        console.error('Error deleting submission:', error);
        return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
    }
}
