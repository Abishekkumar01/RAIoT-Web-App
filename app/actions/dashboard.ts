'use server'

import { collection, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getGalleryData } from '@/lib/gallery-data'

export async function getDashboardStats() {
    try {
        // 1. Fetch Events Count from Firestore
        // Note: db is initialized in lib/firebase.ts which uses client SDK. 
        // In Next.js Server Actions, this usually works if firebase-admin isn't strictly required, 
        // but for read operations it should be fine if rules allow or if using admin SDK.
        // Wait, standard firebase SDK checks auth. On server, there is no auth user unless we use cookies.
        // Converting to Admin SDK for server actions is best practice, but let's stick to what works in other files.
        // app/gallery/page.tsx uses `getGalleryData` which uses `db` from `@/lib/firebase`.
        // So `getGalleryData` works.
        // `getCountFromServer` might fail if it needs an authenticated user and we are on server without auth context?
        // Rules say: `match /events/{eventId} { allow read: if true; }` -> Publicly readable. So it should work.

        let eventCount = 0;
        try {
            const eventsColl = collection(db, "events");
            const eventsSnapshot = await getCountFromServer(eventsColl);
            eventCount = eventsSnapshot.data().count;
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
