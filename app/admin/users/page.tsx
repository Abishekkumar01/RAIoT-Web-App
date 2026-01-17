"use client"

import React, { useState, useEffect } from "react"
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { logFirebaseStatus } from '@/lib/firebase-test'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, UserPlus, Edit, Mail, Calendar, Loader2, X, Trash2, Check, Save, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AdminUsersPage() {
  // Log Firebase status on component mount
  useEffect(() => {
    logFirebaseStatus()
  }, [])

  const [users, setUsers] = useState<any[]>([])

  // Fetch real users from Firebase
  useEffect(() => {
    if (!db) return

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const firebaseUsers = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          displayName: data.displayName || data.email,
          email: data.email,
          role: data.role || 'member',
          rawJoiningDate: data.joiningDate || (data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          joiningDate: data.joiningDate || (data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          joinDate: (() => {
            const dateVal = data.joiningDate || data.createdAt;
            if (!dateVal) return new Date().toLocaleDateString();
            try {
              // Handle Firestore Timestamp
              if (typeof dateVal === 'object' && dateVal.seconds) {
                return new Date(dateVal.seconds * 1000).toLocaleDateString();
              }
              // Handle standard Date object or String
              const d = new Date(dateVal);
              if (isNaN(d.getTime())) return "N/A";
              return d.toLocaleDateString();
            } catch (e) {
              return "N/A";
            }
          })(),
          lastActive: (() => {
            const dateVal = data.updatedAt;
            if (!dateVal) return new Date().toLocaleDateString();
            try {
              if (typeof dateVal === 'object' && dateVal.seconds) {
                return new Date(dateVal.seconds * 1000).toLocaleDateString();
              }
              const d = new Date(dateVal);
              if (isNaN(d.getTime())) return "N/A";
              return d.toLocaleDateString();
            } catch (e) {
              return new Date().toLocaleDateString();
            }
          })(),
          attendanceRate: data.attendance ? data.attendance.length * 10 : 0,
          passwordChangedAt: data.passwordChangedAt ? new Date(data.passwordChangedAt.seconds * 1000) : null,
          passwordChangedBy: data.passwordChangedBy || null,
          initialPassword: data.initialPassword || null, // Stored password for admin reference
          profileData: {
            year: data.profileData?.year || 'N/A',
            branch: data.profileData?.branch || 'N/A',
            rollNumber: data.profileData?.rollNumber || 'N/A',
            phone: data.profileData?.phone || 'N/A'
          }
        }
      })

      setUsers(firebaseUsers)
    })

    return () => unsubscribe()
  }, [db])

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [editingUser, setEditingUser] = useState<any>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showStoredPassword, setShowStoredPassword] = useState(false)

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    rollNumber: '',
    phone: '',
    branch: '',
    year: '',
    role: 'junior_developer',
    joiningDate: new Date().toISOString().split('T')[0]
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "junior_developer":
        return "bg-green-500"
      case "senior_developer":
        return "bg-blue-500"
      case "student_coordinator":
        return "bg-purple-500"
      case "inventory_head":
        return "bg-orange-500"
      case "vice_president":
        return "bg-red-500"
      case "president":
        return "bg-red-600"
      case "public_relation_head":
      case "content_creation_head":
        return "bg-pink-500"
      case "management_head":
        return "bg-yellow-500"
      case "technical_head":
        return "bg-cyan-500"
      default:
        return "bg-gray-500"
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      displayName: '',
      email: '',
      password: '',
      rollNumber: '',
      phone: '',
      branch: '',
      year: '',
      role: 'junior_developer',
      joiningDate: new Date().toISOString().split('T')[0]
    })
    setError('')
    setSuccess('')
  }

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validation (Logic kept same)
      if (!formData.displayName.trim()) throw new Error('Full name is required')
      if (!formData.email.trim()) throw new Error('Email is required')
      if (!formData.rollNumber.trim()) throw new Error('Roll number is required')
      if (formData.password.length < 6) throw new Error('Password must be at least 6 characters')

      console.log('Creating member account via API...')

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          role: formData.role,
          profileData: {
            rollNumber: formData.rollNumber,
            phone: formData.phone,
            branch: formData.branch,
            year: formData.year
          },
          joiningDate: formData.joiningDate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error} - ${data.details}`
          : (data.error || 'Failed to create user')
        throw new Error(errorMsg)
      }

      console.log('Member user created successfully via API:', data.uid)
      const userUid = data.uid

      // Automatically generate and assign unique ID for the new member
      console.log('Generating unique ID for new member...')
      let uniqueId = null
      try {
        const { generateAndAssignUniqueId } = await import('@/lib/id-generator')
        uniqueId = await generateAndAssignUniqueId(userUid)
        console.log('✅ Unique ID generated and assigned:', uniqueId)
      } catch (idError) {
        console.error('❌ Failed to generate unique ID for member:', idError)
        // Don't fail the entire process if ID generation fails
      }

      // Show success message with unique ID if generated
      const successMessage = uniqueId
        ? `Member ${formData.displayName} has been successfully registered with ID: ${uniqueId}`
        : `Member ${formData.displayName} has been successfully registered`

      setSuccess(successMessage)

      // Update local state (Optimistic update or fetch again? Fetching happens via snapshot listener so it should update automatically)

      // Close quickly to avoid perceived hanging
      setTimeout(() => {
        setShowInviteModal(false)
        resetForm()
        setSuccess('')
      }, 800)

    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message || 'Failed to create member account')
    } finally {
      setLoading(false)
    }
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    setLoading(true)
    setError('')

    try {
      // Call the API to update Auth and Firestore
      const response = await fetch('/api/admin/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: editingUser.id,
          email: editingUser.email,
          displayName: editingUser.displayName,
          role: editingUser.role,
          profileData: editingUser.profileData,
          joiningDate: editingUser.joiningDate
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      toast({
        title: "✅ User Updated",
        description: "User profile has been updated successfully.",
      })

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === editingUser.id ? editingUser : user
      ))

      setEditingUser(null)

    } catch (error: any) {
      console.error('Edit user error:', error)
      setError(`Failed to update user: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function saveUserRole(userId: string, newRole: string, userName: string) {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await setDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date()
      }, { merge: true })

      // Show toast notification in bottom corner
      toast({
        title: "✅ Role Updated",
        description: `${userName}'s role has been changed to ${newRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      })

    } catch (error: any) {
      console.error('Save role error:', error)
      toast({
        title: "❌ Error",
        description: `Failed to save role: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (window.confirm(`⚠️ Are you sure you want to delete "${userName}"?\n\nThis action cannot be undone and will:\n• Remove user from Authentication\n• Delete all user data from Firestore`)) {
      setLoading(true)
      setError('')

      try {
        // Find user by email in Firestore to get their UID
        // Note: In our current data structure, userId IS the uid, but let's be safe
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', users.find(u => u.id === userId)?.email)
        )

        const querySnapshot = await getDocs(usersQuery)
        let userUid = userId

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0]
          const userData = userDoc.data()
          userUid = userData.uid || userId
        }

        // Call server API to delete from Auth and Firestore
        const response = await fetch('/api/admin/users/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userUid }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete user')
        }

        console.log(`Deleted user ${userName} via API`)

        // Remove from local state
        setUsers(prev => prev.filter(user => user.id !== userId))

        // Show toast notification
        toast({
          title: "🗑️ User Deleted",
          description: `${userName} has been successfully removed from the system.`,
        })

      } catch (error: any) {
        console.error('Delete user error:', error)
        toast({
          title: "❌ Delete Failed",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <p className="text-muted-foreground">Manage user roles and access control</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Global Success/Error Notifications */}
      {success && (
        <Alert className="border-green-500 bg-green-500/10">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500 font-medium">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="junior_developer">Junior Developers</SelectItem>
                <SelectItem value="senior_developer">Senior Developers</SelectItem>
                <SelectItem value="student_coordinator">Student Coordinators</SelectItem>
                <SelectItem value="inventory_head">Inventory Heads</SelectItem>
                <SelectItem value="vice_president">Vice Presidents</SelectItem>
                <SelectItem value="president">Presidents</SelectItem>
                <SelectItem value="public_relation_head">Public Relation & Content Creation Head</SelectItem>
                <SelectItem value="management_head">Management Heads</SelectItem>
                <SelectItem value="technical_head">Technical Heads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Academic Info</TableHead>
                <TableHead className="w-[100px] text-zinc-400">Join Date</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleColor(user.role)} text-white`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.profileData.year}</div>
                      <div className="text-muted-foreground">{user.profileData.branch}</div>
                      <div className="text-muted-foreground">{user.profileData.rollNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div className="flex items-center text-xs">
                      <Calendar className="w-3 h-3 mr-1 text-zinc-500" />
                      {user.joinDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {user.lastActive}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="junior_developer">Junior Developer</SelectItem>
                            <SelectItem value="senior_developer">Senior Developer</SelectItem>
                            <SelectItem value="student_coordinator">Student Coordinator</SelectItem>
                            <SelectItem value="inventory_head">Inventory Head</SelectItem>
                            <SelectItem value="vice_president">Vice President</SelectItem>
                            <SelectItem value="president">President</SelectItem>
                            <SelectItem value="public_relation_head">Public Relation & Content Creation Head</SelectItem>
                            <SelectItem value="management_head">Management Head</SelectItem>
                            <SelectItem value="technical_head">Technical Head</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveUserRole(user.id, user.role, user.displayName)}
                          className="h-10 w-10 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                          title="Save Role"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.displayName)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Invite New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account with ID card access. The user will receive their login credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteUser} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name *</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rollNumber">Roll Number *</Label>
                    <Input
                      id="rollNumber"
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="r00006"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Minimum 6 characters"
                  />
                  <p className="text-xs text-muted-foreground">
                    This password will be provided to the member. They can change it later in their profile.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Academic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch/Department</Label>
                    <Input
                      id="branch"
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Current Year</Label>
                    <Input
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      placeholder="3rd Year"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior_developer">Junior Developer</SelectItem>
                        <SelectItem value="senior_developer">Senior Developer</SelectItem>
                        <SelectItem value="student_coordinator">Student Coordinator</SelectItem>
                        <SelectItem value="inventory_head">Inventory Head</SelectItem>
                        <SelectItem value="vice_president">Vice President</SelectItem>
                        <SelectItem value="president">President</SelectItem>
                        <SelectItem value="public_relation_head">Public Relation & Content Creation Head</SelectItem>
                        <SelectItem value="management_head">Management Head</SelectItem>
                        <SelectItem value="technical_head">Technical Head</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input
                      id="joiningDate"
                      name="joiningDate"
                      type="date"
                      value={formData.joiningDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false)
                  resetForm()
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={(e) => handleEditUser(e)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editDisplayName">Full Name</Label>
                  <Input
                    id="editDisplayName"
                    value={editingUser.displayName}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editRollNumber">Roll Number</Label>
                  <Input
                    id="editRollNumber"
                    value={editingUser.profileData?.rollNumber || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      profileData: { ...editingUser.profileData, rollNumber: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone</Label>
                  <Input
                    id="editPhone"
                    value={editingUser.profileData?.phone || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      profileData: { ...editingUser.profileData, phone: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editBranch">Branch</Label>
                  <Input
                    id="editBranch"
                    value={editingUser.profileData?.branch || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      profileData: { ...editingUser.profileData, branch: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editJoiningDate">Joining Date</Label>
                  <Input
                    id="editJoiningDate"
                    type="date"
                    value={editingUser.joiningDate || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, joiningDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editYear">Year</Label>
                  <Input
                    id="editYear"
                    value={editingUser.profileData?.year || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      profileData: { ...editingUser.profileData, year: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior_developer">Junior Developer</SelectItem>
                    <SelectItem value="senior_developer">Senior Developer</SelectItem>
                    <SelectItem value="student_coordinator">Student Coordinator</SelectItem>
                    <SelectItem value="inventory_head">Inventory Head</SelectItem>
                    <SelectItem value="vice_president">Vice President</SelectItem>
                    <SelectItem value="president">President</SelectItem>
                    <SelectItem value="public_relation_head">Public Relation & Content Creation Head</SelectItem>
                    <SelectItem value="management_head">Management Head</SelectItem>
                    <SelectItem value="technical_head">Technical Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              {/* Password Change Info */}
              {editingUser.passwordChangedAt && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-400">
                    🔐 Password last changed: {editingUser.passwordChangedAt.toLocaleDateString()} at {editingUser.passwordChangedAt.toLocaleTimeString()}
                    <span className="text-xs ml-2 text-blue-300">({editingUser.passwordChangedBy === 'self' ? 'by user' : 'by admin'})</span>
                  </p>
                </div>
              )}

              {/* Current Password Display & Edit */}
              <div className="space-y-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <Label className="flex items-center text-sm font-medium">
                  🔑 Current Password
                </Label>

                {/* Show current stored password */}
                {editingUser.initialPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-900 rounded-md px-3 py-2 font-mono text-sm border border-zinc-700">
                      {showStoredPassword ? editingUser.initialPassword : '••••••••'}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStoredPassword(!showStoredPassword)}
                      title={showStoredPassword ? "Hide password" : "Show password"}
                    >
                      {showStoredPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(editingUser.initialPassword)
                        toast({ title: "📋 Copied!", description: "Password copied to clipboard" })
                      }}
                      title="Copy password"
                    >
                      📋
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No password stored (user created before this feature)</p>
                )}

                {/* Edit/Reset Password */}
                <div className="pt-3 border-t border-zinc-700 mt-3">
                  <Label htmlFor="newPassword" className="flex items-center text-sm font-medium mb-2">
                    ✏️ Set New Password
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={passwordLoading || newPassword.length < 6}
                      onClick={async () => {
                        setPasswordLoading(true)
                        try {
                          const response = await fetch('/api/admin/users/update-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: editingUser.id, newPassword })
                          })
                          const data = await response.json()
                          if (!response.ok) throw new Error(data.error)
                          toast({
                            title: "✅ Password Updated",
                            description: `Password has been set for ${editingUser.displayName}`,
                          })
                          // Update local state to show new password
                          setEditingUser({ ...editingUser, initialPassword: newPassword })
                          setNewPassword('')
                        } catch (error: any) {
                          toast({
                            title: "❌ Error",
                            description: error.message,
                            variant: "destructive"
                          })
                        } finally {
                          setPasswordLoading(false)
                        }
                      }}
                    >
                      {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update User'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog >
    </div >
  )
}
