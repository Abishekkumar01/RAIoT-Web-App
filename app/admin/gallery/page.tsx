'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, ExternalLink, Folder, Github } from 'lucide-react'
import { extractFolderId, checkFolderAccess } from '@/lib/drive'
import { parseRepoUrl, GithubRepoConfig } from '@/lib/github'

export default function AdminGalleryPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState("events") // Default to events for quick access

    // Config State
    const [sourceType, setSourceType] = useState<'drive' | 'github'>('drive')
    const [folderUrl, setFolderUrl] = useState('')
    const [githubUrl, setGithubUrl] = useState('')

    // Connected State
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [currentGithub, setCurrentGithub] = useState<GithubRepoConfig | null>(null)

    // Events State
    const [events, setEvents] = useState<any[]>([])
    const [metadata, setMetadata] = useState<any>({})
    const [eventsLoading, setEventsLoading] = useState(false)

    const { toast } = useToast()

    const loadData = async () => {
        setLoading(true)
        try {
            // Load Config
            const docRef = doc(db, 'settings', 'gallery_config')
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
                const data = docSnap.data()
                if (data.sourceType) setSourceType(data.sourceType)
                if (data.rootFolderId) {
                    setCurrentId(data.rootFolderId)
                    setFolderUrl(`https://drive.google.com/drive/folders/${data.rootFolderId}`)
                }
                if (data.githubConfig) {
                    setCurrentGithub(data.githubConfig)
                    const { owner, repo, branch, path } = data.githubConfig
                    let url = `https://github.com/${owner}/${repo}`;
                    if (path) url += `/tree/${branch || 'main'}/${path}`;
                    setGithubUrl(url)
                }
            }

            // Load Events
            setEventsLoading(true)
            const { getAdminGalleryData } = await import('@/app/actions/gallery')
            const galleryData = await getAdminGalleryData()
            setEvents(galleryData.events)
            setMetadata(galleryData.metadata)
            setEventsLoading(false)

        } catch (error) {
            console.error("Error loading gallery data:", error)
            toast({
                title: "Error loading configuration",
                description: "Could not fetch current settings.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [toast])

    const handleSaveConfig = async () => {
        setSaving(true)
        try {
            const updateData: any = {
                sourceType,
                updatedAt: new Date()
            }

            if (sourceType === 'drive') {
                const folderId = extractFolderId(folderUrl)
                if (!folderId) throw new Error("Invalid Drive URL")
                const canAccess = await checkFolderAccess(folderId)
                if (!canAccess) throw new Error("Cannot access Drive folder. Check sharing settings.")
                updateData.rootFolderId = folderId
                setCurrentId(folderId)
            }
            else if (sourceType === 'github') {
                const repoConfig = parseRepoUrl(githubUrl)
                if (!repoConfig) throw new Error("Invalid GitHub Repository URL")
                updateData.githubConfig = repoConfig
                setCurrentGithub(repoConfig)
            }

            await setDoc(doc(db, 'settings', 'gallery_config'), updateData, { merge: true })

            toast({
                title: "Success",
                description: "Configuration saved. Reloading events..."
            })

            // Reload to fetch new events
            await loadData()

        } catch (error: any) {
            console.error("Error saving gallery config:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to save configuration.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleMetadataChange = (id: string, field: string, value: any) => {
        setMetadata((prev: any) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }))
    }

    const handleSaveMetadata = async () => {
        setSaving(true)
        try {
            const docRef = doc(db, 'settings', 'gallery_metadata');
            await setDoc(docRef, metadata, { merge: true });

            // Revalidate cache
            const { revalidateGallery } = await import('@/app/actions/gallery')
            await revalidateGallery()

            toast({
                title: "Success",
                description: "Event metadata saved and gallery updated."
            })
            // Reload to see sorted order
            await loadData()
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to save metadata.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Gallery Management</h1>
                    <p className="text-muted-foreground">
                        Configure source and manage event details.
                    </p>
                </div>
                {activeTab === 'events' && (
                    <Button onClick={handleSaveMetadata} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                    <TabsTrigger value="events">Manage Events</TabsTrigger>
                    <TabsTrigger value="source">Data Source</TabsTrigger>
                </TabsList>

                <TabsContent value="events" className="space-y-6">
                    {eventsLoading ? (
                        <div className="text-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p>Loading events from source...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                No events found. Check your Data Source configuration.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6">
                            {events.map((event: any) => {
                                const meta = metadata[event.id] || metadata[event.name] || {};
                                const currentName = meta.displayName || event.name;
                                const currentDate = meta.customDate ? meta.customDate.split('T')[0] : (event.createdTime ? event.createdTime.split('T')[0] : '');

                                return (
                                    <Card key={event.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1 flex-1">
                                                    <CardTitle className="text-lg font-medium">
                                                        {event.originalName || event.name}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs font-mono">
                                                        ID: {event.id}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-xs whitespace-nowrap">Order:</Label>
                                                    <Input
                                                        type="number"
                                                        className="w-20 h-8"
                                                        value={meta.order !== undefined ? meta.order : 9999}
                                                        onChange={(e) => handleMetadataChange(event.id, 'order', parseInt(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Display Title</Label>
                                                <Input
                                                    value={meta.displayName ?? ''}
                                                    onChange={(e) => handleMetadataChange(event.id, 'displayName', e.target.value)}
                                                    placeholder={event.name}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Badge Label</Label>
                                                <Input
                                                    value={meta.tag ?? ''}
                                                    onChange={(e) => handleMetadataChange(event.id, 'tag', e.target.value)}
                                                    placeholder="Event"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Event Date</Label>
                                                <Input
                                                    type="date"
                                                    value={currentDate}
                                                    onChange={(e) => handleMetadataChange(event.id, 'customDate', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Batch Label</Label>
                                                <Input
                                                    value={meta.batch ?? ''}
                                                    onChange={(e) => handleMetadataChange(event.id, 'batch', e.target.value)}
                                                    placeholder="e.g. 2023 - 2026"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Description</Label>
                                                <Textarea
                                                    value={meta.description ?? ''}
                                                    onChange={(e) => handleMetadataChange(event.id, 'description', e.target.value)}
                                                    placeholder="Short description of the event..."
                                                    className="h-20"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="source">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gallery Source</CardTitle>
                            <CardDescription>
                                Select your preferred storage provider.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as 'drive' | 'github')} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="drive">
                                        <Folder className="mr-2 h-4 w-4" />
                                        Google Drive
                                    </TabsTrigger>
                                    <TabsTrigger value="github">
                                        <Github className="mr-2 h-4 w-4" />
                                        GitHub Repository
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="drive" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="drive-url">Google Drive Folder Link</Label>
                                        <Input
                                            id="drive-url"
                                            placeholder="https://drive.google.com/drive/folders/..."
                                            value={folderUrl}
                                            onChange={(e) => setFolderUrl(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Make sure the folder is shared with "Anyone with the link".
                                        </p>
                                    </div>
                                    {currentId && sourceType === 'drive' && (
                                        <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-md border border-green-200">
                                            <Folder className="h-4 w-4" />
                                            <span className="text-sm font-medium">Connected: {currentId}</span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="github" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="github-url">GitHub Repository Link</Label>
                                        <Input
                                            id="github-url"
                                            placeholder="https://github.com/username/repo/tree/main/images"
                                            value={githubUrl}
                                            onChange={(e) => setGithubUrl(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Point to the root folder containing your Event subfolders.
                                        </p>
                                    </div>
                                    {currentGithub && sourceType === 'github' && (
                                        <div className="flex items-center gap-2 p-3 bg-slate-500/10 text-slate-600 rounded-md border border-slate-200">
                                            <Github className="h-4 w-4" />
                                            <span className="text-sm font-medium">Connected: {currentGithub.owner}/{currentGithub.repo}</span>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t px-6 py-4 bg-muted/50">
                            <Button onClick={handleSaveConfig} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Config
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
