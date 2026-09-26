"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Edit2, Save, X, ExternalLink, Trophy, Award, CheckCircle2, Search } from "lucide-react"
import Link from "next/link"
import ImageUpload from "@/components/ui/ImageUpload"
import { Achievement } from "@/lib/types/achievement"

export default function AdminAchievementsPage() {
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all")

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        batch: new Date().getFullYear().toString(),
        date: "",
        tag: "1st Place",
        imageUrl: "",
        description: "",
        pointsText: "", // Newline-separated points for easy editing
        order: 0,
        status: "published" as 'published' | 'draft'
    })

    const { toast } = useToast()

    // Subscribe to Achievements from Firestore
    useEffect(() => {
        const q = query(collection(db, "achievements"), orderBy("order", "asc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Achievement[] = []
            snapshot.forEach((doc) => {
                const data = doc.data()
                items.push({
                    id: doc.id,
                    title: data.title || "",
                    batch: data.batch || new Date().getFullYear().toString(),
                    date: data.date || "",
                    tag: data.tag || "",
                    imageUrl: data.imageUrl || "",
                    description: data.description || "",
                    points: Array.isArray(data.points) ? data.points : [],
                    order: typeof data.order === 'number' ? data.order : 0,
                    status: data.status || 'published',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                })
            })
            // Sort by Batch Descending then Order Ascending
            items.sort((a, b) => parseInt(b.batch) - parseInt(a.batch) || a.order - b.order)
            setAchievements(items)
            setLoading(false)
        }, (error) => {
            console.error("Error fetching achievements:", error)
            toast({ title: "Error", description: "Failed to load achievements.", variant: "destructive" })
            setLoading(false)
        })

        return () => unsubscribe()
    }, [toast])

    const resetForm = () => {
        setFormData({
            title: "",
            batch: new Date().getFullYear().toString(),
            date: "",
            tag: "1st Place",
            imageUrl: "",
            description: "",
            pointsText: "",
            order: achievements.length,
            status: "published"
        })
        setEditingId(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title.trim() || !formData.batch.trim()) {
            toast({ title: "Validation Error", description: "Title and Batch are required.", variant: "destructive" })
            return
        }

        // Parse points from newline-separated string
        const points = formData.pointsText
            .split('\n')
            .map(p => p.trim())
            .filter(Boolean)

        const dataToSave = {
            title: formData.title.trim(),
            batch: formData.batch.trim(),
            date: formData.date.trim(),
            tag: formData.tag.trim(),
            imageUrl: formData.imageUrl.trim(),
            description: formData.description.trim(),
            points: points,
            order: formData.order,
            status: formData.status,
            updatedAt: serverTimestamp()
        }

        try {
            if (editingId) {
                await updateDoc(doc(db, "achievements", editingId), dataToSave)
                toast({ title: "Updated", description: "Achievement updated successfully." })
            } else {
                await addDoc(collection(db, "achievements"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                })
                toast({ title: "Created", description: "Achievement created successfully." })
            }
            resetForm()
        } catch (error: any) {
            console.error("Error saving achievement:", error)
            toast({
                title: "Error",
                description: `Failed to save achievement: ${error.message || "Unknown error"}`,
                variant: "destructive"
            })
        }
    }

    const handleEdit = (achievement: Achievement) => {
        setEditingId(achievement.id)
        setFormData({
            title: achievement.title,
            batch: achievement.batch,
            date: achievement.date || "",
            tag: achievement.tag || "1st Place",
            imageUrl: achievement.imageUrl || "",
            description: achievement.description || "",
            pointsText: (achievement.points || []).join("\n"),
            order: achievement.order || 0,
            status: achievement.status || "published"
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id: string) => {
        const achievement = achievements.find(a => a.id === id)
        const name = achievement?.title || 'this achievement'

        if (!confirm(`⚠️ Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) return

        try {
            await deleteDoc(doc(db, "achievements", id))
            toast({
                title: "🗑️ Deleted",
                description: `"${name}" has been removed.`
            })
        } catch (error) {
            console.error("Error deleting achievement:", error)
            toast({
                title: "Delete Failed",
                description: "Failed to delete achievement.",
                variant: "destructive"
            })
        }
    }

    // Extract unique batches for filtering
    const uniqueBatches = Array.from(new Set(achievements.map(a => a.batch))).sort((a, b) => parseInt(b) - parseInt(a))

    const filteredAchievements = achievements.filter(a => {
        const matchesBatch = selectedBatchFilter === "all" || a.batch === selectedBatchFilter
        const matchesSearch = searchQuery === "" ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.tag && a.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.points && a.points.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())))
        return matchesBatch && matchesSearch
    })

    return (
        <div className="max-w-[1920px] mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-amber-400" />
                        Manage Achievements
                    </h1>
                    <p className="text-muted-foreground">Add and manage batch-wise achievements, landscape photos, and milestone points.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/achievements" target="_blank">
                        <Button variant="outline">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Public Achievements
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-cyan-400" />
                                {editingId ? "Edit Achievement" : "Add Achievement"}
                            </CardTitle>
                            <CardDescription>Fill out milestone and victory details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Achievement Title *</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Smart India Hackathon Winners"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Batch (Year) *</Label>
                                        <Input
                                            value={formData.batch}
                                            onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                                            placeholder="e.g. 2025"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date / Period</Label>
                                        <Input
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            placeholder="e.g. Dec 2024"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tag / Award</Label>
                                        <Input
                                            value={formData.tag}
                                            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                            placeholder="e.g. 1st Place, National Winner"
                                        />
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

                                {/* Landscape Image Upload */}
                                <div className="space-y-2">
                                    <Label>Landscape Banner Image</Label>
                                    <Input
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://... (or upload below)"
                                    />
                                    <ImageUpload
                                        value={formData.imageUrl || ""}
                                        onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                        onRemove={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                                        variant="banner"
                                        className="w-full"
                                    />
                                    <p className="text-[11px] text-muted-foreground">Upload a wide landscape photo of the batch / team receiving the award.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Summary Description (Optional)</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="A brief overview of the competition or event..."
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Achievement Points (One per line) *</Label>
                                        <span className="text-[10px] text-muted-foreground font-mono">1 line = 1 point</span>
                                    </div>
                                    <Textarea
                                        value={formData.pointsText}
                                        onChange={(e) => setFormData({ ...formData, pointsText: e.target.value })}
                                        placeholder={"• Secured 1st place among 1,200+ national teams\n• Won cash prize of ₹1,00,000\n• Built an autonomous AI search and rescue drone system\n• Recognized by Ministry of Electronics & IT"}
                                        rows={5}
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: 'published' | 'draft') => setFormData({ ...formData, status: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="published">Published</SelectItem>
                                            <SelectItem value="draft">Draft (Hidden)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="flex-1">
                                        {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                        {editingId ? "Update Achievement" : "Add Achievement"}
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h2 className="text-xl font-semibold">
                            Existing Achievements ({achievements.length})
                        </h2>
                        {/* Search and Batch Filter */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48">
                                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="pl-8 h-8 text-xs"
                                />
                            </div>
                            <div className="flex flex-wrap gap-1 bg-muted/60 p-1 rounded-lg">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedBatchFilter === "all" ? "default" : "ghost"}
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setSelectedBatchFilter("all")}
                                >
                                    All
                                </Button>
                                {uniqueBatches.map(batch => (
                                    <Button
                                        key={batch}
                                        type="button"
                                        size="sm"
                                        variant={selectedBatchFilter === batch ? "default" : "ghost"}
                                        className="h-7 text-xs px-2.5 font-mono"
                                        onClick={() => setSelectedBatchFilter(batch)}
                                    >
                                        {batch}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-cyan-400" /></div>
                    ) : filteredAchievements.length === 0 ? (
                        <div className="text-center p-12 border border-dashed rounded-xl bg-muted/10">
                            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                            <p className="text-muted-foreground font-medium">No achievements found.</p>
                            <p className="text-xs text-muted-foreground mt-1">Add your first achievement milestone using the form on the left.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAchievements.map((item) => (
                                <Card key={item.id} className="relative group overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300">
                                    <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start">
                                        {/* Landscape Image Preview */}
                                        <div className="w-full md:w-56 aspect-video rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-700/60 relative">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                                    <Trophy className="w-8 h-8 mb-1 text-slate-600" />
                                                    <span className="text-[10px] font-mono">No Image</span>
                                                </div>
                                            )}
                                            {item.tag && (
                                                <div className="absolute top-2 left-2">
                                                    <Badge className="bg-amber-500/90 text-black font-bold text-[10px] shadow-sm">
                                                        {item.tag}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2 w-full">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 font-mono text-xs">
                                                            Batch {item.batch}
                                                        </Badge>
                                                        {item.date && (
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {item.date}
                                                            </span>
                                                        )}
                                                        <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                            {item.status}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground font-mono">#{item.order}</span>
                                                    </div>
                                                    <h3 className="text-lg md:text-xl font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                                                        {item.title}
                                                    </h3>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => handleEdit(item)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {item.description && (
                                                <p className="text-xs md:text-sm text-slate-400 line-clamp-2">
                                                    {item.description}
                                                </p>
                                            )}

                                            {/* Points list */}
                                            {item.points && item.points.length > 0 && (
                                                <div className="mt-2 space-y-1 bg-muted/20 p-2.5 rounded-lg border border-slate-800">
                                                    <p className="text-[11px] font-mono text-cyan-400 font-semibold uppercase tracking-wider mb-1">
                                                        Key Milestones ({item.points.length}):
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {item.points.slice(0, 3).map((pt, i) => (
                                                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5 font-sans">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                                                <span className="line-clamp-1">{pt}</span>
                                                            </li>
                                                        ))}
                                                        {item.points.length > 3 && (
                                                            <p className="text-[10px] text-muted-foreground italic pl-5">
                                                                +{item.points.length - 3} more points...
                                                            </p>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
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
