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
// Updated to use the new modular SDK 9+ persistence pattern
import { persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore'

export const db = initializeFirestore(app, {
  localCache: typeof window !== 'undefined'
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache()
})
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
