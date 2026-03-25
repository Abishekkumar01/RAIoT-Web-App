import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

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
        if (testData?.status !== 'live') {
            return NextResponse.json({ error: 'Test is not currently live' }, { status: 400 });
        }

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
            if (!userAnswer) continue;

            if (q.type === 'mcq') {
                if (q.correctAnswer && userAnswer === q.correctAnswer) {
                    score += q.points || 0;
                } else if (q.correctAnswer && userAnswer !== q.correctAnswer) {
                    score -= q.negativePoints || 0;
                }
            } else {
                requiresManualGrading = true;
            }
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
