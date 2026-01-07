import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

const COUNTER_DOC_ID = 'uniqueIdCounter'
const COUNTER_COLLECTION = 'system'

/**
 * Generates a sequential unique ID using atomic operations
 * Format: RAIoT00001, RAIoT00002, etc.
 * Uses Firestore transactions to ensure atomicity and prevent race conditions
 */
export async function generateSequentialUniqueId(): Promise<string> {
  try {
    console.log('🔍 Starting atomic unique ID generation...')
    
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID)
    
    // Use a transaction to ensure atomicity
    const result = await runTransaction(db, async (transaction) => {
      console.log('🔍 Starting transaction for ID generation...')
      
      // Read the current counter
      const counterDoc = await transaction.get(counterRef)
      
      let currentCount: number
      
      if (!counterDoc.exists()) {
        // First time - initialize counter
        console.log('🔍 Initializing counter for first time...')
        currentCount = 0
        transaction.set(counterRef, {
          count: 0,
          lastGenerated: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      } else {
        // Get current count
        const data = counterDoc.data()
        currentCount = data.count || 0
        console.log('🔍 Current count from counter:', currentCount)
      }
      
      // Generate next sequential ID
      const nextCount = currentCount + 1
      const paddedNumber = nextCount.toString().padStart(5, '0')
      const uniqueId = `RAIoT${paddedNumber}`
      
      console.log('🔍 Generated unique ID:', uniqueId, '(count:', nextCount, ')')
      
      // Update counter atomically
      transaction.update(counterRef, {
        count: nextCount,
        lastGenerated: uniqueId,
        updatedAt: serverTimestamp()
      })
      
      return {
        uniqueId,
        count: nextCount
      }
    })
    
    console.log('🔍 Transaction completed successfully:', result)
    return result.uniqueId
    
  } catch (error) {
    console.error('❌ Error in generateSequentialUniqueId:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    })
    throw new Error(`Failed to generate unique ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Assigns a unique ID to a user
 * This function should be called after generateSequentialUniqueId()
 */
export async function assignUniqueIdToUser(userId: string, uniqueId: string): Promise<void> {
  try {
    console.log('🔍 Assigning unique ID to user:', userId, 'ID:', uniqueId)
    
    const userRef = doc(db, 'users', userId)
    
    await updateDoc(userRef, {
      uniqueId: uniqueId,
      uniqueIdAssignedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    console.log('🔍 Unique ID assigned successfully to user:', userId)
    
  } catch (error) {
    console.error('❌ Error assigning unique ID to user:', error)
    throw new Error(`Failed to assign unique ID to user: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Complete atomic operation: generate and assign unique ID
 * This is the main function to use for ID generation
 */
export async function generateAndAssignUniqueId(userId: string): Promise<string> {
  try {
    console.log('🔍 Starting complete unique ID generation and assignment for user:', userId)
    
    // First, check if user already has a unique ID
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      if (userData.uniqueId) {
        console.log('🔍 User already has unique ID:', userData.uniqueId)
        return userData.uniqueId
      }
    }
    
    // Generate new unique ID
    const uniqueId = await generateSequentialUniqueId()
    
    // Assign to user
    await assignUniqueIdToUser(userId, uniqueId)
    
    console.log('🔍 Complete unique ID generation and assignment successful:', uniqueId)
    return uniqueId
    
  } catch (error) {
    console.error('❌ Error in generateAndAssignUniqueId:', error)
    throw error
  }
}

/**
 * Get the current counter status (for debugging/admin purposes)
 */
export async function getCounterStatus(): Promise<{
  count: number
  lastGenerated: string | null
  updatedAt: any
}> {
  try {
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID)
    const counterDoc = await getDoc(counterRef)
    
    if (!counterDoc.exists()) {
      return {
        count: 0,
        lastGenerated: null,
        updatedAt: null
      }
    }
    
    const data = counterDoc.data()
    return {
      count: data.count || 0,
      lastGenerated: data.lastGenerated || null,
      updatedAt: data.updatedAt
    }
    
  } catch (error) {
    console.error('❌ Error getting counter status:', error)
    throw error
  }
}
