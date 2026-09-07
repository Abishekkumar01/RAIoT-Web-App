"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react'
import { doc, collection, query, where, onSnapshot, writeBatch } from 'firebase/firestore'
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
  maxParticipants: number
  registered: number
  minTeamSize?: number
  maxTeamSize?: number
  registrationDeadline?: string
  imageUrl?: string
  status: 'active' | 'completed' | 'cancelled'
  isOnline?: boolean
  registrationType?: 'in-site' | 'external'
  externalRegistrationLink?: string
  requiresLogin?: boolean
  showCapacity?: boolean
  subEvents?: {
    id: string
    title: string
    description: string
    time?: string
    location?: string
    rulebookUrl?: string
    imageUrl?: string
  }[]
}

const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  // Regular expression to match URLs (http, https)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 break-all transition-colors"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

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
        const response = await fetch(`/api/events/${eventId}`, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))

        if (response.ok && data?.data) {
          const eventData = data.data as EventDetail
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

  // Refresh event details periodically so registration counts stay fresh from MongoDB
  useEffect(() => {
    if (!event?.id) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/events/${event.id}`, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data?.data?.registered !== undefined) {
          setEvent(prev => (prev ? { ...prev, registered: data.data.registered } : prev))
        }
      } catch {
        // Silent refresh failure; UI can continue with current state.
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [event?.id])

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


  const handleRegister = async () => {
    if (!event) return

    // If login is required and user is not logged in, they shouldn't even see the button, but just in case:
    if (!user && (event.requiresLogin !== false || event.registrationType !== 'external')) {
      toast({
        title: "Login Required",
        description: "Please log in to register for this event.",
        variant: "destructive",
      })
      router.push('/auth/login')
      return
    }

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

    // Handle external registration
    if (event.registrationType === 'external' && event.externalRegistrationLink) {
      window.open(event.externalRegistrationLink, '_blank')
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

      // Commit the batch
      await batch.commit()
      await fetch(`/api/events/${event.id}/registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: 1 }),
      })

      // Refresh event once after registration
      const refresh = await fetch(`/api/events/${event.id}`, { cache: 'no-store' })
      const refreshData = await refresh.json().catch(() => ({}))
      if (refresh.ok && refreshData?.data) {
        setEvent(refreshData.data as EventDetail)
      }

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

      <div className="w-full px-6 md:px-20 py-6">
        <div className="max-w-[1400px] mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">

              {/* Header Section: Image + Title/Info Side-by-Side */}
              <div className="flex flex-col md:flex-row gap-8 items-start">

                {/* Event Image */}
                {event.imageUrl && (
                  <div className="w-full md:w-auto md:max-w-sm shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer overflow-hidden rounded-lg shadow-md group relative border border-transparent hover:border-cyan-500/50 transition-colors duration-300">
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-auto object-contain max-h-[500px] transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white font-mono text-sm border border-white/50 px-3 py-1 rounded-full backdrop-blur-sm">Click to view poster</span>
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] h-[90vh] md:h-[95vh] p-2 md:p-6 bg-black/95 border-cyan-500/50 flex flex-col items-center justify-center">
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Title and Basic Info */}
                <div className="flex-1 space-y-4">
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

                  {/* About This Event (Moved here to be next to image) */}
                  {event.description && (
                    <Card className="p-4 border-none shadow-none bg-transparent px-0">
                      <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-xl">About This Event</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div 
                          className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: event.description }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Detailed Content */}
              {event.detailedContent && event.detailedContent.trim() !== '' && (
                <Card className="p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans"
                      dangerouslySetInnerHTML={{ __html: event.detailedContent }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Sub Events */}
              {event.subEvents && event.subEvents.length > 0 && (
                <Card className="p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Event Schedule & Sub-Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {event.subEvents.map((subEvent, index) => (
                        <Dialog key={subEvent.id}>
                          <DialogTrigger asChild>
                            <div className="group cursor-pointer rounded-lg border border-border/50 bg-muted/20 p-4 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-300 flex flex-col gap-2 relative overflow-hidden">
                              <h3 className="font-semibold text-base md:text-lg line-clamp-2 group-hover:text-cyan-400 transition-colors z-10">{subEvent.title}</h3>
                              {subEvent.time && (
                                <Badge variant="secondary" className="w-fit opacity-80 group-hover:opacity-100 z-10">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {subEvent.time}
                                </Badge>
                              )}
                              {subEvent.imageUrl && (
                                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
                                  <img 
                                    src={subEvent.imageUrl} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              )}
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] md:max-w-[600px] bg-black/95 border-cyan-500/50 max-h-[90vh] overflow-y-auto">
                            <div className="space-y-6 pt-4">
                              <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-cyan-400 pr-8">{subEvent.title}</h2>
                                <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
                                  {subEvent.time && (
                                    <div className="flex items-center bg-muted/30 px-3 py-1 rounded-full">
                                      <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                                      <span>{subEvent.time}</span>
                                    </div>
                                  )}
                                  {subEvent.location && (
                                    <div className="flex items-center bg-muted/30 px-3 py-1 rounded-full">
                                      <MapPin className="w-4 h-4 mr-2 text-cyan-400" />
                                      <span>{subEvent.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {subEvent.imageUrl && (
                                <div className="rounded-lg overflow-hidden border border-cyan-500/20 bg-black/50 flex justify-center">
                                  <img 
                                    src={subEvent.imageUrl} 
                                    alt={subEvent.title} 
                                    className="max-w-full max-h-[300px] object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                    }}
                                  />
                                </div>
                              )}

                              {subEvent.description && (
                                <div 
                                  className="text-foreground text-sm leading-relaxed whitespace-pre-wrap"
                                  dangerouslySetInnerHTML={{ __html: subEvent.description }}
                                />
                              )}
                              
                              {subEvent.rulebookUrl && (
                                <div className="pt-2 border-t border-border/50">
                                  <Button asChild variant="default" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                                    <a href={subEvent.rulebookUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      View Rulebook / Guidelines
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
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

                  {event.showCapacity !== false && (
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
                  )}

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
              {(user || (!user && event.registrationType === 'external' && event.requiresLogin === false)) && (
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
                        Register
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

