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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const manager = await verifyEventManager(request);
        if (!manager) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        await dbConnect();

        const updated = await Event.findByIdAndUpdate(params.id, { $set: body }, { new: true }).lean();
        if (!updated) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serialize(updated) });
    } catch (error: any) {
        console.error('Failed to update event in MongoDB:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const manager = await verifyEventManager(request);
        if (!manager) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const deleted = await Event.findByIdAndDelete(params.id).lean();
        if (!deleted) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete event in MongoDB:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
