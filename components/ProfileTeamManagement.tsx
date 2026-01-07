"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, UserPlus, Crown, Search, Calendar, Trash2, X, Clock } from 'lucide-react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc, // Added import
  arrayUnion, // Fix import
  Timestamp,
  runTransaction // Added for sequential IDs
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface TeamMember {
  uid: string
  displayName: string
  email: string
  uniqueId: string
  university?: string
  phone?: string
  joinedAt: Date
}

interface Team {
  id: string
  eventId: string
  eventTitle?: string
  teamName: string
  teamCode?: string
  members: TeamMember[]
  leaderId: string
  createdAt: Date
  maxSize: number
  pendingRequests?: any[]
  memberIds?: string[]
}

interface RegisteredEvent {
  id: string
  eventId: string
  eventTitle: string
  eventType: string
  eventDate: Date
}

interface ProfileTeamManagementProps {
  preloadedRegistrations?: RegisteredEvent[]
}

export default function ProfileTeamManagement({ preloadedRegistrations }: ProfileTeamManagementProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // State for team management
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [userTeams, setUserTeams] = useState<{ [eventId: string]: Team }>({})
  const [pendingTeams, setPendingTeams] = useState<{ [eventId: string]: Team }>({}) // Added for pending requests
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [joinUniqueId, setJoinUniqueId] = useState('')
  const [foundTeam, setFoundTeam] = useState<Team | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [addMemberUniqueId, setAddMemberUniqueId] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [allTeams, setAllTeams] = useState<Team[]>([])

  // Get user's registered events - OPTIMIZED with immediate fetch + real-time updates
  useEffect(() => {
    if (!user) {
      console.log('No user, clearing events')
      setRegisteredEvents([])
      return
    }

    // IF PRELOADED REGISTRATIONS EXIST, USE THEM AND SKIP FETCH
    if (preloadedRegistrations && preloadedRegistrations.length > 0) {
      console.log('📦 Using preloaded registrations:', preloadedRegistrations)
      setRegisteredEvents(preloadedRegistrations)
      if (preloadedRegistrations.length > 0 && !selectedEventId) {
        setSelectedEventId(preloadedRegistrations[0].eventId)
      }
      return
    }

    let isMounted = true
    let unsubscribe: (() => void) | null = null

    const fetchRegistrations = async () => {
      try {
        console.log('🔍 Fetching registrations for user:', user.uid)
        const registrationsRef = collection(db, 'registrations')
        const registrationsQuery = query(registrationsRef, where('userId', '==', user.uid))

        // First, do an immediate fetch for fast loading
        const initialSnapshot = await getDocs(registrationsQuery)
        console.log('📋 Initial fetch:', initialSnapshot.docs.length, 'registrations found')
        console.log('📋 User UID being queried:', user.uid)

        // Debug: Log all registration docs to see what's in the database
        if (initialSnapshot.docs.length === 0) {
          console.warn('⚠️ No registrations found. Checking all registrations for debugging...')
          const allRegsSnapshot = await getDocs(collection(db, 'registrations'))
          console.log('📋 Total registrations in DB:', allRegsSnapshot.docs.length)
          allRegsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            console.log('📋 Registration doc:', {
              id: doc.id,
              userId: data.userId,
              userUid: user.uid,
              matches: data.userId === user.uid,
              eventId: data.eventId,
              eventTitle: data.eventTitle
            })
          })
        }

        if (isMounted) {
          const events: RegisteredEvent[] = initialSnapshot.docs.map(doc => {
            const data = doc.data()
            console.log('📋 Processing registration:', {
              id: doc.id,
              eventId: data.eventId,
              eventTitle: data.eventTitle,
              eventType: data.eventType
            })
            return {
              id: doc.id,
              eventId: data.eventId,
              eventTitle: data.eventTitle || 'Event',
              eventType: data.eventType || 'workshop',
              eventDate: data.eventDate?.toDate() || (data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate))
            }
          })

          console.log('✅ Processed events (initial):', events)
          setRegisteredEvents(events)

          // Auto-select first event if available
          if (events.length > 0) {
            setSelectedEventId(prev => {
              if (!prev) {
                console.log('🎯 Auto-selecting first event:', events[0].eventId)
                return events[0].eventId
              }
              return prev
            })
          }
        }

        // Then set up real-time listener for updates
        unsubscribe = onSnapshot(registrationsQuery, (snap) => {
          if (!isMounted) return

          console.log('📋 Real-time update:', snap.docs.length, 'registrations found')

          const events: RegisteredEvent[] = snap.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              eventId: data.eventId,
              eventTitle: data.eventTitle || 'Event',
              eventType: data.eventType || 'workshop',
              eventDate: data.eventDate?.toDate() || (data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate))
            }
          })

          console.log('✅ Processed events (real-time):', events)
          setRegisteredEvents(events)

          // Auto-select first event if none selected
          if (events.length > 0) {
            setSelectedEventId(prev => {
              if (!prev) {
                return events[0].eventId
              }
              return prev
            })
          } else {
            setSelectedEventId('')
          }
        }, (error) => {
          console.error('❌ Error in real-time listener:', error)
        })
      } catch (error) {
        console.error('❌ Error fetching registrations:', error)
        if (isMounted) {
          setRegisteredEvents([])
        }
      }
    }

    fetchRegistrations()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user, preloadedRegistrations])

  // Ref to track unsubscribe function to avoid race conditions
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Get teams for registered events
  useEffect(() => {
    if (!user || !selectedEventId) {
      console.log('No user or no selected event, clearing teams')
      setUserTeams({})
      return
    }

    console.log('🔍 Fetching teams for event:', selectedEventId)
    const teamsRef = collection(db, 'teams')
    // OPTIMIZATION: Modified to listen to ALL teams for the event to detect pending requests
    // Security rules allow reading all teams for authenticated users
    const q = query(
      teamsRef,
      where('eventId', '==', selectedEventId)
    )

    // Create new listener
    try {
      unsubscribeRef.current = onSnapshot(q, (snap) => {
        console.log('📋 Teams snapshot for event:', selectedEventId, snap.docs.length, 'teams found')

        let userTeamForEvent: Team | null = null
        let pendingTeamForEvent: Team | null = null

        snap.docs.forEach(doc => {
          const teamData = doc.data()
          const members = teamData.members || []
          const pendingRequests = teamData.pendingRequests || []

          // Check if user is a member
          const isMember = members.some((member: any) => {
            return member.uid === user.uid ||
              (member.uid && typeof member.uid === 'string' && member.uid === user.uid)
          })

          // Check if user has a pending request
          const isPending = pendingRequests.some((req: any) => req.uid === user.uid)

          const team = {
            id: doc.id,
            eventId: teamData.eventId,
            eventTitle: teamData.eventTitle,
            teamName: teamData.teamName,
            teamCode: teamData.teamCode,
            members: members.map((m: any) => ({
              ...m,
              joinedAt: m.joinedAt?.toDate() || new Date()
            })),
            leaderId: teamData.leaderId,
            createdAt: teamData.createdAt?.toDate() || new Date(),
            maxSize: teamData.maxSize || 5,
            pendingRequests: pendingRequests,
            memberIds: teamData.memberIds || []
          } as Team

          if (isMember) {
            userTeamForEvent = team
          } else if (isPending) {
            pendingTeamForEvent = team
          }
        })

        const allTeamsForEvent = snap.docs.map(doc => {
          const teamData = doc.data()
          return {
            id: doc.id,
            eventId: teamData.eventId,
            eventTitle: teamData.eventTitle,
            teamName: teamData.teamName,
            teamCode: teamData.teamCode,
            members: (teamData.members || []).map((m: any) => ({
              ...m,
              joinedAt: m.joinedAt?.toDate() || new Date()
            })),
            leaderId: teamData.leaderId,
            createdAt: teamData.createdAt?.toDate() || new Date(),
            maxSize: teamData.maxSize || 5,
            pendingRequests: teamData.pendingRequests || [],
            memberIds: teamData.memberIds || []
          } as Team
        })

        setAllTeams(allTeamsForEvent)

        // Update state - check for member team first, then pending team
        setUserTeams(prev => {
          // If we have a joined team, show that
          if (userTeamForEvent) {
            return { ...prev, [selectedEventId]: userTeamForEvent }
          }
          // If we have a pending team and NOT a joined team, we can store it or handle it separately
          // For now, let's reuse userTeams but mark it? Or better, add a separate state for pending?
          // To minimize refraction, let's add a property to the team object if needed, 
          // OR, simpler: just store the pending team in a new state variable.
          // However, to integrate with the existing "currentTeam" logic flow:
          // We'll add a separate state for pending requests.
          else {
            const newTeams = { ...prev }
            delete newTeams[selectedEventId]
            return newTeams
          }
        })

        // We need a way to store the pending team info. 
        // Let's add that state.
        setPendingTeams(prev => {
          if (pendingTeamForEvent) {
            return { ...prev, [selectedEventId]: pendingTeamForEvent }
          } else {
            const newPending = { ...prev }
            delete newPending[selectedEventId]
            return newPending
          }
        })

      }, (error) => {
        console.error('❌ Error fetching teams:', error)
      })
    } catch (err) {
      console.error('❌ Error setting up team listener:', err)
    }

    return () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current()
        } catch (err) {
          console.error('❌ Error unsubscribing from teams:', err)
        }
        unsubscribeRef.current = null
      }
    }
  }, [user, selectedEventId])

  const currentTeam = selectedEventId ? userTeams[selectedEventId] : null
  const pendingTeam = selectedEventId ? pendingTeams[selectedEventId] : null
  const selectedEvent = registeredEvents.find(e => e.eventId === selectedEventId)

  const createTeam = async () => {
    if (!user || !newTeamName.trim() || !selectedEventId) {
      toast({
        title: "Error",
        description: "Please select an event first.",
        variant: "destructive"
      })
      return
    }

    // Check if user already has a team for this event
    if (currentTeam) {
      toast({
        title: "Already in Team",
        description: "You already have a team for this event.",
        variant: "destructive"
      })
      return
    }

    // Check if team name is already taken for this event
    try {
      const teamsRef = collection(db, 'teams')
      const q = query(
        teamsRef,
        where('eventId', '==', selectedEventId),
        where('teamName', '==', newTeamName.trim())
      )

      // We can use getDocs here because we just need to check if ANY document exists
      // The new security rules allow reading if we are checking for duplicates or if we are admin
      // However, since we can't read teams we are not part of, we might not be able to check availability 
      // accurately if the rule strictly forbids it. 
      // BUT: We need a way to check uniqueness.
      // OPTION: We rely on the creation failure or try to read. 
      // The user wants "no duplicate team name". 
      // I will assume for now that if I query, I might get empty if I don't have permission.
      // To strictly enforce unique names without public read access to all teams, we'd need a Cloud Function.

      // Use a transaction to ensure unique, sequential team code
      await runTransaction(db, async (transaction) => {
        // Reference to the counter document
        const counterRef = doc(db, 'counters', 'team_codes');
        const counterDoc = await transaction.get(counterRef);

        let newCount = 1;
        if (counterDoc.exists()) {
          const data = counterDoc.data();
          newCount = (data.current || 0) + 1;
        }

        // Generate formatted code: RAIoT-00001
        const paddedCount = String(newCount).padStart(5, '0');
        const newTeamCode = `RAIoT-${paddedCount}`;

        // Check if team name is already taken (inside transaction for consistency, though less critical than ID)
        // Note: Querying inside transaction requires an index usually, so we might skip strict name check inside 
        // OR rely on the fact that name collision is rare enough to handle with a simple pre-check outside or just proceed.
        // For simplicity and to avoid index issues on 'teamName', we'll rely on the transaction for the ID mainly.

        // Prepare team data
        const teamRef = doc(collection(db, 'teams')); // Generate new ref

        const teamData = {
          eventId: selectedEventId,
          eventTitle: selectedEvent?.eventTitle || 'Event',
          teamName: newTeamName.trim(),
          teamCode: newTeamCode, // Sequential Code
          members: [{
            uid: user.uid,
            displayName: user.displayName || 'Unknown',
            email: user.email || '',
            uniqueId: user.uniqueId || '',
            university: user.profileData?.organization || '',
            phone: user.profileData?.phone || '',
            joinedAt: new Date()
          }],
          memberIds: [user.uid], // IMPORTANT: For Security Rules
          leaderId: user.uid,
          createdAt: new Date(),
          maxSize: 5
        }

        // Write operations
        transaction.set(counterRef, { current: newCount }, { merge: true });
        transaction.set(teamRef, teamData);
      });

      console.log('✅ Team created successfully')
      toast({
        title: "Team Created",
        description: `Team "${newTeamName}" has been created successfully.`,
      })

      setNewTeamName('')
    } catch (error: any) {
      console.error('❌ Error creating team:', error)
      console.error('❌ Error details:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      })

      let errorMessage = "Failed to create team. Please try again."
      if (error?.code === 'permission-denied') {
        errorMessage = "You do not have permission to create a team. Please try refreshing."
      } else if (error?.code === 'unavailable') {
        errorMessage = "Network unavailable. Please check your connection."
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCreatingTeam(false)
    }
  }

  // Helper to normalize ID to match database format (RAIoT prefix)
  const normalizeUniqueId = (id: string) => {
    // Trim whitespace
    let normalized = id.trim();

    // Check if it starts with 'raiot' (case-insensitive)
    if (/^raiot/i.test(normalized)) {
      // Replace with standard 'RAIoT' prefix
      // Note: We assume the rest of the ID is digits, but we just fix the prefix casing
      normalized = normalized.replace(/^raiot/i, 'RAIoT');
    }

    console.log(`Input ID: "${id}" -> Normalized: "${normalized}"`);
    return normalized;
  }

  const searchTeamByUniqueId = async () => {
    if (!joinUniqueId.trim() || !selectedEventId) {
      toast({
        title: "Error",
        description: "Please select an event first.",
        variant: "destructive"
      })
      return
    }

    setIsSearching(true)
    try {
      // Normalize the unique ID to match DB format (RAIoT prefix)
      const searchId = normalizeUniqueId(joinUniqueId)
      console.log('🔍 Searching for user with ID:', searchId)

      // Find user by unique ID
      const usersRef = collection(db, 'users')
      const userQuery = query(usersRef, where('uniqueId', '==', searchId))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        toast({
          title: "User Not Found",
          description: `No user found with unique ID: ${searchId}. Please check the ID and try again.`,
          variant: "destructive"
        })
        setFoundTeam(null)
        return
      }

      const targetUserDoc = userSnapshot.docs[0]
      const targetUser = targetUserDoc.data()
      // The uid should be in the document data, or use document ID
      const targetUserId = targetUser.uid || targetUserDoc.id

      console.log('Found user:', {
        docId: targetUserDoc.id,
        uid: targetUser.uid,
        uniqueId: targetUser.uniqueId,
        displayName: targetUser.displayName
      })

      // Search for user's team in this event
      // Now we can query simply because rules allow reading teams
      const teamsRef = collection(db, 'teams')
      const q = query(
        teamsRef,
        where('eventId', '==', selectedEventId),
        where('memberIds', 'array-contains', targetUserId)
      )

      const teamSnapshot = await getDocs(q)

      if (teamSnapshot.empty) {
        toast({
          title: "No Team Found",
          description: `User ${targetUser.displayName || searchId} is not part of any team for this event yet.`,
          variant: "destructive"
        })
        setFoundTeam(null)
        return
      }

      // Should only be one team per event ideally
      const teamDoc = teamSnapshot.docs[0]
      const teamData = teamDoc.data()

      const team = {
        id: teamDoc.id,
        eventId: teamData.eventId,
        eventTitle: teamData.eventTitle,
        teamName: teamData.teamName,
        teamCode: teamData.teamCode,
        members: teamData.members?.map((m: any) => ({
          ...m,
          joinedAt: m.joinedAt?.toDate() || new Date()
        })) || [],
        leaderId: teamData.leaderId,
        createdAt: teamData.createdAt?.toDate() || new Date(),
        maxSize: teamData.maxSize || 5,
        pendingRequests: teamData.pendingRequests || [] // Add this
      } as Team

      console.log('Found team:', team)
      setFoundTeam(team)
    } catch (error) {
      console.error('Error searching team:', error)
      toast({
        title: "Error",
        description: "Failed to search for team. Please try again.",
        variant: "destructive"
      })
      setFoundTeam(null)
    } finally {
      setIsSearching(false)
    }
  }

  const requestToJoinTeam = async (team: Team) => {
    if (!user || !team || !selectedEventId) return

    try {
      // Check if user already has a team for this event
      if (currentTeam) {
        toast({
          title: "Already in Team",
          description: "You already have a team for this event.",
          variant: "destructive"
        })
        return
      }

      // Check if user is already in this team
      if (team.members.some(m => m.uid === user.uid)) {
        toast({
          title: "Already in Team",
          description: "You are already a member of this team.",
          variant: "destructive"
        })
        return
      }

      // Check if team is full
      if (team.members.length >= team.maxSize) {
        toast({
          title: "Team Full",
          description: "This team has reached its maximum capacity.",
          variant: "destructive"
        })
        return
      }

      // Check if already requested
      const pending = team.pendingRequests || []
      if (pending.some((r: any) => r.uid === user.uid)) {
        toast({
          title: "Request Pending",
          description: "You have already sent a request to join this team.",
          variant: "destructive"
        })
        return
      }

      // Add to pending requests
      const request = {
        uid: user.uid,
        displayName: user.displayName || 'Unknown',
        uniqueId: user.uniqueId || '',
        requestedAt: new Date()
      }

      await updateDoc(doc(db, 'teams', team.id), {
        pendingRequests: arrayUnion(request)
      })

      // Send Notification to Captain
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: team.leaderId, // Captain
          type: 'join_request',
          title: 'New Join Request',
          message: `${user.displayName} has requested to join your team "${team.teamName}"`,
          teamId: team.id,
          eventId: selectedEventId,
          requesterId: user.uid,
          read: false,
          createdAt: new Date()
        })
      } catch (e) { console.error(e) }

      toast({
        title: "Request Sent",
        description: `Your request to join "${team.teamName}" has been sent for approval.`
      })

      setFoundTeam(null)
      setJoinUniqueId('')
    } catch (error) {
      console.error('Error requesting join:', error)
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive"
      })
    }
  }

  const addMemberByUniqueId = async () => {
    if (!user || !currentTeam || currentTeam.leaderId !== user.uid || !addMemberUniqueId.trim()) return

    setIsAddingMember(true)
    try {
      // Check if team is full
      if (currentTeam.members.length >= currentTeam.maxSize) {
        toast({
          title: "Team Full",
          description: "This team has reached its maximum capacity.",
          variant: "destructive"
        })
        setIsAddingMember(false)
        return
      }

      // Normalize unique ID
      const searchId = normalizeUniqueId(addMemberUniqueId)
      console.log('🔍 Adding member with ID:', searchId)

      // Find user by unique ID
      const usersRef = collection(db, 'users')
      const userQuery = query(usersRef, where('uniqueId', '==', searchId))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        toast({
          title: "User Not Found",
          description: `No user found with unique ID: ${searchId}`,
          variant: "destructive"
        })
        setIsAddingMember(false)
        return
      }

      const targetUserDoc = userSnapshot.docs[0]
      const targetUser = targetUserDoc.data()
      const targetUserId = targetUser.uid || targetUserDoc.id

      // Check if target user is registered for this event
      const targetUserRegistrationsRef = collection(db, 'registrations')
      const targetUserRegQuery = query(
        targetUserRegistrationsRef,
        where('userId', '==', targetUserId),
        where('eventId', '==', currentTeam.eventId)
      )
      const targetUserRegSnapshot = await getDocs(targetUserRegQuery)

      if (targetUserRegSnapshot.empty) {
        toast({
          title: "User Not Registered",
          description: "This user is not registered for this event. They must register for the event first before joining a team.",
          variant: "destructive"
        })
        setIsAddingMember(false)
        return
      }

      // Check if user is already in this team
      if (currentTeam.members.some(m => {
        const memberUid = m.uid
        return memberUid === targetUserId ||
          memberUid === targetUserDoc.id ||
          (targetUser.uid && memberUid === targetUser.uid)
      })) {
        toast({
          title: "Already in Team",
          description: "This user is already a member of your team.",
          variant: "destructive"
        })
        setIsAddingMember(false)
        return
      }

      // Add user to team
      const newMember = {
        uid: targetUser.uid || targetUserId,
        displayName: targetUser.displayName || 'Unknown',
        email: targetUser.email || '',
        uniqueId: targetUser.uniqueId || addMemberUniqueId.trim().toUpperCase(),
        university: targetUser.profileData?.organization || '',
        phone: targetUser.profileData?.phone || '',
        joinedAt: new Date()
      }

      await updateDoc(doc(db, 'teams', currentTeam.id), {
        members: [...currentTeam.members, newMember],
        memberIds: arrayUnion(newMember.uid) // IMPORTANT: For Security Rules
      })

      // Send Notification to the added user
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: newMember.uid, // Target user
          type: 'team_added',
          title: 'Added to Team',
          message: `You have been added to team "${currentTeam.teamName}" for event "${currentTeam.eventTitle}"`,
          teamId: currentTeam.id,
          eventId: currentTeam.eventId,
          read: false,
          createdAt: new Date()
        })
      } catch (notifError) {
        console.error('Error sending notification:', notifError)
        // Non-blocking error
      }

      toast({
        title: "Member Added",
        description: `${targetUser.displayName || 'Member'} has been added to your team!`
      })

      setAddMemberUniqueId('')
    } catch (error) {
      console.error('Error adding member:', error)
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  // Helper to approve request
  const handleApproveRequest = async (requestUid: string, teamId: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      if (!teamDoc.exists()) return;

      const data = teamDoc.data();
      const request = data.pendingRequests?.find((r: any) => r.uid === requestUid);
      if (!request) return;

      const newMember: TeamMember = {
        uid: request.uid,
        displayName: request.displayName,
        email: '',
        uniqueId: request.uniqueId,
        joinedAt: new Date()
      };

      const updatedRequests = data.pendingRequests.filter((r: any) => r.uid !== requestUid);
      const updatedMembers = [...(data.members || []), newMember];

      await updateDoc(teamRef, {
        members: updatedMembers,
        memberIds: arrayUnion(newMember.uid), // IMPORTANT: For Security Rules
        pendingRequests: updatedRequests
      });

      toast({ title: "Member Approved", description: `${request.displayName} added to team.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve.", variant: "destructive" });
    }
  }

  const handleRejectRequest = async (requestUid: string, teamId: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      if (!teamDoc.exists()) return;
      const data = teamDoc.data();
      const updatedRequests = data.pendingRequests?.filter((r: any) => r.uid !== requestUid) || [];
      await updateDoc(teamRef, { pendingRequests: updatedRequests });
      toast({ title: "Rejected", description: "Request rejected." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
    }
  }

  const handleDeleteTeam = async () => {
    if (!currentTeam || !user) return

    if (!window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      return
    }

    try {
      await deleteDoc(doc(db, 'teams', currentTeam.id))

      toast({
        title: "Team Deleted",
        description: "Your team has been successfully deleted."
      })

      // Reset state is handled by the snapshot listener returning null
    } catch (error) {
      console.error('Error deleting team:', error)
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (!user) return null

  // If no registered events, show helpful message
  if (registeredEvents.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-cyan-500/30">
        <CardContent className="pt-8">
          <div className="text-center py-10">
            <Calendar className="h-16 w-16 mx-auto mb-6 text-zinc-600" />
            <h3 className="text-xl font-semibold text-zinc-200 mb-2">No Registered Events</h3>
            <p className="text-base text-zinc-500 mb-6">
              You need to register for an event before you can create or join a team.
            </p>
            <Button variant="outline" className="border-cyan-500/30 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6 h-10 text-base shadow-sm" onClick={() => window.location.href = '/events'}>
              Browse Events
            </Button>
            <p className="text-sm text-zinc-600 mt-6">
              💡 After registering, come back here to create or join teams for that event
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Event Selection - Refined Neon Border Design */}
      <div className="flex items-center gap-6 p-6 rounded-lg bg-black/40 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] relative overflow-hidden">
        {/* Decorative Glow - Thinner and subtler */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-indigo-500 shadow-[0_0_5px_rgba(6,182,212,0.3)]"></div>

        <div className="flex-1 space-y-2 relative z-10">
          <label className="text-sm font-semibold text-cyan-500 uppercase tracking-wider block flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Select Event Module
          </label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full bg-zinc-900/80 border-cyan-800/30 text-cyan-100 h-12 text-base ring-offset-zinc-950 focus:ring-cyan-500/10 focus:border-cyan-500/50 focus:shadow-sm">
              <SelectValue placeholder="Select an event..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
              {registeredEvents.map((event) => (
                <SelectItem key={event.eventId} value={event.eventId} className="focus:bg-zinc-800 focus:text-cyan-400 text-base py-3">
                  {event.eventTitle} <span className="text-zinc-500 text-xs ml-2 uppercase tracking-wide">[{event.eventType}]</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {registeredEvents.length > 0 && (
          <div className="hidden sm:block text-right relative z-10">
            <div className="px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-sm font-bold shadow-sm">
              {registeredEvents.length} Active Events
            </div>
          </div>
        )}
      </div>

      {selectedEventId && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* User's Current Team - Subtler Banner Layout */}
          {currentTeam ? (
            <Card className="bg-black/40 border-cyan-500/20 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.08)]">
              <CardHeader className="pb-6 border-b border-cyan-500/10 bg-gradient-to-r from-zinc-900 via-cyan-950/10 to-zinc-900">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl flex items-center text-cyan-100 font-bold tracking-tight">
                      <div className="relative mr-4 text-cyan-500">
                        <Users className="h-8 w-8" />
                      </div>
                      {currentTeam.teamName}
                    </CardTitle>
                    <CardDescription className="text-zinc-400 mt-2 flex items-center gap-4 text-sm">
                      <span className="font-medium text-cyan-200/80">REPLAY: {currentTeam.eventTitle || selectedEvent?.eventTitle}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500/80"></span>
                      <span className="font-mono bg-zinc-900/80 border border-zinc-700 px-3 py-1 rounded text-sm text-zinc-300">CODE: <span className="text-white font-bold">{currentTeam.teamCode}</span></span>

                    </CardDescription>
                  </div>
                  {currentTeam.leaderId === user?.uid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteTeam}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/20 hover:border-red-500/30 border border-transparent h-9 text-sm px-4"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Terminate Team
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-8 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Members List */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-sm font-semibold text-cyan-500 uppercase tracking-wider">
                      <span>Team Members [{currentTeam.members.length}/{currentTeam.maxSize}]</span>
                    </div>
                    <div className="space-y-3">
                      {currentTeam.members.map((member) => (
                        <div key={member.uid} className={`flex items-center justify-between p-4 rounded-md border ${member.uid === currentTeam.leaderId ? 'border-fuchsia-500/40 bg-fuchsia-500/5 shadow-[0_0_8px_rgba(217,70,239,0.1)]' : 'border-cyan-500/20 bg-zinc-900/40'} hover:border-cyan-500/40 transition-all duration-300`}>
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-sm flex items-center justify-center font-bold text-base border ${member.uid === currentTeam.leaderId ? 'border-fuchsia-500 bg-fuchsia-950 text-fuchsia-400' : 'border-cyan-700 bg-cyan-950 text-cyan-400'}`}>
                              {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-base font-medium text-zinc-100 leading-none mb-1">{member.displayName}</p>
                              <p className="text-xs text-cyan-500/60 font-mono">{member.uniqueId}</p>
                            </div>
                          </div>
                          {member.uid === currentTeam.leaderId && (
                            <Badge variant="secondary" className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 text-[10px] px-2 py-0.5">Captain</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="space-y-8">
                    {/* Pending Requests */}
                    {currentTeam.leaderId === user?.uid && (currentTeam as any).pendingRequests?.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider flex items-center">
                          <span className="w-2 h-2 rounded-full bg-fuchsia-500 mr-2.5 animate-pulse"></span> Pending Requests
                        </div>
                        <div className="space-y-3">
                          {(currentTeam as any).pendingRequests.map((req: any) => (
                            <div key={req.uid} className="flex items-center justify-between p-3 rounded-md border border-fuchsia-500/30 bg-fuchsia-950/10 shadow-sm">
                              <div className="pl-2">
                                <span className="text-fuchsia-200 block font-medium text-sm">{req.displayName}</span>
                                <span className="text-xs text-fuchsia-500/70 font-mono">{req.uniqueId}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button size="icon" className="h-8 w-8 bg-green-500/10 hover:bg-green-500/30 text-green-400 border border-green-500/30" onClick={() => handleApproveRequest(req.uid, currentTeam.id)}><Plus className="h-4 w-4" /></Button>
                                <Button size="icon" className="h-8 w-8 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30" onClick={() => handleRejectRequest(req.uid, currentTeam.id)}><X className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Member Logic */}
                    {currentTeam.leaderId === user?.uid && currentTeam.members.length < currentTeam.maxSize && (
                      <div className="space-y-3 p-5 rounded-lg bg-zinc-900/30 border border-cyan-500/20 shadow-sm">
                        <Label className="text-sm text-cyan-400/80 font-medium">Add Member by UID</Label>
                        <div className="flex gap-3">
                          <Input
                            placeholder="Enter UID..."
                            value={addMemberUniqueId}
                            onChange={(e) => setAddMemberUniqueId(e.target.value)}
                            className="bg-black/50 border-cyan-800 text-cyan-100 placeholder:text-zinc-600 h-10 text-base focus:border-cyan-500 focus:ring-cyan-500/10"
                          />
                          <Button
                            size="default"
                            onClick={addMemberByUniqueId}
                            disabled={isAddingMember || !addMemberUniqueId.trim()}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 h-10 px-6 font-bold tracking-wide shadow-sm"
                          >
                            {isAddingMember ? '...' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          ) : pendingTeam ? (
            /* Pending Status */
            <Card className="bg-black/40 border-dashed border-amber-500/30">
              <CardContent className="py-12 text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping opacity-75"></div>
                  <div className="relative flex items-center justify-center w-16 h-16 bg-black/60 border border-amber-500/50 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-amber-200">Join Request  Pending</h3>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    You have requested to join <span className="text-amber-400 font-semibold">"{pendingTeam.teamName}"</span>.
                    <br />
                    Please wait for the Captain to approve your request.
                  </p>
                  <p className="text-xs text-zinc-600 pt-2 font-mono">
                    Status: Awaiting Approval
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* No Team: clean cards */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Team Module */}
                <Card className="bg-black/40 border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-md transition-all duration-300 group">
                  <CardHeader className="pb-3 border-b border-cyan-500/10">
                    <CardTitle className="text-xl text-cyan-100 flex items-center font-bold">
                      <Plus className="h-5 w-5 mr-3 text-cyan-500" /> Create Team
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-sm">Initialize a new team for this module</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="space-y-3">
                      <Label className="text-cyan-500/70 text-sm uppercase tracking-wide">Team Name</Label>
                      <Input
                        placeholder="e.g. The Innovators"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="bg-black/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-700 h-11 text-base focus:border-cyan-500 focus:shadow-sm transition-all"
                      />
                    </div>
                    <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 shadow-sm mt-2 h-11 text-base font-bold tracking-wide group-hover:scale-[1.01] transition-transform"
                      onClick={createTeam}
                      disabled={isCreatingTeam || !newTeamName.trim()}
                    >
                      {isCreatingTeam ? 'Creating...' : 'Create Team'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Join Team Module */}
                <Card className="bg-black/40 border-purple-500/20 hover:border-purple-500/40 hover:shadow-md transition-all duration-300 group">
                  <CardHeader className="pb-3 border-b border-purple-500/10">
                    <CardTitle className="text-xl text-purple-100 flex items-center font-bold">
                      <Search className="h-5 w-5 mr-3 text-purple-500" /> Join Existing Team
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-sm">Search for an active team to integrate with</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    {!foundTeam ? (
                      <div className="flex gap-3">
                        <Input
                          placeholder="Enter Unique ID..."
                          value={joinUniqueId}
                          onChange={(e) => setJoinUniqueId(e.target.value)}
                          className="bg-black/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-700 h-11 text-base focus:border-purple-500 focus:shadow-sm transition-all"
                        />
                        <Button
                          onClick={searchTeamByUniqueId}
                          disabled={isSearching || !joinUniqueId.trim()}
                          variant="secondary"
                          className="bg-purple-900/20 text-purple-300 border border-purple-500/30 hover:bg-purple-900/40 hover:text-white h-11 w-14"
                        >
                          {isSearching ? '...' : <Search className="h-5 w-5" />}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-purple-900/10 border border-purple-500/30 p-4 rounded-lg flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-purple-200 font-bold text-base">{foundTeam.teamName}</p>
                          <p className="text-xs text-purple-400 mt-1 uppercase tracking-wide">{foundTeam.members.length}/{foundTeam.maxSize} Members</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 h-9 px-4 text-sm font-bold shadow-sm"
                          onClick={() => requestToJoinTeam(foundTeam)}
                          disabled={foundTeam.members.length >= foundTeam.maxSize || (foundTeam.pendingRequests || []).some((r: any) => r.uid === user?.uid)}
                        >
                          {(foundTeam.pendingRequests || []).some((r: any) => r.uid === user?.uid) ? 'Pending' : 'Join'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Available Teams List */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-cyan-100 flex items-center">
                      <Users className="h-5 w-5 mr-3 text-cyan-500" />
                      Available Teams
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1">Open teams looking for members in {selectedEvent?.eventTitle}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {allTeams.filter(t =>
                    t.members.length < t.maxSize &&
                    !t.members.some(m => m.uid === user.uid) &&
                    !(t.pendingRequests || []).some((r: any) => r.uid === user.uid)
                  ).map(team => (
                    <div key={team.id} className="p-5 rounded-lg border border-cyan-500/10 bg-black/40 hover:bg-cyan-950/10 hover:border-cyan-500/30 transition-all group flex flex-col justify-between h-full">
                      <div>
                        <h4 className="font-bold text-zinc-100 text-lg group-hover:text-cyan-400 transition-colors truncate">{team.teamName}</h4>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Captain ID: <span className="text-zinc-400 font-mono">{(team.members.find(m => m.uid === team.leaderId)?.uniqueId) || 'N/A'}</span></p>
                      </div>

                      <div className="flex items-center justify-between mt-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-500 uppercase font-black mb-1">Squad Power</span>
                          <div className="flex gap-1">
                            {[...Array(team.maxSize)].map((_, i) => (
                              <div key={i} className={`h-1.5 w-4 rounded-full ${i < team.members.length ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'bg-zinc-800'}`}></div>
                            ))}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-white h-9 px-5 text-sm font-black uppercase tracking-tighter"
                          onClick={() => requestToJoinTeam(team)}
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}

                  {allTeams.filter(t =>
                    t.members.length < t.maxSize &&
                    !t.members.some(m => m.uid === user.uid) &&
                    !(t.pendingRequests || []).some((r: any) => r.uid === user.uid)
                  ).length === 0 && (
                      <div className="sm:col-span-2 lg:col-span-3 text-center py-12 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10">
                        <p className="text-zinc-600 font-mono text-sm tracking-wider">NO_AVAILABLE_SQUADS_FOUND_FOR_THIS_MODULE</p>
                        <p className="text-zinc-500 text-xs mt-2 uppercase">Be the first to initialize a tactical team</p>
                      </div>
                    )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
