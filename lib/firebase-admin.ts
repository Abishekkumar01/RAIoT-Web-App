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

        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            // Remove wrapping quotes if they exist (common Vercel issue)
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.slice(1, -1);
            }
            if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
                privateKey = privateKey.slice(1, -1);
            }

            // Replace literal newlines with actual newlines
            const keyWithNewlines = privateKey.replace(/\\n/g, '\n');

            // Extract explicitly the content between BEGIN and END tags
            const match = keyWithNewlines.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);

            if (match) {
                privateKey = match[0];
            } else {
                // Fallback: use the cleaned string, but trim it
                privateKey = keyWithNewlines.trim();
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
