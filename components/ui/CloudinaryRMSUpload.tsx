"use client"

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, X, FileText, CheckCircle } from "lucide-react"
import { getRMSCloudinarySignature } from '@/app/actions/uploadAction'
import { useToast } from "@/hooks/use-toast"
import { auth } from '@/lib/firebase';

interface CloudinaryRMSUploadProps {
    userId: string;
    onUploadSuccess: (payload: {
        fileUrl: string;
        fileName: string;
        storageType: 'cloudinary' | 'mongodb';
        mongoFileId?: string;
        mimeType?: string;
    }) => void;
    currentFileUrl?: string;
}

export function CloudinaryRMSUpload({ userId, onUploadSuccess, currentFileUrl }: CloudinaryRMSUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [success, setSuccess] = useState(!!currentFileUrl);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const parseResponsePayload = async (response: Response) => {
        const raw = await response.text();
        try {
            return { json: JSON.parse(raw), raw };
        } catch {
            return { json: null as any, raw };
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setSuccess(false);
        setFileName(file.name);

        try {
            if (file.type.startsWith('image/')) {
                // Image files are stored on Cloudinary for fast public serving.
                const { signature, timestamp } = await getRMSCloudinarySignature('raiot_rms');

                const formData = new FormData();
                formData.append('file', file);

                const apiKey = '667167674852528';
                formData.append('api_key', apiKey);
                formData.append('timestamp', timestamp.toString());
                formData.append('signature', signature);
                formData.append('folder', 'raiot_rms');

                const cloudName = 'dvjvbonjb';
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                    method: 'POST',
                    body: formData
                });

                const { json: data, raw } = await parseResponsePayload(response);

                if (!response.ok) {
                    throw new Error(data?.error?.message || raw || 'Upload failed');
                }

                setSuccess(true);
                onUploadSuccess({
                    fileUrl: data.secure_url,
                    fileName: file.name,
                    storageType: 'cloudinary',
                    mimeType: file.type || 'application/octet-stream',
                });
            } else {
                // Non-image files are stored in MongoDB (GridFS) on Oracle-hosted instance.
                const token = await auth.currentUser?.getIdToken(true);
                if (!token) {
                    throw new Error('Authentication required for document upload');
                }

                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch('/api/rms/upload', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const { json: data, raw } = await parseResponsePayload(response);
                if (!response.ok) {
                    const parsedError = data?.error;
                    const fallback = raw?.includes('Request Entity Too Large')
                        ? 'Document is too large for server upload. Please upload a smaller file or increase server body size limit.'
                        : raw;
                    throw new Error(parsedError || fallback || 'Document upload failed');
                }

                setSuccess(true);
                onUploadSuccess({
                    fileUrl: data.fileUrl,
                    fileName: data.fileName || file.name,
                    storageType: 'mongodb',
                    mongoFileId: data.fileId,
                    mimeType: data.mimeType || file.type || 'application/octet-stream',
                });
            }

            toast({
                title: "Upload Successful",
                description: file.type.startsWith('image/')
                    ? "Image uploaded to Cloudinary."
                    : "Document uploaded to MongoDB.",
            });
        } catch (error: any) {
            console.error("Cloudinary RMS Upload Error:", error);
            setSuccess(false);
            toast({
                title: "Upload Failed",
                description: error.message || "There was an error uploading the resource.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="w-full">
            <label className={`
                flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg cursor-pointer 
                transition-colors duration-200
                ${success ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 bg-zinc-900/50 hover:border-purple-500 hover:bg-zinc-800'}
                ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 mb-3 text-purple-500 animate-spin" />
                    ) : success ? (
                        <CheckCircle className="w-8 h-8 mb-3 text-purple-400" />
                    ) : (
                        <UploadCloud className="w-8 h-8 mb-3 text-zinc-400" />
                    )}

                    <p className="mb-2 text-sm text-zinc-400">
                        {isUploading ? (
                            <span className="font-semibold text-purple-400">Uploading {fileName}...</span>
                        ) : success ? (
                            <span className="font-semibold text-purple-400">Upload Complete! ({fileName})</span>
                        ) : (
                            <span className="font-semibold">Click to upload image or document</span>
                        )}
                    </p>
                    {!isUploading && !success && (
                        <p className="text-xs text-zinc-500">PDF, DOCX, ZIP, PNG, JPG (Large files supported)</p>
                    )}
                </div>
                <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg"
                    ref={fileInputRef}
                    disabled={isUploading}
                />
            </label>
        </div>
    );
}
