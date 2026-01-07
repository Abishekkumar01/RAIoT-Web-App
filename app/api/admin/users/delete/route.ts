import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export async function DELETE(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'UserId is required' },
                { status: 400 }
            );
        }

        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json(
                { error: 'Firebase Admin not initialized' },
                { status: 500 }
            );
        }

        // 1. Delete from Firebase Authentication
        try {
            await adminAuth.deleteUser(userId);
            console.log(`Successfully deleted user ${userId} from Auth`);
        } catch (authError: any) {
            // If user not found in Auth, we can proceed to delete from Firestore
            console.warn(`Error deleting user from Auth (might not exist):`, authError);
            if (authError.code !== 'auth/user-not-found') {
                throw authError;
            }
        }

        // 2. Delete from Firestore
        await adminDb.collection('users').doc(userId).delete();
        console.log(`Successfully deleted user ${userId} from Firestore`);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
