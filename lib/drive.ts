export const GOOGLE_DRIVE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
export const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    webContentLink?: string;
    createdTime?: string;
    url?: string;
}

/**
 * Extracts the Folder ID from a Google Drive URL
 */
export const extractFolderId = (url: string): string | null => {
    // Configurable regex for various Drive URL formats
    const patterns = [
        /\/folders\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /open\?id=([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // If the user pasted just the ID
    if (/^[a-zA-Z0-9_-]{15,}$/.test(url)) {
        return url;
    }

    return null;
};

/**
 * Validates the API key and accessibility of the folder
 */
export const checkFolderAccess = async (folderId: string): Promise<boolean> => {
    try {
        const url = `${GOOGLE_DRIVE_API_BASE}/${folderId}?key=${GOOGLE_DRIVE_API_KEY}&fields=id,name`;
        const res = await fetch(url);
        return res.ok;
    } catch (e) {
        console.error("Drive Access Check Failed:", e);
        return false;
    }
};

/**
 * Lists subfolders (Events) within the root gallery folder
 */
export const listGalleryEvents = async (rootFolderId: string): Promise<DriveFile[]> => {
    if (!rootFolderId) return [];

    const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = `${GOOGLE_DRIVE_API_BASE}?q=${encodeURIComponent(q)}&key=${GOOGLE_DRIVE_API_KEY}&fields=files(id,name,createdTime)&orderBy=createdTime desc`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        return data.files || [];
    } catch (e) {
        console.error("Error fetching gallery events:", e);
        return [];
    }
};

/**
 * Lists images within a specific event folder
 */
export const getEventImages = async (folderId: string): Promise<DriveFile[]> => {
    if (!folderId) return [];

    // Query for images
    const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
    // Request fields needed for display (webContentLink is usually the download link, thumbnailLink is better for previews)
    // We'll ask for webContentLink and thumbnailLink (s1024 or similar can be hacked into thumbnail link if needed)
    const url = `${GOOGLE_DRIVE_API_BASE}?q=${encodeURIComponent(q)}&key=${GOOGLE_DRIVE_API_KEY}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&pageSize=1000`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch images');
        const data = await res.json();

        // Helper to get high-res image from thumbnail link (hacky but standard Drive API trick)
        // thumbnailLink usually ends in =s220. Replacing with =s2048 gives high res.
        return (data.files || []).map((f: any) => ({
            ...f,
            url: f.thumbnailLink ? f.thumbnailLink.replace('=s220', '=s2048') : f.webContentLink
        }));
    } catch (e) {
        console.error("Error fetching event images:", e);
        return [];
    }
};
