import { NextResponse } from 'next/server';
import { getAdminDb, verifyExaminationAdmin } from '@/lib/firebase-admin';
import { ExamTest } from '@/types/examination';

export async function GET(request: Request) {
    try {
        const authUser = await verifyExaminationAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const snapshot = await adminDb.collection('exams').orderBy('createdAt', 'desc').get();
        const exams: ExamTest[] = [];
        snapshot.forEach(doc => {
            exams.push({ id: doc.id, ...doc.data() } as ExamTest);
        });

        return NextResponse.json({ exams });
    } catch (error: any) {
        console.error('Error fetching exams:', error);
        return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authUser = await verifyExaminationAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const newExam: Omit<ExamTest, 'id'> = {
            title: body.title,
            description: body.description,
            status: body.status || 'upcoming',
            resultPublished: false,
            startTime: body.startTime,
            endTime: body.endTime,
            examStartTime: body.examStartTime,
            examEndTime: body.examEndTime,
            publishTarget: body.publishTarget || 'all',
            publishToUserIds: Array.isArray(body.publishToUserIds) ? body.publishToUserIds : [],
            sequentialNavigationOnly: body.sequentialNavigationOnly === true,
            durationMinutes: body.durationMinutes,
            createdBy: authUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            questions: body.questions || []
        };

        const docRef = await adminDb.collection('exams').add(newExam);

        return NextResponse.json({
            success: true,
            examId: docRef.id,
            message: 'Exam created successfully'
        });
    } catch (error: any) {
        console.error('Error creating exam:', error);
        return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
    }
}
