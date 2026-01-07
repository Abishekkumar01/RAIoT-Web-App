"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Download, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { expandCSV, downloadCSV } from "@/lib/excel-utils"
import { toast } from "sonner"

interface AttendanceSummary {
    id: string
    dateStr: string
    date: Timestamp
    totalStudents: number
    totalPresent: number
    totalAbsent: number
}

export function AttendanceHistory() {
    const [summaries, setSummaries] = useState<AttendanceSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState<string | null>(null)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true)
                // Order by date descending
                const q = query(
                    collection(db, "attendance_summaries"),
                    orderBy("dateStr", "desc")
                )
                const snapshot = await getDocs(q)
                const data: AttendanceSummary[] = []
                snapshot.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() } as AttendanceSummary)
                })
                setSummaries(data)
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
            // Fetch detailed records for this date
            const q = query(
                collection(db, "attendance"),
                where("dateStr", "==", dateStr)
            )
            const snapshot = await getDocs(q)
            const records: any[] = []
            snapshot.forEach(doc => {
                const d = doc.data()
                records.push({
                    Date: d.dateStr,
                    StudentID: d.studentUniqueId,
                    Name: d.studentName,
                    Status: d.status,
                    MarkedTime: d.timestamp?.toDate()?.toLocaleTimeString()
                })
            })

            if (records.length === 0) {
                toast.error("No detailed records found.")
                return
            }

            // Sort by name
            records.sort((a, b) => a.Name.localeCompare(b.Name))

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
                            <TableHead>Total Students</TableHead>
                            <TableHead className="text-green-600">Present</TableHead>
                            <TableHead className="text-red-600">Absent</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : summaries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No attendance records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            summaries.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        {format(item.date.toDate(), "PPP")}
                                    </TableCell>
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
