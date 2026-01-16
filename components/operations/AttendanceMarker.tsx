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
import { collection, getDocs, query, where, writeBatch, doc, Timestamp, getDoc } from "firebase/firestore"
import { toast } from "sonner"


interface Student {
    id: string
    uniqueId: string
    name: string
    batch?: string
    status?: string // Optional status for local checking
}

export function AttendanceMarker() {
    const { user } = useAuth()
    const [date, setDate] = useState<Date>(new Date())
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Map of studentId -> status
    const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
    const [existingAttendance, setExistingAttendance] = useState<boolean>(false)

    const fetchStudents = async () => {
        try {
            setLoading(true)
            // Fetch users with role 'member'
            // Fetch users with eligible roles
            const q = query(collection(db, "users"), where("role", "in", ["member", "junior_developer", "senior_developer"]))
            const snapshot = await getDocs(q)
            const fetched: Student[] = []

            snapshot.forEach((doc) => {
                const data = doc.data()
                fetched.push({
                    id: doc.id, // User UID
                    uniqueId: data.uniqueId || data.profileData?.rollNumber || 'N/A',
                    name: data.displayName || 'Unknown',
                    batch: data.profileData?.year ? `${data.profileData.year} - ${data.profileData.branch || ''}` : 'General'
                })
            })
            setStudents(fetched)

            // Initialize all as absent by default if not loading existing
            if (!existingAttendance) {
                const initial: Record<string, 'present' | 'absent' | 'late'> = {}
                fetched.forEach(s => initial[s.id] = 'absent')
                setAttendanceState(prev => ({ ...initial, ...prev })) // Keep prev if any was manually set
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

                if (!snapshot.empty) {
                    setExistingAttendance(true)
                    // Load existing state
                    const existing: Record<string, 'present' | 'absent' | 'late'> = {}
                    snapshot.forEach(doc => {
                        const data = doc.data()
                        if (data.studentId) {
                            // Handle legacy boolean or string status
                            if (data.status === 'present' || data.status === true) {
                                existing[data.studentId] = 'present'
                            } else if (data.status === 'late') {
                                existing[data.studentId] = 'late'
                            } else {
                                existing[data.studentId] = 'absent'
                            }
                        }
                    })
                    setAttendanceState(prev => ({ ...prev, ...existing }))
                } else {
                    setExistingAttendance(false)
                    // If switching to a new date without records, reset state
                    if (students.length > 0) {
                        const reset: Record<string, 'present' | 'absent' | 'late'> = {}
                        students.forEach(s => reset[s.id] = 'absent')
                        setAttendanceState(reset)
                    }
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
        // if (existingAttendance) {
        //     toast.error("Attendance for this date has already been submitted.")
        //     return
        // }

        try {
            setSubmitting(true)
            const batch = writeBatch(db)
            const dateStr = format(date, 'yyyy-MM-dd')
            const timestamp = Timestamp.now()

            students.forEach(student => {
                const status = attendanceState[student.id] || 'absent'
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

            // Create summary document
            const summaryRef = doc(db, "attendance_summaries", dateStr)
            const presentCount = Object.values(attendanceState).filter(s => s === 'present').length
            const lateCount = Object.values(attendanceState).filter(s => s === 'late').length
            const absentCount = students.length - presentCount - lateCount

            batch.set(summaryRef, {
                dateStr,
                date: Timestamp.fromDate(date),
                markedBy: user.uid,
                updatedAt: timestamp,
                totalStudents: students.length,
                totalPresent: presentCount,
                totalLate: lateCount,
                totalAbsent: absentCount
            })

            await batch.commit()
            setExistingAttendance(true)
            toast.success("Attendance submitted successfully")
        } catch (error) {
            console.error("Error submitting attendance:", error)
            toast.error("Failed to submit attendance")
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
                            Submitted (Editable)
                        </span>
                    )}
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
                                        <TableCell className="min-w-[200px]">
                                            <RadioGroup
                                                value={attendanceState[student.id] || 'absent'}
                                                onValueChange={(val) => handleStatusChange(student.id, val as any)}
                                                className="flex items-center space-x-4"
                                            // disabled={existingAttendance} // Enable editing
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="present" id={`p-${student.id}`} className="text-green-600 border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`p-${student.id}`} className="text-xs text-green-700 font-medium cursor-pointer">Present</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="late" id={`l-${student.id}`} className="text-orange-500 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`l-${student.id}`} className="text-xs text-orange-600 font-medium cursor-pointer">Late</Label>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <RadioGroupItem value="absent" id={`a-${student.id}`} className="text-red-500 border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white" />
                                                    <Label htmlFor={`a-${student.id}`} className="text-xs text-red-600 font-medium cursor-pointer">Absent</Label>
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                        <TableCell className="font-medium">{student.uniqueId}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{student.batch || '-'}</TableCell>
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
