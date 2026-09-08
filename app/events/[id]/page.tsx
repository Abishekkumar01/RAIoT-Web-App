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
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

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
    lottieUrl?: string
  }[]
  teamMembers?: {
    id: string
    name: string
    role: string
    contact: string
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
                  {/* Event Details & Contact Team */}
                  {/* Event Details & Contact Team */}
                  {(event.detailedContent || (event.teamMembers && event.teamMembers.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                      {/* Event Details Button & Modal */}
                      {event.detailedContent && event.detailedContent.trim() !== '' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="group relative cursor-pointer w-full h-32 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/40 flex items-center justify-center p-6 hover:border-cyan-400 transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:-translate-y-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                              {/* Background glowing rings */}
                              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-400/30 transition-colors duration-500" />
                              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-colors duration-500" />
                              
                              <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 group-hover:border-cyan-400 transition-all duration-300">
                                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute opacity-70" />
                                  <span className="w-3 h-3 rounded-full bg-cyan-400 relative z-10" />
                                </div>
                                <span className="text-white font-bold text-lg tracking-wide group-hover:text-cyan-400 transition-colors">Event Details</span>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] md:max-w-[700px] bg-black/95 border border-cyan-500/50 backdrop-blur-xl shadow-[0_0_50px_rgba(34,211,238,0.2)]">
                            <div className="relative group rounded-xl p-2 sm:p-6 overflow-hidden flex flex-col h-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />
                              <h3 className="text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-3 relative z-10 border-b border-cyan-500/20 pb-4">
                                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                                Event Details
                              </h3>
                              <div 
                                className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans relative z-10 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent pr-4"
                                dangerouslySetInnerHTML={{ __html: event.detailedContent }}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Contact Team Button & Modal */}
                      {event.teamMembers && event.teamMembers.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="group relative cursor-pointer w-full h-32 rounded-2xl overflow-hidden border border-purple-500/30 bg-black/40 flex items-center justify-center p-6 hover:border-purple-400 transition-all duration-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:-translate-y-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                              {/* Background glowing rings */}
                              <div className="absolute top-0 left-0 -mt-8 -ml-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-colors duration-500" />
                              <div className="absolute bottom-0 right-0 -mb-8 -mr-8 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-400/30 transition-colors duration-500" />
                              
                              <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 group-hover:border-purple-400 transition-all duration-300">
                                  <Users className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                </div>
                                <span className="text-white font-bold text-lg tracking-wide group-hover:text-purple-400 transition-colors">Organizing Team</span>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] md:max-w-[700px] bg-black/95 border border-purple-500/50 backdrop-blur-xl shadow-[0_0_50px_rgba(168,85,247,0.2)]">
                            <div className="relative group rounded-xl p-2 sm:p-6 overflow-hidden flex flex-col h-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 pointer-events-none" />
                              <h3 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-3 relative z-10 border-b border-purple-500/20 pb-4">
                                <Users className="w-6 h-6 text-purple-400" />
                                Organizing Team
                              </h3>
                              {(() => {
                                const grouped = event.teamMembers.reduce((acc, member) => {
                                  const role = member.role || 'Team Member';
                                  if (!acc[role]) acc[role] = [];
                                  acc[role].push(member);
                                  return acc;
                                }, {} as Record<string, typeof event.teamMembers[0][]>);

                                return (
                                  <div className="flex flex-col gap-6 relative z-10 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent pr-4 pb-4">
                                    {Object.entries(grouped).map(([role, members]) => (
                                      <div key={role} className="flex flex-col gap-3">
                                        <h4 className="text-sm font-bold text-purple-400 tracking-wider uppercase border-b border-purple-500/20 pb-2">{role}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          {members.map((member) => (
                                            <div key={member.id} className="group/card flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:-translate-y-1 cursor-default">
                                              <div className="relative">
                                                <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-md opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                                                {member.imageUrl ? (
                                                  <img src={member.imageUrl} alt={member.name} className="relative w-14 h-14 rounded-full object-cover border-2 border-purple-500/30 group-hover/card:border-purple-400 transition-colors z-10" />
                                                ) : (
                                                  <div className="relative w-14 h-14 rounded-full bg-purple-950/50 flex items-center justify-center border-2 border-purple-500/30 group-hover/card:border-purple-400 transition-colors z-10">
                                                    <Users className="w-7 h-7 text-purple-400" />
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-bold text-base text-gray-100 truncate group-hover/card:text-purple-300 transition-colors">{member.name}</p>
                                                {member.contact && <p className="text-xs text-gray-400 mt-1 truncate">{member.contact}</p>}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sub Events */}
              {event.subEvents && event.subEvents.length > 0 && (
                <div className="mt-12 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-cyan-500/50" />
                    <h2 className="text-2xl md:text-3xl font-bold text-center text-white font-mono uppercase tracking-wider flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                      Sub-Events
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-cyan-500/50" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {event.subEvents.map((subEvent, index) => (
                      <Dialog key={subEvent.id}>
                        <DialogTrigger asChild>
                          <div className="group relative w-full aspect-[3/4] cursor-pointer rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/50 flex flex-col justify-end p-6 hover:border-cyan-400 transition-all duration-700 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:-translate-y-2">
                            {/* Animated Background layers */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                            
                            {/* Orbiting element animation */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none">
                               <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-purple-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none">
                               <div className="absolute bottom-0 right-1/2 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc]" />
                            </div>

                            {/* Sub-event Image */}
                            {subEvent.imageUrl ? (
                              <img 
                                src={subEvent.imageUrl} 
                                alt="" 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 z-0"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-cyan-950/20 group-hover:bg-cyan-900/40 transition-colors duration-700 z-0">
                                <Calendar className="w-16 h-16 text-cyan-500/20 group-hover:text-cyan-400/40 transition-colors duration-700" />
                              </div>
                            )}

                            {/* Lottie Overlay Animation */}
                            {subEvent.lottieUrl && (
                              <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none flex items-center justify-center">
                                <Lottie 
                                  animationData={null} // We will fetch it via the path
                                  path={subEvent.lottieUrl}
                                  loop={true}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            {/* Content overlay */}
                            <div className="relative z-20 flex flex-col gap-3 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                              <h3 className="font-bold text-xl md:text-2xl text-white group-hover:text-cyan-400 transition-colors">{subEvent.title}</h3>
                              {subEvent.time && (
                                <Badge variant="outline" className="w-fit border-cyan-500/50 text-cyan-300 bg-black/50 backdrop-blur-sm">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {subEvent.time}
                                </Badge>
                              )}
                              <p className="text-sm text-gray-300 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 h-0 group-hover:h-auto overflow-hidden">
                                {subEvent.description?.replace(/<[^>]*>?/gm, '') || 'Click to view details'}
                              </p>
                              <div className="mt-2 text-cyan-500 text-sm font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-500 delay-200">
                                View Details <span className="text-lg leading-none">&rarr;</span>
                              </div>
                            </div>
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
                </div>
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

