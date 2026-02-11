'use server';

import dbConnect from '@/lib/mongodb';
import Trainee, { ITrainee } from '@/lib/models/Trainee';
import { revalidatePath } from 'next/cache';

// Helper to serialize Mongoose documents to plain objects
function serializeTrainee(trainee: any) {
    return {
        id: trainee._id.toString(),
        name: trainee.name,
        email: trainee.email,
        phoneWhatsApp: trainee.phoneWhatsApp,
        phoneCall: trainee.phoneCall,
        dob: trainee.dob,
        enrollmentNo: trainee.enrollmentNo,
        course: trainee.course,
        gender: trainee.gender,
        residence: trainee.residence,
        department: trainee.department, // Legacy/Fallback
        currentStatus: trainee.currentStatus,
        areasOfInterest: trainee.areasOfInterest || [],
        skills: trainee.skills,
        hobby: trainee.hobby,
        laptopSpecs: trainee.laptopSpecs,
        hasLaptop: trainee.hasLaptop,
        passportPhotoUrl: trainee.passportPhotoUrl,
        whatsappScreenshotUrl: trainee.whatsappScreenshotUrl,
        status: trainee.status,
        timestamp: trainee.createdAt ? trainee.createdAt.toISOString() : new Date().toISOString(),
    };
}

export async function getAllTrainees() {
    try {
        await dbConnect();
        const trainees = await Trainee.find({}).sort({ createdAt: -1 });
        return { success: true, data: trainees.map(serializeTrainee) };
    } catch (error: any) {
        console.error('Error fetching trainees:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTraineeStatus(id: string, status: string) {
    try {
        await dbConnect();
        const trainee = await Trainee.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        if (!trainee) {
            return { success: false, error: 'Trainee not found' };
        }
        revalidatePath('/admin/trainees');
        return { success: true, data: serializeTrainee(trainee) };
    } catch (error: any) {
        console.error('Error updating trainee status:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteTrainee(id: string) {
    try {
        await dbConnect();
        const trainee = await Trainee.findByIdAndDelete(id);
        if (!trainee) {
            return { success: false, error: 'Trainee not found' };
        }
        revalidatePath('/admin/trainees');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting trainee:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAllTrainees() {
    try {
        await dbConnect();
        // This is a destructive action!
        await Trainee.deleteMany({});
        revalidatePath('/admin/trainees');
        return { success: true, message: 'All trainee data has been cleared.' };
    } catch (error: any) {
        console.error('Error deleting all trainees:', error);
        return { success: false, error: error.message };
    }
}
