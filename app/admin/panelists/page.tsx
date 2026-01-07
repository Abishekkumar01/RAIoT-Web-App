"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Mail, Phone, Award, Building } from "lucide-react"

export default function PanelistsPage() {
  const [panelists, setPanelists] = useState([
    {
      id: "1",
      name: "Dr. Sarah Wilson",
      email: "sarah.wilson@techcorp.com",
      phone: "+1 (555) 123-4567",
      organization: "TechCorp Industries",
      expertise: "Machine Learning, AI",
      role: "judge",
      bio: "Leading AI researcher with 15+ years of experience in machine learning and neural networks.",
      status: "active",
    },
    {
      id: "2",
      name: "Prof. Michael Chen",
      email: "michael.chen@university.edu",
      phone: "+1 (555) 234-5678",
      organization: "State University",
      expertise: "Robotics, Automation",
      role: "mentor",
      bio: "Professor of Robotics Engineering and founder of the University Robotics Lab.",
      status: "active",
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      email: "emily.r@iotstart.com",
      phone: "+1 (555) 345-6789",
      organization: "IoT Startup Inc.",
      expertise: "IoT, Embedded Systems",
      role: "speaker",
      bio: "CTO of IoT Startup with expertise in embedded systems and smart device development.",
      status: "inactive",
    },
  ])

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPanelist, setEditingPanelist] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    expertise: "",
    role: "judge",
    bio: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCreatePanelist = () => {
    const newPanelist = {
      id: Date.now().toString(),
      ...formData,
      status: "active",
    }
    setPanelists((prev) => [...prev, newPanelist])
    resetForm()
    setIsCreateDialogOpen(false)
  }

  const handleEditPanelist = (panelist: any) => {
    setEditingPanelist(panelist)
    setFormData({
      name: panelist.name,
      email: panelist.email,
      phone: panelist.phone,
      organization: panelist.organization,
      expertise: panelist.expertise,
      role: panelist.role,
      bio: panelist.bio,
    })
  }

  const handleUpdatePanelist = () => {
    setPanelists((prev) =>
      prev.map((panelist) => (panelist.id === editingPanelist.id ? { ...panelist, ...formData } : panelist)),
    )
    setEditingPanelist(null)
    resetForm()
  }

  const handleDeletePanelist = (panelistId: string) => {
    setPanelists((prev) => prev.filter((panelist) => panelist.id !== panelistId))
  }

  const toggleStatus = (panelistId: string) => {
    setPanelists((prev) =>
      prev.map((panelist) =>
        panelist.id === panelistId
          ? { ...panelist, status: panelist.status === "active" ? "inactive" : "active" }
          : panelist,
      ),
    )
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      organization: "",
      expertise: "",
      role: "judge",
      bio: "",
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "judge":
        return "bg-red-500"
      case "mentor":
        return "bg-blue-500"
      case "speaker":
        return "bg-green-500"
      case "advisor":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusColor = (status: string) => {
    return status === "active" ? "bg-green-500" : "bg-gray-500"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Panelists</h1>
          <p className="text-muted-foreground">Manage judges, mentors, speakers, and advisors for RAIoT events</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Panelist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Panelist</DialogTitle>
              <DialogDescription>Add a new judge, mentor, speaker, or advisor</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Dr. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="judge">Judge</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="speaker">Speaker</SelectItem>
                      <SelectItem value="advisor">Advisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    placeholder="Company or University"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expertise">Expertise</Label>
                  <Input
                    id="expertise"
                    name="expertise"
                    value={formData.expertise}
                    onChange={handleInputChange}
                    placeholder="AI, Robotics, IoT"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Brief professional background and expertise..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePanelist}>Add Panelist</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Panelists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Panelists ({panelists.length})</CardTitle>
          <CardDescription>Manage your panel of experts for events and competitions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Contact</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panelists.map((panelist) => (
                <TableRow key={panelist.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{panelist.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {panelist.email}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {panelist.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      {panelist.organization}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleColor(panelist.role)} text-white`}>
                      {panelist.role.charAt(0).toUpperCase() + panelist.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                      {panelist.expertise}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(panelist.id)}>
                      <Badge className={`${getStatusColor(panelist.status)} text-white mr-2`}>
                        {panelist.status.charAt(0).toUpperCase() + panelist.status.slice(1)}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditPanelist(panelist)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePanelist(panelist.id)}
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

      {/* Edit Panelist Dialog */}
      <Dialog open={!!editingPanelist} onOpenChange={() => setEditingPanelist(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Panelist</DialogTitle>
            <DialogDescription>Update panelist information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="speaker">Speaker</SelectItem>
                    <SelectItem value="advisor">Advisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" value={formData.phone} onChange={handleInputChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-organization">Organization</Label>
                <Input
                  id="edit-organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expertise">Expertise</Label>
                <Input id="edit-expertise" name="expertise" value={formData.expertise} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea id="edit-bio" name="bio" value={formData.bio} onChange={handleInputChange} rows={3} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditingPanelist(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePanelist}>Update Panelist</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
