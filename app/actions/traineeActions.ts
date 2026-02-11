'use server';

import dbConnect from '@/lib/mongodb';
import Trainee, { ITrainee } from '@/lib/models/Trainee';
import { revalidatePath } from 'next/cache';

export async function submitTraineeRegistration(formData: any) {
    try {
        await dbConnect();

        // Check if user already submitted? (Optional: based on userId or email)
        // For now, let's allow multiple submissions or handle unique constraints in Schema if needed.
        // The schema has unique: true for nothing explicitly but we might want to check email/userId.

        const newTrainee = new Trainee(formData);
        await newTrainee.save();

        console.log(`Trainee registered: ${newTrainee._id}`);

        // Revalidate relevant paths if needed (e.g., if there's an admin dashboard showing this list)
        revalidatePath('/admin/trainees');

        return { success: true, message: 'Application submitted successfully!' };

    } catch (error: any) {
        console.error('Error in submitTraineeRegistration:', error);
        return {
            success: false,
            message: error.message || 'Failed to submit application. Please try again.'
        };
    }
}
