import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

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

        // Verify test is live
        const testDoc = await adminDb.collection('exams').doc(testId).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data();

        // Compute real-time status from examStartTime/examEndTime
        const now = new Date();
        const examStart = testData?.examStartTime ? new Date(testData.examStartTime) : null;
        const examEnd = testData?.examEndTime ? new Date(testData.examEndTime) : null;
        const effectiveStatus = examStart && examEnd
            ? (now < examStart ? 'upcoming' : now <= examEnd ? 'live' : 'previous')
            : testData?.status;

        // Block if not started yet
        if (effectiveStatus === 'upcoming') {
            return NextResponse.json({ error: 'Test has not started yet' }, { status: 400 });
        }
        // Note: Allow submission even after examEndTime because a user who started
        // before the deadline is entitled to their full duration window.

        // Check if already submitted
        const existingSub = await adminDb.collection('examSubmissions')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (!existingSub.empty) {
            return NextResponse.json({ error: 'Already submitted this test' }, { status: 400 });
        }

        // Auto-grade MCQs
        let score = 0;
        let requiresManualGrading = false;

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
                    score -= q.negativePoints || 0;
                }
                continue;
            }

            if (q.type === 'checkbox') {
                const selectedIndexes = normalizeIndexAnswer(userAnswer);
                const correctIndexes = normalizeIndexAnswer(q.correctAnswer);
                const isExactMatch =
                    selectedIndexes.length > 0 &&
                    selectedIndexes.length === correctIndexes.length &&
                    selectedIndexes.every((value, idx) => value === correctIndexes[idx]);

                if (isExactMatch) {
                    score += q.points || 0;
                } else {
                    // Award marks only on exact option set match; otherwise apply negative marks.
                    score -= q.negativePoints || 0;
                }
                continue;
            }

            requiresManualGrading = true;
        }

        // Create submission
        const submissionRef = await adminDb.collection('examSubmissions').add({
            testId,
            userId: authUser.uid,
            answers,
            score: requiresManualGrading ? null : score,
            submittedAt: new Date().toISOString()
        });

        return NextResponse.json({ 
            success: true, 
             message: 'Submitted successfully',
            score: requiresManualGrading ? null : score
        });
    } catch (error: any) {
        console.error('Error submitting test:', error);
        return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
    }
}
