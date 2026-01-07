'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Kept for reference but unused in new flow, actually we can remove specific imports or keep file clean.
// Since we are not using storage anymore in this file, we can remove the import or leave it if other components might need it (but this is a specific file). 
// Let's remove the import of storage functions to be clean.
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Upload, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import Image from 'next/image';
import { compressImage } from '@/lib/utils';

const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Invalid email address." }),
    phoneWhatsApp: z.string().min(10, { message: "WhatsApp number must be at least 10 digits." }),
    phoneCall: z.string().min(10, { message: "Calling number must be at least 10 digits." }),
    dob: z.string().min(1, { message: "Date of Birth is required." }),
    enrollmentNo: z.string().min(1, { message: "Enrollment Number is required." }),
    course: z.string().min(1, { message: "Course is required." }),
    currentStatus: z.string().min(1, { message: "Current Status is required." }),
    skills: z.string().optional(),
    areasOfInterest: z.array(z.string()).min(1, { message: "Select at least one area of interest." }),
    hobby: z.string().min(1, { message: "Hobby is required." }),
    // File validations are handled separately in the component for simplicity with react-hook-form z wrapper
});

export default function TraineeRegistrationModal({
    triggerButton,
    onOpenChange
}: {
    triggerButton?: React.ReactNode,
    onOpenChange?: (open: boolean) => void
}) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();

    // File states
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            phoneWhatsApp: '',
            phoneCall: '',
            dob: '',
            enrollmentNo: '',
            course: '',
            currentStatus: '',
            skills: '',
            areasOfInterest: [],
            hobby: '',
        },
    });

    const areasList = [
        "Hardware",
        "Software",
        "Both (Hardware and Software)",
        "Public Relations and Content Creation",
        "Social Media Handling",
        "Marketing"
    ];

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            form.reset();
            setPhotoFile(null);
        }
        onOpenChange?.(newOpen);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) {
            toast.error("You must be logged in to submit.");
            return;
        }

        if (!photoFile) {
            toast.error("Please upload your passport size photo.");
            return;
        }

        // 5MB Limit Check
        const MAX_SIZE = 5 * 1024 * 1024;
        if (photoFile.size > MAX_SIZE) {
            toast.error("File must be smaller than 5MB.");
            return;
        }

        setIsSubmitting(true);
        console.log("Submitting form (Cloudinary)...");
        try {
            // 1. Optimize Image
            console.log("Optimizing image...");
            let uploadFile = photoFile;
            try {
                // Compress to max 800px, 0.7 quality
                const compressedPhoto = await compressImage(photoFile, 800, 0.7);
                console.log(`Optimized: ${photoFile.size} -> ${compressedPhoto.size}`);
                uploadFile = compressedPhoto;
            } catch (e) {
                console.warn("Optimization failed, using original.", e);
            }

            // 2. Upload to Cloudinary
            console.log("Uploading to Cloudinary...");

            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("upload_preset", "Trainee_photos");
            formData.append("cloud_name", "dvjvbonjb");
            formData.append("folder", "trainees");

            const cloudinaryRes = await fetch("https://api.cloudinary.com/v1_1/dvjvbonjb/image/upload", {
                method: "POST",
                body: formData
            });

            if (!cloudinaryRes.ok) {
                const errorData = await cloudinaryRes.json();
                console.error("Cloudinary Error:", errorData);
                throw new Error(`Cloudinary Upload Failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const cloudinaryData = await cloudinaryRes.json();
            const photoURL = cloudinaryData.secure_url;
            console.log("Upload Complete. URL:", photoURL);

            // 3. Save Data to Firestore
            console.log("Saving to Firestore...");
            const dataToSave = {
                ...values,
                passportPhotoUrl: photoURL,
                status: 'Pending',
                timestamp: serverTimestamp(),
                userId: user.uid,
            };

            await addDoc(collection(db, 'trainees'), dataToSave);
            console.log("Firestore Save Complete.");

            toast.success("Application submitted successfully!");
            handleOpenChange(false);
        } catch (error: any) {
            console.error("Error submitting registration:", error);
            toast.error(`Failed to submit: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }

    };

    if (!user && open) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {triggerButton || <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">Register Now</Button>}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] border-primary/20 bg-background/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-orbitron font-bold text-primary">Authentication Required</DialogTitle>
                        <DialogDescription>
                            You must be logged in to apply for a specialized traineeship.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <Button asChild variant="outline" className="w-full">
                            <a href="/auth/login">Login</a>
                        </Button>
                        <Button asChild className="w-full">
                            <a href="/auth/signup">Sign Up</a>
                        </Button>
                        <Button asChild variant="ghost" className="w-full">
                            <a href="/auth/guest-signup">Guest Signup</a>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {triggerButton || <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">Register Now</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col border-primary/20 bg-background/95 backdrop-blur-xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="text-2xl font-orbitron font-bold text-primary">Trainee Application</DialogTitle>
                    <DialogDescription>
                        Join the RAIoT Club. Please fill out all details carefully.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Personal Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-primary/80 border-b border-primary/20 pb-1">Personal Details</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Full Name" {...field} className="bg-white/5" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dob"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} className="bg-white/5" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="phoneWhatsApp"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>WhatsApp Number <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="WhatsApp Number" {...field} className="bg-white/5" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phoneCall"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Calling Number <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Calling Number" {...field} className="bg-white/5" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="email@example.com" {...field} className="bg-white/5" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Academic Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-primary/80 border-b border-primary/20 pb-1">Academic Details</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="enrollmentNo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Enrollment Number <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enrollment Number" {...field} className="bg-white/5" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="course"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Course / Branch <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white/5">
                                                            <SelectValue placeholder="Select Course" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="CSE">CSE</SelectItem>
                                                        <SelectItem value="ECE">ECE</SelectItem>
                                                        <SelectItem value="EEE">EEE</SelectItem>
                                                        <SelectItem value="Chemical Engineering">Chemical Engineering</SelectItem>
                                                        <SelectItem value="Bio-Tech">Bio-Tech</SelectItem>
                                                        <SelectItem value="Applied Physics">Applied Physics</SelectItem>
                                                        <SelectItem value="Cyber Security">Cyber Security</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="currentStatus"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Status <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white/5">
                                                        <SelectValue placeholder="Select Status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Day Scholar">Day Scholar</SelectItem>
                                                    <SelectItem value="Hosteller">Hosteller</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Skills & Interest */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-primary/80 border-b border-primary/20 pb-1">Skills & Interests</h3>
                                <FormField
                                    control={form.control}
                                    name="skills"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Skills (Brief) <span className="text-neutral-400 text-xs">(e.g. C++, Python, Video Editing)</span></FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="List your technical or non-technical skills..." {...field} className="bg-white/5" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="areasOfInterest"
                                    render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Areas of Interest <span className="text-destructive">*</span></FormLabel>
                                                <FormDescription>
                                                    Select all that apply.
                                                </FormDescription>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {areasList.map((item) => (
                                                    <FormField
                                                        key={item}
                                                        control={form.control}
                                                        name="areasOfInterest"
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={item}
                                                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/5 p-3 hover:bg-white/5 transition-colors"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(item)}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...field.value, item])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value) => value !== item
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal cursor-pointer w-full">
                                                                        {item}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hobby"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hobby <span className="text-neutral-400 text-xs">(Only those which we can discuss)</span> <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Reading, Football, Chess" {...field} className="bg-white/5" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Documents & Confirmation */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-primary/80 border-b border-primary/20 pb-1">Verification</h3>

                                {/* WhatsApp Group Join */}
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <h4 className="font-medium text-green-400">Join WhatsApp Group</h4>
                                            <p className="text-xs text-green-300/70">Required for official updates.</p>
                                        </div>
                                        <Button asChild size="sm" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20">
                                            <a href="https://chat.whatsapp.com/HKfGrbeY2wr95FBavuryrO" target="_blank" rel="noopener noreferrer">
                                                Join Group <ExternalLink className="ml-2 h-3 w-3" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>

                                <FormItem>
                                    <FormLabel>Upload Passport Size Photo <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPhotoFile(e.target.files ? e.target.files[0] : null)}
                                            className="bg-white/5 file:bg-white/10 file:text-white file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-4 file:text-sm file:font-semibold hover:file:bg-white/20 cursor-pointer"
                                        />
                                    </FormControl>
                                </FormItem>
                            </div>

                        </form>
                    </Form>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-primary/10 shrink-0 bg-background/95 backdrop-blur-xl">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full md:w-auto min-w-[150px]">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                            </>
                        ) : (
                            'Submit Application'
                        )}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
