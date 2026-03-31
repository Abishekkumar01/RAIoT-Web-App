import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

const parseChoiceIndexes = (value: string): string[] => {
    const text = String(value || '').trim();
    if (!text || text === '-') return [];

    const segments = text.split('|').map((part) => part.trim()).filter(Boolean);
    const indexes: string[] = [];

    for (const seg of segments) {
        const match = seg.match(/^(\d+)\s*:/);
        if (match) {
            indexes.push(match[1]);
        }
    }

    if (indexes.length > 0) return indexes;

    const single = text.match(/^(\d+)\s*:/);
    return single ? [single[1]] : [];
};

const normalizeStatus = (value: any): 'correct' | 'incorrect' | 'unattempted' => {
    const status = String(value || '').toLowerCase().trim();
    if (status === 'correct' || status === 'incorrect' || status === 'unattempted') return status;
    return 'unattempted';
};

const parseNumber = (value: any, fallback = 0): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const buildSubmissionPayload = (
    testId: string,
    userId: string,
    examQuestions: any[],
    questionRows: any[],
    submittedAt: string,
    memberName: string,
    restoredBy: string
) => {
    const answers: Record<string, string | string[]> = {};
    const manualGrades: Record<string, any> = {};
    let totalScore = 0;

    for (const row of questionRows) {
        const questionNo = Number(row.questionNo);
        if (!Number.isFinite(questionNo) || questionNo < 1 || questionNo > examQuestions.length) continue;

        const question = examQuestions[questionNo - 1];
        const questionId = question?.id;
        if (!questionId) continue;

        const questionType = String(row.questionType || question?.type || '').toLowerCase();
        const userAnswer = String(row.userAnswer ?? '').trim();
        const marksObtained = parseNumber(row.marksObtained, 0);
        const status = normalizeStatus(row.status);

        if (status === 'unattempted') {
            answers[questionId] = '';
        } else if (questionType === 'mcq') {
            const idx = parseChoiceIndexes(userAnswer)[0];
            answers[questionId] = idx !== undefined ? idx : userAnswer;
        } else if (questionType === 'checkbox') {
            answers[questionId] = parseChoiceIndexes(userAnswer);
        } else {
            answers[questionId] = userAnswer === '-' ? '' : userAnswer;
        }

        manualGrades[questionId] = {
            status,
            marks: marksObtained,
            markedAt: new Date().toISOString(),
            restoredFromExcel: true,
        };

        totalScore += marksObtained;
    }

    const nowIso = new Date().toISOString();
    return {
        testId,
        userId,
        answers,
        autoScore: totalScore,
        score: totalScore,
        requiresManualReview: false,
        manualReviewRequired: [],
        manualGrades,
        submittedAt: submittedAt || nowIso,
        restoredAt: nowIso,
        restoredBy,
        restoredFromExcel: true,
        restoredMemberName: memberName || '',
    };
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const testId = params.id;
        const body = await request.json();
        const {
            memberEmail,
            memberName,
            submittedAt,
            questionRows,
            summaryRows,
            breakdownRows,
            restoreMissingOnly,
        } = body || {};

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const examDoc = await adminDb.collection('exams').doc(testId).get();
        if (!examDoc.exists) {
            return NextResponse.json({ error: 'Test not found' }, { status: 404 });
        }
        const examData = examDoc.data() || {};
        const examQuestions = Array.isArray(examData.questions) ? examData.questions : [];

        // Backward-compatible single-record restore mode.
        if (memberEmail && Array.isArray(questionRows) && questionRows.length > 0) {
            const userSnapshot = await adminDb.collection('users')
                .where('email', '==', String(memberEmail).trim())
                .limit(1)
                .get();

            if (userSnapshot.empty) {
                return NextResponse.json({ error: 'No user found with this email in users collection' }, { status: 404 });
            }

            const userDoc = userSnapshot.docs[0];
            const userId = userDoc.id;

            const existingSubmission = await adminDb.collection('examSubmissions')
                .where('testId', '==', testId)
                .where('userId', '==', userId)
                .get();
            if (!existingSubmission.empty) {
                return NextResponse.json({ error: 'Submission already exists for this user in this test' }, { status: 409 });
            }

            const payload = buildSubmissionPayload(
                testId,
                userId,
                examQuestions,
                questionRows,
                String(submittedAt || ''),
                String(memberName || ''),
                authUser.uid
            );

            const created = await adminDb.collection('examSubmissions').add(payload);
            return NextResponse.json({ success: true, message: 'Submission restored from Excel export', submissionId: created.id });
        }

        // Merge mode: restore only missing students and keep existing untouched.
        if (!Array.isArray(summaryRows) || summaryRows.length === 0 || !Array.isArray(breakdownRows)) {
            return NextResponse.json(
                { error: 'Provide either single restore fields or bulk summaryRows + breakdownRows.' },
                { status: 400 }
            );
        }

        const activeSubmissions = await adminDb.collection('examSubmissions')
            .where('testId', '==', testId)
            .get();
        const existingUserIds = new Set<string>();
        activeSubmissions.docs.forEach((doc) => {
            const data = doc.data() || {};
            if (data.userId) existingUserIds.add(String(data.userId));
        });

        const breakdownBySNo = new Map<number, any[]>();
        for (const row of breakdownRows) {
            const sno = Number(row?.SubmissionSNo);
            if (!Number.isFinite(sno)) continue;
            if (!breakdownBySNo.has(sno)) breakdownBySNo.set(sno, []);
            breakdownBySNo.get(sno)!.push({
                questionNo: Number(row?.QuestionNo),
                questionType: String(row?.QuestionType || ''),
                status: String(row?.Status || 'unattempted').toLowerCase(),
                marksObtained: parseNumber(row?.MarksObtained, 0),
                userAnswer: String(row?.UserAnswer || ''),
            });
        }

        let createdCount = 0;
        let skippedExistingCount = 0;
        let skippedNotFoundCount = 0;
        let skippedInvalidCount = 0;
        const restoredEmails: string[] = [];

        for (const row of summaryRows) {
            const email = String(row?.Email || '').trim();
            const sNo = Number(row?.SNo);
            if (!email || !Number.isFinite(sNo)) {
                skippedInvalidCount += 1;
                continue;
            }

            const rowsForSubmission = breakdownBySNo.get(sNo) || [];
            if (rowsForSubmission.length === 0) {
                skippedInvalidCount += 1;
                continue;
            }

            const userSnapshot = await adminDb.collection('users')
                .where('email', '==', email)
                .limit(1)
                .get();

            if (userSnapshot.empty) {
                skippedNotFoundCount += 1;
                continue;
            }

            const userDoc = userSnapshot.docs[0];
            const userId = userDoc.id;
            if (restoreMissingOnly !== false && existingUserIds.has(userId)) {
                skippedExistingCount += 1;
                continue;
            }

            const payload = buildSubmissionPayload(
                testId,
                userId,
                examQuestions,
                rowsForSubmission,
                String(row?.SubmittedAt || ''),
                String(row?.Member || ''),
                authUser.uid
            );

            await adminDb.collection('examSubmissions').add(payload);
            createdCount += 1;
            existingUserIds.add(userId);
            restoredEmails.push(email);
        }

        return NextResponse.json({
            success: true,
            message: 'Merge restore completed',
            createdCount,
            skippedExistingCount,
            skippedNotFoundCount,
            skippedInvalidCount,
            restoredEmails,
        });
    } catch (error: any) {
        console.error('Error restoring submission from export:', error);
        return NextResponse.json({ error: 'Failed to restore submission from export' }, { status: 500 });
    }
}
