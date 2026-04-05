import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json().catch(() => ({}));
        const delta = Number(body?.delta || 0);

        if (![1, -1].includes(delta)) {
            return NextResponse.json({ error: 'delta must be 1 or -1' }, { status: 400 });
        }

        await dbConnect();
        const event = await Event.findById(params.id);
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const current = Number(event.registered || 0);
        const next = Math.max(0, current + delta);
        event.registered = next;
        await event.save();

        return NextResponse.json({ success: true, registered: next });
    } catch (error: any) {
        console.error('Failed to update event registration count in MongoDB:', error);
        return NextResponse.json({ error: 'Failed to update registration count' }, { status: 500 });
    }
}
