'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Trophy, Bot, Target, Image as ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, getCountFromServer, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  date: string
  type: string
  status: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const [globalStats, setGlobalStats] = useState({ events: 0, students: 0 })
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, late: 0, absent: 0, total: 0 })
  const [uniqueClassDates, setUniqueClassDates] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch Global Stats
        const eventsColl = collection(db, "events");
        const studentsColl = collection(db, "students");

        const [eventsSnap, studentsSnap] = await Promise.all([
          getCountFromServer(eventsColl),
          getCountFromServer(studentsColl)
        ]);

        setGlobalStats({
          events: eventsSnap.data().count,
          students: studentsSnap.data().count
        });

        // Fetch unique class dates from attendance collection
        const attendanceColl = collection(db, "attendance")
        const allAttendanceSnap = await getDocs(attendanceColl)
        const uniqueDates = new Set<string>()
        allAttendanceSnap.forEach(doc => {
          const data = doc.data()
          // Get date from timestamp or date field
          if (data.date) {
            // Handle Firestore timestamp
            const dateValue = data.date.seconds
              ? new Date(data.date.seconds * 1000).toDateString()
              : new Date(data.date).toDateString()
            uniqueDates.add(dateValue)
          } else if (data.createdAt) {
            const dateValue = data.createdAt.seconds
              ? new Date(data.createdAt.seconds * 1000).toDateString()
              : new Date(data.createdAt).toDateString()
            uniqueDates.add(dateValue)
          }
        })
        setUniqueClassDates(uniqueDates.size)

        // Fetch User Attendance (for developers)
        if (user?.uid) {
          const q = query(attendanceColl, where("studentId", "==", user.uid))
          const snapshot = await getDocs(q)

          let present = 0, late = 0, absent = 0
          snapshot.forEach(doc => {
            const data = doc.data()
            const status = (data.status === true || data.status === 'present') ? 'present'
              : (data.status === 'late') ? 'late'
                : 'absent';
            if (status === 'present') present++;
            else if (status === 'late') late++;
            else absent++;
          })
          setAttendanceStats({
            present, late, absent,
            total: snapshot.size
          })
        }

      } catch (e) {
        console.error("Dashboard stats fetch error:", e);
      }
    };
    fetchStats();
  }, [user])

  useEffect(() => {
    // Listen to global events
    const eventsRef = collection(db, 'events')
    const q = query(eventsRef, orderBy('date', 'desc'), limit(5))

    const unsubscribeEvents = onSnapshot(q, (snap) => {
      const events = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[]
      setRecentEvents(events)
      setLoading(false)
    }, (error) => {
      console.error("Error fetching recent events:", error);
      setLoading(false);
    })

    return () => unsubscribeEvents()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with RAIoT today.
          </p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with RAIoT today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.events}</div>
            <p className="text-xs text-muted-foreground">
              Total organized events
            </p>
          </CardContent>
        </Card>

        {/* Attendance/Classes Card - changes based on user role */}
        <Card className="overflow-hidden relative">
          <Link href="/dashboard/attendance" className="absolute inset-0 z-10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {/* Show "My Attendance" for junior/senior developers, "Total Classes" for operations roles */}
              {user?.role === 'junior_developer' || user?.role === 'senior_developer'
                ? 'My Attendance'
                : 'Total Classes'}
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {user?.role === 'junior_developer' || user?.role === 'senior_developer' ? (
              // Developers see their attendance stats
              <>
                <div className="text-2xl font-bold">
                  {attendanceStats.present + attendanceStats.late}/{attendanceStats.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Events Attended
                </p>
                <div className="flex gap-2 mt-3 text-[10px] text-muted-foreground">
                  <span className="text-green-500">{attendanceStats.present} Present</span>
                  <span>•</span>
                  <span className="text-orange-500">{attendanceStats.late} Late</span>
                  <span>•</span>
                  <span className="text-red-500">{attendanceStats.absent} Absent</span>
                </div>
              </>
            ) : (
              // Operations/Leadership see total class count
              <>
                <div className="text-2xl font-bold">
                  {uniqueClassDates}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Classes Conducted
                </p>
                <div className="flex gap-2 mt-3 text-[10px] text-muted-foreground">
                  <span className="text-primary">View attendance records →</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Club Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.students}</div>
            <p className="text-xs text-muted-foreground">
              Total active members
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>
              Latest updates from the club
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length > 0 ? (
              <div className="space-y-4">
                {recentEvents.map((event, index) => (
                  <div key={event.id} className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No recent events</p>
              </div>
            )}
          </CardContent>
        </Card>


      </div>

      {/* Explore More Events Section */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-2xl flex items-center">
            <Calendar className="h-6 w-6 mr-3 text-primary" />
            Explore More Events
          </CardTitle>
          <CardDescription className="text-lg">
            Discover additional workshops, competitions, and seminars
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Find Your Next Adventure</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Continue your robotics journey by exploring more events and opportunities!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Browse All Events
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/projects">
                  <Target className="h-4 w-4 mr-2" />
                  View Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
