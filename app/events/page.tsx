"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { EventCard } from '@/components/EventCard'
import { Calendar } from 'lucide-react'
import { collection, onSnapshot, query, where, doc, increment, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { useToast } from '@/hooks/use-toast'
import TeamManagement from '@/components/TeamManagement'

interface EventItem {
  id: string
  title: string
  description: string
  date: string
  time: string
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

export default function EventsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { validation } = useProfileValidation()
  const [events, setEvents] = useState<EventItem[]>([])
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null)

  useEffect(() => {
    // Subscribe to events
    const eventsQuery = collection(db, 'events')
    const eventsUnsub = onSnapshot(eventsQuery, (snap) => {
      const items: EventItem[] = snap.docs.map((d) => {
        const data = d.data() as any
        console.log(`📥 Received event "${data.title}":`, {
          id: d.id,
          imageUrl: data.imageUrl,
          hasImageUrl: !!data.imageUrl,
          imageUrlType: typeof data.imageUrl
        })
        return { id: d.id, ...data }
      })
      setEvents(items)
      setLoading(false)
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
      toast({
        title: "Error loading events",
        description: "Please check your internet connection.",
        variant: "destructive"
      })
    })

    // Subscribe to user registrations if user is logged in
    let registrationsUnsub: (() => void) | null = null
    if (user) {
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where('userId', '==', user.uid)
      )
      registrationsUnsub = onSnapshot(registrationsQuery, (snap) => {
        const registeredEventIds = new Set(snap.docs.map(doc => {
          const data = doc.data()
          const eventId = data.eventId
          console.log('📝 Registration found:', { eventId, userId: data.userId, currentUser: user.uid })
          return eventId
        }))
        console.log('📋 Updated user registrations:', Array.from(registeredEventIds))
        setUserRegistrations(registeredEventIds)
      }, (error) => {
        console.error('❌ Error fetching registrations:', error)
        setUserRegistrations(new Set())
      })
    } else {
      // Clear registrations if user is not logged in
      setUserRegistrations(new Set())
    }

    return () => {
      eventsUnsub()
      if (registrationsUnsub) registrationsUnsub()
    }
  }, [user])


  const handleRegister = async (event: EventItem) => {
    if (!user) {
      // Check if user is trying to register as a public viewer
      const shouldSignup = confirm(
        "You need to create an account to register for events. Would you like to sign up now?"
      )
      if (shouldSignup) {
        router.push('/auth/guest-signup')
      }
      return
    }

    // Prevent double registration
    if (registeringEventId === event.id) {
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

    setRegisteringEventId(event.id)

    // Check profile completion (skip for admins)
    console.log('🔍 Checking profile completion for registration...')
    console.log('🔍 Validation state:', validation)
    console.log('🔍 User role:', user.role)

    if (!validation.isComplete && user.role !== 'admin' && user.role !== 'superadmin') {
      console.log('❌ Profile incomplete, cannot register')
      console.log('❌ Missing fields:', validation.missingFields)
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

    console.log('✅ Profile is complete, proceeding with registration')

    // Check if user is already registered
    if (userRegistrations.has(event.id)) {
      toast({
        title: "Already Registered",
        description: "You have already registered for this event.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('🔍 Starting event registration for:', event.id)
      console.log('🔍 User:', user.uid)
      console.log('🔍 Profile validation:', validation)
      console.log('🔍 User role:', user.role)
      console.log('🔍 Profile complete:', validation.isComplete)
      console.log('🔍 Can register:', validation.canRegister)

      // Check if event is full
      if (event.maxParticipants && event.registered && event.registered >= event.maxParticipants) {
        toast({
          title: "Event Full",
          description: "This event has reached its maximum capacity.",
          variant: "destructive",
        })
        return
      }

      // Use a batch write to ensure atomicity
      const batch = writeBatch(db)

      // Create registration document
      console.log('🔍 Creating registration document...')
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
      console.log('🔍 Updating event count...')
      const eventRef = doc(db, 'events', event.id)
      batch.update(eventRef, {
        registered: increment(1)
      })

      // Commit the batch
      await batch.commit()
      console.log('🔍 Registration and count update successful')

      // Only show success message if we reach here
      toast({
        title: "Registration Successful",
        description: `You have successfully registered for ${event.title}`,
      })
    } catch (e: any) {
      console.error('❌ Registration failed:', e)
      console.error('❌ Error details:', {
        message: e instanceof Error ? e.message : 'Unknown error',
        code: e?.code,
        stack: e instanceof Error ? e.stack : 'No stack trace',
        error: e
      })

      let errorMessage = 'Failed to register for event. Please try again.'
      if (e?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions or contact support.'
      } else if (e?.message) {
        errorMessage = e.message
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setRegisteringEventId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading events...</p>
          </div>
        </div>

        {/* Team Management Section for Team Events */}
        {user && events.some(event => event.minTeamSize && event.maxTeamSize) && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Team Management</h2>
              <p className="text-xl text-muted-foreground">
                Manage your teams for team-based events
              </p>
            </div>

            {events
              .filter(event => event.minTeamSize && event.maxTeamSize)
              .map(event => (
                <div key={event.id} className="mb-8">
                  <h3 className="text-2xl font-semibold mb-4 text-center">
                    {event.title} - Team Management
                  </h3>
                  <TeamManagement
                    eventId={event.id}
                    eventTitle={event.title}
                    minTeamSize={event.minTeamSize || 2}
                    maxTeamSize={event.maxTeamSize || 10}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <div className="max-w-[1920px] mx-auto px-4 pt-12 pb-4 md:pb-8">
        <div className="text-center mb-12">
          <h1
            className="text-5xl md:text-7xl font-black font-orbitron mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Upcoming Events
          </h1>
          <p className="text-xl text-muted-foreground">
            Join us for exciting workshops, competitions, and seminars
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Events Available</h3>
            <p className="text-muted-foreground">Check back later for upcoming events!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-32 md:gap-x-8 gap-y-20 md:gap-y-20 max-w-fit mx-auto justify-items-center justify-center [zoom:0.75] md:[zoom:1] origin-top px-6 md:px-0 mb-0">
            {events.map((event) => {
              const isRegistered = user ? userRegistrations.has(event.id) : false
              const isFull = Boolean(event.maxParticipants && event.registered && event.registered >= event.maxParticipants);

              let isRegistrationClosed = false;
              if (event.registrationDeadline) {
                const deadline = new Date(event.registrationDeadline);
                deadline.setHours(23, 59, 59, 999);
                isRegistrationClosed = new Date() > deadline;
              }

              // Log for debugging
              console.log(`📋 Event "${event.title}":`, {
                id: event.id,
                isRegistered,
                isRegistrationClosed,
                userRegistrations: Array.from(userRegistrations),
                hasUser: !!user,
                imageUrl: event.imageUrl,
                hasImageUrl: !!event.imageUrl,
                imageUrlType: typeof event.imageUrl,
                imageUrlLength: event.imageUrl?.length || 0
              })

              return (
                <EventCard
                  key={event.id}
                  image={event.imageUrl || ''}
                  name={event.title}
                  details={{
                    date: event.date,
                    location: event.location,
                    type: event.type,
                    capacity: event.maxParticipants ? `${event.registered ?? 0}/${event.maxParticipants}` : 'UNLIMITED'
                  }}
                  onBrief={() => router.push(`/events/${event.id}`)}
                  isRegistered={isRegistered}
                  isFull={isFull}
                  isOnline={event.isOnline === true}
                  isRegistrationClosed={isRegistrationClosed}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
