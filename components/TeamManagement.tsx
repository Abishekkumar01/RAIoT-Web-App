"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, UserPlus, Crown, Edit, CheckCircle, XCircle, Clock } from 'lucide-react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, getDocs, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore'
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

interface TeamRequest {
  uid: string
  displayName: string
  uniqueId: string
  requestedAt: Date
}

interface Team {
  id: string
  eventId: string
  teamName: string
  teamCode: string // Display ID like RAIOT-4821
  leaderUniqueId: string // Ensure easy lookup
  members: TeamMember[]
  pendingRequests?: TeamRequest[]
  leaderId: string
  createdAt: Date
  maxSize: number
  status: 'open' | 'closed'
}

interface TeamManagementProps {
  eventId: string
  eventTitle: string
  minTeamSize: number
  maxTeamSize: number
  registrationDeadline?: string
}

export default function TeamManagement({ eventId, eventTitle, minTeamSize, maxTeamSize, registrationDeadline }: TeamManagementProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [userTeam, setUserTeam] = useState<Team | null>(null)

  // Join Flow
  const [captainIdInput, setCaptainIdInput] = useState('') // Input for Captain's Unique ID

  // Create Flow
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  // Edit Flow
  const [editingTeamName, setEditingTeamName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)

  // Request Status
  const [pendingRequestTeamId, setPendingRequestTeamId] = useState<string | null>(null)

  const isDeadlinePassed = () => {
    if (!registrationDeadline) return false;
    const passed = new Date() > new Date(registrationDeadline);
    if (passed) console.log("Deadline passed but bypassed for testing.");
    return false; // TEMPORARY BYPASS
  }

  useEffect(() => {
    if (!user) return

    // Listen to teams for this event
    const teamsRef = collection(db, 'teams')
    const eventTeamsQuery = query(teamsRef, where('eventId', '==', eventId))

    const unsubscribe = onSnapshot(eventTeamsQuery, (snap) => {
      const teamsData: Team[] = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          members: data.members?.map((m: any) => ({
            ...m,
            joinedAt: m.joinedAt?.toDate() || new Date()
          })) || [],
          pendingRequests: data.pendingRequests?.map((r: any) => ({
            ...r,
            requestedAt: r.requestedAt?.toDate() || new Date()
          })) || [],
          teamCode: data.teamCode || 'N/A',
          leaderUniqueId: data.leaderUniqueId || '',
          status: data.status || 'open'
        } as Team;
      })

      setTeams(teamsData)

      // Find user's team (Member or Leader)
      const usersCurrentTeam = teamsData.find(team =>
        team.members.some(member => member.uid === user.uid)
      )
      setUserTeam(usersCurrentTeam || null)

      // Check if user has a pending request in any team
      const teamWithRequest = teamsData.find(team =>
        team.pendingRequests?.some(req => req.uid === user.uid)
      )

      setPendingRequestTeamId(teamWithRequest ? teamWithRequest.id : null)
    })

    return () => unsubscribe()
  }, [eventId, user])



  const createTeam = async () => {
    if (!user || !newTeamName.trim()) return

    if (isDeadlinePassed()) {
      toast({ title: "Deadline Passed", description: "Registration deadline has passed.", variant: "destructive" });
      return;
    }

    try {
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
        const uniqueCode = `RAIoT-${paddedCount}`;

        // Create new team reference
        const teamRef = doc(collection(db, 'teams'));

        const teamData = {
          eventId,
          teamName: newTeamName.trim(),
          teamCode: uniqueCode,
          leaderUniqueId: user.uniqueId || '',
          members: [{
            uid: user.uid,
            displayName: user.displayName || 'Unknown',
            email: user.email || '',
            uniqueId: user.uniqueId || '',
            university: user.profileData?.organization || '',
            phone: user.profileData?.phone || '',
            joinedAt: new Date()
          }],
          pendingRequests: [],
          leaderId: user.uid,
          memberIds: [user.uid], // IMPORTANT: For Security Rules
          createdAt: new Date(),
          maxSize: maxTeamSize,
          status: 'open'
        }

        // Write operations
        transaction.set(counterRef, { current: newCount }, { merge: true });
        transaction.set(teamRef, teamData);
      });

      toast({
        title: "Team Created",
        description: `Team "${newTeamName}" created!`
      })

      setNewTeamName('')
      setIsCreatingTeam(false)
    } catch (error) {
      console.error('Error creating team:', error)
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleJoinRequest = async (targetTeamId: string) => {
    if (!user) return;

    if (isDeadlinePassed()) {
      toast({ title: "Deadline Passed", description: "Registration deadline has passed.", variant: "destructive" });
      return;
    }

    try {
      if (userTeam) {
        toast({ title: "Already in a Team", description: "You cannot join another team.", variant: "destructive" });
        return;
      }
      if (pendingRequestTeamId) {
        toast({ title: "Request Pending", description: "You already have a pending request.", variant: "destructive" });
        return;
      }

      const requestData: TeamRequest = {
        uid: user.uid,
        displayName: user.displayName || 'Unknown',
        uniqueId: user.uniqueId || '',
        requestedAt: new Date()
      };

      await updateDoc(doc(db, 'teams', targetTeamId), {
        pendingRequests: arrayUnion(requestData)
      });

      toast({ title: "Request Sent", description: "Your join request has been sent to the captain." });

    } catch (error) {
      console.error('Error sending join request:', error);
      toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
    }
  }

  const handleJoinByCaptainId = async () => {
    if (!user || !captainIdInput.trim()) return

    if (isDeadlinePassed()) {
      toast({ title: "Deadline Passed", description: "Registration deadline has passed.", variant: "destructive" });
      return;
    }

    // Find team by Leader's Unique ID
    // We are filtering locally because Firestore query by 'leaderUniqueId' is better, 
    // but we already have all event teams loaded in `teams`
    const targetTeam = teams.find(t =>
      t.leaderUniqueId.toLowerCase() === captainIdInput.trim().toLowerCase()
    );

    if (!targetTeam) {
      toast({
        title: "Team Not Found",
        description: `No team found with Captain ID: ${captainIdInput}`,
        variant: "destructive"
      })
      return
    }

    if (targetTeam.members.length >= targetTeam.maxSize) {
      toast({ title: "Team Full", description: "This team is already full.", variant: "destructive" });
      return;
    }

    if (targetTeam.status !== 'open') {
      toast({ title: "Team Closed", description: "This team is not accepting new members.", variant: "destructive" });
      return;
    }

    await handleJoinRequest(targetTeam.id);
    setCaptainIdInput('');
  }

  const addMemberByUniqueId = async (memberUniqueId: string) => {
    if (!user || !userTeam || userTeam.leaderId !== user.uid || !memberUniqueId.trim()) return

    try {
      if (userTeam.members.length >= userTeam.maxSize) {
        toast({ title: "Team Full", description: "Team has reached maximum capacity.", variant: "destructive" })
        return
      }

      // 1. Find User
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('uniqueId', '==', memberUniqueId.trim()))
      const snap = await getDocs(q)

      if (snap.empty) {
        toast({ title: "User Not Found", description: `No user found with ID: ${memberUniqueId}`, variant: "destructive" })
        return
      }

      const targetUserDoc = snap.docs[0];
      const targetUser = targetUserDoc.data();
      const targetUid = targetUserDoc.id; // Use doc ID as UID source of truth

      // 2. Check Registration for Event (IMPORTANT)
      // Note: In some systems, we might skip this check if we trust the uniqueID. 
      // But strict mode requires registration.
      const regRef = collection(db, 'registrations');
      const regQ = query(regRef, where('userId', '==', targetUid), where('eventId', '==', eventId));
      const regSnap = await getDocs(regQ);

      // Warning: If registration logic varies (e.g. eventId string vs num), verify here.
      if (regSnap.empty) {
        toast({ title: "User Not Registered", description: "This user is not registered for this event.", variant: "destructive" });
        return;
      }

      // 3. Check if already in a team (ANY team for this event)
      // We check the local `teams` state since it contains all teams for this event
      const existingTeam = teams.find(t => t.members.some(m => m.uid === targetUid));
      if (existingTeam) {
        toast({ title: "User Unavailable", description: "User is already in a team for this event.", variant: "destructive" });
        return;
      }

      // 4. Add to Team
      const newMember: TeamMember = {
        uid: targetUid,
        displayName: targetUser.displayName || 'Unknown',
        email: targetUser.email || '',
        uniqueId: targetUser.uniqueId,
        joinedAt: new Date()
      };

      await updateDoc(doc(db, 'teams', userTeam.id), {
        members: arrayUnion(newMember),
        memberIds: arrayUnion(newMember.uid) // IMPORTANT: For Security Rules
      });

      toast({ title: "Member Added", description: `${targetUser.displayName} added to the team!` });

    } catch (error) {
      console.error("Error adding member:", error);
      toast({ title: "Error", description: "Failed to add member.", variant: "destructive" });
    }
  }

  const handleApproveRequest = async (requestUid: string, teamId: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);

      if (!teamDoc.exists()) {
        toast({ title: "Error", description: "Team not found.", variant: "destructive" });
        return;
      }

      const data = teamDoc.data() as Team;
      const request = data.pendingRequests?.find(r => r.uid === requestUid);

      if (!request) {
        toast({ title: "Error", description: "Request not found.", variant: "destructive" });
        return;
      }

      const newMember: TeamMember = {
        uid: request.uid,
        displayName: request.displayName,
        email: '', // Email not always needed in member view, or fetch if needed
        uniqueId: request.uniqueId,
        joinedAt: new Date()
      };

      const updatedRequests = data.pendingRequests?.filter(r => r.uid !== requestUid) || [];
      const updatedMembers = [...(data.members || []), newMember];

      await updateDoc(teamRef, {
        members: updatedMembers,
        memberIds: arrayUnion(newMember.uid), // IMPORTANT: For Security Rules
        pendingRequests: updatedRequests
      });

      toast({ title: "Member Approved", description: `${request.displayName} has been added to the team.` });

    } catch (error) {
      console.error('Error approving member:', error);
      toast({ title: "Error", description: "Failed to approve member.", variant: "destructive" });
    }
  }

  const handleRejectRequest = async (requestUid: string, teamId: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);

      if (!teamDoc.exists()) {
        toast({ title: "Error", description: "Team not found.", variant: "destructive" });
        return;
      }

      const data = teamDoc.data() as Team;
      const updatedRequests = data.pendingRequests?.filter(r => r.uid !== requestUid) || [];

      await updateDoc(teamRef, {
        pendingRequests: updatedRequests
      });
      toast({ title: "Request Rejected", description: "Join request rejected." });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    }
  }

  const updateTeamName = async () => {
    if (!userTeam || !editingTeamName.trim() || userTeam.leaderId !== user?.uid) return
    try {
      await updateDoc(doc(db, 'teams', userTeam.id), { teamName: editingTeamName.trim() })
      toast({ title: "Updated", description: "Team name updated." })
      setIsEditingName(false)
    } catch (error) {
      toast({ title: "Error", variant: "destructive", description: "Failed to update name." })
    }
  }

  if (!user) return null

  // CASE 1: User is already in a team
  if (userTeam) {
    const isLeader = userTeam.leaderId === user.uid;
    const pendingCount = userTeam.pendingRequests?.length || 0;

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {userTeam.teamName}
                  {isLeader && <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 ml-2"><Crown className="w-3 h-3 mr-1" /> Captain</Badge>}
                </CardTitle>
                <CardDescription className="mt-1">
                  Team Code: <span className="font-mono font-bold text-primary">{userTeam.teamCode}</span>
                </CardDescription>

              </div>
              {isLeader && (
                <Button variant="outline" size="sm" onClick={() => { setIsEditingName(true); setEditingTeamName(userTeam.teamName); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Name
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingName && (
              <div className="flex gap-2 mb-4">
                <Input value={editingTeamName} onChange={(e) => setEditingTeamName(e.target.value)} />
                <Button onClick={updateTeamName}>Save</Button>
                <Button variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Members ({userTeam.members.length}/{userTeam.maxSize})</h4>
              {userTeam.members.map((member) => (
                <div key={member.uid} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {member.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.displayName}</p>
                      <p className="text-xs text-muted-foreground">{member.uniqueId}</p>
                    </div>
                  </div>
                  {member.uid === userTeam.leaderId && <Badge variant="secondary">Leader</Badge>}
                </div>
              ))}
            </div>

            {/* LEADER: Add Member */}
            {isLeader && userTeam.members.length < userTeam.maxSize && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Add Member Directly
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Unique ID (e.g. RAIoT00025)"
                    className="max-w-xs"
                    id="add-member-input" // Helper ID
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.currentTarget as HTMLInputElement).value;
                        addMemberByUniqueId(val);
                        (e.currentTarget as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const input = document.getElementById('add-member-input') as HTMLInputElement;
                    addMemberByUniqueId(input.value);
                    input.value = '';
                  }}>Add</Button>
                </div>
              </div>
            )}

            {/* LEADER: Pending Requests */}
            {isLeader && pendingCount > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-medium text-yellow-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Requests ({pendingCount})
                </h4>
                {userTeam.pendingRequests?.map((req) => (
                  <div key={req.uid} className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center font-bold text-yellow-500">
                        {req.displayName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{req.displayName}</p>
                        <p className="text-xs text-muted-foreground">{req.uniqueId}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700" onClick={() => handleApproveRequest(req.uid, userTeam.id)}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleRejectRequest(req.uid, userTeam.id)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // CASE 2: Pending Request State
  if (pendingRequestTeamId) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-8 text-center space-y-4">
          <Clock className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Join Request Pending</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Your request has been sent to the team captain. You will be notified once they approve your request.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // CASE 3: Not in a Team - Create or Join
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Option A: Create Team */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create New Team
          </CardTitle>
          <CardDescription>Start a new team and become the captain.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {isCreatingTeam ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  placeholder="Enter team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createTeam} className="flex-1">Confirm</Button>
                <Button variant="ghost" onClick={() => setIsCreatingTeam(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" onClick={() => setIsCreatingTeam(true)} disabled={isDeadlinePassed()}>
              <Plus className="w-4 h-4 mr-2" /> Create Team {isDeadlinePassed() && '(Closed)'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Option B: Join Team */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Join Existing Team
          </CardTitle>
          <CardDescription>Join by entering the Captain&apos;s Unique ID.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Captain&apos;s Unique ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. RAIoT00024"
                value={captainIdInput}
                onChange={(e) => setCaptainIdInput(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleJoinByCaptainId}
            disabled={!captainIdInput.trim() || isDeadlinePassed()}
          >
            Request to Join {isDeadlinePassed() && '(Closed)'}
          </Button>
        </CardContent>
      </Card>

      {/* Available Teams List (Optional but helpful) */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Available Teams</CardTitle>
            <CardDescription>Open teams looking for members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.filter(t => t.status === 'open' && t.members.length < t.maxSize).map(team => (
                <div key={team.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-semibold truncate">{team.teamName}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Captain: <span className="font-mono">{team.leaderUniqueId}</span></p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                      {team.members.length} / {team.maxSize} members
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleJoinRequest(team.id)} disabled={isDeadlinePassed()}>
                      Join
                    </Button>
                  </div>
                </div>
              ))}
              {teams.filter(t => t.status === 'open' && t.members.length < t.maxSize).length === 0 && (
                <div className="md:col-span-3 text-center py-8 text-muted-foreground">
                  No teams available yet. Be the first to create one!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
