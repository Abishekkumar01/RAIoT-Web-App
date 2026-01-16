"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, GraduationCap, Code, Save, CheckCircle, Github, Linkedin, Globe, Lock, Eye, EyeOff, Users, Plus, Trash, ExternalLink, Trophy, Star, Briefcase } from "lucide-react"
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

import ImageUpload from "@/components/ui/ImageUpload"
import { InventorySection } from "./InventorySection"

export default function ProfilePage() {
  const { user, updateUserProfile, refreshUserData } = useAuth()
  const { validation, refreshValidation } = useProfileValidation()
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    phone: user?.profileData?.phone || "",
    year: user?.profileData?.year || "",
    branch: user?.profileData?.branch || "",
    rollNumber: user?.profileData?.rollNumber || "",
    bio: user?.profileData?.bio || "",
    tagline: user?.profileData?.tagline || "",
    skills: user?.profileData?.skills?.join(", ") || "",
    githubLink: user?.profileData?.githubLink || "",
    linkedinLink: user?.profileData?.linkedinLink || "",
    websiteLink: user?.profileData?.websiteLink || "",
    photoUrl: user?.profileData?.photoUrl || "",
    bannerUrl: user?.profileData?.bannerUrl || "",
    projects: user?.profileData?.projects || [],
    achievements: user?.profileData?.achievements || [],
    contributions: user?.profileData?.contributions || [],
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const defaultBanner = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSave = async () => {
    if (!user) return

    // Validate required fields
    const missingFields: string[] = []

    if (!formData.displayName.trim()) {
      missingFields.push('Full Name')
    }
    if (!formData.phone.trim()) {
      missingFields.push('Phone Number')
    }
    if (!formData.rollNumber.trim()) {
      missingFields.push('Roll Number')
    }
    if (!formData.branch.trim()) {
      missingFields.push('Branch')
    }
    if (!formData.year.trim()) {
      missingFields.push('Year')
    }

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      })
      return
    }

    try {
      console.log('🔍 Saving member profile for user:', user.uid)
      console.log('🔍 Form data:', formData)

      setSaving(true)

      // Update user profile
      await updateUserProfile({
        displayName: formData.displayName,
        // Role is NOT updated here to prevent overwriting admin-assigned roles
        profileData: {
          phone: formData.phone,
          rollNumber: formData.rollNumber,
          branch: formData.branch,
          year: formData.year,
          bio: formData.bio,
          tagline: formData.tagline,
          photoUrl: formData.photoUrl,
          bannerUrl: formData.bannerUrl,
          githubLink: formData.githubLink,
          linkedinLink: formData.linkedinLink,
          websiteLink: formData.websiteLink,
          projects: formData.projects,
          achievements: formData.achievements.filter(Boolean),
          contributions: formData.contributions.filter(Boolean),
          skills: formData.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        },
      })

      console.log('🔍 Profile update successful')

      // Refresh profile validation to trigger unique ID generation
      refreshValidation()

      // Force a profile validation check after a short delay
      setTimeout(() => {
        refreshValidation()
      }, 1000)

      toast({
        title: "Profile Updated Successfully",
        description: "Your profile has been updated! A unique ID will be generated automatically.",
      })

      setSaved(true)
      setIsEditing(false)
      setTimeout(() => {
        //    router.push('/dashboard') 
      }, 3000)

    } catch (error) {
      console.error('❌ Failed to update profile:', error)
      toast({
        title: "Update Failed",
        description: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || "",
      phone: user?.profileData?.phone || "",
      year: user?.profileData?.year || "",
      branch: user?.profileData?.branch || "",
      rollNumber: user?.profileData?.rollNumber || "",
      bio: user?.profileData?.bio || "",
      tagline: user?.profileData?.tagline || "",
      skills: user?.profileData?.skills?.join(", ") || "",
      githubLink: user?.profileData?.githubLink || "",
      linkedinLink: user?.profileData?.linkedinLink || "",
      websiteLink: user?.profileData?.websiteLink || "",
      photoUrl: user?.profileData?.photoUrl || "",
      bannerUrl: user?.profileData?.bannerUrl || "",
      projects: user?.profileData?.projects || [],
      achievements: user?.profileData?.achievements || [],
      contributions: user?.profileData?.contributions || [],
    })
    setIsEditing(false)
  }

  // ... (password logic kept same)

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordLoading(true)

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      setPasswordLoading(false)
      return
    }

    try {
      if (!auth.currentUser || !user?.email) {
        throw new Error('User not authenticated')
      }

      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      )
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword)

      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordSection(false)

      setTimeout(() => setPasswordSuccess(false), 3000)

    } catch (error: any) {
      console.error('Password update error:', error)
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect')
      } else {
        setPasswordError(error.message || 'Failed to update password')
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          {saved && (
            <Alert className="w-auto p-2 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 text-sm">Profile updated successfully!</AlertDescription>
            </Alert>
          )}
          {passwordSuccess && (
            <Alert className="w-auto p-2 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 text-sm">Password updated successfully!</AlertDescription>
            </Alert>
          )}
          {!isEditing ? (
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setShowPasswordSection(!showPasswordSection)}>
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              {validation.isComplete && validation.uniqueId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  disabled
                >
                  ✅ Unique ID: {validation.uniqueId}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card with Banner Background */}
        <Card className="md:col-span-2 relative overflow-hidden group min-h-[250px] border-zinc-800 bg-zinc-900">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{ backgroundImage: `url(${formData.bannerUrl || defaultBanner})` }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

          {isEditing && (
            <div className="absolute top-4 right-4 z-20">
              <ImageUpload
                value={formData.bannerUrl}
                onChange={(url) => setFormData(prev => ({ ...prev, bannerUrl: url }))}
                onRemove={() => setFormData(prev => ({ ...prev, bannerUrl: '' }))}
                disabled={!isEditing}
                variant="banner"
                uploadPreset="Members Profile and projects pics"
                className="bg-black/50 backdrop-blur-sm rounded-lg p-1"
              />
            </div>
          )}

          <CardContent className="relative z-10 pt-10 pb-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <ImageUpload
                  value={formData.photoUrl}
                  onChange={(url) => setFormData(prev => ({ ...prev, photoUrl: url }))}
                  onRemove={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                  disabled={!isEditing}
                  className="ring-4 ring-black/50 rounded-full"
                />
              </div>
              <div className="flex-1 text-center md:text-left space-y-3">
                {isEditing ? (
                  <div className="space-y-4 max-w-md bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/10">
                    <div className="space-y-2">
                      <Label className="text-white">Display Name</Label>
                      <Input
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        placeholder="Your Name"
                        className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Role / Tagline</Label>
                      <Input
                        name="tagline"
                        value={formData.tagline}
                        onChange={handleChange}
                        placeholder="e.g. Full Stack Developer | Robotics Enthusiast"
                        className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">{formData.displayName}</h2>
                    <p className="text-cyan-400 font-medium text-lg tracking-wide uppercase drop-shadow-md flex items-center justify-center md:justify-start gap-2">
                      <span className="w-8 h-[1px] bg-cyan-500/50 inline-block"></span>
                      {formData.tagline || user?.role}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 text-zinc-300 text-sm font-medium mt-4">
                      {formData.branch && (
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
                          {formData.branch}
                        </span>
                      )}
                      {formData.year && (
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
                          {formData.year}
                        </span>
                      )}
                      {formData.rollNumber && (
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
                          ID: {formData.rollNumber}
                        </span>
                      )}
                      <div className="flex gap-2 ml-2">
                        {formData.githubLink && (
                          <a href={formData.githubLink} target="_blank" className="p-1.5 rounded-md bg-black/50 hover:bg-white/20 text-white transition-colors"><Github className="w-4 h-4" /></a>
                        )}
                        {formData.linkedinLink && (
                          <a href={formData.linkedinLink} target="_blank" className="p-1.5 rounded-md bg-black/50 hover:bg-white/20 text-blue-400 transition-colors"><Linkedin className="w-4 h-4" /></a>
                        )}
                        {formData.websiteLink && (
                          <a href={formData.websiteLink} target="_blank" className="p-1.5 rounded-md bg-black/50 hover:bg-white/20 text-green-400 transition-colors"><Globe className="w-4 h-4" /></a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>


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
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
                required
              />
              <p className="text-xs text-muted-foreground">Required for event registration</p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div>
                <Badge variant="outline" className="capitalize">
                  {user?.role}
                </Badge>
              </div>
            </div>

            {validation.uniqueId && (
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="h-4 w-4 text-green-600">🆔</div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-green-800">RAIoT Unique ID</span>
                  <span className="text-sm font-mono text-green-700">{validation.uniqueId}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" />
              Academic Information
            </CardTitle>
            <CardDescription>Your academic details and current status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number</Label>
              <Input
                id="rollNumber"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="CS21001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch/Department</Label>
              <Input
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Current Year</Label>
              <Input
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="3rd Year"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bio and Skills */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2" />
              About & Skills
            </CardTitle>
            <CardDescription>Tell us about yourself and your technical skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Tell us about your interests in robotics, automation, and IoT..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Python, Arduino, Machine Learning, React (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">Enter your skills separated by commas</p>
            </div>

            {user?.profileData?.skills && user.profileData.skills.length > 0 && (
              <div className="space-y-2">
                <Label>Current Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {user.profileData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Social Links
            </CardTitle>
            <CardDescription>Your online presence and portfolio links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="githubLink" className="flex items-center">
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Label>
                <Input
                  id="githubLink"
                  name="githubLink"
                  value={formData.githubLink}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinLink" className="flex items-center">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedinLink"
                  name="linkedinLink"
                  value={formData.linkedinLink}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteLink" className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Website
                </Label>
                <Input
                  id="websiteLink"
                  name="websiteLink"
                  value={formData.websiteLink}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Projects
              </div>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    projects: [...prev.projects, { title: '', description: '', link: '', imageUrl: '' }]
                  }))}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Project
                </Button>
              )}
            </CardTitle>
            <CardDescription>Showcase your technical projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.projects.map((project, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-6 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex-shrink-0">
                  {isEditing ? (
                    <ImageUpload
                      value={project.imageUrl}
                      onChange={(url) => {
                        const newProjects = [...formData.projects];
                        newProjects[index].imageUrl = url;
                        setFormData(prev => ({ ...prev, projects: newProjects }));
                      }}
                      onRemove={() => {
                        const newProjects = [...formData.projects];
                        newProjects[index].imageUrl = '';
                        setFormData(prev => ({ ...prev, projects: newProjects }));
                      }}
                      className="w-full md:w-auto"
                    />
                  ) : (
                    project.imageUrl && (
                      <div className="relative w-full h-48 md:w-32 md:h-32 rounded-lg overflow-hidden border border-zinc-700">
                        <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                      </div>
                    )
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  {isEditing ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          placeholder="Project Title"
                          value={project.title}
                          onChange={(e) => {
                            const newProjects = [...formData.projects];
                            newProjects[index].title = e.target.value;
                            setFormData(prev => ({ ...prev, projects: newProjects }));
                          }}
                        />
                        <Input
                          placeholder="Link (GitHub/Demo)"
                          value={project.link}
                          onChange={(e) => {
                            const newProjects = [...formData.projects];
                            newProjects[index].link = e.target.value;
                            setFormData(prev => ({ ...prev, projects: newProjects }));
                          }}
                        />
                      </div>
                      <Textarea
                        placeholder="Project Description"
                        value={project.description}
                        onChange={(e) => {
                          const newProjects = [...formData.projects];
                          newProjects[index].description = e.target.value;
                          setFormData(prev => ({ ...prev, projects: newProjects }));
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          const newProjects = formData.projects.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, projects: newProjects }));
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">{project.title}</h3>
                        <div className="flex space-x-2">
                          {project.link && (
                            <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-cyan-400">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground">{project.description}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
            {(!formData.projects || formData.projects.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No projects added yet. Click "Edit Profile" to add your projects.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Section - New Addition */}
        <InventorySection />

        {/* Achievements & Contributions */}
        <div className="grid md:grid-cols-2 gap-6 md:col-span-2">
          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Achievements
                </div>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, achievements: [...prev.achievements, ''] }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.achievements.map((item, index) => (
                <div key={index} className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newItems = [...formData.achievements];
                          newItems[index] = e.target.value;
                          setFormData(prev => ({ ...prev, achievements: newItems }));
                        }}
                        placeholder="Achievement details"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newItems = formData.achievements.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, achievements: newItems }));
                        }}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  ) : item && (
                    <div className="flex items-start gap-2 text-sm text-zinc-300">
                      <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  )}
                </div>
              ))}
              {!isEditing && formData.achievements.length === 0 && <p className="text-sm text-muted-foreground">No achievements listed.</p>}
            </CardContent>
          </Card>

          {/* Club Contributions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Club Contributions
                </div>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, contributions: [...prev.contributions, ''] }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.contributions.map((item, index) => (
                <div key={index} className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newItems = [...formData.contributions];
                          newItems[index] = e.target.value;
                          setFormData(prev => ({ ...prev, contributions: newItems }));
                        }}
                        placeholder="Contribution details"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newItems = formData.contributions.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, contributions: newItems }));
                        }}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  ) : item && (
                    <div className="flex items-start gap-2 text-sm text-zinc-300">
                      <Star className="h-4 w-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  )}
                </div>
              ))}
              {!isEditing && formData.contributions.length === 0 && <p className="text-sm text-muted-foreground">No contributions listed.</p>}
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  )
}
