"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
import { Calendar, Users, Plus, Edit, Trash2, Bot, Github, ExternalLink, X, Rocket } from "lucide-react"
import { collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'
import { Project } from "@/lib/types/project"
import { addProject, updateProject, deleteProject } from "@/lib/firebase/projects"
import ImageUpload from "@/components/ui/ImageUpload"

export default function AdminProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<Project>>({
        title: "",
        description: "",
        status: "ongoing",
        technologies: [],
        teamMembers: [],
        image: "",
        githubLink: "",
        demoLink: "",
        completedDate: "",
        batch: "",
    })

    // Inputs for arrays
    const [techInput, setTechInput] = useState("")
    const [memberInput, setMemberInput] = useState("")

    const { toast } = useToast()

    // Real-time listener
    useEffect(() => {
        const colRef = collection(db, 'projects')
        const unsub = onSnapshot(colRef,
            (snap) => {
                const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
                setProjects(list)
                setError(null)
            },
            (err) => {
                console.error("Firestore Error:", err)
                setError(err.message)
                toast({
                    title: "Error fetching projects",
                    description: "Please check your permissions/rules.",
                    variant: "destructive"
                })
            }
        )
        return () => unsub()
    }, [toast])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // --- Array Inputs Logic ---
    const addTech = () => {
        if (!techInput.trim()) return
        setFormData(prev => ({
            ...prev,
            technologies: [...(prev.technologies || []), techInput.trim()]
        }))
        setTechInput("")
    }

    const removeTech = (index: number) => {
        setFormData(prev => ({
            ...prev,
            technologies: prev.technologies?.filter((_, i) => i !== index)
        }))
    }

    const addMember = () => {
        if (!memberInput.trim()) return
        setFormData(prev => ({
            ...prev,
            teamMembers: [...(prev.teamMembers || []), memberInput.trim()]
        }))
        setMemberInput("")
    }

    const removeMember = (index: number) => {
        setFormData(prev => ({
            ...prev,
            teamMembers: prev.teamMembers?.filter((_, i) => i !== index)
        }))
    }

    // --- Submit Logic ---
    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            status: "ongoing",
            technologies: [],
            teamMembers: [],
            image: "",
            githubLink: "",
            demoLink: "",
            completedDate: "",
            batch: "",
            batchHighlight: "",
        })
        setTechInput("")
        setMemberInput("")
    }

    const handleSubmit = async () => {
        if (!formData.title || !formData.description) {
            toast({ title: "Title and description are required", variant: "destructive" })
            return
        }

        setIsSubmitting(true)
        try {
            const projectData = {
                ...formData,
                // Ensure arrays are initialized
                technologies: formData.technologies || [],
                teamMembers: formData.teamMembers || [],
            } as Project // Cast after ensuring required fields? Ideally validate more.

            if (editingProject?.id) {
                await updateProject(editingProject.id, projectData)
                toast({ title: "Project updated" })
            } else {
                await addProject(projectData as Project)
                toast({ title: "Project created" })
            }
            setIsCreateDialogOpen(false)
            setEditingProject(null)
            resetForm()
        } catch (e) {
            console.error(e)
            toast({ title: "Error saving project", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = (project: Project) => {
        setEditingProject(project)
        setFormData(project)
        setIsCreateDialogOpen(true)
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent triggering handleEdit
        if (confirm("Are you sure you want to delete this project?")) {
            try {
                await deleteProject(id)
                toast({ title: "Project deleted" })
            } catch (e) {
                toast({ title: "Error deleting", variant: "destructive" })
            }
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Projects</h1>
                    <p className="text-muted-foreground mt-2">Add, edit, and manage student projects.</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                    setIsCreateDialogOpen(open)
                    if (!open) {
                        setEditingProject(null)
                        resetForm()
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
                            <DialogDescription>
                                Fill in the details for the project. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Project Title</Label>
                                    <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Smart Dustbin" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select name="status" value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="planned">Planned</SelectItem>
                                            <SelectItem value="ongoing">In Progress</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Brief description of the project..." />
                            </div>

                            {/* Tech Stack */}
                            <div className="space-y-2">
                                <Label>Technologies</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={techInput}
                                        onChange={(e) => setTechInput(e.target.value)}
                                        placeholder="Add technology (e.g. React, IoT)"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                                    />
                                    <Button type="button" onClick={addTech} variant="secondary">Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.technologies?.map((tech, i) => (
                                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeTech(i)}>
                                            {tech} <X className="h-3 w-3 ml-1" />
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Team Members */}
                            <div className="space-y-2">
                                <Label>Team Members</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={memberInput}
                                        onChange={(e) => setMemberInput(e.target.value)}
                                        placeholder="Add team member name"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
                                    />
                                    <Button type="button" onClick={addMember} variant="secondary">Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.teamMembers?.map((member, i) => (
                                        <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => removeMember(i)}>
                                            {member} <X className="h-3 w-3 ml-1" />
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="githubLink">GitHub Link</Label>
                                    <div className="relative">
                                        <Github className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" id="githubLink" name="githubLink" value={formData.githubLink} onChange={handleInputChange} placeholder="https://github.com/..." />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="demoLink">Demo Link</Label>
                                    <div className="relative">
                                        <ExternalLink className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" id="demoLink" name="demoLink" value={formData.demoLink} onChange={handleInputChange} placeholder="https://..." />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="completedDate">Completion Date</Label>
                                    <Input id="completedDate" name="completedDate" value={formData.completedDate} onChange={handleInputChange} placeholder="e.g. August 2025" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="batch">Batch</Label>
                                    <Input id="batch" name="batch" value={formData.batch} onChange={handleInputChange} placeholder="e.g. Batch 2023 - 2026" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="batchHighlight">Batch Highlight / Subtitle</Label>
                                <Input
                                    id="batchHighlight"
                                    name="batchHighlight"
                                    value={formData.batchHighlight || ""}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Patented Projects"
                                />
                                <p className="text-[10px] text-muted-foreground">This text will appear below the batch header. (Updates for all projects in this batch)</p>
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-4">
                                <Label>Project Image</Label>

                                <div className="space-y-2">
                                    <Label htmlFor="image-url" className="text-xs text-muted-foreground">Manual URL</Label>
                                    <Input
                                        id="image-url"
                                        name="image"
                                        value={formData.image}
                                        onChange={handleInputChange}
                                        placeholder="https://example.com/image.png"
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
                                    value={formData.image || ""}
                                    onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                                    onRemove={() => setFormData(prev => ({ ...prev, image: "" }))}
                                    variant="banner"
                                    className="w-full"
                                />
                            </div>

                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Project"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg bg-destructive/10 text-destructive">
                    <p className="font-semibold mb-2">Failed to load projects</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-2 text-muted-foreground">Please update your Firestore Security Rules in the Firebase Console.</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="bg-black border-white/10 text-zinc-100 overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] group flex flex-col relative w-full h-full rounded-xl"
                            onClick={() => handleEdit(project)}
                        >
                            {/* Tech Deco Lines */}
                            <div className="absolute top-0 left-0 w-20 h-1 bg-gradient-to-r from-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 right-0 w-20 h-1 bg-gradient-to-l from-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                            <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full shadow-lg shadow-red-900/50"
                                    onClick={(e) => project.id && handleDelete(project.id, e)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="h-64 bg-zinc-900/50 relative w-full overflow-hidden border-b border-white/5">
                                {project.image ? (
                                    <img src={project.image} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                        <Bot className="h-10 w-10 text-zinc-700" />
                                    </div>
                                )}
                                {/* Overlay gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                                {/* Status Badge on Image */}
                                <div className="absolute top-3 left-3">
                                    <Badge className={`${project.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                        project.status === 'ongoing' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                        } backdrop-blur-md border px-3 py-1 text-xs font-bold tracking-wider shadow-lg`}>
                                        {project.status === 'completed' ? 'COMPLETED' :
                                            project.status === 'ongoing' ? 'IN PROGRESS' : 'PLANNED'}
                                    </Badge>
                                </div>
                            </div>

                            <CardHeader className="space-y-3 pb-2 pt-5 bg-black relative z-10">
                                <div className="flex items-center justify-end absolute top-4 right-4">
                                    {project.completedDate && (
                                        <div className="flex items-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold border border-white/10 px-2 py-1 rounded bg-zinc-900/50">
                                            <Calendar className="h-3 w-3 mr-1.5 text-cyan-500" />
                                            {project.completedDate}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1 pt-2">
                                    <CardTitle className="text-xl font-black tracking-wide text-white line-clamp-1 group-hover:text-cyan-400 transition-colors uppercase font-orbitron drop-shadow-md">{project.title}</CardTitle>
                                    <CardDescription className="line-clamp-6 text-zinc-400 text-xs leading-relaxed font-mono">{project.description}</CardDescription>
                                </div>
                            </CardHeader>

                            <CardContent className="mt-auto space-y-6 bg-black relative z-10 pb-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-cyan-600 uppercase tracking-[0.2em] mb-3 flex items-center">
                                        <span className="w-2 h-2 bg-cyan-600 rounded-full mr-2 animate-pulse" />
                                        Technologies
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {project.technologies?.slice(0, 5).map((tech) => (
                                            <Badge key={tech} variant="outline" className="bg-zinc-900/80 text-zinc-300 border-white/10 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors rounded px-2 py-1 text-[10px] font-medium uppercase tracking-tight font-mono">
                                                {tech}
                                            </Badge>
                                        ))}
                                        {(project.technologies?.length || 0) > 5 && (
                                            <Badge variant="outline" className="bg-zinc-900/80 text-zinc-500 border-white/10 rounded px-2 py-1 text-[10px] font-mono">+{project.technologies.length - 5}</Badge>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-bold text-cyan-600 uppercase tracking-[0.2em] mb-2 flex items-center">
                                        <Users className="h-3 w-3 mr-2" />
                                        Team
                                    </h4>
                                    <p className="text-xs line-clamp-1 text-zinc-500 font-mono pl-5">{project.teamMembers?.join(", ")}</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" size="sm" className="flex-1 border-white/10 bg-zinc-900/30 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all font-mono uppercase text-xs tracking-wider decoration-0 pointer-events-none">
                                        <Github className="h-3.5 w-3.5 mr-2" />
                                        Code
                                    </Button>
                                    <Button size="sm" className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20 transition-all font-mono uppercase text-xs tracking-wider pointer-events-none">
                                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                        Demo
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

            )}
        </div>
    )
}
