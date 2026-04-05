"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, TrendingUp, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { AttendanceChart } from "./AttendanceChart"
import { getStudentAttendanceRecords } from "@/app/actions/attendanceActions"

interface AttendanceRecord {
  eventId: string
  eventName: string
  date: string
  time: string
  location: string
  status: "present" | "absent" | "late" | "leave"
  type: string
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.uid) return

      try {
        setLoading(true)

        // Fetch detailed records
        const recordsResult = await getStudentAttendanceRecords(user.uid);
        if (recordsResult.success && recordsResult.data) {
          const records: AttendanceRecord[] = recordsResult.data.map((r: any) => ({
            eventId: r.eventId,
            eventName: r.eventName || "Daily Session",
            date: r.date,
            time: r.time || "N/A",
            location: r.location || "Campus",
            status: r.status,
            type: r.type || "general",
          }));
          setAttendanceRecords(records);
        }

        // We can optionally fetch the aggregated stats here too if we want to ensure
        // the chart perfectly matches the aggregation logic, but calculating it from
        // the records array is also fine and saves a network request.

      } catch (error) {
        console.error("Error fetching attendance details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [user])


  const totalEvents = attendanceRecords.length
  const presentCount = attendanceRecords.filter((record) => record.status === "present").length
  const lateCount = attendanceRecords.filter((record) => record.status === "late").length
  const absentCount = attendanceRecords.filter((record) => record.status === "absent").length
  const leaveCount = attendanceRecords.filter((record) => record.status === "leave").length

  const getStatusIcon = (status: string) => {
    return status === "present" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : status === "late" ? (
      <AlertCircle className="h-4 w-4 text-orange-500" />
    ) : status === "leave" ? (
      <AlertCircle className="h-4 w-4 text-purple-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusColor = (status: string) => {
    return status === "present" ? "bg-green-500" : status === "late" ? "bg-orange-500" : status === "leave" ? "bg-purple-500" : "bg-red-500"
  }

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes("workshop")) return "bg-blue-500"
    if (t.includes("competition")) return "bg-red-500"
    if (t.includes("seminar")) return "bg-green-500"
    return "bg-gray-500"
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Operations/Leadership roles don't have attendance tracked - show different content
  const isOperationsRole = user?.role && ![
    'junior_developer',
    'senior_developer',
    'member',
    'trainee',
    'guest'
  ].includes(user.role)

  if (isOperationsRole) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Overview</h1>
          <p className="text-muted-foreground">View club attendance and class records</p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Leadership Dashboard</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              As a {user?.role?.replace(/_/g, ' ')}, your attendance is not tracked.
              You can manage and mark attendance for club members from the Operations portal.
            </p>
            <a
              href="/operations/attendance"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Attendance Management →
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track your participation in RAIoT events and activities</p>
      </div>

      {/* Attendance Chart */}
      <AttendanceChart
        present={presentCount}
        late={lateCount}
        absent={absentCount}
        leave={leaveCount}
        total={totalEvents}
      />

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Your participation record in RAIoT events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
            ) : (
              attendanceRecords.map((record) => (
                <div
                  key={record.eventId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(record.status)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{record.eventName}</h3>
                        <Badge className={`${getTypeColor(record.type)} text-white text-xs`}>
                          {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {record.date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {record.time}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {record.location}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(record.status)} text-white`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
