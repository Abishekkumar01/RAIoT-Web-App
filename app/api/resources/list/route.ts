import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        
        const mongooseInstance = await dbConnect();
        
        const db = mongooseInstance.connection.db;
        const bucket = new mongooseInstance.mongo.GridFSBucket(db!, {
            bucketName: 'member_resources'
        });
        
        const filter = userId ? { 'metadata.userId': userId } : {};
        const files = await bucket.find(filter).toArray();
        
        return NextResponse.json({ success: true, files });
    } catch (error) {
        console.error('Error fetching resources from MongoDB:', error);
        return NextResponse.json({ error: 'Error fetching resources' }, { status: 500 });
    }
}
