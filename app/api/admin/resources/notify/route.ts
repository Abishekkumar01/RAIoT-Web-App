import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

interface ResourceNotifyBody {
    resourceId?: string;
    title?: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    storageType?: 'cloudinary' | 'mongodb' | 'link';
    userId?: string | string[];
    notifyAll?: boolean;
    uploadedByName?: string;
}

interface QueuedEmail {
    resourceId: string;
    recipientEmail: string;
    recipientName: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileName?: string;
    storageType: 'cloudinary' | 'mongodb' | 'link';
    uploadedByName: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: FirebaseFirestore.Timestamp;
    sentAt?: FirebaseFirestore.Timestamp;
    error?: string;
}

const normalizeTargetIds = (userId: string | string[] | undefined, notifyAll?: boolean) => {
    if (notifyAll) return ['all'];
    if (Array.isArray(userId)) return userId.map((value) => String(value)).filter(Boolean);
    if (typeof userId === 'string' && userId.trim()) return [userId.trim()];
    return [];
};

const normalizeRole = (value: unknown): string => String(value || '').toLowerCase().trim();

const PRIVILEGED_ROLES = new Set([
    'superadmin',
    'president',
    'vice_president',
    'management_head',
    'public_relation_head',
    'technical_head',
]);

export async function POST(request: Request) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const body = (await request.json()) as ResourceNotifyBody;
        const resourceId = String(body.resourceId || '').trim() || 'unknown';
        const title = String(body.title || '').trim();
        const fileUrl = String(body.fileUrl || '').trim();
        const storageType = body.storageType || 'cloudinary';
        const targetIds = normalizeTargetIds(body.userId, body.notifyAll);

        if (!title || !fileUrl || targetIds.length === 0) {
            return NextResponse.json({ error: 'title, fileUrl and userId/notifyAll are required' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const userSnapshots = await adminDb.collection('users').get();
        const allUsers = userSnapshots.docs
            .map((doc) => {
                const data = doc.data() || {};
                return {
                    uid: doc.id,
                    email: String(data.email || '').trim(),
                    displayName: String(data.displayName || data.name || data.profileData?.name || 'User'),
                    role: normalizeRole(data.role),
                };
            });

        const targetRecipients = allUsers.filter((user) => {
            if (!user.email) return false;
            if (targetIds.includes('all')) return true;
            return targetIds.includes(user.uid);
        });

        const privilegedRecipients = allUsers.filter((user) => user.email && PRIVILEGED_ROLES.has(user.role));

        const recipientsMap = new Map<string, { uid: string; email: string; displayName: string; role: string }>();
        [...targetRecipients, ...privilegedRecipients].forEach((user) => {
            if (user.email) recipientsMap.set(user.email.toLowerCase(), user);
        });

        const recipients = Array.from(recipientsMap.values());

        if (recipients.length === 0) {
            return NextResponse.json({ success: true, message: 'No email recipients found for this resource.', queuedCount: 0 });
        }

        // Queue all emails instead of sending immediately
        const queuedEmails: QueuedEmail[] = recipients.map((recipient) => ({
            resourceId,
            recipientEmail: recipient.email,
            recipientName: recipient.displayName,
            title,
            description: body.description,
            fileUrl,
            fileName: body.fileName,
            storageType,
            uploadedByName: body.uploadedByName || 'RAIoT Admin',
            status: 'pending',
            createdAt: admin.firestore.Timestamp.now(),
        }));

        // Add all emails to the queue collection
        const queueCollection = adminDb.collection('resourceEmailQueue');
        for (const email of queuedEmails) {
            await queueCollection.add(email);
        }

        console.log(`📧 Queued ${queuedEmails.length} email notifications for processing (5-min intervals)`);

        return NextResponse.json({
            success: true,
            message: `Queued ${queuedEmails.length} email notification(s) for processing. Emails will be sent automatically at 5-minute intervals.`,
            queuedCount: queuedEmails.length,
        });
    } catch (error: any) {
        console.error('Error queuing resource notifications:', error);
        return NextResponse.json({ error: 'Failed to queue resource notifications' }, { status: 500 });
    }
}
