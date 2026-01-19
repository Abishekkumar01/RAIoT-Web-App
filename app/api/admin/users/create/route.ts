import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, getInitError } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let {
            email,
            password,
            displayName,
            role,
            profileData,
            joiningDate
        } = body;

        // Sanitize inputs
        if (email) email = email.trim();
        if (password) password = password.trim();
        if (displayName) displayName = displayName.trim();

        // Basic validation
        if (!email || !password || !displayName || !role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
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

        // 1. Check for existing user in Auth
        try {
            const existingUser = await adminAuth.getUserByEmail(email);

            // User exists in Auth. Check if they exist in Firestore.
            const userDoc = await adminDb.collection('users').doc(existingUser.uid).get();

            if (userDoc.exists) {
                // Real duplicate user
                return NextResponse.json(
                    { error: 'This email is already registered' },
                    { status: 409 } // Conflict
                );
            } else {
                // "Zombie" account (exists in Auth but not Firestore). Delete it.
                console.log(`Found orphaned account for ${email} (UID: ${existingUser.uid}). Cleaning up...`);
                await adminAuth.deleteUser(existingUser.uid);
                console.log('Orphaned account deleted.');
            }
        } catch (error: any) {
            // If error is 'auth/user-not-found', that's good! Proceed.
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        // 2. Create User in Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName,
        });

        console.log(`Successfully created new user: ${userRecord.uid}`);

        // 3. Create User Document in Firestore
        const userData = {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: displayName,
            role: role,
            profileData: {
                rollNumber: profileData?.rollNumber || 'N/A',
                phone: profileData?.phone || 'N/A',
                branch: profileData?.branch || 'N/A',
                year: profileData?.year || 'N/A'
            },
            // Store initial password for admin reference (so they can share with new user)
            initialPassword: password,
            attendance: [],
            joiningDate: joiningDate || new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await adminDb.collection('users').doc(userRecord.uid).set(userData);
        console.log('User document created in Firestore');

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            message: 'User created successfully'
        });

    } catch (error: any) {
        console.error('Error creating user:', error);

        // Improve error message for known Auth errors
        let errorMessage = error.message || 'Failed to create user';
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'This email is already registered';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
