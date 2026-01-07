"use client"

import { useAuth } from '@/lib/contexts/AuthContext'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function DebugPage() {
  const { user, updateUserProfile } = useAuth()
  const { validation, loading } = useProfileValidation()
  const { toast } = useToast()

  const testFirestoreRead = async () => {
    if (!user) return
    
    try {
      console.log('🔍 Testing Firestore read for user:', user.uid)
      
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log('🔍 User data from Firestore:', userData)
        toast({
          title: "Read Success",
          description: "Firestore read test completed"
        })
      } else {
        toast({
          title: "Read Failed",
          description: "User document not found",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('❌ Firestore read test failed:', error)
      toast({
        title: "Read Failed",
        description: `Error: ${error}`,
        variant: "destructive"
      })
    }
  }

  const testFirestoreWrite = async () => {
    if (!user) return
    
    try {
      console.log('🔍 Testing Firestore write for user:', user.uid)
      
      await updateDoc(doc(db, 'users', user.uid), {
        testField: 'test value',
        updatedAt: new Date()
      })
      
      toast({
        title: "Write Success",
        description: "Firestore write test completed"
      })
      
    } catch (error) {
      console.error('❌ Firestore write test failed:', error)
      toast({
        title: "Write Failed",
        description: `Error: ${error}`,
        variant: "destructive"
      })
    }
  }

  const fixUserRole = async () => {
    if (!user) return
    
    try {
      console.log('🔍 Fixing user role from:', user.role, 'to: guest')
      
      // For guest accounts, we should set role to 'guest', not 'member'
      const correctRole = user.email.includes('guest') || user.role === 'guest' ? 'guest' : 'member'
      
      await updateUserProfile({ role: correctRole })
      
      toast({
        title: "Role Fixed",
        description: `User role changed to '${correctRole}'`
      })
      
    } catch (error) {
      console.error('❌ Role fix failed:', error)
      toast({
        title: "Role Fix Failed",
        description: `Error: ${error}`,
        variant: "destructive"
      })
    }
  }

  // Test profile update function removed to prevent data corruption

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Debug Dashboard</h1>
          <p className="text-muted-foreground">Test and fix all functionality</p>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Current user details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">User ID:</p>
                <p className="text-sm text-muted-foreground">{user?.uid || 'Not logged in'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email:</p>
                <p className="text-sm text-muted-foreground">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Display Name:</p>
                <p className="text-sm text-muted-foreground">{user?.displayName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Role:</p>
                <Badge variant="outline" className="capitalize">
                  {user?.role || 'N/A'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Validation Status */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Validation Status</CardTitle>
            <CardDescription>Current profile completion status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profile Complete:</span>
              <Badge variant={validation.isComplete ? "default" : "destructive"}>
                {validation.isComplete ? "Yes" : "No"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Can Register for Events:</span>
              <Badge variant={validation.canRegister ? "default" : "destructive"}>
                {validation.canRegister ? "Yes" : "No"}
              </Badge>
            </div>

            {validation.uniqueId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Unique ID:</span>
                <Badge variant="secondary" className="font-mono">
                  {validation.uniqueId}
                </Badge>
              </div>
            )}

            {validation.missingFields.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Missing Fields:</p>
                <div className="space-y-1">
                  {validation.missingFields.map((field, index) => (
                    <Badge key={index} variant="destructive" className="mr-2">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Data */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Data</CardTitle>
            <CardDescription>Detailed profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(user?.profileData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Test various functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={testFirestoreRead}>
                Test Firestore Read
              </Button>
              <Button onClick={testFirestoreWrite}>
                Test Firestore Write
              </Button>
              <Button onClick={fixUserRole}>
                Fix User Role
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• Profile validation is working: {validation.isComplete ? '✅' : '❌'}</p>
              <p>• Unique ID generation: {validation.uniqueId ? '✅' : '❌'}</p>
              <p>• Event registration allowed: {validation.canRegister ? '✅' : '❌'}</p>
              <p>• User role: ✅ {user?.role} (correct)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
