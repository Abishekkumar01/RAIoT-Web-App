"use client"

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, X, FileText } from "lucide-react"
import { getCloudinarySignature } from '@/app/actions/uploadAction'
import { useToast } from "@/hooks/use-toast"

interface CloudinaryDocumentUploadProps {
    onUploadSuccess: (url: string, fileName: string) => void;
    currentFileUrl?: string;
}

export function CloudinaryDocumentUpload({ onUploadSuccess, currentFileUrl }: CloudinaryDocumentUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(currentFileUrl ? 'Existing File' : null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Please select a file smaller than 10MB.",
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        setFileName(file.name);

        try {
            const { signature, timestamp } = await getCloudinarySignature('raiot_resources');    

            const formData = new FormData();
            formData.append('file', file);
            const apiKey = '789299399652629'; // hardcoded as previous fix
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('folder', 'raiot_resources');

            const cloudName = 'dvjvbonjb'; // hardcoded as previous fix
            // Note: using auto/upload allows uploading raw documents too.
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Upload failed');        
            }

            onUploadSuccess(data.secure_url, file.name);
            toast({
                title: "Upload Successful",
                description: "File uploaded to Cloudinary.",
            });
        } catch (error: any) {
            console.error("Cloudinary Upload Error:", error);
            setFileName(currentFileUrl ? 'Existing File' : null);
            toast({
                title: "Upload Failed",
                description: error.message || "There was an error uploading the file.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const clearFile = () => {
        setFileName(null);
        onUploadSuccess("", "");
    };

    return (
        <div className="flex flex-col gap-4">
            {fileName ? (
                <div className="relative w-full rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 group flex items-center p-4">
                    <FileText className="h-8 w-8 text-blue-500 mr-3" />
                    <span className="text-zinc-200 truncate pr-10">{fileName}</span>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-4"
                        onClick={clearFile}
                        disabled={isUploading}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center w-full">       
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed rounded-lg cursor-pointer bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mb-3" />
                            ) : (
                                <UploadCloud className="w-8 h-8 mb-3 text-zinc-400" />
                            )}
                            <p className="mb-2 text-sm text-zinc-400">
                                <span className="font-semibold">Click to upload file</span>
                            </p>
                            <p className="text-xs text-zinc-500">PDF, DOCX, Images, etc (MAX 10MB)</p>    
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,image/*,.xls,.xlsx,.ppt,.pptx,.csv"
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