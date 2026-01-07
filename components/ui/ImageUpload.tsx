"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
    value?: string
    onChange: (url: string) => void
    onRemove: () => void
    disabled?: boolean
    className?: string
    variant?: "avatar" | "banner"
    uploadPreset?: string
}

export default function ImageUpload({
    value,
    onChange,
    onRemove,
    disabled,
    className,
    variant = "avatar",
    uploadPreset: customPreset
}: ImageUploadProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        console.log("Starting image upload...", file.name, file.type, file.size)

        // Validate file type
        if (!file.type.includes('image')) {
            toast({
                title: "Invalid file type",
                description: "Please upload an image file",
                variant: "destructive"
            })
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Image size should be less than 5MB",
                variant: "destructive"
            })
            return
        }

        try {
            setLoading(true)
            const formData = new FormData()
            formData.append('file', file)

            const uploadPreset = customPreset || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

            console.log("Cloudinary Config:", {
                presetExists: !!uploadPreset,
                cloudNameExists: !!cloudName,
                cloudName: cloudName,
                preset: uploadPreset
            })

            if (!uploadPreset || !cloudName) {
                throw new Error("Missing Cloudinary configuration. Please check your .env.local file.")
            }

            formData.append('upload_preset', uploadPreset)

            console.log("Uploading to Cloudinary...")
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            )

            if (!response.ok) {
                const errorData = await response.json()
                console.error("Cloudinary Upload Error:", errorData)
                throw new Error(errorData.error?.message || 'Upload failed')
            }

            const data = await response.json()
            console.log("Upload successful:", data.secure_url)
            onChange(data.secure_url)

            toast({
                title: "Success",
                description: "Image uploaded successfully",
            })
        } catch (error: any) {
            console.error("Upload process error:", error)
            toast({
                title: "Error",
                description: `Upload failed: ${error.message}`,
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const inputId = `image-upload-${Math.random().toString(36).substr(2, 9)}`

    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <div className={cn(
                "relative overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 group",
                variant === "avatar" ? "w-24 h-24 rounded-full" : "w-full aspect-video rounded-md"
            )}>
                {value ? (
                    <>
                        <Image
                            fill
                            src={value}
                            alt="Upload"
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                            <button
                                onClick={onRemove}
                                type="button"
                                className="text-white p-1 rounded-full hover:bg-white/20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <ImageIcon className={cn("text-gray-400", variant === "avatar" ? "w-8 h-8" : "w-12 h-12")} />
                )}

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled || loading}
                    onClick={() => document.getElementById(inputId)?.click()}
                    className="w-fit"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    {value ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Recommended: {variant === "avatar" ? "Square JPG, PNG" : "Landscape (16:9)"}. Max 5MB.
                </p>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUpload}
                    disabled={disabled || loading}
                />
            </div>
        </div>
    )
}
