"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User, UserRole } from "@/lib/types/user"
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (email: string, password: string, displayName: string, role?: UserRole) => Promise<User>
  logout: () => Promise<void>
  updateUserProfile: (data: Partial<User>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUserData: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Local storage key for the logged-in user snapshot

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const snap = await getDoc(userDocRef)
          const permanentAdmins = ['theraiot.tech@gmail.com']
          const base: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email || 'User',
            role: 'guest',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          let merged: User
          if (snap.exists()) {
            const data = snap.data()
            // Normalize role
            const rawRole = data.role as string || 'guest'
            const normalizedRole = rawRole.toLowerCase().trim() as UserRole
            merged = { ...base, ...data, role: normalizedRole }
          } else {
            // ... (deletion logic) ...
            console.warn('User authenticated but no Firestore profile found. Logging out.')
            await signOut(auth)
            setUser(null)
            localStorage.removeItem("raiot_user")
            return // Exit early
          }

          // CRITICAL FIX: Race Condition Protection
          // If the user signed out while we were waiting for getDoc (e.g., due to role restriction check),
          // do NOT restore the user state.
          if (!auth.currentUser) {
            console.log('Race condition detected: User logged out during profile fetch. Aborting state update.')
            return
          }

          setUser(merged)
          localStorage.setItem("raiot_user", JSON.stringify(merged))
        } else {
          setUser(null)
          localStorage.removeItem("raiot_user")
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
    const base: User = {
      uid: cred.user.uid,
      email: cred.user.email || '',
      displayName: cred.user.displayName || cred.user.email || 'User',
      role: 'guest',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    let result: User
    if (userDoc.exists()) {
      const data = userDoc.data()
      // Normalize role
      const rawRole = data.role as string || 'guest'
      const normalizedRole = rawRole.toLowerCase().trim() as UserRole
      result = { ...base, ...data, role: normalizedRole }
    } else {
      result = base
    }

    setUser(result)
    localStorage.setItem("raiot_user", JSON.stringify(result))
    return result
  }

  const signup = async (email: string, password: string, displayName: string, role: UserRole = "member"): Promise<User> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      try { await updateProfile(cred.user, { displayName }) } catch { }
    }
    // Normalize input role
    const normalizedRole = role.toLowerCase().trim() as UserRole

    const userDocRef = doc(db, 'users', cred.user.uid)
    const payload = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || cred.user.email,
      role: normalizedRole,
      profileData: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await setDoc(userDocRef, payload, { merge: true })
    const createdUser: User = payload as User
    setUser(createdUser)
    localStorage.setItem("raiot_user", JSON.stringify(createdUser))
    return createdUser
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    localStorage.removeItem("raiot_user")
  }

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return

    try {
      console.log('🔍 Updating user profile for:', user.uid)
      console.log('🔍 Update data:', data)

      // First, get the current user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const currentData = userDoc.exists() ? userDoc.data() : {}

      // Merge the data properly
      const updatedUser = {
        ...user,
        ...data,
        profileData: {
          ...user.profileData,
          ...data.profileData
        },
        updatedAt: new Date()
      }

      // Ensure role is preserved/normalized if updated
      if (data.role) {
        updatedUser.role = data.role.toLowerCase().trim() as UserRole
      }

      console.log('🔍 Updated user object:', updatedUser)

      // Persist the update to Firestore with proper merging
      const ref = doc(db, 'users', user.uid)
      const updateData: any = {
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        profileData: updatedUser.profileData,
        updatedAt: new Date(),
      }

      // Only add uniqueId if it exists
      if (updatedUser.uniqueId) {
        updateData.uniqueId = updatedUser.uniqueId
      }

      console.log('🔍 Firestore update data:', updateData)
      await setDoc(ref, updateData, { merge: true })

      // After successful Firestore update, refresh the user data from Firestore
      const updatedUserDoc = await getDoc(doc(db, 'users', user.uid))
      if (updatedUserDoc.exists()) {
        const freshUserData = updatedUserDoc.data()

        // Normalize role
        const rawRole = freshUserData.role as string || 'guest'
        const normalizedRole = rawRole.toLowerCase().trim() as UserRole
        const finalData = { ...freshUserData, role: normalizedRole }

        const mergedUser = { ...user, ...finalData }
        console.log('🔍 Refreshed user data from Firestore:', mergedUser)

        // Update local state with fresh data
        setUser(mergedUser)
        localStorage.setItem("raiot_user", JSON.stringify(mergedUser))
      }

      console.log('🔍 Profile update successful')

    } catch (error) {
      console.error('❌ Error updating user profile:', error)
      throw error
    }
  }

  const refreshUserData = async () => {
    if (!user) return

    try {
      console.log('🔍 Refreshing user data from Firestore...')

      // Get the latest user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const freshUserData = userDoc.data()

        // Normalize role
        const rawRole = freshUserData.role as string || 'guest'
        const normalizedRole = rawRole.toLowerCase().trim() as UserRole
        const finalData = { ...freshUserData, role: normalizedRole }

        const mergedUser = { ...user, ...finalData }
        console.log('🔍 Fresh user data from Firestore:', mergedUser)

        // Update local state with fresh data
        setUser(mergedUser)
        localStorage.setItem("raiot_user", JSON.stringify(mergedUser))

        console.log('🔍 User data refreshed successfully')
        return mergedUser
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error)
      throw error
    }
  }

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/login`,
        handleCodeInApp: true,
      }
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      console.log("Password reset email sent to:", email)
    } catch (error) {
      console.error("Error sending password reset email:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUserProfile,
    refreshUserData,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
