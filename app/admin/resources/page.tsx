"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, FileText, Search } from "lucide-react"
import { CloudinaryDocumentUpload } from "@/components/ui/CloudinaryDocumentUpload"
import { MemberResource } from "@/lib/types/resource"

export default function AdminResourcesPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<any[]>([])
  const [resources, setResources] = useState<MemberResource[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // New Resource Form State
  const [selectedUserId, setSelectedUserId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [fileName, setFileName] = useState("")

  // Fetch users
  useEffect(() => {
    const q = query(collection(db, "users"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.data().uid || doc.id,
        displayName: doc.data().displayName || "Unknown User",
        email: doc.data().email || "",
      }))
      setUsers(fetchedUsers)
    })
    return () => unsubscribe()
  }, [])

  // Fetch resources
  useEffect(() => {
    const q = query(collection(db, "member_resources"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedResources = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MemberResource[]
      
      // Sort by uploadedAt descending locally
      fetchedResources.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0))
      
      setResources(fetchedResources)
    })
    return () => unsubscribe()
  }, [])

  const filteredResources = resources.filter(res => 
    res.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    users.find(u => u.uid === res.userId)?.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUploadSuccess = (url: string, name: string) => {
    setFileUrl(url)
    setFileName(name)
  }

  const handleAddResource = async () => {
    if (!selectedUserId || !title || !fileUrl) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      await addDoc(collection(db, "member_resources"), {
        userId: selectedUserId,
        title,
        description,
        fileUrl,
        fileName,
        uploadedAt: Date.now(),
        uploadedBy: currentUser?.uid || "Admin"
      })
      
      toast({ title: "Success", description: "Resource uploaded successfully!" })
      setIsAddModalOpen(false)
      // Reset form
      setSelectedUserId("")
      setTitle("")
      setDescription("")
      setFileUrl("")
      setFileName("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return
    try {
      await deleteDoc(doc(db, "member_resources", id))
      toast({ title: "Resource deleted" })
    } catch (error: any) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" })
    }
  }

  const getUserName = (uid: string) => {
    return users.find(u => u.uid === uid)?.displayName || uid
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Manage Resources</h1>
          <p className="text-zinc-400 mt-2">Upload and manage test papers and materials for members.</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Upload New Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Member *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select a member..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-64">
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.displayName} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resource Title *</Label>
                <Input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. C++ Test Result" 
                  className="bg-zinc-800 border-zinc-700" 
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Additional details..." 
                  className="bg-zinc-800 border-zinc-700" 
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label>Resource File *</Label>
                <CloudinaryDocumentUpload onUploadSuccess={handleUploadSuccess} currentFileUrl={fileUrl} />
              </div>

              <Button 
                onClick={handleAddResource} 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                disabled={isSubmitting || !selectedUserId || !title || !fileUrl}
              >
                {isSubmitting ? "Saving..." : "Save Resource"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex sm:flex-row flex-col gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search resources by title, file name, or member name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-950 border-zinc-800 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="rounded-md border border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-950">
              <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium">Resource Title</TableHead>
                <TableHead className="text-zinc-400 font-medium">Member</TableHead>
                <TableHead className="text-zinc-400 font-medium">File</TableHead>
                <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                <TableHead className="text-right text-zinc-400 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.map((res) => (
                <TableRow key={res.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <TableCell className="font-medium text-zinc-200">
                    <div>{res.title}</div>
                    {res.description && <div className="text-xs text-zinc-500">{res.description}</div>}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {getUserName(res.userId)}
                  </TableCell>
                  <TableCell>
                    <a href={res.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-400 hover:text-blue-300 text-sm">
                      <FileText className="h-4 w-4 mr-1" />
                      {res.fileName || "View File"}
                    </a>
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {res.uploadedAt ? new Date(res.uploadedAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(res.id)} className="text-red-400 hover:text-red-300 hover:bg-zinc-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredResources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                    No resources found. Try adding one!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}