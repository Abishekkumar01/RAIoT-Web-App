'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Archive, Users, FileBarChart, ArrowRight, Calendar, Image as ImageIcon, User, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDashboardStats } from '@/app/actions/dashboard';

export default function OperationsDashboard() {
    const { user } = useAuth()
    const [studentCount, setStudentCount] = useState(0)
    const [traineeStats, setTraineeStats] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
    })
    const [eventCount, setEventCount] = useState(0)
    const [galleryStats, setGalleryStats] = useState({ totalSections: 0, totalImages: 0 })

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Fetch Students Count
                const studentsColl = collection(db, "students");
                const studentsSnapshot = await getCountFromServer(studentsColl);
                setStudentCount(studentsSnapshot.data().count);

                // Fetch Trainee Stats
                const traineesColl = collection(db, "trainees");

                // Total Trainees
                const totalSnapshot = await getCountFromServer(traineesColl);

                // Pending
                const pendingQuery = query(traineesColl, where("status", "==", "Pending"));
                const pendingSnapshot = await getCountFromServer(pendingQuery);

                // Accepted
                const acceptedQuery = query(traineesColl, where("status", "==", "Accepted"));
                const acceptedSnapshot = await getCountFromServer(acceptedQuery);

                // Rejected
                const rejectedQuery = query(traineesColl, where("status", "==", "Rejected"));
                const rejectedSnapshot = await getCountFromServer(rejectedQuery);

                setTraineeStats({
                    total: totalSnapshot.data().count,
                    pending: pendingSnapshot.data().count,
                    accepted: acceptedSnapshot.data().count,
                    rejected: rejectedSnapshot.data().count
                });

            } catch (err) {
                console.error("Error fetching dashboard stats", err);
            }
        }

        const fetchPRStats = async () => {
            const stats = await getDashboardStats();
            setEventCount(stats.eventCount);
            setGalleryStats(stats.galleryStats);
        }

        fetchCounts();
        fetchPRStats();
        fetchCounts();
    }, [])

    return (
        <div className="space-y-6">
            {/* Background Gradient */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50 blur-3xl pointer-events-none" />

            <div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Welcome back, {user?.displayName || 'Coordinator'}!
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Here's your operations control center.
                </p>
            </div>



            {/* Dashboard Overview - Stat Cards (Student Coordinator) */}
            {
                (user?.role === 'student_coordinator' || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
                        {/* Total Students (Registered Members) */}
                        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{studentCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Registered members
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Trainees (Applications) */}
                        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                                <FileText className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{traineeStats.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    Trainee applications
                                </p>
                            </CardContent>
                        </Card>

                        {/* Pending Approval */}
                        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                                <Clock className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{traineeStats.pending}</div>
                                <p className="text-xs text-muted-foreground">
                                    Awaiting review
                                </p>
                            </CardContent>
                        </Card>

                        {/* Accepted */}
                        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Accepted</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{traineeStats.accepted}</div>
                                <p className="text-xs text-muted-foreground">
                                    Joined trainees
                                </p>
                            </CardContent>
                        </Card>

                        {/* Rejected */}
                        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{traineeStats.rejected}</div>
                                <p className="text-xs text-muted-foreground">
                                    Applications declined
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Dashboard Overview - Stat Cards (Public Relation Head) */}
            {
                (user?.role === 'public_relation_head' || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8 ${(user?.role === 'admin' || user?.role === 'superadmin') ? 'mt-8' : ''}`}>
                        {/* Total Events */}
                        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                                <Calendar className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{eventCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Organized events
                                </p>
                            </CardContent>
                        </Card>

                        {/* Gallery Albums */}
                        <Card className="bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Gallery Albums</CardTitle>
                                <ImageIcon className="h-4 w-4 text-pink-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{galleryStats.totalSections}</div>
                                <p className="text-xs text-muted-foreground">
                                    Photo collections
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Photos */}
                        <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20 shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
                                <ImageIcon className="h-4 w-4 text-cyan-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{galleryStats.totalImages}</div>
                                <p className="text-xs text-muted-foreground">
                                    Captured moments
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )
            }


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Attendance & Trainee Cards - STUDENT COORDINATOR ONLY */}
                {(user?.role === 'student_coordinator' || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <>
                        <Link href="/operations/attendance">
                            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Mark Attendance</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">New Session</div>
                                    <p className="text-xs text-muted-foreground">
                                        Scan ID cards to mark attendance
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/operations/history">
                            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Attendance History</CardTitle>
                                    <Archive className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Records</div>
                                    <p className="text-xs text-muted-foreground">
                                        View past attendance logs
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/operations/manage-trainee">
                            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Manage Trainee</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Trainees</div>
                                    <p className="text-xs text-muted-foreground">
                                        View and manage trainees
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </>
                )}

                {/* Events & Gallery Cards - PUBLIC RELATION HEAD ONLY */}
                {(user?.role === 'public_relation_head' || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <>
                        <Link href="/operations/events">
                            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Manage Events</CardTitle>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Events</div>
                                    <p className="text-xs text-muted-foreground">
                                        Create and edit events
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/operations/gallery">
                            <Card className="h-full relative overflow-hidden border-muted-foreground/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group bg-card/50 backdrop-blur-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Manage Gallery</CardTitle>
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Gallery</div>
                                    <p className="text-xs text-muted-foreground">
                                        Configure gallery sources
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </>
                )}

                <Link href="/dashboard/profile">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">My Profile</CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Profile</div>
                            <p className="text-xs text-muted-foreground">
                                View and edit your details
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Quick Access Section - COORDINATOR ONLY */}
            {
                (user?.role === 'student_coordinator' || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold mb-4">Operations & Management</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Link href="/operations/attendance">
                                <Card className="hover:border-primary transition-all duration-300 hover:shadow-md cursor-pointer group bg-card hover:bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <ClipboardList className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="font-semibold group-hover:text-primary transition-colors">Mark New Attendance</span>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Link href="/operations/history">
                                <Card className="hover:border-primary transition-all duration-300 hover:shadow-md cursor-pointer group bg-card hover:bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Archive className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="font-semibold group-hover:text-primary transition-colors">View History</span>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Link href="/operations/manage-trainee">
                                <Card className="hover:border-primary transition-all duration-300 hover:shadow-md cursor-pointer group bg-card hover:bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Users className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="font-semibold group-hover:text-primary transition-colors">Manage Trainees</span>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>
                )
            }

            {/* Quick Access Section - PR HEAD ONLY */}
            {
                (user?.role === 'public_relation_head' || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold mb-4">Content Management</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Link href="/operations/events">
                                <Card className="hover:border-primary transition-all duration-300 hover:shadow-md cursor-pointer group bg-card hover:bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Calendar className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="font-semibold group-hover:text-primary transition-colors">Manage Events</span>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Link href="/operations/gallery">
                                <Card className="hover:border-primary transition-all duration-300 hover:shadow-md cursor-pointer group bg-card hover:bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <ImageIcon className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="font-semibold group-hover:text-primary transition-colors">Manage Gallery</span>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
