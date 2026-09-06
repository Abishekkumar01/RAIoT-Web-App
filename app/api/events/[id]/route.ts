import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';

export const dynamic = 'force-dynamic';

const serialize = (doc: any) => {
    const raw = doc?.toObject ? doc.toObject() : doc;
    if (!raw) return raw;
    return {
        id: String(raw._id),
        ...raw,
        _id: undefined,
    };
};

export async function GET(_: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const event = await Event.findById(params.id).lean();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serialize(event) });
    } catch (error: any) {
        console.error('Failed to fetch event from MongoDB:', error);
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
}
