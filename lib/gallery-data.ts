import { listGalleryEvents, getEventImages, DriveFile } from '@/lib/drive';
import { fetchGithubGallery, GithubRepoConfig } from '@/lib/github';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { unstable_cache } from 'next/cache';

export interface GalleryEventWithImages extends DriveFile {
    images: DriveFile[];
    description?: string;
    customDate?: string;
    order?: number;
    displayName?: string;
    tag?: string;
    batch?: string;
    originalName?: string;
}

interface GalleryConfig {
    sourceType?: 'drive' | 'github';
    rootFolderId?: string;
    githubConfig?: GithubRepoConfig;
}

// 1. Fetch Root Config
const getGalleryConfig = async (): Promise<GalleryConfig | null> => {
    try {
        if (process.env.NEXT_PUBLIC_GALLERY_REPO_OWNER && process.env.NEXT_PUBLIC_GALLERY_REPO_NAME) {
            return {
                sourceType: 'github',
                githubConfig: {
                    owner: process.env.NEXT_PUBLIC_GALLERY_REPO_OWNER,
                    repo: process.env.NEXT_PUBLIC_GALLERY_REPO_NAME,
                    path: '',
                    branch: 'main'
                }
            };
        }

        const docRef = doc(db, 'settings', 'gallery_config');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as GalleryConfig : null;
    } catch (e) {
        console.error("Config Fetch Error", e);
        return null;
    }
}

// Helper to fetch metadata
const getGalleryMetadata = async () => {
    try {
        const docRef = doc(db, 'settings', 'gallery_metadata');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : {};
    } catch (e) {
        console.error("Metadata Fetch Error", e);
        return {};
    }
}

// 2. Fetch All Gallery Data (Cached)
const fetchGalleryDataInternal = async (config: GalleryConfig) => {
    // Fetch metadata
    const metadata: any = await getGalleryMetadata();

    let eventsWithImages: GalleryEventWithImages[] = [];

    // A. GitHub Source
    if (config.sourceType === 'github' && config.githubConfig) {
        try {
            const events = await fetchGithubGallery(config.githubConfig);
            eventsWithImages = events as unknown as GalleryEventWithImages[];
        } catch (err) {
            console.error("Error calling fetchGithubGallery:", err);
        }
    }
    // B. Drive Source (Default)
    else {
        const rootId = config.rootFolderId;
        if (!rootId) return [];

        const events = await listGalleryEvents(rootId);
        if (!events.length) return [];

        eventsWithImages = await Promise.all(
            events.map(async (event) => {
                const images = await getEventImages(event.id);
                return {
                    ...event,
                    images
                };
            })
        );
    }

    // Merge Metadata & Sort
    const processedEvents = eventsWithImages.map(event => {
        const verifyKey = (key: string) => metadata[key] ? metadata[key] : null;
        const meta = verifyKey(event.id) || verifyKey(event.name) || {};

        return {
            ...event,
            ...meta,
            name: meta.displayName || event.name,
            originalName: event.name
        };
    });

    // Sort by Order (ascending), then Date (descending - newest first)
    processedEvents.sort((a, b) => {
        const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 9999;
        const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 9999;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        try {
            const dateA = new Date(a.customDate || a.createdTime || 0).getTime();
            const dateB = new Date(b.customDate || b.createdTime || 0).getTime();
            return dateB - dateA;
        } catch (e) {
            return 0; // Keep original order if date parsing fails
        }
    });

    return processedEvents;
};

// Wrap with cache
export const getCachedGalleryData = unstable_cache(
    async (config: GalleryConfig) => fetchGalleryDataInternal(config),
    ['gallery-data'],
    { revalidate: 30, tags: ['gallery'] }
);

export async function getGalleryData() {
    try {
        const config = await getGalleryConfig();
        if (!config) return null;
        return getCachedGalleryData(config);
    } catch (e) {
        console.error("Failed getGalleryData", e);
        return [];
    }
}
