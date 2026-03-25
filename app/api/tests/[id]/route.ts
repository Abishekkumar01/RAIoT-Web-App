import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';
import { ExamTest } from '@/types/examination';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const testId = params.id;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const testDoc = await adminDb.collection('exams').doc(testId).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data() as ExamTest;

        // Check if user is registered
        const regSnapshot = await adminDb.collection('examRegistrations')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (regSnapshot.empty && testData.status !== 'previous') {
             return NextResponse.json({ error: 'You are not registered for this test' }, { status: 403 });
        }

        // If the test is live (or they are reviewing a previous test), return the questions
        if (testData.status === 'upcoming') {
            return NextResponse.json({ error: 'Test is not live yet' }, { status: 403 });
        }

        // Remove correct answers when returning to the user
        const safeQuestions = (testData.questions || []).map(q => {
            const { correctAnswer, ...safeQuestion } = q;
            return safeQuestion;
        });

        return NextResponse.json({ 
            test: {
                ...testData,
                id: testId,
                questions: safeQuestions
            } 
        });
    } catch (error: any) {
        console.error('Error fetching specific test details:', error);
        return NextResponse.json({ error: 'Failed to fetch test details' }, { status: 500 });
    }
}
