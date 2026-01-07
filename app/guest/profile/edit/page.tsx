"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, CheckCircle, Upload, User, Building, MapPin, Mail } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useProfileValidation } from '@/hooks/use-profile-validation'

interface GuestProfile {
  uid: string
  email: string
  displayName: string
  role: string
  profileData: {
    organization?: string
    department?: string
    year?: string
    city?: string
    phone?: string
    idCardUrl?: string
  }
  createdAt: any
  updatedAt: any
}

export default function GuestProfileEditPage() {
  const { user, updateUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { refreshValidation } = useProfileValidation()
  const [profile, setProfile] = useState<GuestProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    organization: "",
    department: "",
    year: "",
    city: "",
    idCardUrl: ""
  })

  useEffect(() => {
    if (!user || user.role !== 'guest') {
      router.push('/')
      return
    }

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const profileData = userDoc.data() as GuestProfile
          setProfile(profileData)
          setFormData({
            displayName: profileData.displayName || "",
            phone: profileData.profileData?.phone || "",
            organization: profileData.profileData?.organization || "",
            department: profileData.profileData?.department || "",
            year: profileData.profileData?.year || "",
            city: profileData.profileData?.city || "",
            idCardUrl: profileData.profileData?.idCardUrl || ""
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full name to complete your profile.",
        variant: "destructive"
      })
      return
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number to complete your profile.",
        variant: "destructive"
      })
      return
    }

    if (!formData.idCardUrl.trim()) {
      toast({
        title: "ID Card Required",
        description: "Please provide an ID card URL to complete your profile.",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      console.log('🔍 Updating profile with data:', formData)
      
      // Update the profile
      await updateUserProfile({
        displayName: formData.displayName,
        profileData: {
          phone: formData.phone,
          organization: formData.organization,
          department: formData.department,
          year: formData.year,
          city: formData.city,
          idCardUrl: formData.idCardUrl
        },
      })
      
      console.log('🔍 Profile update successful')
      setSaved(true)
      
      // Show success message
      toast({
        title: "Profile Updated Successfully",
        description: "Your profile has been completed! You can now generate a unique ID."
      })
      
      // Simple redirect after a short delay
      setTimeout(() => {
        router.push('/guest/profile')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Profile update failed:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl mb-4">Profile not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/guest/profile" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Link>
            <div className="flex items-center space-x-2">
              {saved && (
                <Alert className="w-auto p-2 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 text-sm">Profile updated successfully!</AlertDescription>
                </Alert>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">Complete your profile to register for events</p>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>Your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name *</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  required
                />
                <p className="text-xs text-muted-foreground">Required for event registration</p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div>
                  <Badge variant="outline" className="capitalize">
                    {profile.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic/Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Organization Information
              </CardTitle>
              <CardDescription>Details about your institution or organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organization">Organization/University</Label>
                <Input
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="Your university or organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Your department or field of study"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year/Level</Label>
                <Input
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="e.g., 3rd Year, Graduate, Professional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Your city"
                />
              </div>
            </CardContent>
          </Card>

          {/* ID Card Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                ID Card Upload *
              </CardTitle>
              <CardDescription>Upload your ID card for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idCardUrl">ID Card URL *</Label>
                <Input
                  id="idCardUrl"
                  name="idCardUrl"
                  value={formData.idCardUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/id-card.jpg or upload to cloud storage"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Upload your ID card to a cloud storage service (Google Drive, Dropbox, etc.) and paste the link here.
                  This is required for event registration.
                </p>
              </div>

              {formData.idCardUrl && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Current ID Card:</p>
                  <a 
                    href={formData.idCardUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {formData.idCardUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Completion Status */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Completion Status</CardTitle>
              <CardDescription>Track what's needed to complete your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Full Name</span>
                  <Badge variant={formData.displayName ? "default" : "destructive"}>
                    {formData.displayName ? "Complete" : "Missing"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Phone Number</span>
                  <Badge variant={formData.phone ? "default" : "destructive"}>
                    {formData.phone ? "Complete" : "Missing"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ID Card</span>
                  <Badge variant={formData.idCardUrl ? "default" : "destructive"}>
                    {formData.idCardUrl ? "Complete" : "Missing"}
                  </Badge>
                </div>
              </div>
              
              {formData.displayName && formData.phone && formData.idCardUrl && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Profile Complete!</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    You can now register for events. A unique ID will be generated automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

