const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkInventory() {
    console.log('Checking inventory collection...');
    try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        console.log(`Found ${querySnapshot.size} items.`);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`- ${data.name} (Qty: ${data.availableQuantity})`);
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
    }
}

checkInventory();
