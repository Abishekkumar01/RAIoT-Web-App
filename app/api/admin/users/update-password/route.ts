import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, getInitError } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { userId, newPassword } = body;

        // Trim password to avoid copy-paste whitespace issues
        if (newPassword && typeof newPassword === 'string') {
            newPassword = newPassword.trim();
        }

        // Basic validation
        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: 'Missing required fields: userId and newPassword' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
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
                },
                { status: 500 }
            );
        }

        // Update password in Firebase Auth
        await adminAuth.updateUser(userId, {
            password: newPassword
        });

        console.log(`Successfully updated password for user: ${userId}`);

        // Update passwordChangedAt timestamp and new password in Firestore
        await adminDb.collection('users').doc(userId).update({
            initialPassword: newPassword, // Store new password for admin reference
            passwordChangedAt: new Date(),
            passwordChangedBy: 'admin',
            updatedAt: new Date()
        });

        console.log('Password change tracked in Firestore');

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error: any) {
        console.error('Error updating password:', error);

        let errorMessage = error.message || 'Failed to update password';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
