"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileSpreadsheet, Users, Calendar } from 'lucide-react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

interface Event {
  id: string
  title: string
  date: string
  type: string
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
  userData?: any
}

interface Team {
  id: string
  eventId: string
  teamName: string
  members: any[]
  leaderId: string
  createdAt: Date
}

export default function AdminEventExport() {
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [exportType, setExportType] = useState<'registrations' | 'teams'>('teams')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, 'events')
        const snapshot = await getDocs(eventsRef)
        const eventsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[]
        setEvents(eventsData)
      } catch (error) {
        console.error('Error fetching events:', error)
      }
    }

    fetchEvents()
  }, [])

  const generateCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header] || ''
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportRegistrations = async () => {
    if (!selectedEvent) {
      toast({
        title: "No Event Selected",
        description: "Please select an event to export registrations.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log('Starting export for event:', selectedEvent)
      // Get registrations for the selected event
      const registrationsRef = collection(db, 'registrations')
      const q = query(registrationsRef, where('eventId', '==', selectedEvent))
      const snapshot = await getDocs(q)

      console.log('Registrations found:', snapshot.size)

      if (snapshot.empty) {
        toast({
          title: "No Registrations",
          description: "There are no registrations for this event yet.",
        })
        setLoading(false)
        return
      }

      const registrations: Registration[] = []

      // Get user data for each registration
      for (const regDoc of snapshot.docs) {
        const regData = regDoc.data() as Registration

        // Ensure userId exists before querying
        if (regData.userId) {
          try {
            const userRef = doc(db, 'users', regData.userId)
            const userDoc = await getDoc(userRef)
            if (userDoc.exists()) {
              regData.userData = userDoc.data()
            }
          } catch (error) {
            console.error(`Error fetching user data for ${regData.userId}:`, error)
          }
        }
        registrations.push(regData)
      }

      console.log('Processed registrations:', registrations.length)

      // Helper for date formatting
      const formatDateSafe = (val: any) => {
        if (!val) return 'N/A'
        try {
          // Handle Firestore Timestamp
          if (typeof val.toDate === 'function') {
            return val.toDate().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
          // Handle JS Date or string
          const date = new Date(val)
          if (isNaN(date.getTime())) return 'N/A'

          return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        } catch (e) {
          return 'N/A'
        }
      }

      // Prepare CSV data
      const csvData = registrations.map(reg => ({
        'Registration ID': reg.id,
        'User ID': reg.userId || 'N/A',
        'Unique ID': reg.userData?.uniqueId || 'N/A',
        'Full Name': reg.userData?.displayName || 'N/A',
        'Email': reg.userData?.email || 'N/A',
        'Phone': reg.userData?.profileData?.phone || 'N/A',
        'University': reg.userData?.profileData?.organization || 'N/A',
        'Department': reg.userData?.profileData?.department || 'N/A',
        'Year': reg.userData?.profileData?.year || 'N/A',
        'Roll Number': reg.userData?.profileData?.rollNumber || 'N/A',
        'Event Title': reg.eventTitle || 'N/A',
        'Event Type': reg.eventType || 'N/A',
        'Event Date': reg.eventDate || 'N/A',
        'Status': reg.status || 'N/A',
        'Registration Date': formatDateSafe(reg.createdAt)
      }))

      const headers = [
        'Registration ID', 'User ID', 'Unique ID', 'Full Name', 'Email', 'Phone',
        'University', 'Department', 'Year', 'Roll Number', 'Event Title',
        'Event Type', 'Event Date', 'Status', 'Registration Date'
      ]

      const eventTitle = events.find(e => e.id === selectedEvent)?.title || 'Event'
      const cleanEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `${cleanEventTitle}_Registrations_${new Date().toISOString().split('T')[0]}.csv`

      console.log('Generating CSV:', filename)
      generateCSV(csvData, headers, filename)

      toast({
        title: "Export Successful",
        description: `Registrations exported to ${filename}`
      })
    } catch (error) {
      console.error('Error exporting registrations:', error)
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export registrations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const exportTeams = async () => {
    if (!selectedEvent) {
      toast({
        title: "No Event Selected",
        description: "Please select an event to export teams.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Get teams for the selected event
      const teamsRef = collection(db, 'teams')
      const q = query(teamsRef, where('eventId', '==', selectedEvent))
      const snapshot = await getDocs(q)

      const teams: Team[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[]

      // Prepare CSV data
      const csvData: any[] = []

      // Helper for date formatting
      const formatDateSafe = (val: any) => {
        if (!val) return 'N/A'
        try {
          // Handle Firestore Timestamp
          if (typeof val.toDate === 'function') {
            return val.toDate().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
          // Handle JS Date or string
          const date = new Date(val)
          if (isNaN(date.getTime())) return 'N/A'

          return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        } catch (e) {
          return 'N/A'
        }
      }

      teams.forEach(team => {
        team.members.forEach((member, index) => {
          csvData.push({
            'Team Name': team.teamName,
            'Member Position': index + 1,
            'Is Leader': member.uid === team.leaderId ? 'Yes' : 'No',
            'Unique ID': member.uniqueId || 'N/A',
            'Full Name': member.displayName || 'N/A',
            'Email': member.email || 'N/A',
            'Phone': member.phone || 'N/A',
            'University': member.university || 'N/A',
            'Team Created': formatDateSafe(team.createdAt)
          })
        })
      })

      const headers = [
        'Team Name', 'Member Position', 'Is Leader',
        'Unique ID', 'Full Name', 'Email', 'Phone', 'University',
        'Team Created'
      ]

      const eventTitle = events.find(e => e.id === selectedEvent)?.title || 'Event'
      const filename = `${eventTitle}_Teams_${new Date().toISOString().split('T')[0]}.csv`

      generateCSV(csvData, headers, filename)

      toast({
        title: "Export Successful",
        description: `Teams exported to ${filename}`
      })
    } catch (error) {
      console.error('Error exporting teams:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export teams. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (exportType === 'registrations') {
      exportRegistrations()
    } else {
      exportTeams()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Export Event Data
        </CardTitle>
        <CardDescription>
          Generate Excel-compatible CSV reports for event registrations and team data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Event</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} ({event.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Export Type</label>
            <Select value={exportType} onValueChange={(value: 'registrations' | 'teams') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teams">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Teams
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {exportType === 'registrations'
                ? 'Export individual registrations with user details'
                : 'Export team information with member details'
              }
            </span>
          </div>

          <Button
            onClick={handleExport}
            disabled={!selectedEvent || loading}
            className="ml-4"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {exportType === 'registrations' ? 'Registrations' : 'Teams'}
              </>
            )}
          </Button>
        </div>



        {exportType === 'teams' && (
          <div className="text-sm text-muted-foreground">
            <p>• Includes: Team details, member information, leadership status, join dates</p>
            <p>• Format: CSV file with one row per team member for comprehensive analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
