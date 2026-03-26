import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, verifySuperAdmin } from '@/lib/firebase-admin';

export async function DELETE(request: Request) {
    try {
        const authUser = await verifySuperAdmin(request);
        if (!authUser) {
            return NextResponse.json(
                { error: 'Unauthorized: Superadmin access required' },
                { status: 401 }
            );
        }

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

        // 1. Fetch current user snapshot for history archive
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : null;

        // 2. Save archival history in previousMembers collection
        await adminDb.collection('previousMembers').doc(userId).set({
            uid: userId,
            ...(userData || {}),
            archivedAt: new Date().toISOString(),
            archivedBy: {
                uid: authUser.uid,
                email: authUser.email
            },
            accessRevoked: true,
            archivedFrom: 'users'
        }, { merge: true });

        // 3. Delete from Firebase Authentication
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

        // 4. Delete active profile from Firestore so user is removed from active portals/resources
        await userRef.delete();
        console.log(`Successfully deleted user ${userId} from Firestore`);

        return NextResponse.json({ success: true, message: 'User moved to previous members and access revoked' });

    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
