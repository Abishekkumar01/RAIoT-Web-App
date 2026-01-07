import { initializeApp, getApps, App, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App;

if (getApps().length === 0) {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
    } catch (error) {
        console.error("Firebase Admin initialization failed. Ensure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set.", error);
    }
} else {
    app = getApp();
}

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
