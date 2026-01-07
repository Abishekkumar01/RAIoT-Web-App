'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, updateDoc, setDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Search, Calendar, Mail, Phone, BookOpen, User, Eye, Download, ExternalLink, Trash2, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { Download as DownloadIcon } from 'lucide-react';

const shortenInterest = (interest: string) => {
    const map: Record<string, string> = {
        "Public Relations and Content Creation (PR & CC)": "Public Relations and Content Creation",
        "Hardware (Robotics & Automation)": "Hardware",
        "Software (AI & App/Web Dev)": "Software",
        "Both (Hardware and Software)": "Hardware & Software"
    };
    return map[interest] || interest;
};
import Image from 'next/image';

interface Trainee {
    id: string;
    name: string;
    email: string;
    phoneWhatsApp: string;
    phoneCall: string;
    department?: string; // Legacy support
    course?: string;
    enrollmentNo?: string;
    currentStatus?: string;
    areaOfInterest?: string; // Legacy
    areasOfInterest?: string[];
    skills?: string;
    hobby?: string;
    passportPhotoUrl?: string;
    whatsappScreenshotUrl?: string;
    dob?: string;
    status: 'Pending' | 'Accepted' | 'Rejected' | 'Trash';
    timestamp: any;
}

export default function ManageTraineePage() {
    const { user } = useAuth();
    const [recruitmentOpen, setRecruitmentOpen] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loadingTrainees, setLoadingTrainees] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
    const [viewMode, setViewMode] = useState<'Active' | 'Trash'>('Active');

    // Fetch Recruitment Settings
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

    // Fetch Trainees
    useEffect(() => {
        const q = query(collection(db, 'trainees'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const traineeList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Trainee));
            setTrainees(traineeList);
            setLoadingTrainees(false);
        }, (error) => {
            console.error("Error fetching trainees:", error);
            setLoadingTrainees(false);
        });
        return () => unsubscribe();
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

    const updateStatus = async (traineeId: string, newStatus: 'Accepted' | 'Rejected' | 'Trash' | 'Pending') => {
        try {
            await updateDoc(doc(db, 'trainees', traineeId), {
                status: newStatus
            });
            const action = newStatus === 'Trash' ? 'moved to Trash' : newStatus;
            toast.success(`Trainee ${action} successfully`);

            if (selectedTrainee && selectedTrainee.id === traineeId) {
                // If viewing details and moved to trash, maybe close it or update status
                setSelectedTrainee(prev => prev ? ({ ...prev, status: newStatus }) : null);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const deleteTrainee = async (traineeId: string) => {
        if (!window.confirm("Are you sure? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'trainees', traineeId));
            toast.success("Trainee deleted permanently");
            if (selectedTrainee && selectedTrainee.id === traineeId) {
                setSelectedTrainee(null);
            }
        } catch (error) {
            console.error("Error deleting trainee:", error);
            toast.error("Failed to delete trainee");
        }
    };

    const handleExport = (status: 'Accepted' | 'Rejected') => {
        const dataToExport = trainees
            .filter(t => t.status === status)
            .map(t => ({
                Name: t.name,
                Email: t.email,
                'Enrollment No': t.enrollmentNo || 'N/A',
                Course: t.course || t.department || 'N/A',
                'Phone (Call)': t.phoneCall || 'N/A',
                'Phone (WA)': t.phoneWhatsApp || 'N/A',
                Interest: t.areaOfInterest || t.areasOfInterest?.join(', ') || 'N/A',
                Status: t.status,
                'Applied On': t.timestamp?.toDate ? new Date(t.timestamp.toDate()).toLocaleDateString() : 'N/A'
            }));

        if (dataToExport.length === 0) {
            toast.error(`No ${status} trainees found to export.`);
            return;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, status);
        XLSX.writeFile(wb, `Trainees_${status}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`${status} list exported successfully!`);
    };


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
                        Manage Trainees
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Oversee recruitment and manage trainee applications.
                    </p>
                </div>

                <Card className={`border-l-4 transition-all duration-300 ${recruitmentOpen ? 'border-l-green-500 shadow-green-500/10' : 'border-l-destructive shadow-destructive/10'} shadow-lg`}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Recruitment Status
                            </label>
                            <p className="text-xs text-muted-foreground">
                                {recruitmentOpen ? 'Registrations are currently active' : 'Registrations are closed'}
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

            {/* Trainee List */}
            <Card className="border-muted-foreground/20 shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className='flex items-center gap-2'>
                            <CardTitle>Applications</CardTitle>
                            <Badge variant="secondary" className="ml-2">{filteredTrainees.length}</Badge>
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

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleExport('Accepted')}
                            >
                                <DownloadIcon className="h-3 w-3" /> Accepted
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleExport('Rejected')}
                            >
                                <DownloadIcon className="h-3 w-3" /> Rejected
                            </Button>
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search trainees..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
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
                                                        : <Badge variant="outline" className="text-[10px]">{shortenInterest(trainee.areaOfInterest || 'N/A')}</Badge>
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
                                                                onClick={() => deleteTrainee(trainee.id)}
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
                            Applicant Details • Submitted on {selectedTrainee?.timestamp?.toDate ? new Date(selectedTrainee.timestamp.toDate()).toLocaleDateString() : 'N/A'}
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
                                            {!selectedTrainee.areasOfInterest && selectedTrainee.areaOfInterest && (
                                                <Badge variant="secondary">{selectedTrainee.areaOfInterest}</Badge>
                                            )}
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
        </div>
    );
}
