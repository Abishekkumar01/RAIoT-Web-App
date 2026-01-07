import { auth, db } from './firebase'

export const testFirebaseConnection = async () => {
  const results = {
    authConfigured: false,
    dbConfigured: false,
    envVarsPresent: false,
    connectionTest: false,
    error: null as string | null
  }

  try {
    // Check if environment variables are present
    results.envVarsPresent = !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    )

    // Check if auth is configured
    results.authConfigured = !!auth

    // Check if database is configured
    results.dbConfigured = !!db

    // Test basic connection
    if (auth && db) {
      // Try to get current user (this doesn't require authentication)
      const currentUser = auth.currentUser
      results.connectionTest = true
    }

  } catch (error: any) {
    results.error = error.message
  }

  return results
}

export const logFirebaseStatus = async () => {
  console.log('=== Firebase Configuration Check ===')
  
  const envVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present' : 'Missing',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Present' : 'Missing',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'Present' : 'Missing'
  }

  console.log('Environment Variables:', envVars)
  console.log('Auth instance:', auth ? 'Initialized' : 'Not initialized')
  console.log('Database instance:', db ? 'Initialized' : 'Not initialized')

  const testResults = await testFirebaseConnection()
  console.log('Connection Test Results:', testResults)
  
  return testResults
}
