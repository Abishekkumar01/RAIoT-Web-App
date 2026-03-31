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

        const deletedSnapshot = await adminDb.collection('deletedExamSubmissions')
            .where('testId', '==', testId)
            .get();

        const deletedRows = deletedSnapshot.docs
            .map((doc) => {
                const data = doc.data() || {};
                const submissionData = data.submissionData || {};
                return {
                    id: doc.id,
                    testId: data.testId,
                    originalSubmissionId: data.originalSubmissionId,
                    deletedAt: data.deletedAt,
                    deletedBy: data.deletedBy,
                    userId: submissionData.userId,
                    submittedAt: submissionData.submittedAt,
                };
            })
            .sort((a: any, b: any) => {
                const aTime = new Date(a.deletedAt || 0).getTime();
                const bTime = new Date(b.deletedAt || 0).getTime();
                return bTime - aTime;
            });

        const uniqueUserIds = Array.from(new Set(deletedRows.map((row: any) => row.userId).filter(Boolean)));
        const userMap = new Map<string, { name: string; email: string; role: string }>();

        await Promise.all(uniqueUserIds.map(async (uid: string) => {
            try {
                const userDoc = await adminDb.collection('users').doc(uid).get();
                const userData = userDoc.data() || {};
                userMap.set(uid, {
                    name: userData.displayName || userData.name || userData.profileData?.name || 'Unknown User',
                    email: userData.email || '',
                    role: userData.role || 'guest',
                });
            } catch {
                userMap.set(uid, { name: 'Unknown User', email: '', role: 'guest' });
            }
        }));

        const deletedSubmissions = deletedRows.map((row: any) => {
            const userInfo = userMap.get(row.userId) || { name: 'Unknown User', email: '', role: 'guest' };
            return {
                ...row,
                userName: userInfo.name,
                userEmail: userInfo.email,
                userRole: userInfo.role,
            };
        });

        return NextResponse.json({ deletedSubmissions });
    } catch (error: any) {
        console.error('Error fetching deleted submissions:', error);
        return NextResponse.json({ error: 'Failed to fetch deleted submissions' }, { status: 500 });
    }
}
