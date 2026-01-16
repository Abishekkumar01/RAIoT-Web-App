"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, query, orderBy, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Edit2, Save, X, ExternalLink, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import ImageUpload from "@/components/ui/ImageUpload"

interface Leader {
    id: string
    displayId?: string // Custom ID for display
    name: string
    role: string
    batch: string
    status: 'active' | 'alumni'
    type?: 'leader' | 'faculty' // New field
    linkedin: string
    imageUrl: string
    order: number
    bio?: string
    skills?: string[]
    contributionLevel?: number // Percentage 0-100
}

export default function AdminLeadersPage() {
    const [leaders, setLeaders] = useState<Leader[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        role: "",
        batch: new Date().getFullYear().toString(),
        status: "active" as 'active' | 'alumni',
        type: "leader" as 'leader' | 'faculty',
        linkedin: "",
        imageUrl: "",
        order: 0,
        bio: "",
        skills: "", // Comma separated string for input
        contributionLevel: 85 // Default to 85%
    })

    const { toast } = useToast()

    // Subscribe to Leaders
    useEffect(() => {
        const q = query(collection(db, "leaders"), orderBy("order", "asc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Leader[] = []
            snapshot.forEach((doc) => {
                const data = doc.data()
                // Use stored displayId or fallback to doc id for legacy records
                const displayId = data.displayId || doc.id
                items.push({ id: doc.id, ...data, displayId, type: data.type || 'leader' } as Leader)
            })
            setLeaders(items)
            setLoading(false)
        }, (error) => {
            console.error("Error fetching leaders:", error)
            toast({ title: "Error", description: "Failed to load leaders.", variant: "destructive" })
            setLoading(false)
        })

        return () => unsubscribe()
    }, [toast])

    const resetForm = () => {
        setFormData({
            id: "",
            name: "",
            role: "",
            batch: new Date().getFullYear().toString(),
            status: "active",
            type: "leader",
            linkedin: "",
            imageUrl: "",
            order: leaders.length, // Auto-increment sort order
            bio: "",
            skills: "",
            contributionLevel: 85
        })
        setEditingId(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name || !formData.role) {
            toast({ title: "Validation Error", description: "Name and Role are required.", variant: "destructive" })
            return
        }

        try {
            // Data to save: remove 'id' from formData (which is display ID) and store it as displayId
            const { id: displayIdInput, ...rest } = formData
            const dataToSave = {
                ...rest,
                displayId: displayIdInput,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
            }

            if (editingId) {
                // UPDATE EXISTING: always use updateDoc on the editingId (doc ID)
                await updateDoc(doc(db, "leaders", editingId), dataToSave)
                toast({ title: "Updated", description: "Leader updated successfully." })
            } else {
                // CREATE NEW: always use auto-ID to avoid collisions
                await addDoc(collection(db, "leaders"), dataToSave)
                toast({ title: "Created", description: `Leader added with ID: ${displayIdInput}` })
            }
            resetForm()
        } catch (error: any) {
            console.error("Error saving leader:", error)
            toast({
                title: "Error",
                description: `Failed to save leader: ${error.message || "Unknown error"}`,
                variant: "destructive"
            })
        }
    }

    const handleEdit = (leader: Leader) => {
        setEditingId(leader.id)
        setFormData({
            id: leader.displayId || leader.id,
            name: leader.name,
            role: leader.role,
            batch: leader.batch,
            status: leader.status,
            type: leader.type || 'leader',
            linkedin: leader.linkedin,
            imageUrl: leader.imageUrl,
            order: leader.order,
            bio: leader.bio || "",
            skills: leader.skills ? leader.skills.join(", ") : "",
            contributionLevel: leader.contributionLevel || 85
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this leader?")) return
        try {
            await deleteDoc(doc(db, "leaders", id))
            toast({ title: "Deleted", description: "Leader removed." })
        } catch (error) {
            console.error("Error deleting leader:", error)
            toast({ title: "Error", description: "Failed to delete leader.", variant: "destructive" })
        }
    }

    return (
        <div className="max-w-[1920px] mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Manage Leaders & Faculty</h1>
                    <p className="text-muted-foreground">Add members to the Our Leaders or Faculty timeline.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/leaders" target="_blank">
                        <Button variant="outline">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Public Site
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{editingId ? "Edit Member" : "Add Member"}</CardTitle>
                            <CardDescription>Enter details below.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Member Type Selection */}
                                <div className="space-y-3 pb-2 border-b">
                                    <Label>Member Type</Label>
                                    <RadioGroup
                                        defaultValue="leader"
                                        value={formData.type}
                                        onValueChange={(v: 'leader' | 'faculty') => setFormData({ ...formData, type: v })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="leader" id="r-leader" />
                                            <Label htmlFor="r-leader">Leader</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="faculty" id="r-faculty" />
                                            <Label htmlFor="r-faculty">Faculty</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>ID (Custom)</Label>
                                        <Input
                                            value={formData.id}
                                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                            // Display ID is editable, we just save it as a field
                                            placeholder="e.g. R00006"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Custom Display ID (can be duplicate, e.g. NA).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sort Order</Label>
                                        <Input
                                            type="number"
                                            value={formData.order}
                                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Input
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            placeholder="e.g. President"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Batch</Label>
                                        <Input
                                            value={formData.batch}
                                            onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                                            placeholder="e.g. 2024"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(v: 'active' | 'alumni') => setFormData({ ...formData, status: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="alumni">Alumni</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>LinkedIn URL</Label>
                                    <Input
                                        value={formData.linkedin}
                                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label>Member Image</Label>

                                    <div className="space-y-2">
                                        <Label htmlFor="image-url" className="text-xs text-muted-foreground">Manual URL (GitHub/External)</Label>
                                        <Input
                                            id="image-url"
                                            value={formData.imageUrl}
                                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                            placeholder="https://raw.githubusercontent.com/..."
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-muted/30" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">Or upload file</span>
                                        </div>
                                    </div>

                                    <ImageUpload
                                        value={formData.imageUrl || ""}
                                        onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                        onRemove={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                                        variant="avatar"
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Skills (Comma separated)</Label>
                                    <Input
                                        value={formData.skills}
                                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                        placeholder="React, Python, Robotics, ..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Bio / Quote</Label>
                                    <Textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="A short tagline or quote..."
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-lg font-semibold">Contribution Level</Label>
                                        <span className="text-sm font-mono text-primary">{formData.contributionLevel}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={formData.contributionLevel}
                                        onChange={(e) => setFormData({ ...formData, contributionLevel: parseInt(e.target.value) })}
                                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                                        style={{
                                            background: `linear-gradient(to right, #2563eb ${formData.contributionLevel}%, #1e293b ${formData.contributionLevel}%)`
                                        }}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Slide to set the contribution percentage (0-100%)</p>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="flex-1">
                                        {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                        {editingId ? "Update" : "Add"}
                                    </Button>
                                    {editingId && (
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Current Members ({leaders.length})</h2>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : leaders.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-lg">
                            <p className="text-muted-foreground mb-4">No leaders found in database.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {leaders.map((leader, index) => (
                                <Card key={leader.id} className="relative group overflow-hidden mb-4">
                                    <CardContent className="p-4 flex gap-4 items-center">
                                        {/* Image Preview */}
                                        <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0 border-2 border-primary/20">
                                            {leader.imageUrl ? (
                                                <img src={leader.imageUrl} alt={leader.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                                    No Img
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="font-bold truncate">{leader.name}</h3>
                                            <p className="text-xs text-primary font-medium truncate">{leader.role}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <Badge
                                                    variant={leader.type === 'faculty' ? 'default' : 'outline'}
                                                    className={`text-[10px] h-5 px-1.5 shrink-0 ${leader.type === 'faculty' ? 'bg-amber-600 hover:bg-amber-700' : 'border-primary/50 text-foreground'}`}
                                                >
                                                    {leader.type === 'faculty' ? 'FACULTY' : 'LEADER'}
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono whitespace-nowrap shrink-0">
                                                    ID: {leader.displayId || leader.id}
                                                </Badge>
                                                <Badge variant={leader.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 shrink-0">
                                                    {leader.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-muted-foreground">Batch {leader.batch}</span>
                                                <span className="text-xs text-muted-foreground text-[10px]">#{leader.order}</span>
                                            </div>
                                            {leader.skills && leader.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {leader.skills.slice(0, 3).map((s, i) => (
                                                        <span key={i} className="text-[9px] bg-secondary px-1 rounded text-secondary-foreground">{s}</span>
                                                    ))}
                                                    {leader.skills.length > 3 && <span className="text-[9px] text-muted-foreground">+{leader.skills.length - 3}</span>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-background/80 rounded-lg p-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleEdit(leader)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDelete(leader.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

