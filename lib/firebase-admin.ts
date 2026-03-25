import { initializeApp, getApps, App, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Store initialization error for debugging
let initError: Error | null = null;
let app: App;

if (getApps().length === 0) {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        let privateKey: string | undefined = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            // Try to parse as JSON first (in case user pasted the whole service-account.json)
            try {
                const jsonKey = JSON.parse(privateKey);
                if (jsonKey.private_key) {
                    privateKey = jsonKey.private_key;
                    console.log("Create Agent: Extracted private key from JSON.");
                }
            } catch (e) {
                // Not a JSON object, continue
            }

            // Handle possibility of Base64 encoded key
            if (privateKey && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                try {
                    const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
                    if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
                        console.log("Create Agent: Detected and decoded Base64 private key.");
                        privateKey = decoded;
                    }
                } catch (e) {
                    // Not base64 or failed to decode
                }
            }

            // Standard cleanup:
            // 1. Remove wrapping quotes (common in JSON/Env vars when pasted incorrectly)
            // 2. Unescape newlines (fixes "\n" literals from JSON)
            if (privateKey) {
                privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
            }
        }

        console.log("Create Agent: Initializing Firebase Admin...");
        console.log(`- Project ID available: ${!!projectId}`);
        console.log(`- Client Email available: ${!!clientEmail}`);
        console.log(`- Private Key available: ${!!privateKey}`);

        if (projectId && clientEmail && privateKey) {
            app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log("Create Agent: Firebase Admin initialized with custom credentials.");
        } else {
            console.warn("Create Agent: Missing custom credentials. Attempting default initialization...");
            // Fallback to default credentials (GOOGLE_APPLICATION_CREDENTIALS)
            app = initializeApp();
        }
    } catch (error: any) {
        console.error("Firebase Admin initialization failed. Ensure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set.", error);
        initError = error;
    }
} else {
    app = getApp();
}

export const getInitError = () => initError;

// Export a function to get DB so we can handle potential startup failures
export const getAdminDb = () => {
    try {
        if (!getApps().length) return null;
        return getFirestore();
    } catch (error) {
        console.error("Error getting Firestore Instance:", error);
        return null;
    }
}

export const getAdminAuth = () => {
    try {
        if (!getApps().length) return null
        return getAuth(app)
    } catch (error) {
        console.error("Error getting Auth Instance:", error)
        return null
    }
}

export const verifySuperAdmin = async (request: Request): Promise<{ uid: string, email: string } | null> => {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('Missing or invalid authorization header');
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            console.error('Firebase Admin Auth not initialized for token verification');
            return null;
        }

        const decodedToken = await adminAuth.verifyIdToken(token);
        const email = decodedToken.email;

        // Verify it's one of the superadmins
        const SUPERADMIN_EMAILS = ['chouhanchetan066@gmail.com', 'amanchoudhary.1502@gmail.com'];
        if (!email || !SUPERADMIN_EMAILS.includes(email.toLowerCase())) {
            console.log(`Unauthorized attempt by ${email}`);
            return null;
        }

        return {
            uid: decodedToken.uid,
            email: email
        };
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

export const verifyExaminationAdmin = async (request: Request): Promise<{ uid: string, email: string } | null> => {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('[DEBUG] Missing Auth Header');
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();
        if (!adminAuth || !adminDb) {
            console.log('[DEBUG] Failed to get adminAuth or adminDb');
            return null;
        }

        const decodedToken = await adminAuth.verifyIdToken(token);
        const email = decodedToken.email;

        // Verify it's one of the superadmins
        const SUPERADMIN_EMAILS = ['chouhanchetan066@gmail.com', 'amanchoudhary.1502@gmail.com'];
        if (email && SUPERADMIN_EMAILS.includes(email.toLowerCase())) {
            return {
                uid: decodedToken.uid,
                email: email
            };
        }

        // Check firestore for profileData.hasExaminationAccess
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            console.log('[DEBUG] User doc does not exist for uid:', decodedToken.uid);
            return null;
        }

        const userData = userDoc.data();
        if (userData?.profileData?.hasExaminationAccess === true) {
            return {
                uid: decodedToken.uid,
                email: email || ''
            };
        }

        console.log('[DEBUG] User is not superadmin and does not have hasExaminationAccess. Email:', email);
        return null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

export const verifyUser = async (request: Request): Promise<{ uid: string, email: string } | null> => {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            return null;
        }

        const decodedToken = await adminAuth.verifyIdToken(token);
        
        return {
            uid: decodedToken.uid,
            email: decodedToken.email || ''
        };
    } catch (error) {
        console.error('User token verification error:', error);
        return null;
    }
}


