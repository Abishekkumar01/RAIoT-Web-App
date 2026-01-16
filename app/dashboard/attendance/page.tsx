"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, TrendingUp, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AttendanceChart } from "./AttendanceChart"

interface AttendanceRecord {
  eventId: string
  eventName: string
  date: string
  time: string
  location: string
  status: "present" | "absent" | "late"
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

        if (!user?.uid) return

        // 2. Fetch attendance records for this user by UID (Real-time)
        const attendanceColl = collection(db, "attendance")
        const q = query(attendanceColl, where("studentId", "==", user.uid))

        const unsubscribe = onSnapshot(q, (snapshot) => {
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
              status: (data.status === true || data.status === 'present') ? 'present'
                : (data.status === 'late') ? 'late'
                  : 'absent',
              type: eventInfo ? eventInfo.type : "general",
            })
          })

          // Sort by date desc
          records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          setAttendanceRecords(records)
          setLoading(false)
        }, (error) => {
          console.error("Error fetching personal attendance:", error)
          setLoading(false)
        })

        return () => unsubscribe()

      } catch (error) {
        console.error("Error setting up attendance listener:", error)
        setLoading(false) // Stop main loading state if setup fails
      }
    }

    fetchAttendance()
  }, [user])

  const totalEvents = attendanceRecords.length
  const presentCount = attendanceRecords.filter((record) => record.status === "present").length
  const lateCount = attendanceRecords.filter((record) => record.status === "late").length
  const absentCount = attendanceRecords.filter((record) => record.status === "absent").length

  const getStatusIcon = (status: string) => {
    return status === "present" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : status === "late" ? (
      <AlertCircle className="h-4 w-4 text-orange-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusColor = (status: string) => {
    return status === "present" ? "bg-green-500" : status === "late" ? "bg-orange-500" : "bg-red-500"
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
