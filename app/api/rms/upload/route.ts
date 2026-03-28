import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import dbConnect from '@/lib/mongodb';
import { verifyExaminationAdmin } from '@/lib/firebase-admin';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function POST(request: Request) {
    try {
        const authUser = await verifyExaminationAdmin(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        if (file.type?.startsWith('image/')) {
            return NextResponse.json({ error: 'Images should be uploaded to Cloudinary for RMS.' }, { status: 400 });
        }

        if (file.size > 16 * 1024 * 1024) {
            return NextResponse.json({ error: 'File exceeds 16MB upload limit' }, { status: 400 });
        }

        await dbConnect();
        const db = mongoose.connection.db;
        if (!db) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
        }

        const bucket = new GridFSBucket(db, { bucketName: 'rms_files' });
        const fileName = sanitizeFileName(file.name || `rms_${Date.now()}`);
        const buffer = Buffer.from(await file.arrayBuffer());

        const uploadStream = bucket.openUploadStream(fileName, {
            metadata: {
                uploadedBy: authUser.uid,
                uploadedAt: new Date().toISOString(),
                originalName: file.name,
                mimeType: file.type || 'application/octet-stream',
            },
        });

        await new Promise<void>((resolve, reject) => {
            uploadStream.on('finish', () => resolve());
            uploadStream.on('error', (err) => reject(err));
            uploadStream.end(buffer);
        });

        const fileId = uploadStream.id?.toString();
        if (!fileId) {
            return NextResponse.json({ error: 'Failed to persist file id' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            storageType: 'mongodb',
            fileId,
            fileUrl: `/api/rms/files/${fileId}`,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
        });
    } catch (error: any) {
        console.error('Error uploading RMS document to MongoDB:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
