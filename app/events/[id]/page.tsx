"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle } from 'lucide-react'
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { useToast } from '@/hooks/use-toast'
import TeamManagement from '@/components/TeamManagement'

interface EventDetail {
  id: string
  title: string
  description: string
  detailedContent?: string
  date: string
  time: string
  duration: number
  location: string
  type: string
  maxParticipants?: number
  registered?: number
  minTeamSize?: number
  maxTeamSize?: number
  imageUrl?: string
  registrationDeadline?: string
  isOnline?: boolean
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const { validation } = useProfileValidation()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)

  const isDeadlinePassed = (() => {
    if (!event?.registrationDeadline) return false;
    const deadline = new Date(event.registrationDeadline);
    deadline.setHours(23, 59, 59, 999);
    return new Date() > deadline;
  })();
  const isFull = (event?.maxParticipants && event.registered && event.registered >= event.maxParticipants) || false

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventId = params.id as string
        const eventDoc = await getDoc(doc(db, 'events', eventId))

        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() } as EventDetail
          console.log('📥 Fetched event data:', {
            id: eventData.id,
            title: eventData.title,
            hasDetailedContent: !!eventData.detailedContent,
            detailedContentLength: eventData.detailedContent?.length || 0,
            detailedContentPreview: eventData.detailedContent?.substring(0, 100) || 'N/A',
            fullDetailedContent: eventData.detailedContent
          })
          setEvent(eventData)
        } else {
          toast({
            title: 'Event not found',
            description: 'The event you are looking for does not exist.',
            variant: 'destructive'
          })
          router.push('/events')
        }
      } catch (error) {
        console.error('Error fetching event:', error)
        toast({
          title: 'Error',
          description: 'Failed to load event details.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchEvent()
    }
  }, [params.id, router, toast])

  // Check if user is registered
  useEffect(() => {
    if (!user || !event) return

    const registrationsQuery = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid),
      where('eventId', '==', event.id)
    )

    const unsubscribe = onSnapshot(registrationsQuery, (snapshot) => {
      setIsRegistered(!snapshot.empty)
    })

    return () => unsubscribe()
  }, [user, event])

  // Subscribe to event updates for registration count
  useEffect(() => {
    if (!event) return

    const unsubscribe = onSnapshot(doc(db, 'events', event.id), (doc) => {
      if (doc.exists()) {
        const updatedData = doc.data()
        setEvent(prev => prev ? { ...prev, registered: updatedData.registered } : null)
        console.log('🔄 Event registration count updated:', updatedData.registered)
      }
    })

    return () => unsubscribe()
  }, [event])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return timeString
    }
  }

  // Render HTML content safely
  const renderContent = (content: string) => {
    // Simple HTML rendering - in production, use a proper sanitizer
    return { __html: content }
  }

  const handleRegister = async () => {
    if (!user || !event) return

    // Check if event is offline
    if (event.isOnline === false) {
      toast({
        title: "Event Offline",
        description: "This event is currently offline. Registration is not available.",
        variant: "destructive",
      })
      return
    }

    // Check if deadline passed
    if (isDeadlinePassed) {
      toast({
        title: "Registration Closed",
        description: "The registration deadline for this event has passed.",
        variant: "destructive",
      })
      return
    }

    // Check profile completion (skip for admins)
    if (!validation.isComplete && user.role !== 'admin' && user.role !== 'superadmin') {
      toast({
        title: "Profile Incomplete",
        description: `Please complete your profile first. Missing: ${validation.missingFields.join(', ')}`,
        variant: "destructive",
      })
      if (user.role === 'guest') {
        router.push('/guest/profile/edit')
      } else {
        router.push('/dashboard/profile')
      }
      return
    }

    // Check if already registered
    if (isRegistered) {
      toast({
        title: "Already Registered",
        description: "You have already registered for this event.",
        variant: "destructive",
      })
      return
    }

    // Check if event is full
    if (event.maxParticipants && event.registered && event.registered >= event.maxParticipants) {
      toast({
        title: "Event Full",
        description: "This event has reached its maximum capacity.",
        variant: "destructive",
      })
      return
    }

    try {
      const batch = writeBatch(db)

      // Create registration document
      const registrationRef = doc(collection(db, 'registrations'))
      batch.set(registrationRef, {
        userId: user.uid,
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        eventDate: event.date,
        status: 'registered',
        createdAt: new Date(),
      })

      // Update event participant count
      const eventRef = doc(db, 'events', event.id)
      batch.update(eventRef, {
        registered: increment(1)
      })

      // Commit the batch
      await batch.commit()

      toast({
        title: "Registration Successful",
        description: `You have successfully registered for ${event.title}`,
      })
    } catch (error) {
      console.error('Registration failed:', error)
      toast({
        title: "Registration Failed",
        description: `Failed to register for event. Please try again.`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">Loading event details...</div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">Event not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <div className="w-full px-3 sm:px-4 md:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Event Image */}
              {event.imageUrl && (
                <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-gray-800">
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Event Title */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.type === 'workshop' ? 'bg-blue-500/20 text-blue-400' :
                    event.type === 'seminar' ? 'bg-purple-500/20 text-purple-400' :
                      event.type === 'competition' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                    }`}>
                    {event.type.toUpperCase()}
                  </span>
                  {isFull && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                      FULL
                    </span>
                  )}
                </div>
              </div>

              {/* Event Description */}
              {event.description && (
                <Card className="p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">About This Event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">{event.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Content */}
              {event.detailedContent && event.detailedContent.trim() !== '' && (
                <Card className="p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-ul:text-muted-foreground prose-li:text-muted-foreground prose-sm"
                      dangerouslySetInnerHTML={renderContent(event.detailedContent)}
                      style={{
                        lineHeight: '1.6',
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
              <Card className="p-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">{formatDate(event.date)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(event.time)} ({event.duration} hours)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Capacity</p>
                      <p className="text-sm text-muted-foreground">
                        {event.maxParticipants
                          ? `${event.registered ?? 0} / ${event.maxParticipants} registered`
                          : 'Unlimited'
                        }
                      </p>
                    </div>
                  </div>

                  {event.registrationDeadline && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Registration Deadline</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.registrationDeadline)}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.minTeamSize && event.maxTeamSize && (
                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Team Size</p>
                        <p className="text-sm text-muted-foreground">
                          {event.minTeamSize} - {event.maxTeamSize} members
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Registration Section */}
              {user && (
                <Card className="p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Registration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isRegistered ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-green-900">Registration Confirmed</h3>
                                <p className="text-green-700">You are successfully registered for {event.title}!</p>
                                <div className="mt-2 text-sm text-green-800/80 flex gap-4">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date().toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {event.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {(event.minTeamSize && event.maxTeamSize && event.minTeamSize > 1) && (
                          <TeamManagement
                            eventId={event.id}
                            eventTitle={event.title}
                            minTeamSize={event.minTeamSize}
                            maxTeamSize={event.maxTeamSize}
                            registrationDeadline={event.registrationDeadline}
                          />
                        )}
                      </div>
                    ) : isFull ? (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted rounded-lg">
                        This event is full. Registration is closed.
                      </p>
                    ) : isDeadlinePassed ? (
                      <p className="text-sm text-red-500/80 font-semibold text-center py-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        Registrations Closed
                      </p>
                    ) : (
                      <Button
                        onClick={handleRegister}
                        className="w-full"
                        size="lg"
                      >
                        Register for Event
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

