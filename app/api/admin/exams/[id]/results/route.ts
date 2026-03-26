import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

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
            const userInfo = userMap.get(data.userId) || { name: 'Unknown User', email: '', role: 'guest' };
            return {
                id: doc.id,
                ...data,
                userName: userInfo.name,
                userEmail: userInfo.email,
                userRole: userInfo.role
            };
        }).sort((a: any, b: any) => {
            const aTime = new Date(a.submittedAt || 0).getTime();
            const bTime = new Date(b.submittedAt || 0).getTime();
            return bTime - aTime;
        });

        return NextResponse.json({
            exam: {
                id: examDoc.id,
                title: examDoc.data()?.title || 'Untitled Test',
                resultPublished: examDoc.data()?.resultPublished === true
            },
            submissions
        });
    } catch (error: any) {
        console.error('Error fetching exam submissions:', error);
        return NextResponse.json({ error: 'Failed to fetch exam submissions' }, { status: 500 });
    }
}
