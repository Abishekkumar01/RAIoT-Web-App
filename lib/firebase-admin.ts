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
