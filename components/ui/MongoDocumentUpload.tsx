"use client";

import { useState } from 'react';
import { UploadCloud, CheckCircle, FileText, Loader2 } from 'lucide-react';

interface MongoDocumentUploadProps {
    userId: string;
    onUploadSuccess: (fileUrl: string, fileId: string, fileName: string) => void;
}

export default function MongoDocumentUpload({ userId, onUploadSuccess }: MongoDocumentUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        setUploading(true);
        setSuccess(false);
        setFileName(file.name);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        try {
            const response = await fetch('/api/resources/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || `Upload failed with status ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.fileId) {
                setSuccess(true);
                // Return a download URL mapping to the newly created download route
                const fileUrl = `/api/resources/download/${data.fileId}`;
                onUploadSuccess(fileUrl, data.fileId, file.name);
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            alert(`Upload failed: ${error.message || 'Please try again.'}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            <label className={`
                flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg cursor-pointer 
                transition-colors duration-200
                ${success ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-blue-500 hover:bg-gray-800/50'}
                ${uploading ? 'opacity-50 pointer-events-none' : ''}
            `}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? (
                        <Loader2 className="w-8 h-8 mb-3 text-blue-500 animate-spin" />
                    ) : success ? (
                        <CheckCircle className="w-8 h-8 mb-3 text-green-500" />
                    ) : (
                        <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                    )}

                    <p className="mb-2 text-sm text-gray-400">
                        {uploading ? (
                            <span className="font-semibold text-blue-400">Uploading {fileName}...</span>
                        ) : success ? (
                            <span className="font-semibold text-green-500">Upload Complete! ({fileName})</span>
                        ) : (
                            <span className="font-semibold">Click to upload resource to MongoDB</span>
                        )}
                    </p>
                    {!uploading && !success && (
                        <p className="text-xs text-gray-500">PDF, DOCX, ZIP, MP4 (Max 16MB)</p>
                    )}
                </div>
                <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.mp4,.png,.jpg,.jpeg"
                    disabled={uploading}
                />
            </label>
        </div>
    );
}
