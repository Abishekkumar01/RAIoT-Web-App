'use server';

import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function testConnection() {
    try {
        const conn = await dbConnect();
        const state = mongoose.connection.readyState;
        const stateMap = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
            99: 'uninitialized',
        };
        const status = stateMap[state] || 'unknown';

        // Try a simple ping
        if (conn.connection.db) {
            await conn.connection.db.admin().ping();
            return { success: true, message: `Connected successfully! State: ${status}`, state };
        } else {
            return { success: false, error: `Connected but DB instance missing. State: ${status}` };
        }

    } catch (error: any) {
        console.error("Test Connection Error:", error);
        return {
            success: false,
            error: error.message || "Unknown connection error",
            stack: error.stack
        };
    }
}
