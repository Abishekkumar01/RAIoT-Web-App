import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { getAdminDb, verifySuperAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: 'Firestore Admin SDK unavailable' }, { status: 500 });
        }

        await dbConnect();

        const snap = await adminDb.collection('events').get();
        if (snap.empty) {
            return NextResponse.json({ success: true, message: 'No Firestore events to migrate', migrated: 0, skipped: 0 });
        }

        let migrated = 0;
        let skipped = 0;

        for (const doc of snap.docs) {
            const data = doc.data() || {};

            const existing = await Event.findOne({ sourceFirestoreId: doc.id }).lean();
            if (existing) {
                skipped += 1;
                continue;
            }

            const payload = {
                sourceFirestoreId: doc.id,
                title: String(data.title || '').trim(),
                description: String(data.description || ''),
                detailedContent: String(data.detailedContent || ''),
                date: String(data.date || ''),
                time: String(data.time || ''),
                duration: Number(data.duration || 0),
                location: String(data.location || ''),
                type: String(data.type || 'workshop'),
                maxParticipants: Number(data.maxParticipants || 0),
                registered: Number(data.registered || 0),
                minTeamSize: Number(data.minTeamSize || 2),
                maxTeamSize: Number(data.maxTeamSize || 10),
                registrationDeadline: String(data.registrationDeadline || ''),
                imageUrl: data.imageUrl ? String(data.imageUrl) : null,
                status: String(data.status || 'active'),
                isOnline: data.isOnline !== false,
                createdBy: String(data.createdBy || ''),
            };

            if (!payload.title || !payload.date || !payload.time || payload.duration <= 0) {
                skipped += 1;
                continue;
            }

            await Event.create(payload);
            migrated += 1;
        }

        return NextResponse.json({
            success: true,
            message: 'Firestore events migration completed',
            migrated,
            skipped,
            total: snap.size,
        });
    } catch (error: any) {
        console.error('Failed to migrate Firestore events to MongoDB:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
