import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { testId } = body;
        
        if (!testId) {
            return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        // Verify test exists and is 'upcoming' or 'live'
        const testDoc = await adminDb.collection('exams').doc(testId).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data();
        if (testData?.status === 'previous') {
            return NextResponse.json({ error: 'Cannot register for a previous test' }, { status: 400 });
        }

        const now = new Date();
        const regStart = testData?.startTime ? new Date(testData.startTime) : null;
        const regEnd = testData?.endTime ? new Date(testData.endTime) : null;

        if (regStart && now < regStart) {
            return NextResponse.json({ error: 'Registration has not started yet' }, { status: 400 });
        }
        if (regEnd && now > regEnd) {
            return NextResponse.json({ error: 'Registration window has closed' }, { status: 400 });
        }

        // Check if already registered
        const existingReg = await adminDb.collection('examRegistrations')
            .where('userId', '==', authUser.uid)
            .where('testId', '==', testId)
            .get();

        if (!existingReg.empty) {
            return NextResponse.json({ error: 'Already registered for this test' }, { status: 400 });
        }

        // Create registration
        await adminDb.collection('examRegistrations').add({
            testId,
            userId: authUser.uid,
            registeredAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, message: 'Registered successfully' });
    } catch (error: any) {
        console.error('Error registering for test:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
