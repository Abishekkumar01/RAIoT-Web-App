// Test script to verify all functionality
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, addDoc, increment } = require('firebase/firestore');

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testAllFunctionality() {
  console.log('🧪 Starting comprehensive functionality test...\n');

  try {
    // Test 1: Check if a user document exists and can be read
    console.log('1️⃣ Testing Firestore read access...');
    const testUserId = 'test-user-id'; // Replace with actual user ID
    const userDoc = await getDoc(doc(db, 'users', testUserId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User document read successful');
      console.log('   User data:', userData);
    } else {
      console.log('❌ User document not found');
    }

    // Test 2: Test profile update
    console.log('\n2️⃣ Testing profile update...');
    try {
      await updateDoc(doc(db, 'users', testUserId), {
        testField: 'test value',
        updatedAt: new Date()
      });
      console.log('✅ Profile update successful');
    } catch (error) {
      console.log('❌ Profile update failed:', error.message);
    }

    // Test 3: Test event registration
    console.log('\n3️⃣ Testing event registration...');
    try {
      // Create a test registration
      const registrationRef = await addDoc(collection(db, 'registrations'), {
        userId: testUserId,
        eventId: 'test-event-id',
        eventTitle: 'Test Event',
        eventType: 'workshop',
        eventDate: '2024-01-01',
        status: 'registered',
        createdAt: new Date(),
      });
      console.log('✅ Registration creation successful:', registrationRef.id);

      // Update event count
      await updateDoc(doc(db, 'events', 'test-event-id'), {
        registered: increment(1)
      });
      console.log('✅ Event count update successful');
    } catch (error) {
      console.log('❌ Event registration failed:', error.message);
    }

    // Test 4: Test atomic unique ID generation
    console.log('\n4️⃣ Testing atomic unique ID generation...');
    try {
      // Import the new atomic ID generator
      const { generateAndAssignUniqueId } = require('./lib/id-generator');
      
      // Generate and assign unique ID atomically
      const uniqueId = await generateAndAssignUniqueId(testUserId);
      
      console.log('✅ Atomic unique ID generation successful:', uniqueId);
    } catch (error) {
      console.log('❌ Atomic unique ID generation failed:', error.message);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the test
testAllFunctionality();
