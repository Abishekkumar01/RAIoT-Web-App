import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { Readable } from 'stream';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        
        const mongooseInstance = await dbConnect();
        const db = mongooseInstance.connection.db;
        const bucket = new mongooseInstance.mongo.GridFSBucket(db!, {
            bucketName: 'member_resources'
        });

        const objectId = new mongooseInstance.Types.ObjectId(id);
        const files = await bucket.find({ _id: objectId }).toArray();

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'File Not Found' }, { status: 404 });
        }

        const file = files[0];
        const downloadStream = bucket.openDownloadStream(objectId);
        
        const chunks: Buffer[] = [];
        
        return new Promise<NextResponse>((resolve, reject) => {
            downloadStream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            downloadStream.on('error', (err) => {
                console.error("Download Error:", err);
                reject(NextResponse.json({ error: 'Download stream error' }, { status: 500 }));
            });
            
            downloadStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const headers = new Headers();
                headers.set('Content-Type', file.contentType || 'application/octet-stream');
                headers.set('Content-Disposition', `inline; filename="${file.filename}"`);
                
                resolve(new NextResponse(buffer, {
                    status: 200,
                    headers: headers
                }));
            });
        });

    } catch (error) {
        console.error('Error fetching resource from MongoDB:', error);
        return NextResponse.json({ error: 'Server error retrieving file' }, { status: 500 });
    }
}
