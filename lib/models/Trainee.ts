import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITrainee extends Document {
    name: string;
    email: string;
    phoneWhatsApp: string;
    phoneCall: string;
    dob: string;
    enrollmentNo: string;
    course: string;
    currentStatus: string;
    skills?: string;
    areasOfInterest: string[];
    hobby: string;
    passportPhotoUrl: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    userId: string; // Firebase UID
    createdAt: Date;
    updatedAt: Date;
}

const TraineeSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phoneWhatsApp: { type: String, required: true },
        phoneCall: { type: String, required: true },
        dob: { type: String, required: true },
        enrollmentNo: { type: String, required: true },
        course: { type: String, required: true },
        currentStatus: { type: String, required: true },
        skills: { type: String },
        areasOfInterest: { type: [String], required: true },
        hobby: { type: String, required: true },
        passportPhotoUrl: { type: String, required: true },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
        userId: { type: String, required: true },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Prevent overwriting the model if it's already compiled
const Trainee: Model<ITrainee> =
    mongoose.models.Trainee || mongoose.model<ITrainee>('Trainee', TraineeSchema);

export default Trainee;
