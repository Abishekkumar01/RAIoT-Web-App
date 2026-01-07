import { NextResponse } from 'next/server';
import { getGalleryData } from '@/lib/gallery-data';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getGalleryData();

        if (!data) {
            return NextResponse.json({ totalSections: 0, totalImages: 0 });
        }

        const totalSections = data.length;
        const totalImages = data.reduce((acc, section) => acc + (section.images?.length || 0), 0);

        return NextResponse.json({ totalSections, totalImages });
    } catch (error) {
        console.error('Error fetching gallery stats:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery stats' }, { status: 500 });
    }
}
