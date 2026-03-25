import { NextResponse } from 'next/server';
import { getAdminDb, verifyExaminationAdmin } from '@/lib/firebase-admin';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyExaminationAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const examId = params.id;
        const body = await request.json();
        
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const updates = {
            ...body,
            updatedAt: new Date().toISOString()
        };
        // Remove id if it's there
        delete updates.id;

        await adminDb.collection('exams').doc(examId).update(updates);

        return NextResponse.json({ success: true, message: 'Exam updated successfully' });
    } catch (error: any) {
        console.error('Error updating exam:', error);
        return NextResponse.json({ error: 'Failed to update exam' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyExaminationAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const examId = params.id;
        
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        await adminDb.collection('exams').doc(examId).delete();

        return NextResponse.json({ success: true, message: 'Exam deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting exam:', error);
        return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 });
    }
}
