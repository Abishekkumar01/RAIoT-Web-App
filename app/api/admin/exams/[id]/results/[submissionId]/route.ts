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
        const { score, manualGrades } = body;

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

        const updateData: any = {
            updatedAt: new Date().toISOString(),
        };

        // Handle manual score update (for overall submission score)
        if (score !== undefined && score !== null) {
            const manualScore = Number(score);
            if (!Number.isFinite(manualScore)) {
                return NextResponse.json({ error: 'Valid numeric score is required' }, { status: 400 });
            }
            updateData.score = manualScore;
            updateData.requiresManualReview = false;
            updateData.manualReviewedBy = authUser.uid;
            updateData.manualReviewedAt = new Date().toISOString();
        }

        // Handle manual grade update for specific questions
        if (manualGrades && typeof manualGrades === 'object') {
            const sanitizedManualGrades = Object.entries(manualGrades).reduce((acc: Record<string, any>, [questionId, grade]: [string, any]) => {
                if (!grade || typeof grade !== 'object') return acc;

                const nextGrade: Record<string, any> = { ...grade };
                if (nextGrade.status && !['correct', 'incorrect', 'unattempted'].includes(String(nextGrade.status))) {
                    delete nextGrade.status;
                }
                if (nextGrade.marks !== undefined) {
                    const numericMarks = Number(nextGrade.marks);
                    if (!Number.isFinite(numericMarks)) {
                        return acc;
                    }
                    nextGrade.marks = numericMarks;
                }

                acc[questionId] = nextGrade;
                return acc;
            }, {});

            if (Object.keys(sanitizedManualGrades).length > 0) {
                updateData.manualGrades = {
                    ...(submissionData?.manualGrades || {}),
                    ...sanitizedManualGrades
                };
            }
        }

        if (Object.keys(updateData).length === 1) {
            // Only updatedAt is present
            return NextResponse.json(
                { error: 'No valid update fields provided' },
                { status: 400 }
            );
        }

        // Update the submission
        await submissionRef.update(updateData);

        return NextResponse.json({
            success: true,
            message: 'Submission updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating submission:', error);
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
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

        await adminDb.collection('deletedExamSubmissions').add({
            testId,
            originalSubmissionId: submissionId,
            deletedAt: new Date().toISOString(),
            deletedBy: authUser.uid,
            submissionData,
        });

        await submissionRef.delete();
        return NextResponse.json({ success: true, message: 'Submission deleted successfully (moved to recycle bin)' });
    } catch (error: any) {
        console.error('Error deleting submission:', error);
        return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
    }
}
