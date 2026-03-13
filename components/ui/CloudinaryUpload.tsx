"use client"

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, X } from "lucide-react"
import { getCloudinarySignature } from '@/app/actions/uploadAction'
import { useToast } from "@/hooks/use-toast"

interface CloudinaryUploadProps {
    onUploadSuccess: (url: string) => void;
    currentImageUrl?: string;
}

export function CloudinaryUpload({ onUploadSuccess, currentImageUrl }: CloudinaryUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Please select an image smaller than 5MB.",
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);

        // Optimistic preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            // 1. Get Signature from Server
            const { signature, timestamp } = await getCloudinarySignature();

            // 2. Upload directly to Cloudinary from Client (Bypasses Next.js 1MB limit)
            const formData = new FormData();
            formData.append('file', file);
            const apiKey = '789299399652629';
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('folder', 'raiot_inventory');

            const cloudName = 'dvjvbonjb';
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Upload failed');
            }

            onUploadSuccess(data.secure_url);
            toast({
                title: "Upload Successful",
                description: "Image uploaded to Cloudinary.",
            });
        } catch (error: any) {
            console.error("Cloudinary Upload Error:", error);
            setPreviewUrl(currentImageUrl || null); // Revert
            toast({
                title: "Upload Failed",
                description: error.message || "There was an error uploading the image.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const clearImage = () => {
        setPreviewUrl(null);
        onUploadSuccess("");
    };

    return (
        <div className="flex flex-col gap-4">
            {previewUrl ? (
                <div className="relative w-full rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 group aspect-video flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={clearImage}
                        disabled={isUploading}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-zinc-700 border-dashed rounded-lg cursor-pointer bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mb-3" />
                            ) : (
                                <UploadCloud className="w-8 h-8 mb-3 text-zinc-400" />
                            )}
                            <p className="mb-2 text-sm text-zinc-400">
                                <span className="font-semibold">Click to upload image</span>
                            </p>
                            <p className="text-xs text-zinc-500">MAX 5MB</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            )}
        </div>
    );
}
