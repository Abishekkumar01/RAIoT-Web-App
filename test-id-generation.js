const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp } = require('firebase/firestore');

// Firebase configuration (you'll need to set these environment variables)
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

async function generateSequentialUniqueId() {
  try {
    console.log('🔍 Starting atomic unique ID generation...');
    
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID);
    
    // Use a transaction to ensure atomicity
    const result = await runTransaction(db, async (transaction) => {
      console.log('🔍 Starting transaction for ID generation...');
      
      // Read the current counter
      const counterDoc = await transaction.get(counterRef);
      
      let currentCount;
      
      if (!counterDoc.exists()) {
        // First time - initialize counter
        console.log('🔍 Initializing counter for first time...');
        currentCount = 0;
        transaction.set(counterRef, {
          count: 0,
          lastGenerated: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Get current count
        const data = counterDoc.data();
        currentCount = data.count || 0;
        console.log('🔍 Current count from counter:', currentCount);
      }
      
      // Generate next sequential ID
      const nextCount = currentCount + 1;
      const paddedNumber = nextCount.toString().padStart(5, '0');
      const uniqueId = `RAIoT${paddedNumber}`;
      
      console.log('🔍 Generated unique ID:', uniqueId, '(count:', nextCount, ')');
      
      // Update counter atomically
      transaction.update(counterRef, {
        count: nextCount,
        lastGenerated: uniqueId,
        updatedAt: serverTimestamp()
      });
      
      return {
        uniqueId,
        count: nextCount
      };
    });
    
    console.log('🔍 Transaction completed successfully:', result);
    return result.uniqueId;
    
  } catch (error) {
    console.error('❌ Error in generateSequentialUniqueId:', error);
    throw error;
  }
}

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

async function testIdGeneration() {
  console.log('🧪 Testing ID Generation System');
  console.log('================================');
  
  try {
    // Test 1: Get initial counter status
    console.log('\n1️⃣ Getting initial counter status...');
    const initialStatus = await getCounterStatus();
    console.log('Initial status:', initialStatus);
    
    // Test 2: Generate first ID
    console.log('\n2️⃣ Generating first ID...');
    const id1 = await generateSequentialUniqueId();
    console.log('Generated ID 1:', id1);
    
    // Test 3: Generate second ID
    console.log('\n3️⃣ Generating second ID...');
    const id2 = await generateSequentialUniqueId();
    console.log('Generated ID 2:', id2);
    
    // Test 4: Generate third ID
    console.log('\n4️⃣ Generating third ID...');
    const id3 = await generateSequentialUniqueId();
    console.log('Generated ID 3:', id3);
    
    // Test 5: Get final counter status
    console.log('\n5️⃣ Getting final counter status...');
    const finalStatus = await getCounterStatus();
    console.log('Final status:', finalStatus);
    
    // Verify results
    console.log('\n✅ Test Results:');
    console.log('================');
    console.log('ID 1:', id1, '- Expected: RAIoT00001');
    console.log('ID 2:', id2, '- Expected: RAIoT00002');
    console.log('ID 3:', id3, '- Expected: RAIoT00003');
    console.log('Final count:', finalStatus.count, '- Expected: 3');
    console.log('Last generated:', finalStatus.lastGenerated, '- Expected: RAIoT00003');
    
    // Check if results are correct
    const allCorrect = 
      id1 === 'RAIoT00001' &&
      id2 === 'RAIoT00002' &&
      id3 === 'RAIoT00003' &&
      finalStatus.count === 3 &&
      finalStatus.lastGenerated === 'RAIoT00003';
    
    if (allCorrect) {
      console.log('\n🎉 ALL TESTS PASSED! ID generation is working correctly.');
    } else {
      console.log('\n❌ SOME TESTS FAILED! Check the results above.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testIdGeneration();
