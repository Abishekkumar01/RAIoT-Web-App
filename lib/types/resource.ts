export interface MemberResource {
    id: string; // Document ID
    userId: string; // Target member's UID or 'all' for global visibility
    title: string; // Name of the resource
    description?: string; // Optional context
    fileUrl: string; // Cloudinary URL
    fileName: string; // Original uploaded file name
    storageType?: 'cloudinary' | 'mongodb';
    mongoFileId?: string;
    mimeType?: string;
    uploadedAt: number; // Timestamp
    uploadedBy: string; // Admin uid who uploaded it
}