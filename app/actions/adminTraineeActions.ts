'use server';

import dbConnect from '@/lib/mongodb';
import Trainee, { ITrainee } from '@/lib/models/Trainee';
import { revalidatePath } from 'next/cache';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

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

export async function addTrainee(data: any) {
    try {
        await dbConnect();
        
        let firebaseUid = data.userId || 'admin-added';

        // Attempt to create auth identity if password is provided
        if (data.password && data.email && data.name) {
            const adminAuth = getAdminAuth();
            const adminDb = getAdminDb();
            
            if (adminAuth && adminDb) {
                try {
                    // Create Firebase User
                    const userRecord = await adminAuth.createUser({
                        email: data.email,
                        password: data.password,
                        displayName: data.name
                    });
                    
                    firebaseUid = userRecord.uid;
                    
                    // Add users collection record for RBAC
                    await adminDb.collection('users').doc(firebaseUid).set({
                        email: data.email,
                        name: data.name,
                        role: 'trainee',
                        createdAt: new Date().toISOString(),
                        source: 'admin-dashboard'
                    });
                } catch (fbError: any) {
                    console.error("Failed to create Firebase Auth user:", fbError);
                    return { success: false, error: `Firebase Error: ${fbError.message}` };
                }
            } else {
                return { success: false, error: "Firebase Admin is not configured correctly on the server." };
            }
        }

        const newTrainee = new Trainee({
            ...data,
            userId: firebaseUid,
            status: data.status || 'Pending',
            passportPhotoUrl: data.passportPhotoUrl || 'https://via.placeholder.com/150',
            hobby: data.hobby || 'N/A',
            dob: data.dob || '2000-01-01',
            enrollmentNo: data.enrollmentNo || 'N/A',
            course: data.course || data.department || 'N/A',
            currentStatus: data.currentStatus || 'N/A',
            areasOfInterest: data.areasOfInterest && data.areasOfInterest.length > 0 ? data.areasOfInterest : ['None'],
        });
        
        await newTrainee.save();
        revalidatePath('/admin/trainees');
        return { success: true, data: serializeTrainee(newTrainee) };
    } catch (error: any) {
        console.error('Error adding trainee:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTraineeDetails(id: string, data: any) {
    try {
        await dbConnect();

        // Check if we need to update the Firebase password or email
        if (data.password || data.email) {
            const adminAuth = getAdminAuth();
            const adminDb = getAdminDb();
            
            if (adminAuth && adminDb) {
                // To update Firebase, we need the original email or userId
                const existingTrainee = await Trainee.findById(id);
                if (existingTrainee) {
                    try {
                        let uid = existingTrainee.userId;
                        let userRecord = null;
                        
                        // Try to get user by UID, if it's "admin-added" try by email
                        if (uid && uid !== 'admin-added') {
                            try { userRecord = await adminAuth.getUser(uid); } catch (e) {}
                        }
                        if (!userRecord && existingTrainee.email) {
                            try { userRecord = await adminAuth.getUserByEmail(existingTrainee.email); } catch (e) {}
                        }
                        
                        // If user doesn't exist but a password is provided now, we should create them!
                        if (!userRecord && data.password && data.email) {
                            userRecord = await adminAuth.createUser({
                                email: data.email,
                                password: data.password,
                                displayName: data.name || existingTrainee.name
                            });
                            // Store the real UID now
                            data.userId = userRecord.uid;
                            
                            await adminDb.collection('users').doc(userRecord.uid).set({
                                email: data.email,
                                name: data.name || existingTrainee.name,
                                role: 'trainee',
                                createdAt: new Date().toISOString()
                            }, { merge: true });
                            
                        } else if (userRecord && data.password) {
                            // Just update existing password
                            await adminAuth.updateUser(userRecord.uid, {
                                password: data.password
                            });
                        }
                    } catch (fbError: any) {
                        console.error('Firebase Auth update failed:', fbError);
                        return { success: false, error: `Firebase Error: ${fbError.message}` };
                    }
                }
            }
        }
        
        // Remove password from data so we don't save it to MongoDB accidentally
        if (data.password) {
            delete data.password;
        }

        const trainee = await Trainee.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true }
        );
        if (!trainee) {
            return { success: false, error: 'Trainee not found' };
        }
        revalidatePath('/admin/trainees');
        return { success: true, data: serializeTrainee(trainee) };
    } catch (error: any) {
        console.error('Error updating trainee details:', error);
        return { success: false, error: error.message };
    }
}
