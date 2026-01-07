import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDfukNhzfxmD-YERtQE7rPBLjR4ndNe1gs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "raiot-web-portal.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "raiot-web-portal",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "raiot-web-portal.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "735197365563",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:735197365563:web:5164cea5d2d2fd298de31e"
}

// Initialize Firebase (primary app)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

// Initialize Firebase services
// Removed experimentalForceLongPolling as it can cause offline errors if the network is unstable or if the server closes the connection.
// Moving to standard initialization with persistence enabled.
export const db = getFirestore(app)

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.warn('Firebase persistence failed-precondition: Multiple tabs open')
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Firebase persistence unimplemented')
    }
  });
}
export const auth = getAuth(app)
export const storage = getStorage(app)

export default app

// Return a secondary Auth instance for privileged actions (e.g., admin creating users)
// Using a separate app prevents switching the current session of the primary auth.
let secondaryAuthInstance: Auth | null = null
export const getSecondaryAuth = (): Auth => {
  if (secondaryAuthInstance) return secondaryAuthInstance
  const secondaryApp = initializeApp(firebaseConfig, 'secondary')
  secondaryAuthInstance = getAuth(secondaryApp)
  return secondaryAuthInstance
}
