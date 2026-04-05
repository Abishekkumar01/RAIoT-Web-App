import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';
import { ExamTest } from '@/types/examination';

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

        // Legacy fallback: dd/mm/yyyy[, hh:mm[:ss]] or dd-mm-yyyy[, hh:mm[:ss]]
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

const toIsoOrEmpty = (value: any): string => {
    const parsed = toDateSafe(value);
    return parsed ? parsed.toISOString() : '';
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

function computeStatus(data: any): 'upcoming' | 'live' | 'previous' {
    const now = new Date();
    const examStart = toDateSafe(data?.examStartTime);
    const examEnd = toDateSafe(data?.examEndTime);
    if (examStart && examEnd) {
        if (now < examStart) return 'upcoming';
        if (now >= examStart && now <= examEnd) return 'live';
        return 'previous';
    }
    // Fallback: use stored status field
    return data.status || 'upcoming';
}

export async function GET(request: Request) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
        const userRole = String(userDoc.data()?.role || '').toLowerCase();

        // Fetch user submissions first so already-attempted tests remain visible even if audience was changed later.
        const userSubmissionsSnapshot = await adminDb
            .collection('examSubmissions')
            .where('userId', '==', authUser.uid)
            .get();
        const submittedTestIds = new Set<string>();
        userSubmissionsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data?.testId) submittedTestIds.add(String(data.testId));
        });

        // Fetch all exams
        const snapshot = await adminDb.collection('exams').orderBy('createdAt', 'desc').get();
        const exams: Partial<ExamTest>[] = [];
        const publishedResultTestIds = new Set<string>();
        snapshot.forEach(doc => {
            const data = doc.data();
            const hasSubmitted = submittedTestIds.has(doc.id);
            if (!isExamVisibleToUser(data, authUser.uid, userRole) && !hasSubmitted) {
                return;
            }
            // Remove questions so users cannot see them until test starts
            delete data.questions;
            // Compute real-time status from examStartTime / examEndTime
            const effectiveStatus = computeStatus(data);
            if (data.resultPublished === true) {
                publishedResultTestIds.add(doc.id);
            }
            exams.push({
                id: doc.id,
                ...data,
                startTime: toIsoOrEmpty(data?.startTime),
                endTime: toIsoOrEmpty(data?.endTime),
                examStartTime: toIsoOrEmpty(data?.examStartTime),
                examEndTime: toIsoOrEmpty(data?.examEndTime),
                status: effectiveStatus,
            } as Partial<ExamTest>);
        });

        // Fetch user registrations
        const regSnapshot = await adminDb.collection('examRegistrations').where('userId', '==', authUser.uid).get();
        const registrations = regSnapshot.docs.map(doc => doc.data());

        // Build user submissions list (to know if they completed previous tests)
        const submissions = userSubmissionsSnapshot.docs.map(doc => {
            const sub = doc.data();
            const isPublished = publishedResultTestIds.has(sub.testId);
            return {
                ...sub,
                // Keep submission state, but hide score until superadmin publishes result.
                score: isPublished ? sub.score : null,
                resultPublished: isPublished
            };
        });

        return NextResponse.json({ exams, registrations, submissions });
    } catch (error: any) {
        console.error('Error fetching tests:', error);
        return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
    }
}
