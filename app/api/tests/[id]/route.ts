import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';
import { ExamTest } from '@/types/examination';

const isExamVisibleToUser = (
    examData: any,
    uid: string,
    userRole: string
): boolean => {
    const target = String(examData?.publishTarget || 'all').toLowerCase();
    const selectedUsers = Array.isArray(examData?.publishToUserIds) ? examData.publishToUserIds.map((v: any) => String(v)) : [];
    const normalizedRole = String(userRole || '').toLowerCase().trim();
    const isMemberRole = normalizedRole !== '' && !['trainee', 'guest', 'public'].includes(normalizedRole);

    if (target === 'all') return true;
    if (target === 'trainee') return normalizedRole === 'trainee';
    if (target === 'member') return isMemberRole;
    if (target === 'selected') return selectedUsers.includes(uid);
    return true;
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const testId = params.id;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const superAdminEmails = new Set(['chouhanchetan066@gmail.com', 'amanchoudhary.1502@gmail.com']);
        let isSuperAdmin = !!authUser.email && superAdminEmails.has(authUser.email.toLowerCase());
        let userRole = '';
        if (!isSuperAdmin) {
            const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
            userRole = String(userDoc.data()?.role || '').toLowerCase();
            isSuperAdmin = userRole === 'superadmin';
        }

        const testDoc = await adminDb.collection('exams').doc(testId).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data() as ExamTest;

        if (!isSuperAdmin && !isExamVisibleToUser(testData, authUser.uid, userRole)) {
            return NextResponse.json({ error: 'This test is not published for your account.' }, { status: 403 });
        }

        // Check if user is registered
        const regSnapshot = await adminDb.collection('examRegistrations')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        // Check if already submitted
        const subSnapshot = await adminDb.collection('examSubmissions')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (!isSuperAdmin && !subSnapshot.empty) {
            return NextResponse.json({ error: 'You have already submitted this test.' }, { status: 403 });
        }

        const now = new Date();
        const examStart = testData.examStartTime ? new Date(testData.examStartTime) : null;
        const examEnd = testData.examEndTime ? new Date(testData.examEndTime) : null;

        // For backward-compat with old tests that don't have examStartTime
        const effectiveStatus = examStart && examEnd
            ? (now < examStart ? 'upcoming' : now <= examEnd ? 'live' : 'previous')
            : testData.status;

        if (!isSuperAdmin && regSnapshot.empty && effectiveStatus !== 'previous') {
             return NextResponse.json({ error: 'You are not registered for this test' }, { status: 403 });
        }

        if (!isSuperAdmin && effectiveStatus === 'upcoming') {
            return NextResponse.json({ error: 'The test has not started yet.' }, { status: 403 });
        }

        // If they are trying to START the test after the deadline, block them
        if (!isSuperAdmin && effectiveStatus === 'live' && examEnd && now > examEnd) {
            return NextResponse.json({ error: 'The deadline to start this test has passed.' }, { status: 403 });
        }

        // Remove correct answers when returning to the user
        const safeQuestions = (testData.questions || []).map(q => {
            const { correctAnswer, keywords, keywordMatchMode, allowManualReview, ...safeQuestion } = q;
            return safeQuestion;
        });

        return NextResponse.json({ 
            test: {
                ...testData,
                id: testId,
                questions: safeQuestions
            } 
        });
    } catch (error: any) {
        console.error('Error fetching specific test details:', error);
        return NextResponse.json({ error: 'Failed to fetch test details' }, { status: 500 });
    }
}
