"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Upload, X } from "lucide-react"
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'
import AdminEventExport from '@/components/AdminEventExport'

export default function OperationsEventsPage() {
    const [events, setEvents] = useState<any[]>([])

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [uploadTask, setUploadTask] = useState<any>(null)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: "",
        location: "",
        type: "workshop",
        maxParticipants: "",
        minTeamSize: "2",
        maxTeamSize: "10",
        registrationDeadline: "",
        imageUrl: "",
        detailedContent: "",
        isOnline: true,
    })
    const { toast } = useToast()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value
        const name = e.target.name

        // Auto-convert Google Drive URLs when pasted/entered
        if (name === 'imageUrl' && value) {
            const convertedUrl = convertGoogleDriveUrl(value)
            if (convertedUrl !== value) {
                toast({
                    title: 'Google Drive URL converted',
                    description: 'Converted to direct image URL for better compatibility',
                })
            }
            setFormData((prev) => ({
                ...prev,
                [name]: convertedUrl,
            }))
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }))
        }
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    // Convert Google Drive sharing link to direct image URL that actually works
    const convertGoogleDriveUrl = (url: string): string => {
        if (!url || !url.trim()) return url.trim()

        const trimmedUrl = url.trim()

        // Extract file ID from various Google Drive URL formats
        let fileId: string | null = null

        // Pattern 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        let match = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
        if (match) {
            fileId = match[1]
        }

        // Pattern 2: https://drive.google.com/open?id=FILE_ID
        if (!fileId) {
            match = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
            if (match) {
                fileId = match[1]
            }
        }

        // Pattern 3: Already has uc?export=view or uc?id= - extract file ID
        if (!fileId) {
            match = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
            if (match) {
                fileId = match[1]
            }
        }

        // Pattern 4: docs.google.com format
        if (!fileId) {
            match = trimmedUrl.match(/docs\.google\.com\/uc\?[^&]*id=([a-zA-Z0-9_-]+)/)
            if (match) {
                fileId = match[1]
            }
        }

        if (fileId) {
            // Use Google's CDN format which works best for embedding (no CORS issues)
            // This format works when file is set to "Anyone with the link can view"
            const convertedUrl = `https://lh3.googleusercontent.com/d/${fileId}`
            console.log('✅ Converted Google Drive URL:', {
                original: trimmedUrl,
                converted: convertedUrl,
                fileId: fileId,
                note: 'Using Google CDN format - make sure file is set to "Anyone with the link can view"'
            })
            return convertedUrl
        }

        // If no match, return as-is (might be a direct image URL from another source)
        console.log('ℹ️ URL not recognized as Google Drive, using as-is:', trimmedUrl)
        return trimmedUrl
    }

    // Optimize image: compress and resize
    const optimizeImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'))
                        return
                    }

                    // Calculate new dimensions (max 1920px width, maintain aspect ratio)
                    const MAX_WIDTH = 1920
                    const MAX_HEIGHT = 1080
                    let width = img.width
                    let height = img.height

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width
                        width = MAX_WIDTH
                    }
                    if (height > MAX_HEIGHT) {
                        width = (width * MAX_HEIGHT) / height
                        height = MAX_HEIGHT
                    }

                    canvas.width = width
                    canvas.height = height

                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height)

                    // Convert to blob with compression (quality 0.85 for good balance)
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to compress image'))
                                return
                            }

                            // Create new file with optimized blob
                            const optimizedFile = new File(
                                [blob],
                                file.name.replace(/\.[^/.]+$/, '.jpg'), // Convert to .jpg for better compression
                                { type: 'image/jpeg' }
                            )
                            resolve(optimizedFile)
                        },
                        'image/jpeg',
                        0.85 // Quality: 0.85 is a good balance between quality and file size
                    )
                }
                img.onerror = () => reject(new Error('Failed to load image'))
                img.src = e.target?.result as string
            }
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
        })
    }

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Invalid file type',
                    description: 'Please select an image file (jpg, png, gif, etc.)',
                    variant: 'destructive'
                })
                return
            }

            // Validate file size (max 10MB before compression)
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Please select an image smaller than 10MB',
                    variant: 'destructive'
                })
                return
            }

            try {
                // Show loading state
                setUploadingImage(true)
                setUploadProgress(5)

                // Optimize image (compress and resize)
                const optimizedFile = await optimizeImage(file)
                setUploadProgress(15)

                setSelectedImage(optimizedFile)

                // Create preview from optimized file
                const reader = new FileReader()
                reader.onloadend = () => {
                    setImagePreview(reader.result as string)

                    // Show compression info
                    const originalSize = (file.size / 1024 / 1024).toFixed(2)
                    const optimizedSize = (optimizedFile.size / 1024 / 1024).toFixed(2)
                    if (file.size > optimizedFile.size) {
                        toast({
                            title: 'Image optimized',
                            description: `Reduced from ${originalSize}MB to ${optimizedSize}MB. Starting upload...`,
                        })
                    }

                    // Auto-upload immediately after optimization
                    setTimeout(() => {
                        handleImageUpload(optimizedFile)
                    }, 100)
                }
                reader.readAsDataURL(optimizedFile)
            } catch (error) {
                console.error('Error optimizing image:', error)
                toast({
                    title: 'Optimization failed',
                    description: 'Using original image. Starting upload...',
                })
                setSelectedImage(file)
                const reader = new FileReader()
                reader.onloadend = () => {
                    setImagePreview(reader.result as string)
                    // Auto-upload original file
                    setTimeout(() => {
                        handleImageUpload(file)
                    }, 100)
                }
                reader.readAsDataURL(file)
            }
        }
    }

    const handleImageUpload = async (fileToUpload?: File) => {
        const imageFile = fileToUpload || selectedImage

        if (!imageFile) {
            toast({
                title: 'No image selected',
                description: 'Please select an image to upload',
                variant: 'destructive'
            })
            return
        }

        try {
            setUploadingImage(true)
            setUploadProgress(10)

            // Create a unique filename
            const timestamp = Date.now()
            const randomId = Math.random().toString(36).substring(2, 9)
            const filename = `events/${timestamp}_${randomId}_${imageFile.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')}`
            const storageRef = ref(storage, filename)

            console.log('🚀 Starting upload to:', filename)
            console.log('📦 File size:', (imageFile.size / 1024).toFixed(2), 'KB')

            // Use resumable upload for real progress tracking
            const uploadTaskInstance = uploadBytesResumable(storageRef, imageFile)
            setUploadTask(uploadTaskInstance)

            // Create a promise wrapper for the upload
            const uploadPromise = new Promise<string>((resolve, reject) => {
                let lastProgress = 10
                let progressInterval: NodeJS.Timeout | null = null

                // Fallback progress simulation (in case callback doesn't fire)
                progressInterval = setInterval(() => {
                    if (lastProgress < 90) {
                        lastProgress += 2
                        setUploadProgress(lastProgress)
                    }
                }, 200)

                // Track upload progress
                uploadTaskInstance.on(
                    'state_changed',
                    (snapshot) => {
                        // Clear the fallback interval since we have real progress
                        if (progressInterval) {
                            clearInterval(progressInterval)
                            progressInterval = null
                        }

                        // Calculate real progress (10% to 90% range)
                        const uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 80
                        const totalProgress = 10 + Math.round(uploadProgress)
                        setUploadProgress(Math.min(totalProgress, 90))
                        lastProgress = totalProgress

                        console.log('📊 Upload progress:', totalProgress + '%',
                            `(${(snapshot.bytesTransferred / 1024).toFixed(2)} KB / ${(snapshot.totalBytes / 1024).toFixed(2)} KB)`)
                    },
                    (error) => {
                        // Clear interval on error
                        if (progressInterval) {
                            clearInterval(progressInterval)
                        }

                        console.error('❌ Upload error:', error)
                        console.error('Error code:', error.code)
                        console.error('Error message:', error.message)

                        let errorMessage = 'Failed to upload image'
                        if (error.code === 'storage/unauthorized') {
                            errorMessage = 'Permission denied. Please deploy Storage rules: firebase deploy --only storage'
                        } else if (error.code === 'storage/canceled') {
                            errorMessage = 'Upload was canceled'
                        } else if (error.code === 'storage/quota-exceeded') {
                            errorMessage = 'Storage quota exceeded. Please check Firebase Storage limits.'
                        } else if (error.message) {
                            errorMessage = error.message
                        }

                        setUploadTask(null)
                        reject(new Error(errorMessage))
                    },
                    async () => {
                        // Clear interval on success
                        if (progressInterval) {
                            clearInterval(progressInterval)
                        }

                        // Upload completed successfully
                        console.log('✅ Upload completed, getting download URL...')
                        setUploadProgress(95)

                        try {
                            // Get download URL
                            const downloadURL = await getDownloadURL(uploadTaskInstance.snapshot.ref)
                            console.log('🔗 Download URL:', downloadURL)

                            resolve(downloadURL)
                        } catch (urlError) {
                            console.error('❌ Error getting download URL:', urlError)
                            reject(new Error('Upload completed but failed to get download URL'))
                        }
                    }
                )
            })

            // Wait for upload to complete
            const downloadURL = await uploadPromise

            setUploadProgress(100)
            setUploadTask(null) // Clear upload task reference

            // Set the URL in form data
            setFormData((prev) => ({
                ...prev,
                imageUrl: downloadURL,
            }))

            toast({
                title: '✅ Image uploaded successfully!',
                description: 'Image URL has been set. You can now create/update the event.'
            })

            // Keep preview but clear upload state
            setTimeout(() => {
                setUploadProgress(0)
                setUploadingImage(false)
            }, 1500)
        } catch (error) {
            console.error('❌ Error in upload process:', error)
            toast({
                title: 'Upload failed',
                description: (error as Error).message || 'Failed to upload image. Check console for details.',
                variant: 'destructive'
            })
            setUploadTask(null)
            setUploadingImage(false)
            setUploadProgress(0)
        }
    }

    const handleCancelUpload = () => {
        if (uploadTask) {
            try {
                uploadTask.cancel()
                console.log('Upload canceled')
            } catch (error) {
                console.error('Error canceling upload:', error)
            }
        }
        setUploadTask(null)
        setUploadingImage(false)
        setUploadProgress(0)
        setSelectedImage(null)
        setImagePreview(null)
        toast({
            title: 'Upload canceled',
            description: 'Image upload has been canceled'
        })
    }

    const handleRemoveImage = () => {
        // Cancel any ongoing upload
        if (uploadTask) {
            try {
                uploadTask.cancel()
            } catch (error) {
                console.error('Error canceling upload:', error)
            }
        }

        setUploadTask(null)
        setSelectedImage(null)
        setImagePreview(null)
        setUploadingImage(false)
        setUploadProgress(0)
        setFormData((prev) => ({
            ...prev,
            imageUrl: "",
        }))
        // Reset file input
        const fileInput = document.getElementById('imageFile') as HTMLInputElement
        const editFileInput = document.getElementById('edit-imageFile') as HTMLInputElement
        if (fileInput) {
            fileInput.value = ''
        }
        if (editFileInput) {
            editFileInput.value = ''
        }
        toast({
            title: 'Image removed',
            description: 'Image has been removed from the form'
        })
    }

    const handleReplaceImage = () => {
        // Remove current image and allow new selection
        handleRemoveImage()
        // Focus on file input
        setTimeout(() => {
            const fileInput = document.getElementById('imageFile') as HTMLInputElement
            const editFileInput = document.getElementById('edit-imageFile') as HTMLInputElement
            if (fileInput) {
                fileInput.click()
            } else if (editFileInput) {
                editFileInput.click()
            }
        }, 100)
    }

    useEffect(() => {
        const colRef = collection(db, 'events')
        const unsub = onSnapshot(colRef, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
            setEvents(list)
        })
        return () => unsub()
    }, [])

    const handleCreateEvent = async () => {
        try {
            if (isSubmitting) return
            setIsSubmitting(true)
            if (!formData.title.trim()) {
                toast({ title: 'Title is required', variant: 'destructive' })
                return
            }
            if (!formData.date || !formData.time) {
                toast({ title: 'Date and time are required', variant: 'destructive' })
                return
            }

            // Normalize date (support dd-mm-yyyy and yyyy-mm-dd)
            let normalizedDate = formData.date
            const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/
            const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/
            if (ddmmyyyy.test(formData.date)) {
                const m = formData.date.match(ddmmyyyy)!
                normalizedDate = `${m[3]}-${m[2]}-${m[1]}`
            } else if (!yyyymmdd.test(formData.date)) {
                toast({ title: 'Invalid date format', description: 'Use yyyy-mm-dd', variant: 'destructive' })
                return
            }

            // Validate numeric inputs
            const durationNum = Number.parseFloat(formData.duration || '0')
            const maxNum = Number.parseInt(formData.maxParticipants || '0')
            if (Number.isNaN(durationNum) || durationNum <= 0) {
                toast({ title: 'Invalid duration', description: 'Enter a positive number of hours', variant: 'destructive' })
                return
            }
            if (Number.isNaN(maxNum) || maxNum < 0) {
                toast({ title: 'Invalid max participants', description: 'Enter 0 or a positive number', variant: 'destructive' })
                return
            }

            // Convert Google Drive URL if needed
            const processedImageUrl = formData.imageUrl && formData.imageUrl.trim() !== ''
                ? convertGoogleDriveUrl(formData.imageUrl.trim())
                : null

            console.log('🔍 Before creating event - Image URL processing:', {
                formDataImageUrl: formData.imageUrl,
                processedImageUrl: processedImageUrl,
                hasFormDataImageUrl: !!formData.imageUrl,
                hasProcessedImageUrl: !!processedImageUrl
            })

            const eventData: any = {
                title: formData.title,
                description: formData.description,
                detailedContent: formData.detailedContent || "",
                date: normalizedDate,
                time: formData.time,
                duration: durationNum,
                location: formData.location,
                type: formData.type,
                maxParticipants: maxNum || 0,
                minTeamSize: Number.parseInt(formData.minTeamSize) || 2,
                maxTeamSize: Number.parseInt(formData.maxTeamSize) || 10,
                registrationDeadline: formData.registrationDeadline || "",
                registered: 0,
                status: 'active',
                isOnline: formData.isOnline === true, // Explicitly save as boolean
                createdAt: serverTimestamp(),
            }

            // ALWAYS set imageUrl field (even if null) for clarity
            eventData.imageUrl = processedImageUrl || null

            console.log('📝 Creating event with data:', {
                title: eventData.title,
                imageUrl: eventData.imageUrl,
                hasImageUrl: !!eventData.imageUrl,
                imageUrlType: typeof eventData.imageUrl,
                imageUrlLength: eventData.imageUrl?.length || 0
            })

            if (!eventData.imageUrl) {
                console.warn('⚠️ Warning: Event created without imageUrl')
                console.warn('Form data imageUrl:', formData.imageUrl)
            } else {
                console.log('✅ Image URL will be saved:', eventData.imageUrl)
            }

            const docRef = await addDoc(collection(db, 'events'), eventData)
            console.log('✅ Event created with ID:', docRef.id)
            console.log('📸 Saved imageUrl:', eventData.imageUrl)

            // Verify the saved data
            const savedDoc = await getDoc(docRef)
            const savedData = savedDoc.data()
            console.log('🔍 Verification - Saved event data:', {
                id: docRef.id,
                title: savedData?.title,
                imageUrl: savedData?.imageUrl,
                hasImageUrl: !!savedData?.imageUrl
            })

            if (eventData.imageUrl && !savedData?.imageUrl) {
                toast({
                    title: 'Event created',
                    description: 'Warning: Image URL was not saved. Please check console.',
                    variant: 'destructive'
                })
            } else if (eventData.imageUrl) {
                toast({
                    title: 'Event created successfully',
                    description: `Image URL saved: ${eventData.imageUrl.substring(0, 50)}...`
                })
            } else {
                toast({ title: 'Event created successfully' })
            }
            setFormData({
                title: "",
                description: "",
                date: "",
                time: "",
                duration: "",
                location: "",
                type: "workshop",
                maxParticipants: "",
                minTeamSize: "2",
                maxTeamSize: "10",
                registrationDeadline: "",
                imageUrl: "",
                detailedContent: "",
                isOnline: true,
            })
            setIsCreateDialogOpen(false)
            setSelectedImage(null)
            setImagePreview(null)
        } catch (e) {
            console.error('Failed to create event', e)
            toast({ title: 'Failed to create event', description: (e as Error).message, variant: 'destructive' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditEvent = (event: any) => {
        setEditingEvent(event)
        setSelectedImage(null)
        setImagePreview(null)
        setFormData({
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            duration: event.duration,
            location: event.location,
            type: event.type,
            maxParticipants: event.maxParticipants.toString(),
            minTeamSize: event.minTeamSize?.toString() || "2",
            maxTeamSize: event.maxTeamSize?.toString() || "10",
            registrationDeadline: event.registrationDeadline || "",
            imageUrl: event.imageUrl || "",
            detailedContent: event.detailedContent || "",
            isOnline: event.isOnline !== false, // Default to true if not set, but respect false
        })
    }

    const handleUpdateEvent = async () => {
        try {
            if (!editingEvent) return
            if (!formData.title.trim()) {
                toast({ title: 'Title is required', variant: 'destructive' })
                return
            }

            // Convert Google Drive URL if needed
            const processedImageUrl = formData.imageUrl ? convertGoogleDriveUrl(formData.imageUrl.trim()) : ""

            const updateData: any = {
                title: formData.title,
                description: formData.description,
                detailedContent: formData.detailedContent || "",
                date: formData.date,
                time: formData.time,
                duration: formData.duration,
                location: formData.location,
                type: formData.type,
                maxParticipants: Number.parseInt(formData.maxParticipants || '0') || 0,
                minTeamSize: Number.parseInt(formData.minTeamSize) || 2,
                maxTeamSize: Number.parseInt(formData.maxTeamSize) || 10,
                registrationDeadline: formData.registrationDeadline || "",
                isOnline: formData.isOnline === true, // Explicitly save as boolean
            }

            // Only update imageUrl if it's provided
            if (processedImageUrl) {
                updateData.imageUrl = processedImageUrl
            } else {
                // If empty, set to null to clear it
                updateData.imageUrl = null
            }

            console.log('📝 Updating event:', {
                eventId: editingEvent.id,
                title: updateData.title,
                imageUrl: updateData.imageUrl,
                hasImageUrl: !!updateData.imageUrl,
                formDataImageUrl: formData.imageUrl
            })

            const eventRef = doc(db, 'events', editingEvent.id)
            await updateDoc(eventRef, updateData)

            // Verify the update
            const updatedDoc = await getDoc(eventRef)
            const updatedData = updatedDoc.data()
            console.log('🔍 Verification - Updated event data:', {
                id: editingEvent.id,
                title: updatedData?.title,
                imageUrl: updatedData?.imageUrl,
                hasImageUrl: !!updatedData?.imageUrl
            })

            if (updateData.imageUrl && !updatedData?.imageUrl) {
                toast({
                    title: 'Event updated',
                    description: 'Warning: Image URL was not saved. Please check console.',
                    variant: 'destructive'
                })
            } else if (updateData.imageUrl) {
                toast({
                    title: 'Event updated successfully',
                    description: `Image URL saved: ${updateData.imageUrl.substring(0, 50)}...`
                })
            } else {
                toast({ title: 'Event updated successfully' })
            }
            setEditingEvent(null)
            setSelectedImage(null)
            setImagePreview(null)
            setFormData({
                title: "",
                description: "",
                date: "",
                time: "",
                duration: "",
                location: "",
                type: "workshop",
                maxParticipants: "",
                minTeamSize: "2",
                maxTeamSize: "10",
                registrationDeadline: "",
                imageUrl: "",
                detailedContent: "",
            })
        } catch (e) {
            console.error('Failed to update event', e)
            toast({ title: 'Failed to update event', description: (e as Error).message, variant: 'destructive' })
        }
    }

    const handleToggleOnlineStatus = async (eventId: string, currentStatus: boolean) => {
        try {
            const eventRef = doc(db, 'events', eventId)
            await updateDoc(eventRef, {
                isOnline: !currentStatus
            })
            toast({
                title: 'Status updated',
                description: `Event is now ${!currentStatus ? 'ONLINE' : 'OFFLINE'}`
            })
        } catch (e) {
            console.error('Failed to toggle online status', e)
            toast({
                title: 'Failed to update status',
                description: (e as Error).message,
                variant: 'destructive'
            })
        }
    }

    const handleDeleteEvent = async (eventId: string) => {
        try {
            await deleteDoc(doc(db, 'events', eventId))
            toast({ title: 'Event deleted' })
        } catch (e) {
            console.error('Failed to delete event', e)
            toast({ title: 'Failed to delete event', description: (e as Error).message, variant: 'destructive' })
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case "workshop":
                return "bg-blue-500"
            case "competition":
                return "bg-red-500"
            case "seminar":
                return "bg-green-500"
            case "meeting":
                return "bg-purple-500"
            default:
                return "bg-gray-500"
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Manage Events</h1>
                    <p className="text-muted-foreground">Create, edit, and manage RAIoT events</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Event
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-6">
                        <DialogHeader className="flex-shrink-0 pb-4">
                            <DialogTitle className="text-2xl">Create New Event</DialogTitle>
                            <DialogDescription>Fill in the details to create a new event</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                            <div className="grid gap-8 py-2">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="title" className="text-base font-semibold">Event Title</Label>
                                        <Input
                                            id="title"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Workshop title"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="type" className="text-base font-semibold">Event Type</Label>
                                        <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="workshop">Workshop</SelectItem>
                                                <SelectItem value="seminar">Seminar</SelectItem>
                                                <SelectItem value="competition">Competition</SelectItem>
                                                <SelectItem value="meeting">Meeting</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Brief event description (shown on event card)"
                                        rows={4}
                                        className="text-base"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="detailedContent" className="text-base font-semibold">Detailed Content (Event Details Page)</Label>
                                    <Textarea
                                        id="detailedContent"
                                        name="detailedContent"
                                        value={formData.detailedContent}
                                        onChange={handleInputChange}
                                        placeholder="Enter detailed event content here. You can use HTML for formatting, images, and links.&#10;&#10;Examples:&#10;&lt;h3&gt;Agenda&lt;/h3&gt;&#10;&lt;ul&gt;&#10;  &lt;li&gt;Introduction&lt;/li&gt;&#10;  &lt;li&gt;Hands-on Workshop&lt;/li&gt;&#10;&lt;/ul&gt;&#10;&#10;&lt;img src=&quot;https://example.com/image.jpg&quot; alt=&quot;Workshop&quot; /&gt;&#10;&#10;&lt;a href=&quot;https://example.com&quot;&gt;Learn More&lt;/a&gt;"
                                        rows={12}
                                        className="font-mono text-sm"
                                    />
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">Supports HTML:</strong> Use HTML tags for formatting, images, and links.
                                            <br />
                                            <strong className="text-foreground">Images:</strong> Use &lt;img src=&quot;URL&quot; alt=&quot;description&quot; /&gt; or paste image URLs
                                            <br />
                                            <strong className="text-foreground">Links:</strong> Use &lt;a href=&quot;URL&quot;&gt;Link Text&lt;/a&gt;
                                            <br />
                                            <strong className="text-foreground">Formatting:</strong> Use &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt; etc.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="date" className="text-base font-semibold">Date</Label>
                                        <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="h-11" />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="time" className="text-base font-semibold">Start Time</Label>
                                        <select
                                            id="time"
                                            name="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="">Select Time</option>
                                            {Array.from({ length: 48 }, (_, i) => {
                                                const hour = Math.floor(i / 2)
                                                const minute = (i % 2) * 30
                                                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                                                return (
                                                    <option key={timeString} value={timeString}>
                                                        {timeString}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        <p className="text-xs text-muted-foreground">Select from dropdown (30-minute intervals)</p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="duration" className="text-base font-semibold">Duration (hours)</Label>
                                        <Input
                                            id="duration"
                                            name="duration"
                                            type="number"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            placeholder="3"
                                            min="0.5"
                                            step="0.5"
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="location" className="text-base font-semibold">Location</Label>
                                        <Input
                                            id="location"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            placeholder="Computer Lab 1"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="maxParticipants" className="text-base font-semibold">Max Participants</Label>
                                        <Input
                                            id="maxParticipants"
                                            name="maxParticipants"
                                            type="number"
                                            value={formData.maxParticipants}
                                            onChange={handleInputChange}
                                            placeholder="30"
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="minTeamSize" className="text-base font-semibold">Min Team Size</Label>
                                        <Input
                                            id="minTeamSize"
                                            name="minTeamSize"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={formData.minTeamSize}
                                            onChange={handleInputChange}
                                            placeholder="2"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="maxTeamSize" className="text-base font-semibold">Max Team Size</Label>
                                        <Input
                                            id="maxTeamSize"
                                            name="maxTeamSize"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={formData.maxTeamSize}
                                            onChange={handleInputChange}
                                            placeholder="10"
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="registrationDeadline" className="text-base font-semibold">Registration Deadline</Label>
                                    <Input
                                        id="registrationDeadline"
                                        name="registrationDeadline"
                                        type="date"
                                        value={formData.registrationDeadline}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Online Status</Label>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="isOnline"
                                            checked={formData.isOnline}
                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOnline: checked }))}
                                        />
                                        <Label htmlFor="isOnline" className="text-sm text-muted-foreground cursor-pointer">
                                            {formData.isOnline ? 'Event is ONLINE' : 'Event is OFFLINE'}
                                        </Label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="imageFile">Upload Event Image</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="imageFile"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageSelect}
                                                    className="flex-1"
                                                    disabled={uploadingImage}
                                                />
                                                {selectedImage && !uploadingImage && !formData.imageUrl && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleImageUpload()}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        Upload Now
                                                    </Button>
                                                )}
                                            </div>
                                            {uploadingImage && (
                                                <div className="space-y-2">
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                                                            style={{ width: `${uploadProgress}%`, minWidth: '30px' }}
                                                        >
                                                            {uploadProgress > 10 && (
                                                                <span className="text-xs font-semibold text-white">{uploadProgress}%</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-muted-foreground">
                                                            {uploadProgress < 20 ? 'Optimizing image...' :
                                                                uploadProgress < 95 ? 'Uploading to server...' :
                                                                    'Getting image URL...'}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-semibold text-blue-600">{uploadProgress}%</p>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleCancelUpload}
                                                                className="h-7 px-2 text-xs"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {formData.imageUrl && !uploadingImage && (
                                                <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                                                        ✅ Image uploaded successfully! URL is set.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="imageUrl">Or Enter Image URL</Label>
                                            <Input
                                                id="imageUrl"
                                                name="imageUrl"
                                                type="url"
                                                value={formData.imageUrl}
                                                onChange={handleInputChange}
                                                placeholder="https://example.com/image.jpg"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Option 1:</strong> Upload an image file (auto-optimized) <br />
                                                <strong>Option 2:</strong> Paste a Google Drive sharing link - it will be auto-converted to a direct image URL <br />
                                                <span className="text-yellow-500">⚠️ Important: Make sure your Google Drive file is set to "Anyone with the link can view"</span> <br />
                                                <strong>Option 3:</strong> Enter any direct image URL (e.g., https://example.com/image.jpg)
                                            </p>
                                        </div>

                                        {(imagePreview || formData.imageUrl) && !uploadingImage && (
                                            <div className="space-y-2">
                                                <Label>Image Preview</Label>
                                                <div className="relative border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                    <img
                                                        src={imagePreview || formData.imageUrl}
                                                        alt={imagePreview ? "Preview" : "Current"}
                                                        className="w-full h-64 object-contain"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.style.display = 'none'
                                                            const parent = target.parentElement
                                                            if (parent) {
                                                                parent.innerHTML = `
                                <div class="flex items-center justify-center h-64 text-center p-4">
                                  <div>
                                    <p class="text-sm text-muted-foreground mb-2">Image failed to load</p>
                                    <p class="text-xs text-muted-foreground">Please check the URL or try uploading a file</p>
                                  </div>
                                </div>
                              `
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleReplaceImage}
                                                        className="flex-1"
                                                    >
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Replace
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleRemoveImage}
                                                        className="flex-1"
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-6 mt-4 border-t flex-shrink-0 bg-background">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                    setIsCreateDialogOpen(false)
                                    setSelectedImage(null)
                                    setImagePreview(null)
                                }}
                                className="min-w-[120px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateEvent}
                                disabled={isSubmitting}
                                size="lg"
                                className="min-w-[150px]"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Event'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Export Section */}
            <AdminEventExport />

            {/* Events List */}
            <div className="grid gap-6">
                {events.map((event) => (
                    <Card key={event.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                                <Badge className={`${getTypeColor(event.type)} text-white`}>
                                    {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                </Badge>
                                <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditEvent(event)}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="text-xl">{event.title}</CardTitle>
                            <CardDescription>{event.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {formatDate(event.date)}
                                </div>
                                <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {formatTime(event.time)} ({event.duration}h)
                                </div>
                                <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {event.location}
                                </div>
                                <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {event.registered}/{event.maxParticipants} registered
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Online Status:</span>
                                    <span className={`text-sm font-medium ${event.isOnline !== false ? 'text-green-500' : 'text-gray-500'}`}>
                                        {event.isOnline !== false ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Toggle:</span>
                                    <Switch
                                        checked={event.isOnline !== false}
                                        onCheckedChange={() => handleToggleOnlineStatus(event.id, event.isOnline !== false)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Event Dialog */}
            <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
                <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-6">
                    <DialogHeader className="flex-shrink-0 pb-4">
                        <DialogTitle className="text-2xl">Edit Event</DialogTitle>
                        <DialogDescription>Update the event details</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                        <div className="grid gap-8 py-2">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="edit-title" className="text-base font-semibold">Event Title</Label>
                                    <Input id="edit-title" name="title" value={formData.title} onChange={handleInputChange} className="h-11" />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="edit-type" className="text-base font-semibold">Event Type</Label>
                                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="workshop">Workshop</SelectItem>
                                            <SelectItem value="seminar">Seminar</SelectItem>
                                            <SelectItem value="competition">Competition</SelectItem>
                                            <SelectItem value="meeting">Meeting</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="edit-description" className="text-base font-semibold">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Brief event description (shown on event card)"
                                    rows={4}
                                    className="text-base"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="edit-detailedContent" className="text-base font-semibold">Detailed Content (Event Details Page)</Label>
                                <Textarea
                                    id="edit-detailedContent"
                                    name="detailedContent"
                                    value={formData.detailedContent}
                                    onChange={handleInputChange}
                                    placeholder="Enter detailed event content here. You can use HTML for formatting, images, and links.&#10;&#10;Examples:&#10;&lt;h3&gt;Agenda&lt;/h3&gt;&#10;&lt;ul&gt;&#10;  &lt;li&gt;Introduction&lt;/li&gt;&#10;  &lt;li&gt;Hands-on Workshop&lt;/li&gt;&#10;&lt;/ul&gt;&#10;&#10;&lt;img src=&quot;https://example.com/image.jpg&quot; alt=&quot;Workshop&quot; /&gt;&#10;&#10;&lt;a href=&quot;https://example.com&quot;&gt;Learn More&lt;/a&gt;"
                                    rows={12}
                                    className="font-mono text-sm"
                                />
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-foreground">Supports HTML:</strong> Use HTML tags for formatting, images, and links.
                                        <br />
                                        <strong className="text-foreground">Images:</strong> Use &lt;img src=&quot;URL&quot; alt=&quot;description&quot; /&gt; or paste image URLs
                                        <br />
                                        <strong className="text-foreground">Links:</strong> Use &lt;a href=&quot;URL&quot;&gt;Link Text&lt;/a&gt;
                                        <br />
                                        <strong className="text-foreground">Formatting:</strong> Use &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt; etc.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="edit-date" className="text-base font-semibold">Date</Label>
                                    <Input id="edit-date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="h-11" />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="edit-time" className="text-base font-semibold">Start Time</Label>
                                    <select
                                        id="edit-time"
                                        name="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Select Time</option>
                                        {Array.from({ length: 48 }, (_, i) => {
                                            const hour = Math.floor(i / 2)
                                            const minute = (i % 2) * 30
                                            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                                            return (
                                                <option key={timeString} value={timeString}>
                                                    {timeString}
                                                </option>
                                            )
                                        })}
                                    </select>
                                    <p className="text-xs text-muted-foreground">Select from dropdown (30-minute intervals)</p>
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="edit-duration" className="text-base font-semibold">Duration (hours)</Label>
                                    <Input
                                        id="edit-duration"
                                        name="duration"
                                        type="number"
                                        value={formData.duration}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="edit-location" className="text-base font-semibold">Location</Label>
                                    <Input id="edit-location" name="location" value={formData.location} onChange={handleInputChange} className="h-11" />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="edit-maxParticipants" className="text-base font-semibold">Max Participants</Label>
                                    <Input
                                        id="edit-maxParticipants"
                                        name="maxParticipants"
                                        type="number"
                                        value={formData.maxParticipants}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="edit-minTeamSize" className="text-base font-semibold">Min Team Size</Label>
                                    <Input
                                        id="edit-minTeamSize"
                                        name="minTeamSize"
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.minTeamSize}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="edit-maxTeamSize" className="text-base font-semibold">Max Team Size</Label>
                                    <Input
                                        id="edit-maxTeamSize"
                                        name="maxTeamSize"
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.maxTeamSize}
                                        onChange={handleInputChange}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="edit-registrationDeadline" className="text-base font-semibold">Registration Deadline</Label>
                                <Input
                                    id="edit-registrationDeadline"
                                    name="registrationDeadline"
                                    type="date"
                                    value={formData.registrationDeadline}
                                    onChange={handleInputChange}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Online Status</Label>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="edit-isOnline"
                                        checked={formData.isOnline}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOnline: checked }))}
                                    />
                                    <Label htmlFor="edit-isOnline" className="text-sm text-muted-foreground cursor-pointer">
                                        {formData.isOnline ? 'Event is ONLINE' : 'Event is OFFLINE'}
                                    </Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-imageFile">Upload Event Image</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="edit-imageFile"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="flex-1"
                                                disabled={uploadingImage}
                                            />
                                            {selectedImage && !uploadingImage && !formData.imageUrl && (
                                                <Button
                                                    type="button"
                                                    onClick={() => handleImageUpload()}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    Upload Now
                                                </Button>
                                            )}
                                        </div>
                                        {uploadingImage && (
                                            <div className="space-y-2">
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                                                        style={{ width: `${uploadProgress}%`, minWidth: '30px' }}
                                                    >
                                                        {uploadProgress > 10 && (
                                                            <span className="text-xs font-semibold text-white">{uploadProgress}%</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-muted-foreground">
                                                        {uploadProgress < 20 ? 'Optimizing image...' :
                                                            uploadProgress < 95 ? 'Uploading to server...' :
                                                                'Getting image URL...'}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-semibold text-blue-600">{uploadProgress}%</p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleCancelUpload}
                                                            className="h-7 px-2 text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {formData.imageUrl && !uploadingImage && (
                                            <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                                                    ✅ Image uploaded successfully! URL is set.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-imageUrl">Or Enter Image URL</Label>
                                        <Input
                                            id="edit-imageUrl"
                                            name="imageUrl"
                                            type="url"
                                            value={formData.imageUrl}
                                            onChange={handleInputChange}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            <strong>Option 1:</strong> Upload an image file (auto-optimized) <br />
                                            <strong>Option 2:</strong> Paste a Google Drive sharing link - it will be auto-converted to a direct image URL <br />
                                            <span className="text-yellow-500">⚠️ Important: Make sure your Google Drive file is set to "Anyone with the link can view"</span> <br />
                                            <strong>Option 3:</strong> Enter any direct image URL (e.g., https://example.com/image.jpg)
                                        </p>
                                    </div>

                                    {(imagePreview || formData.imageUrl) && !uploadingImage && (
                                        <div className="space-y-2">
                                            <Label>Image Preview</Label>
                                            <div className="relative border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                <img
                                                    src={imagePreview || formData.imageUrl}
                                                    alt={imagePreview ? "Preview" : "Current"}
                                                    className="w-full h-64 object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.style.display = 'none'
                                                        const parent = target.parentElement
                                                        if (parent) {
                                                            parent.innerHTML = `
                                <div class="flex items-center justify-center h-64 text-center p-4">
                                  <div>
                                    <p class="text-sm text-muted-foreground mb-2">Image failed to load</p>
                                    <p class="text-xs text-muted-foreground">Please check the URL or try uploading a file</p>
                                  </div>
                                </div>
                              `
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleReplaceImage}
                                                    className="flex-1"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Replace
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleRemoveImage}
                                                    className="flex-1"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6 mt-4 border-t flex-shrink-0 bg-background">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                setEditingEvent(null)
                                setSelectedImage(null)
                                setImagePreview(null)
                            }}
                            className="min-w-[120px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateEvent}
                            size="lg"
                            className="min-w-[150px]"
                        >
                            Update Event
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
