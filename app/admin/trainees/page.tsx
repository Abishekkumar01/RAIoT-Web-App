'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
    getAllTrainees,
    updateTraineeStatus,
    deleteTrainee,
    deleteAllTrainees,
    addTrainee,
    updateTraineeDetails
} from '@/app/actions/adminTraineeActions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Search, Calendar, Mail, Phone, BookOpen, User, Eye, Download, ExternalLink, Trash2, RotateCcw, AlertTriangle, Plus, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { Download as DownloadIcon } from 'lucide-react';
import Image from 'next/image';

const shortenInterest = (interest: string) => {
    const map: Record<string, string> = {
        "Public Relations and Content Creation (PR & CC)": "Public Relations and Content Creation",
        "Hardware (Robotics & Automation)": "Hardware",
        "Software (AI & App/Web Dev)": "Software",
        "Both (Hardware and Software)": "Hardware & Software"
    };
    return map[interest] || interest;
};

// Interface matching the MongoDB serialization
interface Trainee {
    id: string;
    name: string;
    email: string;
    phoneWhatsApp: string;
    phoneCall: string;
    dob?: string;
    enrollmentNo?: string;
    course?: string;
    department?: string;
    currentStatus?: string;
    areasOfInterest?: string[];
    skills?: string;
    hobby?: string;
    laptopSpecs?: string;
    hasLaptop?: string;
    passportPhotoUrl?: string;
    whatsappScreenshotUrl?: string;
    status: 'Pending' | 'Accepted' | 'Rejected' | 'Trash';
    timestamp: string; // ISO string from server
}

