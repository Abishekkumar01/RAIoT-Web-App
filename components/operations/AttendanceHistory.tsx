"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { format, parseISO } from "date-fns"
import { expandCSV, downloadCSV } from "@/lib/excel-utils"
import { toast } from "sonner"
import { getAttendanceSummaries, getAttendanceDetailsByDate } from "@/app/actions/attendanceActions"

interface AttendanceSummary {
    id: string
    dateStr: string
    date: { toDate: () => Date }
    totalStudents: number
    totalPresent: number
    totalAbsent: number
    type?: 'regular' | 'holiday'
}

export function AttendanceHistory() {
    const [summaries, setSummaries] = useState<AttendanceSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState<string | null>(null)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true)
                const result = await getAttendanceSummaries()
                if (result.success && result.data) {
                    // Re-instantiate the toDate method since serialization loses it
                    const formattedData = result.data.map((item: any) => ({
                        ...item,
                        date: { toDate: () => parseISO(item.dateStr) }
                    }))
                    setSummaries(formattedData)
                } else {
                    toast.error(result.error || "Failed to fetch history")
                }
            } catch (error) {
                console.error("Error fetching history:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()
    }, [])

    const handleDownload = async (dateStr: string) => {
        try {
            setDownloading(dateStr)
            const result = await getAttendanceDetailsByDate(dateStr)

            if (!result.success || !result.data) {
                toast.error(result.error || "No detailed records found.")
                return
            }

            const data = result.data
            const records: any[] = []

            if (data.type === 'holiday') {
                records.push({
                    Date: data.date,
                    Status: 'Holiday',
                    Note: 'Public Holiday / No Class'
                })
            } else {
                data.records.forEach((r: any) => {
                    records.push({
                        Date: data.date,
                        StudentID: r.studentUniqueId,
                        Name: r.studentName,
                        Status: r.status,
                        MarkedTime: r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'N/A'
                    })
                })
            }

            if (records.length === 0) {
                toast.error("No detailed records found.")
                return
            }

            // Sort by name if alphabetical
            if (data.type !== 'holiday') {
                records.sort((a, b) => a.Name.localeCompare(b.Name))
            }

            const csvContent = expandCSV(records)
            downloadCSV(csvContent, `attendance_${dateStr}.csv`)
            toast.success("Downloaded successfully")
        } catch (error) {
            console.error("Download error:", error)
            toast.error("Failed to download report")
        } finally {
            setDownloading(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Total Students</TableHead>
                            <TableHead className="text-green-600">Present</TableHead>
                            <TableHead className="text-red-600">Absent</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : summaries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No attendance records found in MongoDB.
                                </TableCell>
                            </TableRow>
                        ) : (
                            summaries.map((item) => (
                                <TableRow key={item.id} className={item.type === 'holiday' ? "opacity-60 bg-muted/30" : ""}>
                                    <TableCell className="font-medium">
                                        {format(item.date.toDate(), "PPP")}
                                    </TableCell>
                                    <TableCell className="capitalize">{item.type || 'regular'}</TableCell>
                                    <TableCell>{item.totalStudents}</TableCell>
                                    <TableCell className="text-green-600 font-medium">{item.totalPresent}</TableCell>
                                    <TableCell className="text-red-600 font-medium">{item.totalAbsent}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownload(item.dateStr)}
                                            disabled={downloading === item.dateStr}
                                        >
                                            {downloading === item.dateStr ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                            )}
                                            <span className="sr-only">Download</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
