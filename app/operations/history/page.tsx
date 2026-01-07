'use client'

import { AttendanceHistory } from '@/components/operations/AttendanceHistory'

export default function AttendanceHistoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Attendance History</h2>
                <p className="text-muted-foreground">
                    View past attendance records and download reports.
                </p>
            </div>
            <AttendanceHistory />
        </div>
    )
}
