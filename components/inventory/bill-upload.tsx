"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, CheckCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface BillUploadProps {
    onUploadComplete?: (url: string, fileName: string) => Promise<void> | void;
    className?: string;
}

export default function BillUpload({
    onUploadComplete,
    className,
}: BillUploadProps) {
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up object URL on unmount or when file changes
    useEffect(() => {
        return () => {
            if (previewUrl && !previewUrl.startsWith('http')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match(/^image\/(jpeg|png)$/) && file.type !== 'application/pdf') {
            toast({
                title: "Invalid file type",
                description: "Please upload PDF, JPG, or PNG files.",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "File size should be less than 10MB",
                variant: "destructive",
            });
            return;
        }

        setSelectedFile(file);
        setUploadedUrl(null); // Reset uploaded status on new file

        // Create local preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append("file", selectedFile);

            const uploadPreset = "Inventory_Bills";
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

            if (!cloudName) {
                throw new Error("Missing Cloudinary configuration (Cloud Name).");
            }

            formData.append("upload_preset", uploadPreset);

            // Using 'auto' resource type to handle both images and PDFs/raw files appropriately
            const resourceType = 'auto';

            const uploadResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error?.message || "Upload failed");
            }

            const data = await uploadResponse.json();

            if (onUploadComplete) {
                await onUploadComplete(data.secure_url, selectedFile.name);
            }

            setUploadedUrl(data.secure_url);

            toast({
                title: "Success",
                description: "Bill uploaded successfully",
            });

            // Clear selection after successful upload (optional, but good for UX)
            // handleRemove(); // Or keep it to show success state

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Error",
                description: `Upload failed: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadedUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div
                className={cn(
                    "relative border-2 border-dashed border-neutral-700 bg-neutral-900/50 rounded-lg p-8 flex flex-col items-center justify-center transition-colors hover:border-neutral-500",
                    loading && "opacity-50 pointer-events-none"
                )}
            >
                {previewUrl ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
                        {selectedFile?.type.includes('image') ? (
                            <div className="relative w-48 h-64 mb-6 rounded-md overflow-hidden border border-neutral-700 shadow-2xl">
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-48 h-64 mb-6 bg-neutral-800 rounded-md border border-neutral-700">
                                <FileText className="w-20 h-20 text-blue-500 mb-2" />
                                <span className="text-xs text-gray-400">PDF Document</span>
                            </div>
                        )}

                        <p className="text-sm font-medium text-white mb-6 max-w-[200px] truncate text-center">
                            {selectedFile?.name}
                        </p>

                        {uploadedUrl ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center text-green-500 font-bold gap-2 bg-green-500/10 px-4 py-2 rounded-full">
                                    <CheckCircle className="w-5 h-5" />
                                    Uploaded Successfully
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => window.open(uploadedUrl, '_blank')}>
                                        View Uploaded File
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={handleRemove}>
                                        Upload Another
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 w-full max-w-xs">
                                <Button
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                    onClick={handleUpload}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" /> Submit Bill
                                        </>
                                    )}
                                </Button>
                                <Button variant="destructive" onClick={handleRemove} disabled={loading}>
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/50">
                            <Upload className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Upload Bill</h3>
                        <p className="text-sm text-neutral-400 mb-8 text-center max-w-sm">
                            Select a bill to upload. You can preview it before submitting.
                            <br />
                            <span className="text-neutral-500 text-xs">Supports JPG, PNG, PDF (Max 10MB)</span>
                        </p>
                        <Button variant="secondary" size="lg" className="font-semibold" onClick={() => fileInputRef.current?.click()}>
                            Select File
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, application/pdf"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </>
                )}
            </div>

            {/* Disclaimer / Instructions */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                <div className="flex gap-3">
                    <div className="mt-1">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-400 font-bold text-xs">i</span>
                        </div>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                        <p className="font-semibold text-blue-400">Submission Requirements</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Ensure the <strong>Vendor Name</strong>, <strong>Date</strong>, and <strong>Total Amount</strong> are clearly visible.</li>
                            <li>Blurry or incomplete bills may be rejected during audit.</li>
                            <li>For multi-page bills, please convert to a single PDF.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
