'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Trophy, Bot, Target, Image as ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, getCountFromServer, orderBy, limit } from 'firebase/firestore'
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
  const [galleryStats, setGalleryStats] = useState({ totalSections: 0, totalImages: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch Gallery Stats
        fetch('/api/gallery-stats')
          .then(res => res.json())
          .then(data => {
            if (data && !data.error) setGalleryStats(data);
          });

        // Fetch Global Stats (Client Side with Auth)
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

      } catch (e) {
        console.error("Dashboard stats fetch error:", e);
      }
    };
    fetchStats();
  }, [])

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gallery Updates
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{galleryStats.totalSections}</div>
            <p className="text-xs text-muted-foreground">
              Sections, {galleryStats.totalImages} Images
            </p>
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
