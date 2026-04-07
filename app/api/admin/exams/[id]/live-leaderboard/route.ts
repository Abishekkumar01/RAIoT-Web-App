import { NextResponse } from 'next/server';
import { getAdminDb, verifyExaminationAdmin } from '@/lib/firebase-admin';

const roundMarks = (value: number): number => {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const getRoleBucket = (role: unknown): 'member' | 'trainee' | 'other' => {
    const normalized = String(role || '').toLowerCase().trim();
    const memberRoles = [
        'member',
        'junior_developer',
        'senior_developer',
        'student_coordinator',
        'operations',
        'operation',
        'operations_head',
        'public_relation_head',
        'management_head',
        'technical_head',
        'inventory_head',
        'content_creation_head'
    ];

    if (memberRoles.includes(normalized)) return 'member';
    if (normalized === 'trainee') return 'trainee';
    return 'other';
};

const toTs = (value: unknown): number => {
    const parsed = new Date(String(value || 0)).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyExaminationAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const examId = params.id;
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const examDoc = await adminDb.collection('exams').doc(examId).get();
        if (!examDoc.exists) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const examData = examDoc.data() || {};
        const questions = Array.isArray(examData.questions) ? examData.questions : [];
        const totalMarks = roundMarks(questions.reduce((sum: number, q: any) => sum + Number(q?.points || 0), 0));

        const [progressSnap, submissionsSnap] = await Promise.all([
            adminDb.collection('examLiveProgress').where('testId', '==', examId).get(),
            adminDb.collection('examSubmissions').where('testId', '==', examId).get(),
        ]);

        const userIds = new Set<string>();
        progressSnap.docs.forEach((d) => {
            const row = d.data() || {};
            if (row.userId) userIds.add(String(row.userId));
        });
        submissionsSnap.docs.forEach((d) => {
            const row = d.data() || {};
            if (row.userId) userIds.add(String(row.userId));
        });

        const userMap = new Map<string, { name: string; email: string; role: string }>();
        await Promise.all(Array.from(userIds).map(async (uid) => {
            try {
                const userDoc = await adminDb.collection('users').doc(uid).get();
                const data = userDoc.data() || {};
                userMap.set(uid, {
                    name: String(data.displayName || data.name || data.profileData?.name || ''),
                    email: String(data.email || ''),
                    role: String(data.role || 'guest').toLowerCase(),
                });
            } catch {
                userMap.set(uid, { name: '', email: '', role: 'guest' });
            }
        }));

        const rowsByUser = new Map<string, any>();

        progressSnap.docs.forEach((doc) => {
            const data = doc.data() || {};
            const userId = String(data.userId || '');
            if (!userId) return;
            const userInfo = userMap.get(userId) || { name: '', email: '', role: 'guest' };
            const roleBucket = getRoleBucket(userInfo.role);
            if (roleBucket === 'other') return;

            rowsByUser.set(userId, {
                userId,
                userName: userInfo.name || 'Unknown User',
                userEmail: userInfo.email || '-',
                userRole: userInfo.role || '-',
                roleBucket,
                score: roundMarks(Number(data.liveScore || 0)),
                totalMarks,
                attemptedCount: Number(data.attemptedCount || 0),
                updatedAt: String(data.updatedAt || ''),
                submittedAt: '',
                source: 'live',
                statusLabel: 'In Progress',
            });
        });

        submissionsSnap.docs.forEach((doc) => {
            const data = doc.data() || {};
            const userId = String(data.userId || '');
            if (!userId) return;
            const userInfo = userMap.get(userId) || { name: '', email: '', role: 'guest' };
            const roleBucket = getRoleBucket(userInfo.role);
            if (roleBucket === 'other') return;

            const finalScore = Number(data.finalScore ?? data.score ?? data.autoScore ?? 0);
            rowsByUser.set(userId, {
                userId,
                userName: userInfo.name || data.userName || 'Unknown User',
                userEmail: userInfo.email || data.userEmail || '-',
                userRole: userInfo.role || '-',
                roleBucket,
                score: roundMarks(finalScore),
                totalMarks,
                attemptedCount: 0,
                updatedAt: String(data.submittedAt || ''),
                submittedAt: String(data.submittedAt || ''),
                source: 'submitted',
                statusLabel: 'Submitted',
            });
        });

        const rows = Array.from(rowsByUser.values())
            .sort((a, b) => {
                const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
                if (scoreDiff !== 0) return scoreDiff;

                const aTime = toTs(a.submittedAt || a.updatedAt);
                const bTime = toTs(b.submittedAt || b.updatedAt);
                if (aTime !== bTime) return aTime - bTime;

                return String(a.userName || '').localeCompare(String(b.userName || ''));
            })
            .map((row, index) => ({
                ...row,
                rank: index + 1,
                percentage: totalMarks > 0 ? roundMarks((Number(row.score || 0) / totalMarks) * 100) : 0,
            }));

        return NextResponse.json({
            examId,
            examStatus: String(examData.status || 'upcoming'),
            totalMarks,
            rows,
            updatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Error fetching live leaderboard:', error);
        return NextResponse.json({ error: 'Failed to fetch live leaderboard' }, { status: 500 });
    }
}
