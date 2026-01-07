'use client'

import { AttendanceMarker } from '@/components/operations/AttendanceMarker'

export default function MarkAttendancePage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Mark Attendance</h2>
                <p className="text-muted-foreground">
                    Select a date and mark student attendance.
                </p>
            </div>
            <AttendanceMarker />
        </div>
    )
}
