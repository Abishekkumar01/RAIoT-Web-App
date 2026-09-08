import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    sourceFirestoreId?: string;
    title: string;
    description: string;
    detailedContent?: string;
    date: string;
    time: string;
    duration: number;
    location: string;
    type: 'workshop' | 'seminar' | 'competition' | 'meeting' | 'showcase';
    maxParticipants?: number;
    registered?: number;
    minTeamSize?: number;
    maxTeamSize?: number;
    registrationDeadline?: string;
    imageUrl?: string | null;
    status?: 'active' | 'inactive';
    isOnline?: boolean;
    registrationType?: 'in-site' | 'external';
    externalRegistrationLink?: string;
    requiresLogin?: boolean;
    showCapacity?: boolean;
    subEvents?: {
        id: string;
        title: string;
        description: string;
        time?: string;
        location?: string;
        rulebookUrl?: string;
        imageUrl?: string;
        lottieUrl?: string;
    }[];
    teamMembers?: {
        id: string;
        name: string;
        role: string;
        contact: string;
        imageUrl?: string;
    }[];
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
    {
        sourceFirestoreId: { type: String, index: true, sparse: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        detailedContent: { type: String, default: '' },
        date: { type: String, required: true },
        time: { type: String, required: true },
        duration: { type: Number, required: true, min: 0 },
        location: { type: String, default: '' },
        type: {
            type: String,
            enum: ['workshop', 'seminar', 'competition', 'meeting', 'showcase'],
            default: 'workshop',
        },
        maxParticipants: { type: Number, default: 0, min: 0 },
        registered: { type: Number, default: 0, min: 0 },
        minTeamSize: { type: Number, default: 2, min: 1 },
        maxTeamSize: { type: Number, default: 10, min: 1 },
        registrationDeadline: { type: String, default: '' },
        imageUrl: { type: String, default: null },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        isOnline: { type: Boolean, default: true },
        registrationType: { type: String, enum: ['in-site', 'external'], default: 'in-site' },
        externalRegistrationLink: { type: String, default: '' },
        requiresLogin: { type: Boolean, default: true },
        showCapacity: { type: Boolean, default: true },
        subEvents: [{
            id: { type: String, required: true },
            title: { type: String, required: true },
            description: { type: String, default: '' },
            time: { type: String, default: '' },
            location: { type: String, default: '' },
            rulebookUrl: { type: String, default: '' },
            imageUrl: { type: String, default: '' },
            lottieUrl: { type: String, default: '' }
        }],
        teamMembers: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            role: { type: String, default: '' },
            contact: { type: String, default: '' },
            imageUrl: { type: String, default: '' }
        }],
        createdBy: { type: String, default: '' },
    },
    { timestamps: true }
);

export default mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema);
