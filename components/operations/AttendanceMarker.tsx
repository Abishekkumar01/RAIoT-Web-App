"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, Loader2, Search, Upload, Download, FileSpreadsheet } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, writeBatch, doc, Timestamp, getDoc } from "firebase/firestore"
import { toast } from "sonner"
import { parseCSV, expandCSV, downloadCSV } from "@/lib/excel-utils"
import * as XLSX from "xlsx"

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
    const [importing, setImporting] = useState(false)

    // Map of studentId -> isPresent
    const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({})
    const [existingAttendance, setExistingAttendance] = useState<boolean>(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchStudents = async () => {
        try {
            setLoading(true)
            const q = query(collection(db, "students"))
            const snapshot = await getDocs(q)
            const fetched: Student[] = []
            snapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() } as Student)
            })
            setStudents(fetched)

            // Initialize all as absent (false) by default if not loading existing
            if (!existingAttendance) {
                const initial: Record<string, boolean> = {}
                fetched.forEach(s => initial[s.id] = false)
                setAttendanceState(prev => ({ ...initial, ...prev })) // Keep prev if any was manually set
            }
        } catch (error) {
            console.error("Error fetching students:", error)
            toast.error("Failed to load student list")
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
                    const existing: Record<string, boolean> = {}
                    snapshot.forEach(doc => {
                        const data = doc.data()
                        if (data.studentId) {
                            existing[data.studentId] = data.status === 'present'
                        }
                    })
                    setAttendanceState(prev => ({ ...prev, ...existing }))
                } else {
                    setExistingAttendance(false)
                    // If switching to a new date without records, reset state
                    if (students.length > 0) {
                        const reset: Record<string, boolean> = {}
                        students.forEach(s => reset[s.id] = false)
                        setAttendanceState(reset)
                    }
                }
            } catch (error) {
                console.error("Error checking attendance:", error)
            }
        }
        checkExisting()
    }, [date, students.length]) // check when date changes or students loaded

    const handleToggle = (studentId: string) => {
        if (existingAttendance) return // Read-only if already submitted
        setAttendanceState(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }))
    }

    const handleSubmit = async () => {
        if (!date || !user) return
        if (existingAttendance) {
            toast.error("Attendance for this date has already been submitted.")
            return
        }

        try {
            setSubmitting(true)
            const batch = writeBatch(db)
            const dateStr = format(date, 'yyyy-MM-dd')
            const timestamp = Timestamp.now()

            students.forEach(student => {
                const isPresent = attendanceState[student.id]
                const recordId = `${dateStr}_${student.id}`
                const ref = doc(db, "attendance", recordId)

                batch.set(ref, {
                    dateStr,
                    date: Timestamp.fromDate(date),
                    studentId: student.id,
                    studentName: student.name,
                    studentUniqueId: student.uniqueId || '',
                    status: isPresent ? 'present' : 'absent',
                    markedBy: user.uid,
                    timestamp
                })
            })

            // Create summary document
            const summaryRef = doc(db, "attendance_summaries", dateStr)
            batch.set(summaryRef, {
                dateStr,
                date: Timestamp.fromDate(date),
                markedBy: user.uid,
                updatedAt: timestamp,
                totalStudents: students.length,
                totalPresent: Object.values(attendanceState).filter(v => v).length,
                totalAbsent: students.length - Object.values(attendanceState).filter(v => v).length
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setImporting(true)
            let parsedData: any[] = []

            if (file.name.endsWith('.csv')) {
                const text = await file.text()
                parsedData = parseCSV(text)
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Array of arrays

                // Transform array of arrays to object
                if (jsonData.length > 0) {
                    // Assume first row is header if contains "Name" or "ID"
                    const headers = (jsonData[0] as string[]).map(h => h.toString().toLowerCase());
                    const hasHeader = headers.some(h => h.includes('name') || h.includes('id'));
                    const startIndex = hasHeader ? 1 : 0;

                    for (let i = startIndex; i < jsonData.length; i++) {
                        const row = jsonData[i] as any[];
                        if (!row || row.length === 0) continue;

                        // Map based on position: 0=ID, 1=Name, 2=Batch
                        // Or try to map by header if available? For robustness, let's stick to positional for now
                        // as per example: ID, Name, Batch
                        if (row[0] && row[1]) {
                            parsedData.push({
                                uniqueId: row[0].toString(),
                                name: row[1].toString(),
                                batch: row[2] ? row[2].toString() : 'General'
                            })
                        }
                    }
                }
            } else {
                toast.error("Unsupported file type")
                return
            }

            if (parsedData.length === 0) {
                toast.error("No valid data found in file")
                return
            }

            const batch = writeBatch(db)
            parsedData.forEach((student: any) => {
                // Determine ID: use uniqueId if available, else auto-gen
                const ref = student.uniqueId
                    ? doc(db, "students", student.uniqueId)
                    : doc(collection(db, "students"))

                batch.set(ref, {
                    uniqueId: student.uniqueId || ref.id,
                    name: student.name,
                    batch: student.batch || 'General',
                    active: true,
                    updatedAt: Timestamp.now()
                })
            })

            await batch.commit()
            toast.success(`Successfully imported ${parsedData.length} students`)
            await fetchStudents() // Refresh list
        } catch (error) {
            console.error("Import error:", error)
            toast.error("Failed to import students")
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDownloadReport = () => {
        if (!date) return

        // Combine student data with current attendance state
        const reportData = students.map(student => ({
            "Student ID": student.uniqueId,
            "Name": student.name,
            "Batch": student.batch,
            "Status": attendanceState[student.id] ? "Present" : "Absent",
            "Date": format(date, 'yyyy-MM-dd')
        }))

        const dateStr = format(date, 'yyyy-MM-dd')
        const csvContent = expandCSV(reportData)
        downloadCSV(csvContent, `attendance_report_${dateStr}.csv`)
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
                        <span className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
                            View Only (Submitted)
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

            {/* Empty State / Import Action */}
            {!loading && students.length === 0 && (
                <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileSpreadsheet className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium">No Students Found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload a CSV file to populate the student list.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Format: csv/xlsx/xls. Header: ID, Name, Batch
                        </p>
                    </div>
                    <div>
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                        >
                            {importing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                            ) : (
                                <><Upload className="mr-2 h-4 w-4" /> Upload List (CSV/Excel)</>
                            )}
                        </Button>
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
                                        <TableCell>
                                            <Checkbox
                                                checked={attendanceState[student.id] || false}
                                                onCheckedChange={() => handleToggle(student.id)}
                                                disabled={existingAttendance}
                                            />
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
                {/* Secondary Import Button (Mini) if list is populated */}
                {students.length > 0 && (
                    <div>
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                        >
                            <Upload className="mr-2 h-3 w-3" />
                            {importing ? "Importing..." : "Update List (CSV)"}
                        </Button>
                    </div>
                )}

                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={existingAttendance || loading || submitting || students.length === 0}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : existingAttendance ? (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Already Submitted
                        </>
                    ) : (
                        "Submit Attendance"
                    )}
                </Button>
            </div>
        </div>
    )
}
