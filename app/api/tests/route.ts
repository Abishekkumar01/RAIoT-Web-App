import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';
import { ExamTest } from '@/types/examination';

export async function GET(request: Request) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        // Fetch all exams
        const snapshot = await adminDb.collection('exams').orderBy('createdAt', 'desc').get();
        const exams: Partial<ExamTest>[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Important: Remove questions so users cannot see them until test starts
            delete data.questions; 
            exams.push({ id: doc.id, ...data } as Partial<ExamTest>);
        });

        // Fetch user registrations
        const regSnapshot = await adminDb.collection('examRegistrations').where('userId', '==', authUser.uid).get();
        const registrations = regSnapshot.docs.map(doc => doc.data());

        // Fetch user submissions (to know if they completed previous tests)
        const subSnapshot = await adminDb.collection('examSubmissions').where('userId', '==', authUser.uid).get();
        const submissions = subSnapshot.docs.map(doc => doc.data());

        return NextResponse.json({ exams, registrations, submissions });
    } catch (error: any) {
        console.error('Error fetching tests:', error);
        return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
    }
}
