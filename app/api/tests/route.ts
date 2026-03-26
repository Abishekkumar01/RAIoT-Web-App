import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';
import { ExamTest } from '@/types/examination';

function computeStatus(data: any): 'upcoming' | 'live' | 'previous' {
    const now = new Date();
    const examStart = data.examStartTime ? new Date(data.examStartTime) : null;
    const examEnd = data.examEndTime ? new Date(data.examEndTime) : null;
    if (examStart && examEnd) {
        if (now < examStart) return 'upcoming';
        if (now >= examStart && now <= examEnd) return 'live';
        return 'previous';
    }
    // Fallback: use stored status field
    return data.status || 'upcoming';
}

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
        const publishedResultTestIds = new Set<string>();
        snapshot.forEach(doc => {
            const data = doc.data();
            // Remove questions so users cannot see them until test starts
            delete data.questions;
            // Compute real-time status from examStartTime / examEndTime
            const effectiveStatus = computeStatus(data);
            if (data.resultPublished === true) {
                publishedResultTestIds.add(doc.id);
            }
            exams.push({ id: doc.id, ...data, status: effectiveStatus } as Partial<ExamTest>);
        });

        // Fetch user registrations
        const regSnapshot = await adminDb.collection('examRegistrations').where('userId', '==', authUser.uid).get();
        const registrations = regSnapshot.docs.map(doc => doc.data());

        // Fetch user submissions (to know if they completed previous tests)
        const subSnapshot = await adminDb.collection('examSubmissions').where('userId', '==', authUser.uid).get();
        const submissions = subSnapshot.docs.map(doc => {
            const sub = doc.data();
            const isPublished = publishedResultTestIds.has(sub.testId);
            return {
                ...sub,
                // Keep submission state, but hide score until superadmin publishes result.
                score: isPublished ? sub.score : null,
                resultPublished: isPublished
            };
        });

        return NextResponse.json({ exams, registrations, submissions });
    } catch (error: any) {
        console.error('Error fetching tests:', error);
        return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
    }
}
