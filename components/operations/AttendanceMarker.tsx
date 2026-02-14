"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, Loader2, Search, AlertCircle, Download, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/lib/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import { toast } from "sonner"
import { getAttendanceByDate, saveAttendance, getAllAttendanceRecords } from '@/app/actions/attendanceActions';
import { testConnection } from '@/app/actions/testConnection';
import * as XLSX from 'xlsx';
import { getDatabaseStats } from '@/app/actions/storageActions';

interface Student {
    id: string
    uniqueId: string
    name: string
    batch?: string
    status?: string // Optional status for local checking
    attendanceRate?: number
    presentCount?: number
    totalSessions?: number
}

export function AttendanceMarker() {
    const { user } = useAuth()
    const [date, setDate] = useState<Date | undefined>(undefined)
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)

    // Fix Hydration mismatch by setting date on mount
    useEffect(() => {
        setDate(new Date())
    }, [])
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // Map of studentId -> status
    const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | 'late' | 'leave'>>({})
    const [existingAttendance, setExistingAttendance] = useState<boolean>(false)
    const [isHoliday, setIsHoliday] = useState(false)

    // Class Details State (Removed from UI per request, but keeping state for compatibility if logic depends on it, but can be simplified)
    const [classDetails, setClassDetails] = useState({
        subject: '',
        timeRange: '',
        location: ''
    })

    // Storage Stats State
    const [storageStats, setStorageStats] = useState({
        usagePercentage: 0,
        estimatedBytes: 0,
        maxBytes: 512 * 1024 * 1024 // 512MB
    });

    // Fetch Storage Stats
    useEffect(() => {
        const fetchStats = async () => {
            const stats = await getDatabaseStats();
            if (stats.success && stats.data) {
                setStorageStats({
                    usagePercentage: parseFloat(stats.data.usagePercentage),
                    estimatedBytes: stats.data.estimatedBytes,
                    maxBytes: stats.data.maxBytes
                });
            }
        };
        fetchStats();
    }, [date, submitting]); // Refresh when date changes or after submit


    const fetchStudents = async () => {
        try {
            setLoading(true)
            // Fetch users from FIREBASE (keep existing logic for user list)
            const q = query(collection(db, "users"), where("role", "in", ["member", "junior_developer", "senior_developer"]))
            const snapshot = await getDocs(q)

            // TODO: In future, fetch stats from MongoDB if needed. For now, stats might be 0 until migrated.
            // Simplified: Just listing students
            const fetched: Student[] = []

            snapshot.forEach((doc) => {
                const data = doc.data()
                fetched.push({
                    id: doc.id, // User UID
                    uniqueId: data.uniqueId || data.profileData?.rollNumber || 'N/A',
                    name: data.displayName || 'Unknown',
                    batch: data.profileData?.year ? `${data.profileData.year} - ${data.profileData.branch || ''}` : 'General',
                    attendanceRate: 0, // Placeholder
                    presentCount: 0,
                    totalSessions: 0
                })
            })
            setStudents(fetched)

            // Initialize all as PRESENT by default (Green side)
            if (!existingAttendance) {
                const initial: Record<string, 'present' | 'absent' | 'late' | 'leave'> = {}
                fetched.forEach(s => initial[s.id] = 'present')
                setAttendanceState(initial)
            }
        } catch (error) {
            console.error("Error fetching students:", error)
            toast.error("Failed to load student list from users")
        } finally {
            setLoading(false)
        }
    }

    // Fetch students on mount
    useEffect(() => {
        fetchStudents()
    }, [])

    // Check for existing attendance (MONGODB) when date changes
    useEffect(() => {
        const checkExisting = async () => {
            if (!date) return
            const dateStr = format(date, 'yyyy-MM-dd')

            try {
                // Fetch from MongoDB
                const result = await getAttendanceByDate(dateStr);

                // Prepare defaults
                const defaults: Record<string, 'present' | 'absent' | 'late' | 'leave'> = {}
                students.forEach(s => defaults[s.id] = 'present')

                if (result.success && result.data) {
                    const data = result.data;
                    console.log("Found MongoDB record:", data);

                    setExistingAttendance(true);

                    // Set Holiday
                    if (data.type === 'holiday') {
                        setIsHoliday(true);
                        setAttendanceState(defaults); // Default state behind holiday
                    } else {
                        setIsHoliday(false);
                        // Set Class Details
                        setClassDetails({
                            subject: data.subject || '',
                            timeRange: data.timeRange || '',
                            location: data.location || ''
                        });

                        // Set Student Statuses
                        const existing: Record<string, any> = {};
                        data.records.forEach((rec: any) => {
                            existing[rec.studentId] = rec.status;
                        });
                        setAttendanceState({ ...defaults, ...existing });
                    }

                } else {
                    // No record found
                    console.log("No MongoDB record for", dateStr);
                    setExistingAttendance(false);
                    setIsHoliday(false);
                    setClassDetails({ subject: '', timeRange: '', location: '' });
                    setAttendanceState(defaults);
                }

            } catch (error) {
                console.error("Error checking attendance:", error)
                toast.error("Failed to check existing attendance")
            }
        }

        if (students.length > 0) {
            checkExisting()
        }
    }, [date, students.length])

    const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
        setAttendanceState(prev => ({
            ...prev,
            [studentId]: status
        }))
    }

    // Submit to MONGODB
    const handleSubmit = async () => {
        if (!date || !user) return

        if (students.length === 0) {
            toast.error("No eligible students found to mark attendance.")
            return
        }

        try {
            setSubmitting(true)
            const dateStr = format(date, 'yyyy-MM-dd')

            // Prepare records
            const records = students.map(student => ({
                studentId: student.id,
                studentName: student.name,
                studentUniqueId: student.uniqueId,
                status: attendanceState[student.id] || 'present',
                markedBy: user.uid
            }));

            // Prepare payload
            const payload = {
                date: dateStr,
                records: isHoliday ? [] : records, // If holiday, we might not need records, or empty
                subject: classDetails.subject,
                timeRange: classDetails.timeRange,
                location: classDetails.location,
                type: isHoliday ? 'holiday' : 'regular' as 'holiday' | 'regular',
                markedBy: user.uid
            };

            const result = await saveAttendance(payload);

            if (result.success) {
                toast.success("Attendance saved to MongoDB!");
                setExistingAttendance(true);
            } else {
                toast.error("Failed to save: " + result.error);
            }

        } catch (error: any) {
            console.error("Error submitting attendance:", error)
            toast.error(`Failed to submit: ${error.message || "Unknown error"}`)
        } finally {
            setSubmitting(false)
        }
    }

    const handlePublishClass = async () => {
        // In MongoDB model, class details are part of the 'Attendance' document.
        // So basically we just trigger a submit with the current details.
        /* REMOVED UI for class details as per user request to simplify workflow, 
           but kept this function just in case we need it back */
        handleSubmit();
    }

    // MODIFIED EXPORT FUNCTION (No Clear)
    const handleExportOnly = async () => {
        try {
            const result = await getAllAttendanceRecords();
            if (!result.success || !result.data || result.data.length === 0) {
                toast.error("No attendance data found to export.");
                return;
            }

            const ws = XLSX.utils.json_to_sheet(result.data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance_Report");
            const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success("Export successful!");

            // NO CLEAR DIALOG HERE
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Export failed: " + error.message);
        }
    }

    // Format bytes helper
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">

            {/* STORAGE BAR (Windows Style) */}
            <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database Storage (Estimated)
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                        {formatBytes(storageStats.estimatedBytes)} used of {formatBytes(storageStats.maxBytes)}
                    </span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden border border-secondary">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            storageStats.usagePercentage > 90 ? "bg-red-500" :
                                storageStats.usagePercentage > 70 ? "bg-yellow-500" : "bg-blue-600"
                        )}
                        style={{ width: `${Math.max(storageStats.usagePercentage, 1)}%` }} // Min 1% visibility
                    />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    ~{storageStats.usagePercentage.toFixed(4)}% Used (Free Tier Limit)
                </p>
            </div>

            {/* Top Bar with Export */}
            <div className="flex justify-end mb-4 gap-2">
                {/* RESTRICTED TEST BUTTON */}
                {user?.email === 'raj.r@raiot.site' && (
                    <Button
                        variant="outline"
                        className="gap-2 border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-600"
                        onClick={async () => {
                            toast.info("Testing connection...");
                            try {
                                const result = await testConnection();
                                if (result.success) {
                                    toast.success(result.message);
                                } else {
                                    alert(`CONNECTION FAILED:\n\n${result.error}\n\nCheck Vercel Environment Variables.`);
                                    console.error(result);
                                }
                            } catch (err: any) {
                                alert(`CRITICAL FAILURE:\n\n${err.message}`);
                            }
                        }}
                    >
                        <Database className="h-4 w-4" />
                        Test Connection
                    </Button>
                )}

                <Button
                    variant="outline"
                    className="gap-2 border-primary/20 hover:bg-primary/10"
                    onClick={handleExportOnly}
                >
                    <Download className="h-4 w-4" />
                    Export All Data
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justification-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => {
                                    if (d) {
                                        setDate(d)
                                        setIsCalendarOpen(false)
                                    }
                                }}
                                initialFocus
                                disabled={(date) => date > new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                    {existingAttendance && (
                        <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-md border border-green-200">
                            {isHoliday ? 'Relax! It\'s a Holiday 🏖️' : 'Saved to MongoDB'}
                        </span>
                    )}
                    <Button
                        variant={isHoliday ? "default" : "outline"}
                        onClick={() => setIsHoliday(!isHoliday)}
                        className={cn("ml-2", isHoliday && "bg-purple-600 hover:bg-purple-700")}
                    >
                        {isHoliday ? "Unmark Holiday" : "Mark as Holiday"}
                    </Button>

                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {!loading && students.length === 0 && (
                <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium">No Members Found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            No eligible members found. Please ensure users have role &apos;Member&apos;, &apos;Junior Developer&apos;, or &apos;Senior Developer&apos;.
                        </p>
                    </div>
                </div>
            )}

            {/* List */}
            {students.length > 0 && (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">S.No</TableHead>
                                <TableHead className="w-[50px]">Status</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Attendance %</TableHead>
                                <TableHead>Batch</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No matching students found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                        <TableCell className="min-w-[280px]">
                                            <RadioGroup
                                                value={attendanceState[student.id] || 'present'}
                                                onValueChange={(val) => handleStatusChange(student.id, val as any)}
                                                className="flex items-center space-x-3"
                                                disabled={isHoliday}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="present" id={`p-${student.id}`} className="text-green-600 border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`p-${student.id}`} className="text-xs text-green-700 font-medium cursor-pointer">P</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="late" id={`l-${student.id}`} className="text-orange-500 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`l-${student.id}`} className="text-xs text-orange-600 font-medium cursor-pointer">L</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="leave" id={`le-${student.id}`} className="text-purple-500 border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`le-${student.id}`} className="text-xs text-purple-600 font-medium cursor-pointer">Leave</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="absent" id={`a-${student.id}`} className="text-red-500 border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`a-${student.id}`} className="text-xs text-red-600 font-medium cursor-pointer">A</Label>
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                        <TableCell className="font-medium text-xs">{student.uniqueId}</TableCell>
                                        <TableCell className="text-sm font-medium">{student.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "font-bold text-xs px-2 py-0.5 rounded",
                                                        "bg-gray-100 text-gray-500" // Reset styles as % is not calculated yet
                                                    )}>
                                                        N/A
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{student.batch || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex justify-between items-center">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={loading || submitting || students.length === 0}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : existingAttendance ? (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Update Attendance
                        </>
                    ) : (
                        "Submit Attendance"
                    )}
                </Button>
            </div>
        </div>
    )
}
