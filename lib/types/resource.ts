export interface MemberResource {
    id: string; // Document ID
    userId: string; // Target member's UID
    title: string; // Name of the resource
    description?: string; // Optional context
    fileUrl: string; // Cloudinary URL
    fileName: string; // Original uploaded file name
    uploadedAt: number; // Timestamp
    uploadedBy: string; // Admin uid who uploaded it
}