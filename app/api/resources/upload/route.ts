import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

export async function POST(req: Request) {
    try {
        const mongooseInstance = await dbConnect();
        
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        
        if (!file || !userId) {
            return NextResponse.json({ error: 'File and userId are required' }, { status: 400 });
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const db = mongooseInstance.connection.db;
        const bucket = new mongooseInstance.mongo.GridFSBucket(db!, {
            bucketName: 'member_resources'
        });
        
        const uploadStream = bucket.openUploadStream(file.name, {
            contentType: file.type,
            metadata: {
                userId: userId,
                uploadedAt: new Date()
            }
        });
        
        await new Promise((resolve, reject) => {
            uploadStream.end(buffer, (error) => {
                if (error) reject(error);
                else resolve(true);
            });
        });
        
        return NextResponse.json({ 
            success: true, 
            fileId: uploadStream.id.toString(),
            message: 'File uploaded to MongoDB via GridFS'
        });
        
    } catch (error: any) {
        console.error('Error uploading file to MongoDB:', error);
        return NextResponse.json({ 
            error: 'Error uploading file', 
            details: error.message || error.toString(),
            stack: error.stack
        }, { status: 500 });
    }
}
