import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

const MANAGER_ROLES = new Set([
    'admin',
    'superadmin',
    'president',
    'vice_president',
    'student_coordinator',
    'public_relation_head',
    'operations_head',
    'management_head',
    'operations',
    'technical_head',
]);

const normalizeRole = (value: unknown) => String(value || '').toLowerCase().trim();

const serialize = (doc: any) => {
    const raw = doc?.toObject ? doc.toObject() : doc;
    if (!raw) return raw;
    return {
        id: String(raw._id),
        ...raw,
        _id: undefined,
    };
};

async function verifyEventManager(request: Request) {
    const authUser = await verifyUser(request);
    if (!authUser) return null;

    const adminDb = getAdminDb();
    if (!adminDb) return null;

    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    if (!userDoc.exists) return null;

    const role = normalizeRole(userDoc.data()?.role);
    if (!MANAGER_ROLES.has(role)) return null;

    return { ...authUser, role };
}

export async function GET(request: Request) {
    try {
        const manager = await verifyEventManager(request);
        if (!manager) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const events = await Event.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, data: events.map(serialize) });
    } catch (error: any) {
        console.error('Failed to fetch admin events from MongoDB:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const manager = await verifyEventManager(request);
        if (!manager) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        await dbConnect();

        const payload = {
            title: String(body.title || '').trim(),
            description: String(body.description || ''),
            detailedContent: String(body.detailedContent || ''),
            date: String(body.date || ''),
            time: String(body.time || ''),
            duration: Number(body.duration || 0),
            location: String(body.location || ''),
            type: String(body.type || 'workshop'),
            maxParticipants: Number(body.maxParticipants || 0),
            minTeamSize: Number(body.minTeamSize || 2),
            maxTeamSize: Number(body.maxTeamSize || 10),
            registrationDeadline: String(body.registrationDeadline || ''),
            imageUrl: body.imageUrl ? String(body.imageUrl) : null,
            status: String(body.status || 'active'),
            isOnline: body.isOnline !== false,
            registrationType: body.registrationType === 'external' ? 'external' : 'in-site',
            externalRegistrationLink: body.externalRegistrationLink ? String(body.externalRegistrationLink) : '',
            requiresLogin: body.requiresLogin !== false,
            showCapacity: body.showCapacity !== false,
            subEvents: Array.isArray(body.subEvents) ? body.subEvents : [],
            teamMembers: Array.isArray(body.teamMembers) ? body.teamMembers : [],
            registered: Number(body.registered || 0),
            createdBy: manager.uid,
        };

        if (!payload.title || !payload.date || !payload.time || payload.duration <= 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const created = await Event.create(payload);
        return NextResponse.json({ success: true, data: serialize(created) }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create event in MongoDB:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
