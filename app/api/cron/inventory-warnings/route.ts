import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendWarningEmail } from '@/app/actions/emailActions';
import { IInventoryRequest } from '@/types/inventory';

export async function GET(request: Request) {
    // Basic security to avoid public calling of this endpoint
    // Recommend setting a CRON_SECRET in Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const q = query(
            collection(db, 'inventory_requests'),
            where("status", "==", "approved")
        );

        const snapshot = await getDocs(q);
        const now = new Date();
        let emailsSent = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data() as IInventoryRequest;
            const dueDate = new Date(data.dueDate);

            // Calculate time remaining in ms
            const timeRemainingMs = dueDate.getTime() - now.getTime();
            const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);

            let shouldSend = false;
            let timeString = "";

            // Unified warning policy: warn at 24 hours before due date for every issuance
            if (hoursRemaining > 0 && hoursRemaining <= 24) {
                shouldSend = true;
                timeString = `${Math.ceil(hoursRemaining)} hours`;
            } else if (hoursRemaining <= 0) {
                shouldSend = true;
                timeString = `OVERDUE by ${Math.abs(Math.ceil(hoursRemaining / 24))} days`;
            }

            if (shouldSend && !data.warningEmailSent) {
                const componentNames = data.items.map(i => `${i.quantity}x ${i.componentName}`).join(', ');
                await sendWarningEmail(data.userEmail, componentNames, timeString);

                // Update Firestore to prevent duplicate emails
                const { doc: firestoreDoc, updateDoc } = await import('firebase/firestore');
                await updateDoc(firestoreDoc(db, 'inventory_requests', doc.id), {
                    warningEmailSent: true,
                    updatedAt: new Date().toISOString()
                });

                emailsSent++;
            }
        }

        return NextResponse.json({ success: true, emailsSent });
    } catch (error: any) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
