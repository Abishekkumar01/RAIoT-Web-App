import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        let eventsCount = 0;
        let studentsCount = 0;

        const adminDb = getAdminDb();

        if (adminDb) {
            // Use Admin SDK (Bypasses Rules)
            try {
                const eventsSnap = await adminDb.collection('events').count().get();
                eventsCount = eventsSnap.data().count;

                const studentsSnap = await adminDb.collection('students').count().get();
                studentsCount = studentsSnap.data().count;
            } catch (e) {
                console.error("Admin SDK fetch failed (likely credential issue):", e);
                // Verify if we can fallback? 
                // Admin DB exists but method failed? Usually credential error.
                // We can try client SDK fallback below if we structure it right.
                // But let's proceed to return what we have or fallback if counts are 0?
            }
        }

        // Fallback to MongoDB events source when Firestore count is unavailable
        if (eventsCount === 0) {
            try {
                await dbConnect();
                eventsCount = await Event.countDocuments({ status: { $ne: 'inactive' } });
            } catch (e) {
                console.error("MongoDB fallback failed:", e);
            }
        }

        // Return the data
        return NextResponse.json({
            events: eventsCount,
            students: studentsCount,
            source: adminDb ? 'admin' : 'mongo-fallback'
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
}
