import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendanceRecord {
    studentId: string;
    studentName: string;
    studentUniqueId: string;
    status: 'present' | 'absent' | 'late' | 'leave';
    markedBy: string;
    timestamp: Date;
}

export interface IAttendance extends Document {
    date: string; // YYYY-MM-DD
    records: IAttendanceRecord[];
    subject?: string;
    timeRange?: string;
    location?: string;
    type: 'regular' | 'holiday';
    markedBy: string; // User ID of the admin who marked it
    createdAt: Date;
    updatedAt: Date;
}

const attendanceRecordSchema = new Schema({
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    studentUniqueId: { type: String },
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
    markedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const attendanceSchema: Schema<IAttendance> = new Schema({
    date: { type: String, required: true, unique: true }, // One document per day
    records: [attendanceRecordSchema],
    subject: { type: String },
    timeRange: { type: String },
    location: { type: String },
    type: { type: String, enum: ['regular', 'holiday'], default: 'regular' },
    markedBy: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', attendanceSchema);
