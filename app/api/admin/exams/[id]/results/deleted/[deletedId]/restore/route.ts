import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

export async function POST(
    request: Request,
    { params }: { params: { id: string; deletedId: string } }
) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const { id: testId, deletedId } = params;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const deletedRef = adminDb.collection('deletedExamSubmissions').doc(deletedId);
        const deletedDoc = await deletedRef.get();
        if (!deletedDoc.exists) {
            return NextResponse.json({ error: 'Deleted submission not found' }, { status: 404 });
        }

        const deletedData = deletedDoc.data() || {};
        if (deletedData.testId !== testId) {
            return NextResponse.json({ error: 'Deleted submission does not belong to this test' }, { status: 400 });
        }

        const submissionData = deletedData.submissionData;
        if (!submissionData || typeof submissionData !== 'object') {
            return NextResponse.json({ error: 'Invalid deleted submission payload' }, { status: 400 });
        }

        const existing = await adminDb.collection('examSubmissions')
            .where('testId', '==', testId)
            .where('userId', '==', submissionData.userId)
            .get();
        if (!existing.empty) {
            return NextResponse.json({ error: 'An active submission already exists for this user in this test' }, { status: 409 });
        }

        const originalSubmissionId = String(deletedData.originalSubmissionId || '').trim();
        const restorePayload = {
            ...submissionData,
            restoredAt: new Date().toISOString(),
            restoredBy: authUser.uid,
            restoredFromDeletedId: deletedId,
        };

        if (originalSubmissionId) {
            await adminDb.collection('examSubmissions').doc(originalSubmissionId).set(restorePayload);
        } else {
            await adminDb.collection('examSubmissions').add(restorePayload);
        }

        await deletedRef.delete();

        return NextResponse.json({ success: true, message: 'Submission restored successfully' });
    } catch (error: any) {
        console.error('Error restoring deleted submission:', error);
        return NextResponse.json({ error: 'Failed to restore deleted submission' }, { status: 500 });
    }
}
