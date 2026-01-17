import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        console.log("Starting attendance reset...");

        // Delete 'attendance' collection
        const attendanceSnapshot = await db.collection('attendance').get();
        const batch1 = db.batch();
        attendanceSnapshot.docs.forEach((doc) => {
            batch1.delete(doc.ref);
        });
        await batch1.commit();
        console.log(`Deleted ${attendanceSnapshot.size} attendance records.`);

        // Delete 'attendance_summaries' collection
        const summarySnapshot = await db.collection('attendance_summaries').get();
        const batch2 = db.batch();
        summarySnapshot.docs.forEach((doc) => {
            batch2.delete(doc.ref);
        });
        await batch2.commit();
        console.log(`Deleted ${summarySnapshot.size} attendance summaries.`);

        return NextResponse.json({ success: true, message: 'All attendance data reset.' });
    } catch (error: any) {
        console.error("Reset error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
