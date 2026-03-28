import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongodb';
import { verifyUser } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const authUser = await verifyUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fileId = params.id;
        if (!ObjectId.isValid(fileId)) {
            return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
        }

        await dbConnect();
        const db = mongoose.connection.db;
        if (!db) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
        }

        const bucket = new GridFSBucket(db, { bucketName: 'rms_files' });
        const objectId = new ObjectId(fileId);
        const fileDoc = await bucket.find({ _id: objectId }).next();
        if (!fileDoc) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const downloadStream = bucket.openDownloadStream(objectId);
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
            downloadStream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            downloadStream.on('error', reject);
            downloadStream.on('end', () => resolve());
        });

        const buffer = Buffer.concat(chunks);
        const headers = new Headers();
        const metadata = (fileDoc.metadata || {}) as { mimeType?: string; originalName?: string };
        headers.set('Content-Type', metadata.mimeType || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${metadata.originalName || fileDoc.filename || 'resource'}"`);

        return new NextResponse(buffer, { status: 200, headers });
    } catch (error: any) {
        console.error('Error downloading RMS document from MongoDB:', error);
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }
}
