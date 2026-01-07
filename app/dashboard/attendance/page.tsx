"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, TrendingUp, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AttendanceRecord {
  eventId: string
  eventName: string
  date: string
  time: string
  location: string
  status: "present" | "absent"
  type: string
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.displayName) return

      try {
        setLoading(true)

        // 1. Fetch all events to map dates to event names
        const eventsColl = collection(db, "events")
        const eventsSnapshot = await getDocs(eventsColl)
        const eventsMap: Record<string, any> = {}
        eventsSnapshot.forEach(doc => {
          const data = doc.data()
          if (data.date) {
            eventsMap[data.date] = {
              title: data.title,
              location: data.location || "Campus",
              type: data.type || "event",
              time: data.time || "All Day"
            }
          }
        })

        // 2. Fetch attendance records for this user
        const attendanceColl = collection(db, "attendance")
        // Note: Using studentName is the best bet if IDs aren't linked. 
        // Ideally we'd link by studentId == user.uid if that link exists.
        // Falling back to Name as requested.
        const q = query(attendanceColl, where("studentName", "==", user.displayName))
        const snapshot = await getDocs(q)

        const records: AttendanceRecord[] = []
        snapshot.forEach(doc => {
          const data = doc.data()
          const dateStr = data.dateStr
          const eventInfo = eventsMap[dateStr]

          records.push({
            eventId: doc.id,
            eventName: eventInfo ? eventInfo.title : "Daily Session",
            date: dateStr,
            time: eventInfo ? eventInfo.time : "N/A",
            location: eventInfo ? eventInfo.location : "Campus",
            status: data.status,
            type: eventInfo ? eventInfo.type : "general",
          })
        })

        // Sort by date desc
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setAttendanceRecords(records)

      } catch (error) {
        console.error("Error fetching personal attendance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [user])

  const totalEvents = attendanceRecords.length
  const presentCount = attendanceRecords.filter((record) => record.status === "present").length
  const attendanceRate = totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : 0

  const getStatusIcon = (status: string) => {
    return status === "present" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusColor = (status: string) => {
    return status === "present" ? "bg-green-500" : "bg-red-500"
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track your participation in RAIoT events and activities</p>
      </div>

      {/* Attendance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">Events you were invited to</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
            <p className="text-xs text-muted-foreground">Events you attended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">Overall attendance rate</p>
          </CardContent>
        </Card>
      </div>

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
