"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MapPin, Building, GraduationCap, Mail, ArrowLeft, Users, Trophy, Bot, Zap, Target, LogOut, Edit } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import ProfileTeamManagement from '@/components/ProfileTeamManagement'

interface GuestProfile {
  uid: string
  email: string
  displayName: string
  role: string
  profileData?: {
    organization?: string
    department?: string
    year?: string
    city?: string
    phone?: string
    idCardUrl?: string
  }
  createdAt: any // Firestore timestamp
  updatedAt: any // Firestore timestamp
}

interface Event {
  id: string
  title: string
  date: Date
  type: string
  status: 'registered' | 'attended' | 'completed'
}

export default function GuestProfilePage() {
  const { user, logout } = useAuth()
  const { validation, refreshValidation } = useProfileValidation()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<GuestProfile | null>(null)
  const [enrolledEvents, setEnrolledEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const previousEventsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user || user.role !== 'guest') {
      router.push('/')
      return
    }

    // Auto-refresh user data when page loads to ensure unique ID is loaded
    const autoRefreshUserData = async () => {
      try {
        console.log('🔄 Auto-refreshing user data on page load...')
        // Simple refresh by calling validation
        refreshValidation()
        console.log('🔄 User data auto-refresh completed')
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error)
      }
    }

    // Refresh after a short delay to ensure profile validation has run
    setTimeout(autoRefreshUserData, 1000)

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setProfile(userDoc.data() as GuestProfile)
        }

        // Subscribe to user's registrations in Firestore
        const registrationsRef = collection(db, 'registrations')
        const q = query(registrationsRef, where('userId', '==', user.uid))
        const registrationsUnsub = onSnapshot(q, (snap) => {
          const items: Event[] = snap.docs.map((d) => {
            const data: any = d.data()
            const dateVal: Date = data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate)
            return {
              id: data.eventId,
              title: data.eventTitle || 'Event',
              date: dateVal,
              type: data.eventType || 'workshop',
              status: data.status || 'registered',
            }
          })
          // Deduplicate events by ID
          const uniqueItems = Array.from(
            new Map(items.map(item => [item.id, item])).values()
          )
          setEnrolledEvents(uniqueItems)
        }, (error) => {
          console.error("Error fetching registrations:", error);
        })

        // Subscribe to events to handle real-time updates when events are deleted
        const eventsRef = collection(db, 'events')
        const eventsUnsub = onSnapshot(eventsRef, (snap) => {
          const existingEventIds = new Set(snap.docs.map(doc => doc.id))

          // Check for deleted events and show notification
          const currentEventIds = new Set(enrolledEvents.map(event => event.id))
          const deletedEvents = Array.from(currentEventIds).filter(id => !existingEventIds.has(id))

          if (deletedEvents.length > 0) {
            toast({
              title: "Event Cancelled",
              description: "One or more events you registered for have been cancelled.",
              variant: "destructive",
            })
          }

          // Filter out registrations for deleted events
          setEnrolledEvents(prev => prev.filter(event => existingEventIds.has(event.id)))
        }, (error) => {
          console.error("Error fetching events:", error);
        })

        return () => {
          registrationsUnsub()
          eventsUnsub()
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Initializing your robotics profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl mb-4">Profile not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      {/* Hero Header - Compact Version with Neon Border Effect */}
      <div className="relative overflow-hidden bg-zinc-900/50 border-b border-zinc-800">
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        <div className="relative w-full max-w-[95vw] mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">

            {/* Left: User Info */}
            <div className="flex items-center gap-8">
              <Avatar className="w-24 h-24 border-2 border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.2)] bg-zinc-900">
                <AvatarImage src="" />
                <AvatarFallback className="text-3xl font-bold bg-zinc-800 text-zinc-200">
                  {profile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-4">
                  {profile.displayName}
                  <Badge variant="secondary" className="bg-zinc-800 text-cyan-400 font-normal hover:bg-zinc-800 border-none px-3 py-1 text-sm shadow-sm">Guest Member</Badge>
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-2 text-base text-zinc-400">
                  <span className="flex items-center">
                    <Mail className="h-4 w-4 mr-2.5 text-cyan-500/70" />
                    {profile.email}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2.5 text-cyan-500/70" />
                    Member since {profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              {validation.isComplete && !validation.uniqueId && (
                <Button
                  onClick={async () => {
                    if (!user) {
                      toast({ title: "❌ Error", description: "Authentication required", variant: "destructive" })
                      return
                    }
                    try {
                      const { generateAndAssignUniqueId } = await import('@/lib/id-generator')
                      const uniqueId = await generateAndAssignUniqueId(user.uid)
                      toast({ title: "🎉 Basic", description: `Unique ID ${uniqueId} assigned.`, className: "bg-zinc-900 border-zinc-800 text-zinc-100" })
                      setTimeout(() => window.location.reload(), 2000)
                    } catch (error) {
                      toast({ title: "❌ Failed", description: String(error), variant: "destructive" })
                    }
                  }}
                  size="default"
                  className="bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-sm shadow-sm"
                >
                  Generate ID
                </Button>
              )}

              {validation.isComplete && validation.uniqueId && (
                <div className="flex items-center px-4 py-2.5 rounded-md bg-zinc-900/50 border border-emerald-500/30 text-zinc-300 text-sm shadow-sm font-mono tracking-wide">
                  <span className="mr-2 text-emerald-500">●</span> {validation.uniqueId}
                </div>
              )}

              <Link href="/guest/profile/edit">
                <Button variant="outline" size="default" className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm h-10 px-4 hover:border-cyan-500/30 hover:shadow-[0_0_5px_rgba(6,182,212,0.2)] transition-all">
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </Link>

              <button
                onClick={logout}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[95vw] mx-auto px-6 py-8 pb-24">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Sidebar - Profile Info (Takes 3/12 cols on large) */}
          <div className="xl:col-span-3 space-y-6">
            {/* Profile Details Compact */}
            <Card className="bg-black/40 border-cyan-500/20 shadow-sm group hover:border-cyan-500/40 transition-all duration-300">
              <CardHeader className="pb-3 pt-5 border-b border-cyan-500/10 bg-cyan-950/5">
                <CardTitle className="text-base flex items-center text-cyan-100 font-semibold uppercase tracking-wider">
                  <Target className="h-4 w-4 mr-2.5 text-cyan-400" />
                  Your Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {profile.profileData?.organization && (
                  <div className="group">
                    <div className="text-xs font-medium text-cyan-500/70 uppercase tracking-wider mb-1.5">Organization</div>
                    <div className="text-base text-zinc-200 font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2.5 text-zinc-600 group-hover:text-cyan-400 transition-colors" /> {profile.profileData.organization}
                    </div>
                  </div>
                )}
                {profile.profileData?.department && (
                  <div className="group">
                    <div className="text-xs font-medium text-cyan-500/70 uppercase tracking-wider mb-1.5">Department</div>
                    <div className="text-base text-zinc-200 font-medium flex items-center">
                      <GraduationCap className="h-4 w-4 mr-2.5 text-zinc-600 group-hover:text-cyan-400 transition-colors" /> {profile.profileData.department}
                    </div>
                  </div>
                )}
                {profile.profileData?.city && (
                  <div className="group">
                    <div className="text-xs font-medium text-cyan-500/70 uppercase tracking-wider mb-1.5">Location</div>
                    <div className="text-base text-zinc-200 font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-2.5 text-zinc-600 group-hover:text-cyan-400 transition-colors" /> {profile.profileData.city}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-lg bg-black/40 border border-cyan-500/20 shadow-sm text-center hover:bg-cyan-950/20 transition-colors">
                <div className="text-4xl font-bold text-zinc-200 mb-2">{enrolledEvents.length}</div>
                <div className="text-xs font-medium text-cyan-500/70 uppercase tracking-wider">Total Events</div>
              </div>
              <div className="p-5 rounded-lg bg-black/40 border border-cyan-500/20 shadow-sm text-center hover:bg-cyan-950/20 transition-colors">
                <div className="text-4xl font-bold text-indigo-400 mb-2">{enrolledEvents.filter(e => e.type === 'workshop').length}</div>
                <div className="text-xs font-medium text-indigo-500/70 uppercase tracking-wider">Workshops</div>
              </div>
              <div className="p-5 rounded-lg bg-black/40 border border-cyan-500/20 shadow-sm text-center hover:bg-cyan-950/20 transition-colors">
                <div className="text-4xl font-bold text-emerald-400 mb-2">{enrolledEvents.filter(e => e.type === 'competition').length}</div>
                <div className="text-xs font-medium text-emerald-500/70 uppercase tracking-wider">Contests</div>
              </div>
              <div className="p-5 rounded-lg bg-black/40 border border-cyan-500/20 shadow-sm text-center hover:bg-cyan-950/20 transition-colors">
                <div className="text-4xl font-bold text-blue-400 mb-2">{enrolledEvents.filter(e => e.type === 'seminar').length}</div>
                <div className="text-xs font-medium text-blue-500/70 uppercase tracking-wider">Seminars</div>
              </div>
            </div>
          </div>

          {/* Main Content (Takes 9/12 cols) */}
          <div className="xl:col-span-9 space-y-8">

            {/* Team Management - Always Full Width */}
            {validation.isComplete && validation.uniqueId && (
              <Card className="bg-black/40 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] backdrop-blur-sm overflow-hidden">
                <CardHeader className="py-5 border-b border-cyan-500/10 bg-cyan-950/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg text-cyan-100 font-bold tracking-tight">
                      <Users className="h-5 w-5 mr-2.5 text-cyan-400" />
                      Team Management
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <ProfileTeamManagement
                    preloadedRegistrations={enrolledEvents.map(e => ({
                      id: e.id,
                      eventId: e.id,
                      eventTitle: e.title,
                      eventType: e.type,
                      eventDate: e.date
                    }))}
                  />
                </CardContent>
              </Card>
            )}

            {/* Events Grid - Two Columns for Events to save vertical space */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Workshops Column */}
              <div className="space-y-6">
                {enrolledEvents.filter(e => e.type === 'workshop').length > 0 && (
                  <Card className="bg-black/40 border-cyan-500/20 shadow-sm h-full hover:border-cyan-500/40 transition-all">
                    <CardHeader className="py-5 border-b border-cyan-500/10 bg-cyan-950/5">
                      <CardTitle className="text-lg flex items-center text-cyan-100 font-bold">
                        <Bot className="h-5 w-5 mr-2.5 text-indigo-400" />
                        Workshops
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {enrolledEvents.filter(e => e.type === 'workshop').map((event, index) => (
                          <div key={event.id} className="group flex items-start space-x-4 p-4 rounded-lg border border-cyan-500/20 bg-zinc-900/50 hover:bg-zinc-900 hover:border-cyan-500/40 hover:shadow-sm transition-all">
                            <div className="flex-shrink-0 w-10 h-10 bg-zinc-900 border border-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-base font-semibold text-zinc-200 truncate pr-2 group-hover:text-cyan-300 transition-colors">{event.title}</h4>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-zinc-700 text-zinc-500 capitalize">{event.status}</Badge>
                              </div>
                              <div className="flex items-center text-sm text-zinc-500">
                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                {event.date.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Competitions & Seminars Column */}
              <div className="space-y-6">
                {enrolledEvents.filter(e => e.type === 'competition').length > 0 && (
                  <Card className="bg-black/40 border-cyan-500/20 shadow-sm hover:border-cyan-500/40 transition-all">
                    <CardHeader className="py-5 border-b border-cyan-500/10 bg-cyan-950/5">
                      <CardTitle className="text-lg flex items-center text-cyan-100 font-bold">
                        <Trophy className="h-5 w-5 mr-2.5 text-emerald-400" />
                        Competitions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {enrolledEvents.filter(e => e.type === 'competition').map((event, index) => (
                          <div key={event.id} className="group flex items-start space-x-4 p-4 rounded-lg border border-emerald-500/20 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/40 hover:shadow-sm transition-all">
                            <div className="flex-shrink-0 w-10 h-10 bg-zinc-900 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-base font-semibold text-zinc-200 truncate pr-2 group-hover:text-emerald-300 transition-colors">{event.title}</h4>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-zinc-700 text-zinc-500 capitalize">{event.status}</Badge>
                              </div>
                              <div className="flex items-center text-sm text-zinc-500">
                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                {event.date.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {enrolledEvents.filter(e => e.type === 'seminar').length > 0 && (
                  <Card className="bg-black/40 border-cyan-500/20 shadow-sm hover:border-cyan-500/40 transition-all">
                    <CardHeader className="py-5 border-b border-cyan-500/10 bg-cyan-950/5">
                      <CardTitle className="text-lg flex items-center text-cyan-100 font-bold">
                        <Target className="h-5 w-5 mr-2.5 text-blue-400" />
                        Seminars
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {enrolledEvents.filter(e => e.type === 'seminar').map((event, index) => (
                          <div key={event.id} className="group flex items-start space-x-4 p-4 rounded-lg border border-blue-500/20 bg-zinc-900/50 hover:bg-zinc-900 hover:border-blue-500/40 hover:shadow-sm transition-all">
                            <div className="flex-shrink-0 w-10 h-10 bg-zinc-900 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-base font-semibold text-zinc-200 truncate pr-2 group-hover:text-blue-300 transition-colors">{event.title}</h4>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-zinc-700 text-zinc-500 capitalize">{event.status}</Badge>
                              </div>
                              <div className="flex items-center text-sm text-zinc-500">
                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                {event.date.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>


            {/* Explore More - Show when user has events */}
            {enrolledEvents.length > 0 && (
              <div className="flex justify-end pt-4">
                <Link href="/events">
                  <Button variant="outline" size="default" className="bg-zinc-900 border-cyan-500/30 text-zinc-300 hover:bg-cyan-950/30 hover:text-white px-8 py-5 text-sm hover:border-cyan-500/40 hover:shadow-sm transition-all">
                    <Calendar className="mr-2 h-4 w-4 text-cyan-500" /> Explore More Events
                  </Button>
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
