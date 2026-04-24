import { NextResponse } from 'next/server';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';
import { sendEmail } from '@/app/actions/emailActions';

// Simple email validation
const isValidEmail = (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

// Verify authentication (Firebase or API key for webhooks)
const verifyAuth = async (request: Request): Promise<boolean> => {
    // Check for API key (for GitHub Actions / webhooks)
    const apiKey = request.headers.get('x-api-key');
    if (apiKey === process.env.QUEUE_API_KEY && process.env.QUEUE_API_KEY) {
        return true;
    }

    // Fall back to Firebase superadmin verification
    try {
        const authUser = await verifySuperAdmin(request);
        return !!authUser;
    } catch {
        return false;
    }
};

export async function POST(request: Request) {
    try {
        const isAuthorized = await verifyAuth(request);
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const BATCH_SIZE = 20;

        // Fetch pending emails (up to batch size)
        const queueSnapshot = await adminDb
            .collection('resourceEmailQueue')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(BATCH_SIZE)
            .get();

        if (queueSnapshot.empty) {
            return NextResponse.json({
                success: true,
                message: 'No pending emails in queue',
                processed: 0,
            });
        }

        let processed = 0;
        let sentCount = 0;
        let failedCount = 0;

        for (const doc of queueSnapshot.docs) {
            const data = doc.data();

            // Validate email
            if (!isValidEmail(data.recipientEmail)) {
                await doc.ref.update({
                    status: 'failed',
                    error: `Invalid email format: ${data.recipientEmail}`,
                    sentAt: new Date(),
                });
                console.warn(`⚠️ Skipped invalid email: ${data.recipientEmail}`);
                processed++;
                failedCount++;
                continue;
            }

            try {
                await sendEmail({
                    to: data.recipientEmail,
                    subject: `New Learning Resource: ${data.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #7c3aed;">New Resource Available</h2>
                            <p>Hello ${data.recipientName || 'there'},</p>
                            <p>A new learning resource has been uploaded for you${data.storageType === 'link' ? ' as an external learning link' : ''}.</p>
                            <p><strong>Title:</strong> ${data.title}</p>
                            ${data.fileName ? `<p><strong>Label:</strong> ${data.fileName}</p>` : ''}
                            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
                            <p><strong>Uploaded By:</strong> ${data.uploadedByName || 'RAIoT Admin'}</p>
                            <p><a href="${data.fileUrl}" target="_blank" rel="noopener noreferrer">Open Resource</a></p>
                            <br/>
                            <p>Regards,<br/>RAIoT Learning Team</p>
                        </div>
                    `,
                });

                await doc.ref.update({
                    status: 'sent',
                    sentAt: new Date(),
                });
                console.log(`✅ Email sent to ${data.recipientEmail}`);
                processed++;
                sentCount++;
            } catch (emailError: any) {
                await doc.ref.update({
                    status: 'failed',
                    error: emailError instanceof Error ? emailError.message : String(emailError),
                    sentAt: new Date(),
                });
                console.error(`❌ Failed to send email to ${data.recipientEmail}:`, emailError);
                processed++;
                failedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${processed} emails: ${sentCount} sent, ${failedCount} failed.`,
            processed,
            sent: sentCount,
            failed: failedCount,
        });
    } catch (error: any) {
        console.error('Error processing email queue:', error);
        return NextResponse.json({ error: 'Failed to process email queue' }, { status: 500 });
    }
}

// GET endpoint to check queue status
export async function GET(request: Request) {
    try {
        const isAuthorized = await verifyAuth(request);
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) throw new Error('Database not initialized');

        const queueSnapshot = await adminDb.collection('resourceEmailQueue').get();

        const pending = queueSnapshot.docs.filter((doc) => doc.data().status === 'pending').length;
        const sent = queueSnapshot.docs.filter((doc) => doc.data().status === 'sent').length;
        const failed = queueSnapshot.docs.filter((doc) => doc.data().status === 'failed').length;

        return NextResponse.json({
            success: true,
            queueStatus: {
                pending,
                sent,
                failed,
                total: queueSnapshot.size,
            },
        });
    } catch (error: any) {
        console.error('Error fetching queue status:', error);
        return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
    }
}
