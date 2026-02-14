'use server';

import dbConnect from '@/lib/mongodb';
import Attendance, { IAttendance } from '@/lib/models/Attendance';
import { revalidatePath } from 'next/cache';

// Helper to serialize
function serialize(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}

// 1. Get Attendance for a specific date
export async function getAttendanceByDate(dateStr: string) {
    try {
        await dbConnect();
        const doc = await Attendance.findOne({ date: dateStr });
        if (!doc) return { success: true, data: null };
        return { success: true, data: serialize(doc) };
    } catch (error: any) {
        console.error('Error fetching attendance:', error);
        return { success: false, error: error.message };
    }
}

// 2. Save/Update Attendance for a specific date
export async function saveAttendance(data: {
    date: string;
    records: any[];
    subject?: string;
    timeRange?: string;
    location?: string;
    type: 'regular' | 'holiday';
    markedBy: string;
}) {
    try {
        await dbConnect();
        // Upsert: Update if exists, Insert if not
        const { date, ...updateData } = data;
        const doc = await Attendance.findOneAndUpdate(
            { date: date },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );
        return { success: true, data: serialize(doc) };
    } catch (error: any) {
        console.error('Error saving attendance:', error);
        return { success: false, error: error.message };
    }
}

// 3. Fetch ALL Attendance (for Export)
export async function getAllAttendanceRecords() {
    try {
        await dbConnect();
        // Fetch all documents, sorted by date
        const docs = await Attendance.find({}).sort({ date: 1 });

        // Flatten the data for Excel export
        // We want a list of EVERY student-day record
        const flatRecords: any[] = [];

        docs.forEach((doc: IAttendance) => {
            if (doc.type === 'holiday') {
                flatRecords.push({
                    Date: doc.date,
                    Type: 'Holiday',
                    Subject: 'N/A',
                    StudentName: 'ALL', // Indicate everyone got holiday
                    StudentID: 'N/A',
                    Status: 'Holiday',
                    MarkedBy: doc.markedBy
                });
            } else {
                doc.records.forEach(record => {
                    flatRecords.push({
                        Date: doc.date,
                        Type: 'Regular',
                        Subject: doc.subject || 'N/A',
                        Time: doc.timeRange || 'N/A',
                        StudentName: record.studentName,
                        StudentID: record.studentUniqueId,
                        Status: record.status,
                        MarkedBy: record.markedBy
                    });
                });
            }
        });

        return { success: true, data: flatRecords };
    } catch (error: any) {
        console.error('Error fetching all attendance:', error);
        return { success: false, error: error.message };
    }
}

// 4. Clear ALL Attendance (after export)
export async function deleteAllAttendanceData() {
    try {
        await dbConnect();
        await Attendance.deleteMany({});
        return { success: true, message: 'All attendance history cleared.' };
    } catch (error: any) {
        console.error('Error deleting attendance:', error);
        return { success: false, error: error.message };
    }
}

// 5. Get Attendance Stats (Percentage)
export async function getAttendanceStats() {
    try {
        await dbConnect();

        const stats = await Attendance.aggregate([
            { $match: { type: 'regular' } }, // Only count regular sessions
            { $unwind: '$records' },
            {
                $group: {
                    _id: '$records.studentId',
                    presentCount: {
                        $sum: {
                            $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0]
                        }
                    },
                    totalSessions: { $sum: 1 }
                }
            }
        ]);

        const statsMap: Record<string, { present: number, total: number, rate: number }> = {};

        stats.forEach(item => {
            if (item._id) {
                statsMap[item._id] = {
                    present: item.presentCount,
                    total: item.totalSessions,
                    rate: item.totalSessions > 0
                        ? parseFloat(((item.presentCount / item.totalSessions) * 100).toFixed(1))
                        : 0
                };
            }
        });

        return { success: true, data: statsMap };
    } catch (error: any) {
        console.error('Error fetching aggregate stats:', error);
        return { success: false, error: error.message };
    }
}
