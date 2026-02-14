'use server';

import dbConnect from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Trainee from '@/lib/models/Trainee';

export async function getDatabaseStats() {
    try {
        await dbConnect();

        // MongoDB Free Tier limit is 512MB.
        // Since we can't easily get exact byte size in all environments without admin privileges,
        // we will estimate based on document counts or just return counts for the UI.

        // Count documents
        const attendanceCount = await Attendance.countDocuments();
        const traineeCount = await Trainee.countDocuments();

        // Rough estimation: 
        // 1 Attendance record ~ 2KB (mostly text + record array)
        // 1 Trainee record ~ 1KB
        const estimatedBytes = (attendanceCount * 2048) + (traineeCount * 1024);
        const maxBytes = 512 * 1024 * 1024; // 512MB
        const usagePercentage = (estimatedBytes / maxBytes) * 100;

        return {
            success: true,
            data: {
                attendanceCount,
                traineeCount,
                estimatedBytes,
                usagePercentage: Math.min(usagePercentage, 100).toFixed(4), // Cap at 100
                maxBytes
            }
        };

    } catch (error: any) {
        console.error("Error fetching DB stats:", error);
        return { success: false, error: error.message };
    }
}
