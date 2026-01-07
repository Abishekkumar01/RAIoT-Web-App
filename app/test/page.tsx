"use client"

import { useAuth } from '@/lib/contexts/AuthContext'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function TestPage() {
  const { user } = useAuth()
  const { validation, loading } = useProfileValidation()
  const { toast } = useToast()

  const testUniqueIdGeneration = () => {
    toast({
      title: "Test Function",
      description: "This would test unique ID generation in a real scenario"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile validation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Functionality Test Page</h1>
          <p className="text-muted-foreground">Testing all the implemented features</p>
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
            <Button onClick={testUniqueIdGeneration}>
              Test Unique ID Generation
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>• Profile validation is working: {validation.isComplete ? '✅' : '❌'}</p>
              <p>• Unique ID generation: {validation.uniqueId ? '✅' : '❌'}</p>
              <p>• Event registration allowed: {validation.canRegister ? '✅' : '❌'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
