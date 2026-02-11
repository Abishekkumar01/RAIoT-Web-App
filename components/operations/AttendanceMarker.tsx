"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, Loader2, Search, AlertCircle, Download, Database, Trash2 } from "lucide-react"
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
import { getAttendanceByDate, saveAttendance, getAllAttendanceRecords, deleteAllAttendanceData } from '@/app/actions/attendanceActions';
import * as XLSX from 'xlsx';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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

    // Class Details State
    const [classDetails, setClassDetails] = useState({
        subject: '',
        timeRange: '',
        location: ''
    })

    // Dialog state for Clear
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

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
        if (!classDetails.subject || !classDetails.timeRange) {
            toast.error("Please enter Subject and Time Range");
            return;
        }
        handleSubmit();
    }

    // EXPORT & CLEAR FUNCTIONALITY
    const handleExportAndClear = async () => {
        try {
            // 1. Fetch All Data
            const result = await getAllAttendanceRecords();
            if (!result.success || !result.data || result.data.length === 0) {
                toast.error("No attendance data found to export.");
                return;
            }

            // 2. Export to Excel
            const ws = XLSX.utils.json_to_sheet(result.data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance_Report");
            const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success("Export successful!");

            // 3. Prompt for Clear
            setIsClearDialogOpen(true);

        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Export failed: " + error.message);
        }
    }

    const confirmClearData = async () => {
        setIsClearing(true);
        try {
            const result = await deleteAllAttendanceData();
            if (result.success) {
                toast.success("All attendance data cleared from database.");
                setIsClearDialogOpen(false);
                // Refresh current view
                window.location.reload();
            } else {
                toast.error("Failed to clear data: " + result.error);
            }
        } catch (error: any) {
            toast.error("Failed to clear: " + error.message);
        } finally {
            setIsClearing(false);
        }
    }

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">

            {/* Top Bar with Export/Clear */}
            <div className="flex justify-end mb-4">
                <Button
                    variant="outline"
                    className="gap-2 border-primary/20 hover:bg-primary/10"
                    onClick={handleExportAndClear}
                >
                    <Download className="h-4 w-4" />
                    Export All & Clear DB
                </Button>
            </div>

            {/* Class Details Inputs */}
            {!loading && !isHoliday && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject / Event Name</Label>
                        <Input
                            id="subject"
                            placeholder="e.g. Robotics 101"
                            value={classDetails.subject}
                            onChange={(e) => setClassDetails({ ...classDetails, subject: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timeRange">Time Range</Label>
                        <Input
                            id="timeRange"
                            placeholder="e.g. 10:00 AM - 11:30 AM"
                            value={classDetails.timeRange}
                            onChange={(e) => setClassDetails({ ...classDetails, timeRange: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            placeholder="e.g. Lab 3"
                            value={classDetails.location}
                            onChange={(e) => setClassDetails({ ...classDetails, location: e.target.value })}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={handlePublishClass}
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Publish / Save
                        </Button>
                    </div>
                </div>
            )}

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
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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

            {/* Clear Confirmation Dialog */}
            <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear All Database Records?</DialogTitle>
                        <DialogDescription>
                            Your Excel file should have downloaded.
                            <br /><br />
                            Are you sure you want to <strong>DELETE ALL</strong> attendance history from the database now?
                            <br />
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>Cancel (Keep Data)</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmClearData}
                            disabled={isClearing}
                        >
                            {isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Yes, Clear Database
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
