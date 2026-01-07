'use server'

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGalleryData } from '@/lib/gallery-data';
import { revalidateTag } from 'next/cache';

export interface GalleryMetadata {
    [key: string]: {
        description?: string;
        customDate?: string; // ISO string or specific format
        order?: number;
        displayName?: string;
        tag?: string;
        batch?: string;
        hidden?: boolean;
    }
}

export async function getAdminGalleryData() {
    try {
        // 1. Fetch the raw gallery events (folders) from existing logic
        const rawEvents = await getGalleryData();

        // 2. Fetch the metadata from Firestore
        const docRef = doc(db, 'settings', 'gallery_metadata');
        const docSnap = await getDoc(docRef);
        const metadata = docSnap.exists() ? docSnap.data() as GalleryMetadata : {};

        // 3. Merge raw events with metadata
        if (!rawEvents) return { events: [], metadata };

        // We return both raw structure and metadata so the UI can map them
        // The UI will be responsible for matching rawEvents[i].id (or name) with metadata keys
        return { events: rawEvents, metadata };

    } catch (error) {
        console.error("Error fetching admin gallery data:", error);
        throw new Error("Failed to fetch gallery data");
    }
}

export async function saveGalleryMetadata(metadata: GalleryMetadata) {
    try {
        const docRef = doc(db, 'settings', 'gallery_metadata');
        // We use merge: true to avoid overwriting unrelated keys if we were sending partial updates,
        // but here we might want to save the whole state. 
        // However, let's assume we are sending the complete metadata object for safety or just updates.
        // For this implementation, we'll save the provided metadata object.
        await setDoc(docRef, metadata, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving gallery metadata:", error);
        throw new Error("Failed to save gallery metadata");
    }
}

export async function revalidateGallery() {
    revalidateTag('gallery');
}
