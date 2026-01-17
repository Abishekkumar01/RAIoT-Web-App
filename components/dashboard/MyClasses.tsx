
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface ClassSession {
    id: string
    dateStr: string
    subject?: string
    timeRange?: string
    location?: string
    type: 'regular' | 'holiday'
}

interface AttendanceRecord {
    status: 'present' | 'absent' | 'late' | 'leave'
}

export default function MyClasses() {
    const { user } = useAuth()
    const [date, setDate] = useState(new Date())
    const [classSession, setClassSession] = useState<ClassSession | null>(null)
    const [userStatus, setUserStatus] = useState<AttendanceRecord['status'] | null>(null)
    const [loading, setLoading] = useState(true)

    // Navigate dates
    const handlePrevDay = () => setDate(prev => subDays(prev, 1))
    const handleNextDay = () => setDate(prev => addDays(prev, 1))
    const handleToday = () => setDate(new Date())

    useEffect(() => {
        if (!user) return

        const dateStr = format(date, 'yyyy-MM-dd')

        // 1. Listen to Class Session (Attendance Summary)
        const summaryRef = doc(db, 'attendance_summaries', dateStr)
        const unsubscribeSummary = onSnapshot(summaryRef, (docSnap) => {
            if (docSnap.exists()) {
                setClassSession({ id: docSnap.id, ...docSnap.data() } as ClassSession)
            } else {
                setClassSession(null)
            }
            setLoading(false)
        }, (error) => {
            console.error("Error fetching class summary:", error)
            setLoading(false)
        })

        // 2. Listen to User's Attendance Status
        // We need to find the record for this user and this date.
        // ID format in AttendanceMarker: `${dateStr}_${student.id}`
        const recordId = `${dateStr}_${user.uid}`
        const attendanceRef = doc(db, 'attendance', recordId)

        const unsubscribeAttendance = onSnapshot(attendanceRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserStatus(docSnap.data().status as AttendanceRecord['status'])
            } else {
                setUserStatus(null)
            }
        }, (error) => {
            console.error("Error fetching attendance status:", error)
        })

        return () => {
            unsubscribeSummary()
            unsubscribeAttendance()
        }
    }, [date, user])

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'present': return 'bg-green-500' // Green dot
            case 'late': return 'bg-orange-500'
            case 'absent': return 'bg-red-500' // Red dot
            case 'leave': return 'bg-purple-500'
            default: return 'bg-gray-300' // Unmarked
        }
    }

    const getStatusText = (status: string | null) => {
        if (!classSession) return "No Class"
        if (classSession.type === 'holiday') return "Holiday"
        switch (status) {
            case 'present': return 'Present'
            case 'late': return 'Late'
            case 'absent': return 'Absent'
            case 'leave': return 'On Leave'
            default: return 'Not Marked'
        }
    }

    // If user is not dev member, maybe don't show or show differently?
    // Assuming this component is only rendered for members.

    return (
        <Card className="mb-6">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg font-bold text-primary">My Classes</CardTitle>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-background rounded-md border shadow-sm">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-md rounded-r-none" onClick={handlePrevDay}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="px-3 h-8 flex items-center justify-center border-x text-sm font-medium w-[140px]">
                                {isSameDay(date, new Date()) ? "Today" : format(date, 'MMMM d, yyyy')}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-md rounded-l-none" onClick={handleNextDay}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleToday} title="Jump to Today">
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : !classSession ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        <p>No classes scheduled for this date.</p>
                    </div>
                ) : classSession.type === 'holiday' ? (
                    <div className="text-center py-8 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <h3 className="text-xl font-bold text-green-500 mb-1">Holiday 🏖️</h3>
                        <p className="text-green-600/80">No classes today. Enjoy your break!</p>
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        {/* Day Header */}
                        <div className="bg-muted/40 px-4 py-2 font-semibold text-sm border-b uppercase tracking-wide text-muted-foreground">
                            {format(date, 'EEEE')}
                        </div>
                        {/* Class Row */}
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 group hover:bg-muted/50 transition-colors">
                            {/* Time */}
                            <div className="min-w-[120px] text-sm font-medium text-cyan-600 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {classSession.timeRange || "Time TBA"}
                            </div>

                            {/* Status Indicator (Mobile: right aligned, Desktop: middle) */}
                            <div className="flex-shrink-0 order-first sm:order-none">
                                <div className={cn("w-3 h-3 rounded-full shadow-sm ring-2 ring-background", getStatusColor(userStatus))} title={getStatusText(userStatus)} />
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                                <h4 className="font-semibold text-base text-foreground">
                                    {classSession.subject || "Untitled Class"}
                                </h4>
                                {classSession.location && (
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {classSession.location}
                                    </div>
                                )}
                                <div className="sm:hidden mt-2 text-xs font-medium text-muted-foreground">
                                    Status: <span className={cn(
                                        userStatus === 'present' ? "text-green-500" :
                                            userStatus === 'absent' ? "text-red-500" :
                                                userStatus === 'late' ? "text-orange-500" : "text-gray-500"
                                    )}>{getStatusText(userStatus)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
