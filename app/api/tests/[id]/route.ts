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

        // Check if already submitted
        const subSnapshot = await adminDb.collection('examSubmissions')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (!subSnapshot.empty) {
            return NextResponse.json({ error: 'You have already submitted this test.' }, { status: 403 });
        }

        const now = new Date();
        const examStart = testData.examStartTime ? new Date(testData.examStartTime) : null;
        const examEnd = testData.examEndTime ? new Date(testData.examEndTime) : null;

        // For backward-compat with old tests that don't have examStartTime
        const effectiveStatus = examStart && examEnd
            ? (now < examStart ? 'upcoming' : now <= examEnd ? 'live' : 'previous')
            : testData.status;

        if (regSnapshot.empty && effectiveStatus !== 'previous') {
             return NextResponse.json({ error: 'You are not registered for this test' }, { status: 403 });
        }

        if (effectiveStatus === 'upcoming') {
            return NextResponse.json({ error: 'The test has not started yet.' }, { status: 403 });
        }

        // If they are trying to START the test after the deadline, block them
        if (effectiveStatus === 'live' && examEnd && now > examEnd) {
            return NextResponse.json({ error: 'The deadline to start this test has passed.' }, { status: 403 });
        }

        // Remove correct answers when returning to the user
        const safeQuestions = (testData.questions || []).map(q => {
            const { correctAnswer, keywords, keywordMatchMode, allowManualReview, ...safeQuestion } = q;
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
