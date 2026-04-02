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

        // Find the first pending email
        const queueSnapshot = await adminDb
            .collection('resourceEmailQueue')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();

        if (queueSnapshot.empty) {
            return NextResponse.json({
                success: true,
                message: 'No pending emails in queue',
                processed: 0,
            });
        }

        const queueDoc = queueSnapshot.docs[0];
        const queueData = queueDoc.data();

        // Validate email
        if (!isValidEmail(queueData.recipientEmail)) {
            await queueDoc.ref.update({
                status: 'failed',
                error: `Invalid email format: ${queueData.recipientEmail}`,
                sentAt: new Date(),
            });

            console.warn(`⚠️ Skipped invalid email: ${queueData.recipientEmail}`);

            return NextResponse.json({
                success: true,
                message: 'Invalid email skipped, moving to next',
                processed: 0,
                skipped: 1,
            });
        }

        // Send the email
        try {
            await sendEmail({
                to: queueData.recipientEmail,
                subject: `New Learning Resource: ${queueData.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #7c3aed;">New Resource Available</h2>
                        <p>Hello ${queueData.recipientName || 'there'},</p>
                        <p>A new learning resource has been uploaded for you${queueData.storageType === 'link' ? ' as an external learning link' : ''}.</p>
                        <p><strong>Title:</strong> ${queueData.title}</p>
                        ${queueData.fileName ? `<p><strong>Label:</strong> ${queueData.fileName}</p>` : ''}
                        ${queueData.description ? `<p><strong>Description:</strong> ${queueData.description}</p>` : ''}
                        <p><strong>Uploaded By:</strong> ${queueData.uploadedByName || 'RAIoT Admin'}</p>
                        <p><a href="${queueData.fileUrl}" target="_blank" rel="noopener noreferrer">Open Resource</a></p>
                        <br/>
                        <p>Regards,<br/>RAIoT Learning Team</p>
                    </div>
                `,
            });

            // Mark as sent
            await queueDoc.ref.update({
                status: 'sent',
                sentAt: new Date(),
            });

            console.log(`✅ Email sent to ${queueData.recipientEmail}`);

            return NextResponse.json({
                success: true,
                message: `Email sent to ${queueData.recipientEmail}. Next email will be processed in 5 minutes.`,
                processed: 1,
                recipientEmail: queueData.recipientEmail,
            });
        } catch (emailError: any) {
            // Mark as failed with error message
            await queueDoc.ref.update({
                status: 'failed',
                error: emailError instanceof Error ? emailError.message : String(emailError),
                sentAt: new Date(),
            });

            console.error(`❌ Failed to send email to ${queueData.recipientEmail}:`, emailError);

            return NextResponse.json({
                success: true,
                message: `Failed to send email to ${queueData.recipientEmail}. Marked as failed. Continuing with next email.`,
                processed: 0,
                failed: 1,
                error: emailError instanceof Error ? emailError.message : String(emailError),
            });
        }
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
