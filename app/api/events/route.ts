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

export async function GET() {
    try {
        await dbConnect();
        const events = await Event.find({ status: { $ne: 'inactive' } })
            .sort({ date: 1, time: 1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: events.map(serialize),
        });
    } catch (error: any) {
        console.error('Failed to fetch events from MongoDB:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}
