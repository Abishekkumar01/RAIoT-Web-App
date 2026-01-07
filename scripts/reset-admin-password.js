/**
 * Script to reset admin password using Firebase Admin SDK
 * 
 * Usage:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Get your service account key from Firebase Console:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate new private key"
 *    - Save it as serviceAccountKey.json in the project root
 * 3. Run: node scripts/reset-admin-password.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Configuration - You can pass email and password as arguments
// Usage: node scripts/reset-admin-password.js [email] [password]
// Example: node scripts/reset-admin-password.js admin.raiot@gmail.com MyNewPass123
const ADMIN_EMAIL = process.argv[2] || 'admin.raiot@gmail.com';
const NEW_PASSWORD = process.argv[3] || 'Admin@123456';

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccountKey.json not found!');
  console.log('\n📋 To get your service account key:');
  console.log('1. Go to https://console.firebase.google.com');
  console.log('2. Select your project: raiot-web-portal');
  console.log('3. Go to Project Settings (gear icon) > Service Accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Save the JSON file as "serviceAccountKey.json" in the project root');
  console.log('\n📖 Quick Guide:');
  console.log('   https://console.firebase.google.com/project/raiot-web-portal/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

async function resetPassword() {
  try {
    console.log(`\n🔐 Resetting password for: ${ADMIN_EMAIL}`);
    console.log(`📝 New password: ${NEW_PASSWORD}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    
    if (!user) {
      console.error(`❌ User with email ${ADMIN_EMAIL} not found!`);
      process.exit(1);
    }
    
    // Update password
    await admin.auth().updateUser(user.uid, {
      password: NEW_PASSWORD
    });
    
    console.log('✅ Password reset successfully!');
    console.log(`\n📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${NEW_PASSWORD}`);
    console.log('\n⚠️  Please save this password securely!');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.log(`\n💡 User ${ADMIN_EMAIL} doesn't exist. You may need to create a new admin account.`);
    }
    process.exit(1);
  }
}

resetPassword();

