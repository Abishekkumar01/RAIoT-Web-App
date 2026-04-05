import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

const toDateSafe = (value: any): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value?.toDate === 'function') {
        const parsed = value.toDate();
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;

        if (typeof value === 'string') {
            const match = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (match) {
                const day = Number(match[1]);
                const month = Number(match[2]);
                const year = Number(match[3]);
                const hour = Number(match[4] || 0);
                const minute = Number(match[5] || 0);
                const second = Number(match[6] || 0);
                const fallback = new Date(year, month - 1, day, hour, minute, second);
                return Number.isNaN(fallback.getTime()) ? null : fallback;
            }
        }
        return null;
    }

    if (typeof value === 'object') {
        const seconds = value.seconds ?? value._seconds;
        const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
        if (typeof seconds === 'number') {
            const parsed = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
    }

    return null;
};

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

        const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
        const userRole = String(userDoc.data()?.role || '').toLowerCase();

        // Verify test exists and is 'upcoming' or 'live'
        const testDoc = await adminDb.collection('exams').doc(testId).get();
        if (!testDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }

        const testData = testDoc.data();
        if (!isExamVisibleToUser(testData, authUser.uid, userRole)) {
            return NextResponse.json({ error: 'This test is not published for your account' }, { status: 403 });
        }
        if (testData?.status === 'previous') {
            return NextResponse.json({ error: 'Cannot register for a previous test' }, { status: 400 });
        }

        const now = new Date();
        const regStart = toDateSafe(testData?.startTime);
        const regEnd = toDateSafe(testData?.endTime);

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
