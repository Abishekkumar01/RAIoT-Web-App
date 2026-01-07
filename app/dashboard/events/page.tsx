"use client";

import { useState, useEffect } from "react";
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { collection, onSnapshot, query, where, addDoc, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast'
import ProfileTeamManagement from '@/components/ProfileTeamManagement'
import { useProfileValidation } from '@/hooks/use-profile-validation'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  type: string
  maxParticipants?: number
  registered?: number
  registrationDeadline?: string
}

interface Registration {
  id: string
  userId: string
  eventId: string
  eventTitle: string
  eventType: string
  eventDate: string
  status: string
  createdAt: Date
}

export default function EventsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { validation } = useProfileValidation()
  const [events, setEvents] = useState<Event[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    // Subscribe to events
    const eventsQuery = collection(db, 'events')
    const eventsUnsub = onSnapshot(eventsQuery, (snap) => {
      const eventsData: Event[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[]
      setEvents(eventsData)
      setLoading(false)
    })

    // Subscribe to user's registrations
    const registrationsQuery = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid)
    )
    const registrationsUnsub = onSnapshot(registrationsQuery, (snap) => {
      const registrationsData: Registration[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Registration[]
      setRegistrations(registrationsData)
    })

    return () => {
      eventsUnsub()
      registrationsUnsub()
    }
  }, [user])

  const handleRegister = async (event: Event) => {
    if (!user) return

    setRegistering(event.id)
    try {
      // Use a batch write to ensure atomicity
      const { writeBatch } = await import('firebase/firestore')
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
        description: `You have successfully registered for ${event.title}`
      })
    } catch (error) {
      console.error('Registration failed:', error)
      toast({
        title: "Registration Failed",
        description: "Failed to register for event. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRegistering(null)
    }
  }

  const handleUnregister = async (eventId: string) => {
    if (!user) return

    try {
      // Find the registration
      const registration = registrations.find(reg => reg.eventId === eventId)
      if (registration) {
        // Delete registration
        await deleteDoc(doc(db, 'registrations', registration.id))

        // Update event participant count
        const event = events.find(e => e.id === eventId)
        if (event && event.registered) {
          await updateDoc(doc(db, 'events', eventId), {
            registered: increment(-1)
          })
        }

        toast({
          title: "Unregistered Successfully",
          description: "You have been unregistered from the event"
        })
      }
    } catch (error) {
      console.error('Unregistration failed:', error)
      toast({
        title: "Unregistration Failed",
        description: "Failed to unregister from event. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "workshop":
        return "bg-blue-500";
      case "competition":
        return "bg-red-500";
      case "seminar":
        return "bg-green-500";
      case "showcase":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const upcomingEvents = events.filter(event => new Date(event.date) > new Date())
  const pastEvents = events.filter(event => new Date(event.date) <= new Date())

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Register for upcoming events and view your event history
          </p>
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">
          Register for upcoming events and view your event history
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Teams</span>
          </TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming events available</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {upcomingEvents.map((event) => {
                const isRegistered = registrations.some(reg => reg.eventId === event.id)
                const isFull = event.maxParticipants && event.registered && event.registered >= event.maxParticipants

                return (
                  <Card
                    key={event.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          className={`${getTypeColor(event.type)} text-white`}
                        >
                          {event.type.charAt(0).toUpperCase() +
                            event.type.slice(1)}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          {isRegistered && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-600"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Registered
                            </Badge>
                          )}
                          {isFull && !isRegistered && (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-600"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Full
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {event.date}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            {event.time}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {event.location}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                            {event.registered || 0}/{event.maxParticipants || '∞'} registered
                          </div>
                        </div>

                        {event.registrationDeadline && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Registration Deadline:</strong>{" "}
                            {event.registrationDeadline}
                          </div>
                        )}

                        <div className="flex justify-end">
                          {isRegistered ? (
                            <Button
                              variant="outline"
                              onClick={() => handleUnregister(event.id)}
                            >
                              Unregister
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleRegister(event)}
                              disabled={isFull || registering === event.id}
                            >
                              {registering === event.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Registering...
                                </>
                              ) : isFull ? (
                                "Event Full"
                              ) : (
                                "Register"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {pastEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No past events available</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pastEvents.map((event) => {
                const registration = registrations.find(reg => reg.eventId === event.id)
                const attended = registration?.status === 'attended'

                return (
                  <Card key={event.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`${getTypeColor(event.type)} text-white`}>
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </Badge>
                        {registration && (
                          <Badge
                            variant="outline"
                            className={
                              attended
                                ? "text-green-600 border-green-600"
                                : "text-red-600 border-red-600"
                            }
                          >
                            {attended ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Attended
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Missed
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {event.date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {event.time}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          {event.location}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>


        <TabsContent value="teams" className="space-y-6">
          {validation.isComplete && validation.uniqueId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Create or join teams to collaborate with other members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileTeamManagement preloadedRegistrations={registrations.map(r => ({
                  id: r.id,
                  eventId: r.eventId,
                  eventTitle: r.eventTitle,
                  eventType: r.eventType,
                  eventDate: new Date(r.eventDate) // Convert string date to Date object
                }))} />
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">Profile Incomplete</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Please complete your profile to access team management features.
              </p>
              <Button onClick={() => router.push('/dashboard/profile')}>
                Complete Profile
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div >
  );
}
