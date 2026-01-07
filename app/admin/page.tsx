"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  Calendar,
  UserPlus,
  Settings,
  Bell,
  Activity,
  Clock,
  Loader2,
  LayoutDashboard,
  ClipboardList,
  GraduationCap,
  Award,
  Image as ImageIcon,
  LogOut,
  User as UserIcon
} from "lucide-react"
import Link from "next/link"
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalEvents: 0,
    upcomingEventsCount: 0,
    pendingApprovals: 0,
  })

  // Notifications state
  const [notifications, setNotifications] = useState<{ id: string, title: string, time: string, type: 'alert' | 'info' }[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // ... (existing fetch logic for members, events)
        const studentsColl = collection(db, "students") // Attendance list
        const totalMembersSnap = await getCountFromServer(studentsColl)
        const totalMembers = totalMembersSnap.data().count

        const eventsColl = collection(db, "events")
        const totalEventsSnap = await getCountFromServer(eventsColl)
        const totalEvents = totalEventsSnap.data().count

        const todayStr = new Date().toISOString().split('T')[0]
        const upcomingQuery = query(eventsColl, where("date", ">=", todayStr), orderBy("date", "asc"))
        const upcomingSnap = await getDocs(upcomingQuery)
        const upcomingEventsCount = upcomingSnap.size

        // Generate Notifications from real data
        const newNotifications: { id: string, title: string, time: string, type: 'alert' | 'info' }[] = []

        // 1. Upcoming Events Notifications
        upcomingSnap.docs.forEach(doc => {
          const data = doc.data()
          newNotifications.push({
            id: `evt-${doc.id}`,
            title: `Upcoming Event: ${data.title}`,
            time: data.date,
            type: 'info'
          })
        })

        // 2. Recent Members (simulate "new" notification for very recent ones)
        // We can just add a generic "System Healthy" or similar if no members, to show it works
        // But let's check for recent users if we can. 
        // Re-using the logic we had before for recent activities but just for notifications:
        const usersColl = collection(db, "users")
        const recentUsersQuery = query(usersColl, orderBy("createdAt", "desc"), limit(3))
        const recentUsersSnap = await getDocs(recentUsersQuery)

        recentUsersSnap.forEach(doc => {
          const data = doc.data()
          if (data.createdAt) {
            // Check if created in last 24h for "New Alert" feel, strictly.
            // For now, just show them as recent registrations.
            newNotifications.push({
              id: `user-${doc.id}`,
              title: `New Member: ${data.displayName || 'User'}`,
              time: 'Recently registered',
              type: 'info'
            })
          }
        })

        setNotifications(newNotifications)

        setStats({
          totalMembers,
          totalEvents,
          upcomingEventsCount,
          pendingApprovals: 0,
        })

      } catch (error) {
        console.error("Error fetching admin stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50 blur-3xl pointer-events-none" />


      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.displayName || 'Admin'}
          </p>
        </div>
        <div className="flex items-center space-x-2">

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <h4 className="font-semibold leading-none">Notifications</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {notifications.length} unread messages.
                </p>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-4 space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    No new notifications.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className={`mt-1 h-2 w-2 rounded-full ${item.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer w-full flex items-center">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await logout();
                    router.push('/auth/login');
                  } catch (error) {
                    console.error("Logout failed", error);
                  }
                }}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Total registered users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.upcomingEventsCount} upcoming events
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Require your attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Club Dashboard</CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Overview</div>
                <p className="text-xs text-muted-foreground">View club stats</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/members">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Members</div>
                <p className="text-xs text-muted-foreground">View all members</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/events">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Events</div>
                <p className="text-xs text-muted-foreground">Create & edit events</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/attendance">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Attendance</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Attendance</div>
                <p className="text-xs text-muted-foreground">Track participation</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Users</div>
                <p className="text-xs text-muted-foreground">Roles & permissions</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/trainees">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Trainees</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Trainees</div>
                <p className="text-xs text-muted-foreground">Recruitment & apps</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/leaders">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Leaders</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Leaders</div>
                <p className="text-xs text-muted-foreground">Team leadership</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/gallery">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Gallery</CardTitle>
                <ImageIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Gallery</div>
                <p className="text-xs text-muted-foreground">Photos & albums</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/contact">
            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Contact</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Contact</div>
                <p className="text-xs text-muted-foreground">Inquiries & msgs</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div >
  )
}