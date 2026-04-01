import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';
import { sendResourceUploadedEmail } from '@/app/actions/emailActions';

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

const normalizeTargetIds = (userId: string | string[] | undefined, notifyAll?: boolean) => {
    if (notifyAll) return ['all'];
    if (Array.isArray(userId)) return userId.map((value) => String(value)).filter(Boolean);
    if (typeof userId === 'string' && userId.trim()) return [userId.trim()];
    return [];
};

export async function POST(request: Request) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const body = (await request.json()) as ResourceNotifyBody;
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
        const recipients = userSnapshots.docs
            .map((doc) => {
                const data = doc.data() || {};
                return {
                    uid: doc.id,
                    email: String(data.email || '').trim(),
                    displayName: String(data.displayName || data.name || data.profileData?.name || 'User'),
                };
            })
            .filter((user) => {
                if (targetIds.includes('all')) return !!user.email;
                return targetIds.includes(user.uid) && !!user.email;
            });

        if (recipients.length === 0) {
            return NextResponse.json({ success: true, message: 'No email recipients found for this resource.' });
        }

        const result = await sendResourceUploadedEmail({
            recipients,
            title,
            description: body.description,
            fileUrl,
            fileName: body.fileName,
            storageType,
            uploadedByName: body.uploadedByName || 'RAIoT Admin',
        });

        return NextResponse.json({
            success: true,
            message: 'Resource notification sent',
            notifiedCount: result.sentCount,
            failedCount: result.failedCount,
        });
    } catch (error: any) {
        console.error('Error sending resource notifications:', error);
        return NextResponse.json({ error: 'Failed to send resource notifications' }, { status: 500 });
    }
}
