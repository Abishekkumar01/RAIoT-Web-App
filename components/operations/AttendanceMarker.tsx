"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, Loader2, Search, AlertCircle, Download } from "lucide-react"
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
import { collection, getDocs, query, where, writeBatch, doc, Timestamp, getDoc, setDoc } from "firebase/firestore"
import { toast } from "sonner"


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
    const [date, setDate] = useState<Date>(new Date())
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

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

    const fetchStudents = async () => {
        try {
            setLoading(true)
            // Fetch users with role 'member'
            // Fetch users with eligible roles
            const q = query(collection(db, "users"), where("role", "in", ["member", "junior_developer", "senior_developer"]))
            const snapshot = await getDocs(q)

            // Fetch attendance stats for calculation
            const attendanceQuery = query(collection(db, "attendance")); // Might be heavy, optimize later if needed
            const attendanceSnap = await getDocs(attendanceQuery);
            const stats: Record<string, number> = {};
            const sessions = new Set<string>();

            attendanceSnap.forEach(doc => {
                const data = doc.data();
                if (data.dateStr) sessions.add(data.dateStr);
                if (data.studentId && (data.status === 'present' || data.status === 'late')) {
                    stats[data.studentId] = (stats[data.studentId] || 0) + 1;
                }
            });
            const totalSessions = sessions.size;

            const fetched: Student[] = []

            snapshot.forEach((doc) => {
                const data = doc.data()
                const presentCount = stats[doc.id] || 0;
                const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

                fetched.push({
                    id: doc.id, // User UID
                    uniqueId: data.uniqueId || data.profileData?.rollNumber || 'N/A',
                    name: data.displayName || 'Unknown',
                    batch: data.profileData?.year ? `${data.profileData.year} - ${data.profileData.branch || ''}` : 'General',
                    attendanceRate: rate,
                    presentCount: presentCount,
                    totalSessions: totalSessions
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

    // Check for existing attendance when date changes
    useEffect(() => {
        const checkExisting = async () => {
            if (!date) return
            try {
                const dateStr = format(date, 'yyyy-MM-dd')
                const q = query(
                    collection(db, "attendance"),
                    where("dateStr", "==", dateStr)
                )
                const snapshot = await getDocs(q)

                // Prepare defaults (all present)
                const defaults: Record<string, 'present' | 'absent' | 'late' | 'leave'> = {}
                students.forEach(s => defaults[s.id] = 'present')

                // First check if it's a holiday
                const summaryDoc = await getDoc(doc(db, "attendance_summaries", dateStr))
                if (summaryDoc.exists()) {
                    const data = summaryDoc.data()
                    if (data.type === 'holiday') {
                        setIsHoliday(true)
                        setExistingAttendance(true)
                        setAttendanceState(defaults)
                        return;
                    }
                    // Load class details if they exist
                    setClassDetails({
                        subject: data.subject || '',
                        timeRange: data.timeRange || '',
                        location: data.location || ''
                    })
                } else {
                    setIsHoliday(false)
                    // Reset details for new date
                    setClassDetails({ subject: '', timeRange: '', location: '' })
                }

                if (!snapshot.empty) {
                    setExistingAttendance(true)
                    // Load existing state
                    const existing: Record<string, 'present' | 'absent' | 'late' | 'leave'> = {}
                    snapshot.forEach(doc => {
                        const data = doc.data()
                        if (data.studentId) {
                            if (data.status === 'present' || data.status === true) {
                                existing[data.studentId] = 'present'
                            } else if (data.status === 'late') {
                                existing[data.studentId] = 'late'
                            } else if (data.status === 'leave') {
                                existing[data.studentId] = 'leave'
                            } else {
                                existing[data.studentId] = 'absent'
                            }
                        }
                    })
                    // Merge existing into defaults (don't use prev)
                    setAttendanceState({ ...defaults, ...existing })
                } else {
                    setExistingAttendance(false)
                    // If switching to a new date without records, reset state to defaults
                    setAttendanceState(defaults)
                }
            } catch (error) {
                console.error("Error checking attendance:", error)
            }
        }
        checkExisting()
    }, [date, students.length]) // check when date changes or students loaded

    const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
        // if (existingAttendance) return // Removed restriction to allow editing
        setAttendanceState(prev => ({
            ...prev,
            [studentId]: status
        }))
    }

    const handleSubmit = async () => {
        if (!date || !user) return

        try {
            setSubmitting(true)
            const dateStr = format(date, 'yyyy-MM-dd')
            const timestamp = Timestamp.now()

            // If Holiday, save summary only and return
            if (isHoliday) {
                const batch = writeBatch(db)
                const summaryRef = doc(db, "attendance_summaries", dateStr)
                batch.set(summaryRef, {
                    dateStr,
                    date: Timestamp.fromDate(date),
                    markedBy: user.uid,
                    updatedAt: timestamp,
                    type: 'holiday',
                    totalStudents: students.length
                })
                await batch.commit()
                setExistingAttendance(true)
                toast.success("Marked as Holiday")
                setSubmitting(false)
                return
            }

            // Normal Attendance - Batch Chunking
            // limit is 500, keeping it safe at 400
            const BATCH_SIZE = 400
            const chunks = []

            for (let i = 0; i < students.length; i += BATCH_SIZE) {
                chunks.push(students.slice(i, i + BATCH_SIZE))
            }

            // Process student batches
            for (const chunk of chunks) {
                const batch = writeBatch(db)
                chunk.forEach(student => {
                    const status = attendanceState[student.id] || 'present'
                    const recordId = `${dateStr}_${student.id}`
                    const ref = doc(db, "attendance", recordId)

                    batch.set(ref, {
                        dateStr,
                        date: Timestamp.fromDate(date),
                        studentId: student.id,
                        studentName: student.name,
                        studentUniqueId: student.uniqueId || '',
                        status: status,
                        markedBy: user.uid,
                        timestamp
                    })
                })
                await batch.commit()
            }

            // Final step: Update Summary
            const summaryBatch = writeBatch(db)
            const summaryRef = doc(db, "attendance_summaries", dateStr)
            const presentCount = Object.values(attendanceState).filter(s => s === 'present').length
            const lateCount = Object.values(attendanceState).filter(s => s === 'late').length
            const leaveCount = Object.values(attendanceState).filter(s => s === 'leave').length
            const absentCount = students.length - presentCount - lateCount - leaveCount

            summaryBatch.set(summaryRef, {
                dateStr,
                date: Timestamp.fromDate(date),
                markedBy: user.uid,
                updatedAt: timestamp,
                type: 'regular',
                totalStudents: students.length,
                totalPresent: presentCount,
                totalLate: lateCount,
                totalLeave: leaveCount,
                totalAbsent: absentCount,
                // Class Details
                subject: classDetails.subject,
                timeRange: classDetails.timeRange,
                location: classDetails.location
            })

            await summaryBatch.commit()

            setExistingAttendance(true)
            await fetchStudents() // Refresh to update "Attendance %" and counts immediately
            toast.success("Attendance submitted successfully")
        } catch (error) {
            console.error("Error submitting attendance:", error)
            toast.error("Failed to submit attendance")
        } finally {
            setSubmitting(false)
        }
    }

    const handlePublishClass = async () => {
        if (!date || !user) return
        if (!classDetails.subject || !classDetails.timeRange) {
            toast.error("Please enter Subject and Time Range")
            return
        }

        try {
            setSubmitting(true)
            const dateStr = format(date, 'yyyy-MM-dd')
            const summaryRef = doc(db, "attendance_summaries", dateStr)

            const batch = writeBatch(db)

            // 1. Set the Summary (Publish Class Info)
            batch.set(summaryRef, {
                dateStr,
                date: Timestamp.fromDate(date),
                updatedAt: Timestamp.now(),
                markedBy: user.uid,
                subject: classDetails.subject,
                timeRange: classDetails.timeRange,
                location: classDetails.location,
                type: 'regular'
            }, { merge: true })



            await batch.commit()

            // Update local state - Keep existing attendance state if any
            // setExistingAttendance(false) // Don't reset this flag
            // setAttendanceState({}) // Don't clear local state
            await fetchStudents() // Refresh to sync
            toast.success("Class Published successfully!")
        } catch (error) {
            console.error("Error publishing class:", error)
            toast.error("Failed to publish class")
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = async () => {
        if (!date || !user) return
        if (!confirm("Are you sure you want to reset attendance for this day? This will clear all present/absent marks.")) return

        try {
            setSubmitting(true)
            const dateStr = format(date, 'yyyy-MM-dd')
            const summaryRef = doc(db, "attendance_summaries", dateStr)
            const batch = writeBatch(db)

            // 1. Reset Summary counts but keep class info
            batch.set(summaryRef, {
                dateStr,
                date: Timestamp.fromDate(date),
                updatedAt: Timestamp.now(),
                markedBy: user.uid,
                totalPresent: 0,
                totalLate: 0,
                totalLeave: 0,
                totalAbsent: 0,
                // Keep Class Details
                subject: classDetails.subject,
                timeRange: classDetails.timeRange,
                location: classDetails.location,
                type: 'regular'
            }, { merge: true })

            // 2. Delete all attendance records for this date
            const q = query(collection(db, "attendance"), where("dateStr", "==", dateStr))
            const snapshot = await getDocs(q)
            snapshot.forEach((doc) => {
                batch.delete(doc.ref)
            })

            await batch.commit()

            // 3. Reset Local State
            setAttendanceState({})
            setExistingAttendance(false)
            await fetchStudents()
            toast.success("Attendance reset for this date.")

        } catch (error) {
            console.error("Error resetting attendance:", error)
            toast.error("Failed to reset attendance")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDownloadReport = () => {
        if (!date) return

        // Combine student data with current attendance state
        const reportData = students.map(student => ({
            "Student ID": student.uniqueId,
            "Name": student.name,
            "Batch": student.batch,
            "Status": attendanceState[student.id] || "absent",
            "Date": format(date, 'yyyy-MM-dd')
        }))

        const dateStr = format(date, 'yyyy-MM-dd')
        const rows = [
            ["Student ID", "Name", "Batch", "Status", "Date"],
            ...reportData.map(r => [r["Student ID"], r["Name"], r["Batch"], r["Status"], r["Date"]])
        ]

        let csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Report downloaded")
    }

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
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
                            Publish Class
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Popover>
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
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                                disabled={(date) => date > new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                    {existingAttendance && (
                        <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-md border border-green-200">
                            {isHoliday ? 'Relax! It\'s a Holiday 🏖️' : 'Submitted (Editable)'}
                        </span>
                    )}
                    <Button
                        variant={isHoliday ? "default" : "outline"}
                        onClick={() => setIsHoliday(!isHoliday)}
                        className={cn("ml-2", isHoliday && "bg-purple-600 hover:bg-purple-700")}
                    >
                        {isHoliday ? "Unmark Holiday" : "Mark as Holiday"}
                    </Button>

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleReset}
                        className="ml-2"
                        title="Clear formatted attendance"
                    >
                        Reset
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
                    {/* Download Button */}
                    <Button variant="outline" size="icon" onClick={handleDownloadReport} title="Download Daily Report">
                        <Download className="h-4 w-4" />
                    </Button>


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
                                                        (student.attendanceRate || 0) >= 75 ? "bg-green-500/10 text-green-500" : (student.attendanceRate || 0) >= 60 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                                                    )}>
                                                        {student.attendanceRate || 0}%
                                                    </span>
                                                    <span className="text-xs font-medium text-zinc-400">
                                                        {student.presentCount || 0}/{student.totalSessions || 0} Attended
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
