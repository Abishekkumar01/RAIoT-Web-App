import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env parser
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: any = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/"/g, ''); // Simple quote removal
        if (key && !key.startsWith('#')) {
            envVars[key] = value;
        }
    }
});

const firebaseConfig = {
    apiKey: envVars.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log("ProjectId:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkInventory() {
    console.log('Checking inventory collection...');
    try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        console.log(`Found ${querySnapshot.size} items.`);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`- [${doc.id}] ${data.name} (Qty: ${data.availableQuantity})`);
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
    }
}

checkInventory();
