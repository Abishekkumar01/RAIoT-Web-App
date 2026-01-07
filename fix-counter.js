const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, runTransaction, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COUNTER_DOC_ID = 'uniqueIdCounter';
const COUNTER_COLLECTION = 'system';

async function getCounterStatus() {
  try {
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID);
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      return {
        count: 0,
        lastGenerated: null,
        updatedAt: null
      };
    }
    
    const data = counterDoc.data();
    return {
      count: data.count || 0,
      lastGenerated: data.lastGenerated || null,
      updatedAt: data.updatedAt
    };
    
  } catch (error) {
    console.error('❌ Error getting counter status:', error);
    throw error;
  }
}

async function countExistingUniqueIds() {
  try {
    console.log('🔍 Counting existing unique IDs in users collection...');
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uniqueId', '!=', null));
    const snapshot = await getDocs(q);
    
    const uniqueIds = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.uniqueId) {
        uniqueIds.push(data.uniqueId);
      }
    });
    
    // Sort the IDs to find the highest number
    uniqueIds.sort();
    console.log('📋 Found unique IDs:', uniqueIds);
    
    if (uniqueIds.length === 0) {
      return 0;
    }
    
    // Extract the highest number from the last ID
    const lastId = uniqueIds[uniqueIds.length - 1];
    const match = lastId.match(/RAIoT(\d+)/);
    if (match) {
      const highestNumber = parseInt(match[1], 10);
      console.log('🔢 Highest unique ID number found:', highestNumber);
      return highestNumber;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error counting existing unique IDs:', error);
    throw error;
  }
}

async function fixCounter() {
  try {
    console.log('🔧 Fixing Counter State');
    console.log('======================');
    
    // Get current counter status
    console.log('\n1️⃣ Getting current counter status...');
    const currentStatus = await getCounterStatus();
    console.log('Current counter:', currentStatus);
    
    // Count actual unique IDs in users collection
    console.log('\n2️⃣ Counting actual unique IDs in users...');
    const actualHighestNumber = await countExistingUniqueIds();
    console.log('Actual highest number:', actualHighestNumber);
    
    // Calculate what the counter should be
    const correctCount = actualHighestNumber;
    console.log('\n3️⃣ Analysis:');
    console.log(`Current counter count: ${currentStatus.count}`);
    console.log(`Actual highest ID number: ${actualHighestNumber}`);
    console.log(`Counter should be: ${correctCount}`);
    
    if (currentStatus.count === correctCount) {
      console.log('\n✅ Counter is already correct! No fix needed.');
      return;
    }
    
    // Fix the counter
    console.log('\n4️⃣ Fixing counter...');
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID);
    
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      if (!counterDoc.exists()) {
        // Create counter if it doesn't exist
        transaction.set(counterRef, {
          count: correctCount,
          lastGenerated: actualHighestNumber > 0 ? `RAIoT${actualHighestNumber.toString().padStart(5, '0')}` : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Update existing counter
        transaction.update(counterRef, {
          count: correctCount,
          lastGenerated: actualHighestNumber > 0 ? `RAIoT${actualHighestNumber.toString().padStart(5, '0')}` : null,
          updatedAt: serverTimestamp()
        });
      }
    });
    
    console.log('✅ Counter fixed successfully!');
    
    // Verify the fix
    console.log('\n5️⃣ Verifying fix...');
    const newStatus = await getCounterStatus();
    console.log('New counter status:', newStatus);
    
    if (newStatus.count === correctCount) {
      console.log('\n🎉 Counter fix verified! Next ID will be:', `RAIoT${(correctCount + 1).toString().padStart(5, '0')}`);
    } else {
      console.log('\n❌ Counter fix verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing counter:', error);
  }
}

// Run the fix
fixCounter();
