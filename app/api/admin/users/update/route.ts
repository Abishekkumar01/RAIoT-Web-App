import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, getInitError } from '@/lib/firebase-admin';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const {
            uid,
            email,
            displayName,
            role,
            profileData,
            joiningDate
        } = body;

        if (!uid) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            const initError = getInitError();
            return NextResponse.json(
                {
                    error: 'Firebase Admin not initialized',
                    details: initError ? initError.message : 'Unknown initialization error',
                    stack: initError ? initError.stack : undefined
                },
                { status: 500 }
            );
        }

        // 1. Update Auth Profile (Email, Display Name)
        // Only update if provided
        const authUpdates: any = {};
        if (email) authUpdates.email = email;
        if (displayName) authUpdates.displayName = displayName;

        if (Object.keys(authUpdates).length > 0) {
            try {
                await adminAuth.updateUser(uid, authUpdates);
                console.log(`Auth profile updated for user ${uid}`);
            } catch (authError: any) {
                console.error('Error updating auth profile:', authError);
                // If email is already taken, this matches client-side expectation
                if (authError.code === 'auth/email-already-exists') {
                    return NextResponse.json(
                        { error: 'This email is already in use by another account.' },
                        { status: 409 }
                    );
                }
                if (authError.code === 'auth/invalid-email') {
                    return NextResponse.json(
                        { error: 'Invalid email address format.' },
                        { status: 400 }
                    );
                }
                throw authError; // Re-throw other errors
            }
        }

        // 2. Update Firestore Document
        const firestoreUpdates: any = {
            updatedAt: new Date()
        };

        if (displayName) firestoreUpdates.displayName = displayName;
        if (email) firestoreUpdates.email = email;
        if (role) firestoreUpdates.role = role;
        if (joiningDate) firestoreUpdates.joiningDate = joiningDate;

        // Handle nested profileData updates carefully
        // We use dot notation for nested fields to avoid overwriting the entire map if not intended,
        // BUT here we want to ensure specific sub-fields are set.
        // It's safer to merge.
        if (profileData) {
            if (profileData.rollNumber) firestoreUpdates['profileData.rollNumber'] = profileData.rollNumber;
            if (profileData.phone) firestoreUpdates['profileData.phone'] = profileData.phone;
            if (profileData.branch) firestoreUpdates['profileData.branch'] = profileData.branch;
            if (profileData.year) firestoreUpdates['profileData.year'] = profileData.year;
        }

        await adminDb.collection('users').doc(uid).update(firestoreUpdates);
        console.log(`Firestore document updated for user ${uid}`);

        return NextResponse.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update user' },
            { status: 500 }
        );
    }
}
