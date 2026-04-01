export interface MemberResource {
    id: string; // Document ID
    userId: string; // Target member's UID or 'all' for global visibility
    title: string; // Name of the resource
    description?: string; // Optional context
    fileUrl: string; // File URL or external learning link
    fileName?: string; // Original uploaded file name; optional for external links
    storageType?: 'cloudinary' | 'mongodb' | 'link';
    mongoFileId?: string;
    mimeType?: string;
    uploadedAt: number; // Timestamp
    uploadedBy: string; // Admin uid who uploaded it
}