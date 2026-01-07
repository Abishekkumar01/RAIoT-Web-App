import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateAndAssignUniqueId } from '@/lib/id-generator'

export interface ProfileValidation {
  isComplete: boolean
  missingFields: string[]
  uniqueId: string | null
  canRegister: boolean
}

export function useProfileValidation() {
  const { user, refreshUserData } = useAuth()
  const [validation, setValidation] = useState<ProfileValidation>({
    isComplete: false,
    missingFields: [],
    uniqueId: null,
    canRegister: false
  })
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const validateProfile = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    console.log('🔍 Validating profile for user:', user.uid)
    console.log('🔍 User role:', user.role)
    
    try {
      setLoading(true)
      
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) {
        console.log('❌ User document not found')
        setLoading(false)
        return
      }

      const userData = userDoc.data()
      console.log('🔍 User data from Firestore:', userData)
      console.log('🔍 Profile data details:', {
        displayName: userData.displayName,
        phone: userData.profileData?.phone,
        idCardUrl: userData.profileData?.idCardUrl,
        role: userData.role,
        uniqueId: userData.uniqueId
      })
      
      const missingFields: string[] = []
      
      // Check required fields based on user role - use Firestore data, not local state
      const userRole = userData.role || user.role
      console.log('🔍 Checking requirements for role:', userRole)
      
      // Admins and superadmins don't need profile validation
      if (userRole === 'admin' || userRole === 'superadmin') {
        console.log('✅ Admin/Superadmin - skipping profile validation')
        setValidation({
          isComplete: true,
          missingFields: [],
          uniqueId: userData.uniqueId || null,
          canRegister: true
        })
        setLoading(false)
        return
      }
      
      if (userRole === 'guest') {
        console.log('🔍 Checking guest requirements...')
        if (!userData.displayName) {
          missingFields.push('Full Name')
          console.log('❌ Missing: Full Name')
        }
        if (!userData.profileData?.phone) {
          missingFields.push('Phone Number')
          console.log('❌ Missing: Phone Number')
        }
        if (!userData.profileData?.idCardUrl) {
          missingFields.push('ID Card')
          console.log('❌ Missing: ID Card')
        }
      } else if (userRole === 'member' || userRole === 'junior_developer' || userRole === 'senior_developer' || 
                 userRole === 'student_coordinator' || userRole === 'inventory_head' || userRole === 'vice_president' ||
                 userRole === 'president' || userRole === 'public_relation_head' || userRole === 'content_creation_head' ||
                 userRole === 'management_head' || userRole === 'technical_head') {
        console.log('🔍 Checking member requirements...')
        if (!userData.displayName) {
          missingFields.push('Full Name')
          console.log('❌ Missing: Full Name')
        }
        if (!userData.profileData?.phone) {
          missingFields.push('Phone Number')
          console.log('❌ Missing: Phone Number')
        }
        if (!userData.profileData?.rollNumber) {
          missingFields.push('Roll Number')
          console.log('❌ Missing: Roll Number')
        }
        if (!userData.profileData?.branch) {
          missingFields.push('Branch')
          console.log('❌ Missing: Branch')
        }
        if (!userData.profileData?.year) {
          missingFields.push('Year')
          console.log('❌ Missing: Year')
        }
      } else {
        console.log('🔍 Unknown role:', userRole, '- treating as guest')
        // Treat unknown roles as guest
        if (!userData.displayName) {
          missingFields.push('Full Name')
          console.log('❌ Missing: Full Name')
        }
        if (!userData.profileData?.phone) {
          missingFields.push('Phone Number')
          console.log('❌ Missing: Phone Number')
        }
        if (!userData.profileData?.idCardUrl) {
          missingFields.push('ID Card')
          console.log('❌ Missing: ID Card')
        }
      }
      
              const isComplete = missingFields.length === 0
        console.log('🔍 Profile complete:', isComplete)
        console.log('🔍 Missing fields:', missingFields)
        console.log('🔍 User data check:', {
          displayName: userData.displayName,
          phone: userData.profileData?.phone,
          idCardUrl: userData.profileData?.idCardUrl,
          role: userData.role,
          uniqueId: userData.uniqueId
        })
        console.log('🔍 Profile completion calculation:', {
          hasDisplayName: !!userData.displayName,
          hasPhone: !!userData.profileData?.phone,
          hasIdCard: !!userData.profileData?.idCardUrl,
          missingFieldsCount: missingFields.length,
          isComplete
        })
      
              // Get existing unique ID or generate new one
        let uniqueId = userData.uniqueId
        console.log('🔍 Current unique ID:', uniqueId)
        console.log('🔍 Unique ID generation check:', {
          isComplete,
          hasUniqueId: !!uniqueId,
          shouldGenerate: isComplete && !uniqueId
        })
        
        if (isComplete && !uniqueId) {
        console.log('🔍 Profile is complete but no unique ID found. Generating...')
        console.log('🔍 Starting atomic unique ID generation process...')
        try {
          console.log('🔍 Calling generateAndAssignUniqueId()...')
          uniqueId = await generateAndAssignUniqueId(user.uid)
          console.log('🔍 Successfully generated and assigned unique ID:', uniqueId)
          
          console.log('🔍 Updating local validation state...')
          // Force a re-render by updating validation state immediately
          setValidation(prev => ({ 
            ...prev, 
            uniqueId,
            isComplete: true,
            canRegister: true
          }))
          
          console.log('🔍 Local validation state updated with unique ID')
          console.log('🔍 Unique ID generation process completed successfully!')
          
          // Refresh the user data from Firestore to include the new unique ID
          console.log('🔍 Refreshing user data from Firestore to include new unique ID...')
          try {
            await refreshUserData()
            console.log('🔍 User data refreshed successfully with new unique ID')
          } catch (error) {
            console.error('❌ Failed to refresh user data:', error)
          }
        } catch (error) {
          console.error('❌ Failed to generate unique ID:', error)
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            error: error
          })
          // Continue without unique ID for now
        }
      } else {
        console.log('🔍 Profile validation result:', {
          isComplete,
          hasUniqueId: !!uniqueId,
          uniqueIdValue: uniqueId
        })
      }

      setValidation({
        isComplete,
        missingFields,
        uniqueId,
        canRegister: isComplete
      })
      
      console.log('🔍 Final validation result:', {
        isComplete,
        missingFields,
        uniqueId,
        canRegister: isComplete
      })
      
    } catch (error) {
      console.error('❌ Error validating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔄 Profile validation hook triggered for user:', user?.uid)
    console.log('🔄 Refresh trigger value:', refreshTrigger)
    if (!user) {
      setLoading(false)
      return
    }

    console.log('🔄 Starting profile validation...')
    validateProfile()
  }, [user, refreshTrigger])

  const refreshValidation = () => {
    console.log('🔄 Manual profile validation refresh triggered')
    setRefreshTrigger(prev => prev + 1)
    
    // Force immediate validation by calling validateProfile directly
    if (user) {
      console.log('🔄 Forcing immediate validation...')
      setTimeout(() => {
        validateProfile()
      }, 100)
    }
  }

  return { validation, loading, refreshValidation }
}

