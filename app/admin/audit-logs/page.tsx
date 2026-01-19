
"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2 } from "lucide-react" // Assuming FileText is available, otherwise generic
import { format } from "date-fns"

interface AuditLog {
    id: string
    action: string
    resourceType: string
    resourceId: string
    userId: string
    userName: string
    timestamp: Timestamp
    metadata?: any
    userAgent?: string
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = async () => {
        setLoading(true)
        try {
            // Fetch last 100 logs for now
            const q = query(
                collection(db, "audit_logs"),
                orderBy("timestamp", "desc"),
                limit(100)
            )
            const snapshot = await getDocs(q)
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AuditLog[]
            setLogs(data)
        } catch (error) {
            console.error("Error fetching logs:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const downloadCSV = () => {
        if (logs.length === 0) return

        const headers = ["Timestamp", "Action", "User Name", "User ID", "Resource Type", "Resource ID", "Metadata"]
        const rows = logs.map(log => {
            const date = log.timestamp?.toDate ? format(log.timestamp.toDate(), "yyyy-MM-dd HH:mm:ss") : "N/A"
            const metadataStr = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : ""

            return [
                date,
                log.action,
                `"${log.userName}"`,
                log.userId,
                log.resourceType,
                log.resourceId,
                `"${metadataStr}"`
            ].join(",")
        })

        const csvContent = [headers.join(","), ...rows].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `audit_logs_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">Track all critical system actions and data changes.</p>
                </div>
                <Button onClick={downloadCSV} disabled={loading || logs.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Activity</CardTitle>
                    <CardDescription>Showing the most recent 100 actions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Resource</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No audit logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), "MMM dd, HH:mm") : "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{log.action}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{log.userName}</span>
                                                    <span className="text-xs text-muted-foreground">{log.userId.slice(0, 8)}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="capitalize text-sm">{log.resourceType}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{log.resourceId.slice(0, 8)}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-xs font-mono text-muted-foreground">
                                                {log.metadata ? JSON.stringify(log.metadata) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
