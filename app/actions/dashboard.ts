'use server'

import { getGalleryData } from '@/lib/gallery-data'

export async function getDashboardStats() {
    try {
        let eventCount = 0;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/events`, {
                cache: 'no-store'
            });
            const payload = await response.json().catch(() => ({}));
            const events = Array.isArray(payload?.data) ? payload.data : [];
            eventCount = events.length;
        } catch (e) {
            console.error("Error fetching event count:", e);
        }

        // 2. Fetch Gallery Data
        let galleryStats = { totalSections: 0, totalImages: 0 };
        try {
            const galleryData = await getGalleryData();
            if (galleryData) {
                galleryStats.totalSections = galleryData.length;
                galleryStats.totalImages = galleryData.reduce((acc, section) => acc + (section.images?.length || 0), 0);
            }
        } catch (e) {
            console.error("Error fetching gallery data:", e);
        }

        return {
            eventCount,
            galleryStats
        }
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        return {
            eventCount: 0,
            galleryStats: { totalSections: 0, totalImages: 0 }
        }
    }
}
