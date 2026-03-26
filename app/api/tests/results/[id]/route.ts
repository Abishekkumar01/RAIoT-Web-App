import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

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
            .limit(1)
            .get();

        if (subSnapshot.empty) {
            return NextResponse.json({ error: 'No submission found for this test.' }, { status: 404 });
        }

        const submission = subSnapshot.docs[0].data();
        return NextResponse.json({
            submission: {
                ...submission,
                resultPublished: true
            }
        });
    } catch (error: any) {
        console.error('Error fetching test result:', error);
        return NextResponse.json({ error: 'Failed to fetch test result' }, { status: 500 });
    }
}