export default function AdminManageTraineePage() {
    const { user } = useAuth();
    const [recruitmentOpen, setRecruitmentOpen] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);

    // MongoDB Data State
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loadingTrainees, setLoadingTrainees] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
    const [viewMode, setViewMode] = useState<'Active' | 'Trash'>('Active');

    // Add / Edit State
    const [isAddEditOpen, setIsAddEditOpen] = useState(false);
    const [editingTrainee, setEditingTrainee] = useState<Partial<Trainee> | null>(null);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);

    // For Delete All Confirmation
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    // 1. Fetch Recruitment Settings (Keep in Firestore as requested/consistent)
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'recruitment'), (docSnap) => {
            if (docSnap.exists()) {
                setRecruitmentOpen(docSnap.data().isOpen);
            } else {
                setRecruitmentOpen(false);
            }
            setLoadingSettings(false);
        }, (error) => {
            console.error("Error fetching settings:", error);
            setLoadingSettings(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Trainees from MongoDB (via Server Action)
    const fetchTrainees = async () => {
        setLoadingTrainees(true);
        const result = await getAllTrainees();
        if (result.success && result.data) {
            setTrainees(result.data as Trainee[]);
        } else {
            toast.error("Failed to load trainees from MongoDB");
        }
        setLoadingTrainees(false);
    };

    useEffect(() => {
        fetchTrainees();
    }, []);

    const toggleRecruitment = async (checked: boolean) => {
        try {
            const settingsRef = doc(db, 'settings', 'recruitment');
            await setDoc(settingsRef, { isOpen: checked }, { merge: true });
            toast.success(`Recruitment is now ${checked ? 'OPEN' : 'CLOSED'}`);
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update recruitment status");
        }
    };

    // Update Status Action
    const updateStatus = async (traineeId: string, newStatus: 'Accepted' | 'Rejected' | 'Trash' | 'Pending') => {
        try {
            const result = await updateTraineeStatus(traineeId, newStatus);
            if (result.success) {
                const action = newStatus === 'Trash' ? 'moved to Trash' : newStatus;
                toast.success(`Trainee ${action} successfully`);
                // Update local state
                setTrainees(prev => prev.map(t => t.id === traineeId ? { ...t, status: newStatus } : t));

                if (selectedTrainee && selectedTrainee.id === traineeId) {
                    setSelectedTrainee(prev => prev ? ({ ...prev, status: newStatus }) : null);
                }
            } else {
                toast.error(result.error || "Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    // Delete Single Action
    const handleDeleteTrainee = async (traineeId: string) => {
        if (!window.confirm("Are you sure? This action cannot be undone.")) return;
        try {
            const result = await deleteTrainee(traineeId);
            if (result.success) {
                toast.success("Trainee deleted permanently");
                setTrainees(prev => prev.filter(t => t.id !== traineeId));
                if (selectedTrainee && selectedTrainee.id === traineeId) {
                    setSelectedTrainee(null);
                }
            } else {
                toast.error(result.error || "Failed to delete");
            }
        } catch (error) {
            console.error("Error deleting trainee:", error);
            toast.error("Failed to delete trainee");
        }
    };

    // EXCEL EXPORT
    const handleExport = (status: 'Accepted' | 'Rejected' | 'All') => {
        // Prepare data
        let exportData = trainees;
        if (status !== 'All') {
            exportData = trainees.filter(t => t.status === status);
        }

        if (exportData.length === 0) {
            toast.error(`No ${status} trainees found to export.`);
            return;
        }

        const dataToExport = exportData.map(t => ({
            Name: t.name,
            Email: t.email,
            'Enrollment No': t.enrollmentNo || 'N/A',
            Course: t.course || t.department || 'N/A',
            'Phone (Call)': t.phoneCall || 'N/A',
            'Phone (WA)': t.phoneWhatsApp || 'N/A',
            Interest: t.areasOfInterest?.join(', ') || 'N/A',
            Status: t.status,
            'Applied On': new Date(t.timestamp).toLocaleDateString(),
            'Laptop Specs': t.laptopSpecs || 'N/A',
            'Has Laptop': t.hasLaptop || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, status);
        XLSX.writeFile(wb, `Trainees_${status}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`Exported ${exportData.length} records!`);
    };

    // DELETE ALL (Clear Data)
    const handleClearAttributes = async () => {
        setIsDeletingAll(true);
        try {
            const result = await deleteAllTrainees();
            if (result.success) {
                toast.success(result.message);
                setTrainees([]); // Clear local
                setIsDeleteAllOpen(false);
            } else {
                toast.error(result.error || "Failed to clear data");
            }
        } catch (error) {
            console.error("Error clearing data:", error);
            toast.error("Failed to clear data");
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleSaveTrainee = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmittingForm(true);
        try {
            if (editingTrainee?.id) {
                // Update existing
                const result = await updateTraineeDetails(editingTrainee.id, editingTrainee);
                if (result.success && result.data) {
                    toast.success("Trainee updated successfully");
                    setTrainees(prev => prev.map(t => t.id === editingTrainee.id ? result.data as Trainee : t));
                    setIsAddEditOpen(false);
                    setEditingTrainee(null);
                } else {
                    toast.error(result.error || "Update failed");
                }
            } else {
                // Add new
                const result = await addTrainee(editingTrainee);
                if (result.success && result.data) {
                    toast.success("Trainee added successfully");
                    setTrainees(prev => [result.data as Trainee, ...prev]);
                    setIsAddEditOpen(false);
                    setEditingTrainee(null);
                } else {
                    toast.error(result.error || "Add failed");
                }
            }
        } catch (error) {
            console.error("Error saving trainee:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setIsSubmittingForm(false);
        }
    };

    // Filter Logic
    const filteredTrainees = trainees.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.course || t.department)?.toLowerCase().includes(searchTerm.toLowerCase());

        if (viewMode === 'Trash') {
            return matchesSearch && t.status === 'Trash';
        }
        return matchesSearch && t.status !== 'Trash';
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Manage Trainees (MongoDB)
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Oversee recruitment and manage trainee applications.
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Recruitment Switch (Firestore) */}
                    <Card className={`border-l-4 transition-all duration-300 ${recruitmentOpen ? 'border-l-green-500 shadow-green-500/10' : 'border-l-destructive shadow-destructive/10'} shadow-lg`}>
                        <CardContent className="p-3 flex items-center gap-4">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none">
                                    Recruitment
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    {recruitmentOpen ? 'Active' : 'Closed'}
                                </p>
                            </div>
                            {loadingSettings ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Switch
                                    checked={recruitmentOpen}
                                    onCheckedChange={toggleRecruitment}
                                    className="data-[state=checked]:bg-green-500"
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Trainee List Card */}
            <Card className="border-muted-foreground/20 shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                        <div className='flex items-center gap-2 flex-wrap'>
                            <CardTitle>Applications</CardTitle>
                            <Badge variant="secondary" className="ml-2">{filteredTrainees.length}</Badge>

                            {/* View Toggles */}
                            <div className="flex bg-muted rounded-lg p-1 ml-4">
                                <button
                                    onClick={() => setViewMode('Active')}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'Active' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setViewMode('Trash')}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'Trash' ? 'bg-background shadow-sm text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                                >
                                    <Trash2 className="h-3 w-3" /> Trash
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {/* ADD TRAINEE BUTTON */}
                            <Button
                                size="sm"
                                className="h-8 gap-1 bg-primary text-primary-foreground"
                                onClick={() => {
                                    setEditingTrainee({ status: 'Pending', areasOfInterest: [] });
                                    setIsAddEditOpen(true);
                                }}
                            >
                                <Plus className="h-3 w-3" /> Add Trainee
                            </Button>

                            {/* EXPORT BUTTONS */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 border-primary/20 hover:bg-primary/10"
                                onClick={() => handleExport('All')}
                            >
                                <DownloadIcon className="h-3 w-3" /> Export All
                            </Button>

                            {/* CLEAR DATA BUTTON */}
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 gap-1"
                                onClick={() => setIsDeleteAllOpen(true)}
                            >
                                <AlertTriangle className="h-3 w-3" /> Clear Data
                            </Button>

                            <div className="relative w-full md:w-64 ml-2">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search trainees..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingTrainees ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredTrainees.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchTerm ? 'No matching results found.' : 'No trainee applications yet.'}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student Details</TableHead>
                                        <TableHead>Course/Dept</TableHead>
                                        <TableHead>Enrollment</TableHead>
                                        <TableHead>Interest</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTrainees.map((trainee) => (
                                        <TableRow key={trainee.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium flex items-center gap-2">
                                                        <User className="h-3 w-3 text-muted-foreground" /> {trainee.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                        <Mail className="h-3 w-3" /> {trainee.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{trainee.course || trainee.department || 'N/A'}</TableCell>
                                            <TableCell>{trainee.enrollmentNo || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {trainee.areasOfInterest && trainee.areasOfInterest.length > 0
                                                        ? trainee.areasOfInterest.slice(0, 1).map(area => (
                                                            <Badge key={area} variant="outline" className="text-[10px]">{shortenInterest(area)}</Badge>
                                                        ))
                                                        : <Badge variant="outline" className="text-[10px]">N/A</Badge>
                                                    }
                                                    {(trainee.areasOfInterest?.length || 0) > 1 && (
                                                        <Badge variant="outline" className="text-[10px]">+{(trainee.areasOfInterest?.length || 0) - 1}</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        trainee.status === 'Accepted' ? 'default' :
                                                            trainee.status === 'Rejected' ? 'destructive' : 'secondary'
                                                    }
                                                    className={trainee.status === 'Accepted' ? 'bg-green-500 hover:bg-green-600' : ''}
                                                >
                                                    {trainee.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setSelectedTrainee(trainee)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        <span className="sr-only">View</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => {
                                                            setEditingTrainee(trainee);
                                                            setIsAddEditOpen(true);
                                                        }}
                                                        title="Edit Details"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>

                                                    {viewMode === 'Active' ? (
                                                        <>
                                                            {trainee.status !== 'Accepted' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 text-green-500"
                                                                    onClick={() => updateStatus(trainee.id, 'Accepted')}
                                                                    title="Accept"
                                                                >
                                                                    <CheckCircle2 className="h-5 w-5" />
                                                                    <span className="sr-only">Accept</span>
                                                                </Button>
                                                            )}
                                                            {trainee.status !== 'Rejected' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 text-red-500"
                                                                    onClick={() => updateStatus(trainee.id, 'Rejected')}
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="h-5 w-5" />
                                                                    <span className="sr-only">Reject</span>
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => updateStatus(trainee.id, 'Trash')}
                                                                title="Move to Trash"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">Trash</span>
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                                onClick={() => updateStatus(trainee.id, 'Pending')}
                                                                title="Restore"
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                                <span className="sr-only">Restore</span>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDeleteTrainee(trainee.id)}
                                                                title="Delete Permanently"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                                <span className="sr-only">Delete</span>
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Details Modal */}
            <Dialog open={!!selectedTrainee} onOpenChange={(open) => !open && setSelectedTrainee(null)}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                            {selectedTrainee?.name}
                            <Badge
                                variant={
                                    selectedTrainee?.status === 'Accepted' ? 'default' :
                                        selectedTrainee?.status === 'Rejected' ? 'destructive' : 'secondary'
                                }
                                className={selectedTrainee?.status === 'Accepted' ? 'bg-green-500' : ''}
                            >
                                {selectedTrainee?.status}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Applicant Details • Submitted on {selectedTrainee?.timestamp ? new Date(selectedTrainee.timestamp).toLocaleDateString() : 'N/A'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTrainee && (
                        <div className="grid gap-6 py-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Photo */}
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Passport Photo</h4>
                                    <div className="relative aspect-[3/4] w-40 overflow-hidden rounded-lg border bg-muted">
                                        {selectedTrainee.passportPhotoUrl ? (
                                            <Image
                                                src={selectedTrainee.passportPhotoUrl}
                                                alt="Passport Photo"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-muted-foreground">No Photo</div>
                                        )}
                                    </div>
                                    {selectedTrainee.passportPhotoUrl && (
                                        <a href={selectedTrainee.passportPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                            Open Full Size <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>

                                {/* Key Info */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold text-xs text-muted-foreground uppercase">Enrollment No</h4>
                                            <p>{selectedTrainee.enrollmentNo || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-xs text-muted-foreground uppercase">Date of Birth</h4>
                                            <p>{selectedTrainee.dob || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-xs text-muted-foreground uppercase">Course</h4>
                                        <p>{selectedTrainee.course || selectedTrainee.department || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-xs text-muted-foreground uppercase">Status</h4>
                                        <p>{selectedTrainee.currentStatus || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase">Contact Information</h4>
                                    <div className="space-y-1 text-sm bg-muted/50 p-3 rounded-md">
                                        <p className="flex items-center gap-2"><Mail className="h-4 w-4 opacity-70" /> {selectedTrainee.email}</p>
                                        <p className="flex items-center gap-2"><Phone className="h-4 w-4 opacity-70" /> (WA) {selectedTrainee.phoneWhatsApp}</p>
                                        <p className="flex items-center gap-2"><Phone className="h-4 w-4 opacity-70" /> (Call) {selectedTrainee.phoneCall}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase">Interests & Skills</h4>
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                            {selectedTrainee.areasOfInterest?.map(area => (
                                                <Badge key={area} variant="secondary">{area}</Badge>
                                            ))}
                                        </div>
                                        {selectedTrainee.skills && (
                                            <div className="text-sm border-l-2 border-primary/20 pl-2">
                                                <p className="font-medium text-xs text-muted-foreground">Skills:</p>
                                                <p>{selectedTrainee.skills}</p>
                                            </div>
                                        )}
                                        {selectedTrainee.hobby && (
                                            <div className="text-sm border-l-2 border-primary/20 pl-2">
                                                <p className="font-medium text-xs text-muted-foreground">Hobby:</p>
                                                <p>{selectedTrainee.hobby}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Laptop Details */}
                            <div className="grid md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase">Laptop</h4>
                                    <p className="text-sm">{selectedTrainee.hasLaptop || 'N/A'}</p>
                                </div>
                                {selectedTrainee.laptopSpecs && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-xs text-muted-foreground uppercase">Specs</h4>
                                        <p className="text-sm">{selectedTrainee.laptopSpecs}</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons for Pending */}
                            {selectedTrainee.status === 'Pending' && (
                                <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            updateStatus(selectedTrainee.id, 'Rejected');
                                        }}
                                    >
                                        Reject Application
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => {
                                            updateStatus(selectedTrainee.id, 'Accepted');
                                        }}
                                    >
                                        Accept Application
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add / Edit Trainee Dialog */}
            <Dialog open={isAddEditOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddEditOpen(false);
                    setEditingTrainee(null);
                }
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTrainee?.id ? 'Edit Trainee' : 'Add New Trainee'}</DialogTitle>
                        <DialogDescription>
                            {editingTrainee?.id ? 'Update trainee information below.' : 'Fill in the details to manually register a new trainee.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveTrainee} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input required value={editingTrainee?.name || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, name: e.target.value } : null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input type="email" required value={editingTrainee?.email || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, email: e.target.value } : null)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>WhatsApp No. *</Label>
                                <Input required value={editingTrainee?.phoneWhatsApp || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, phoneWhatsApp: e.target.value } : null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Call No. *</Label>
                                <Input required value={editingTrainee?.phoneCall || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, phoneCall: e.target.value } : null)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Enrollment No.</Label>
                                <Input value={editingTrainee?.enrollmentNo || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, enrollmentNo: e.target.value } : null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Course / Department *</Label>
                                <Input required value={editingTrainee?.course || editingTrainee?.department || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, course: e.target.value, department: e.target.value } : null)} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <Input type="date" value={editingTrainee?.dob || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, dob: e.target.value } : null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Status *</Label>
                                <Input required value={editingTrainee?.currentStatus || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, currentStatus: e.target.value } : null)} placeholder="e.g. 1st Year B.Tech" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Areas of Interest (Comma separated)</Label>
                            <Input 
                                value={editingTrainee?.areasOfInterest?.join(', ') || ''} 
                                onChange={e => setEditingTrainee(prev => prev ? { ...prev, areasOfInterest: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)} 
                                placeholder="Hardware, Software"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Skills</Label>
                                <Input value={editingTrainee?.skills || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, skills: e.target.value } : null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hobby</Label>
                                <Input value={editingTrainee?.hobby || ''} onChange={e => setEditingTrainee(prev => prev ? { ...prev, hobby: e.target.value } : null)} />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingForm}>
                                {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editingTrainee?.id ? 'Save Changes' : 'Add Trainee'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DELETE ALL CONFIRMATION DIALOG */}
            <Dialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear All Data?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete ALL trainee records from the database. This action cannot be undone.
                            Have you exported the data first?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteAllOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleClearAttributes}
                            disabled={isDeletingAll}
                        >
                            {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Yes, Delete Everything
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
