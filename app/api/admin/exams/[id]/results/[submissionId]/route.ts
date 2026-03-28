import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

export async function PUT(
    request: Request,
    { params }: { params: { id: string; submissionId: string } }
) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const { id: testId, submissionId } = params;
        const body = await request.json();
        const manualScore = Number(body?.score);

        if (!Number.isFinite(manualScore) || manualScore < 0) {
            return NextResponse.json({ error: 'Valid non-negative score is required' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const submissionRef = adminDb.collection('examSubmissions').doc(submissionId);
        const submissionDoc = await submissionRef.get();
        if (!submissionDoc.exists) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const submissionData = submissionDoc.data();
        if (submissionData?.testId !== testId) {
            return NextResponse.json({ error: 'Submission does not belong to this test' }, { status: 400 });
        }

        await submissionRef.update({
            score: manualScore,
            requiresManualReview: false,
            manualReviewedBy: authUser.uid,
            manualReviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, message: 'Manual score updated successfully' });
    } catch (error: any) {
        console.error('Error updating manual score:', error);
        return NextResponse.json({ error: 'Failed to update manual score' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string; submissionId: string } }
) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const { id: testId, submissionId } = params;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const submissionRef = adminDb.collection('examSubmissions').doc(submissionId);
        const submissionDoc = await submissionRef.get();
        if (!submissionDoc.exists) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const submissionData = submissionDoc.data();
        if (submissionData?.testId !== testId) {
            return NextResponse.json({ error: 'Submission does not belong to this test' }, { status: 400 });
        }

        await submissionRef.delete();
        return NextResponse.json({ success: true, message: 'Submission deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting submission:', error);
        return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
    }
}
