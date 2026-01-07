"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttendanceMarker } from "@/components/operations/AttendanceMarker"
import { AttendanceHistory } from "@/components/operations/AttendanceHistory"

export default function AdminAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Attendance</h1>
        <p className="text-muted-foreground">Track and manage member attendance for events</p>
      </div>

      <Tabs defaultValue="mark" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-4">
          <div className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
            <AttendanceMarker />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
            <AttendanceHistory />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
