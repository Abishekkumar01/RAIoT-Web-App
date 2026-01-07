'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User, UserRole } from '@/lib/types/user'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Shield, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import Loader from '@/components/ui/Loader'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function MembersListPage() {
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const { user: currentUser } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // Only allow admins/leaders to view this
        const allowedRoles = ['admin', 'superadmin', 'president', 'vice_president', 'management_head']
        if (currentUser && !allowedRoles.includes(currentUser.role)) {
            // redirect or show unauthorized
        }
    }, [currentUser])

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, 'users')
                const q = query(usersRef, orderBy('createdAt', 'desc'))
                const querySnapshot = await getDocs(q)

                const fetchedUsers: User[] = []
                querySnapshot.forEach((doc) => {
                    fetchedUsers.push(doc.data() as User)
                })

                setUsers(fetchedUsers)
                setFilteredUsers(fetchedUsers)
            } catch (error) {
                console.error('Error fetching users:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [])

    useEffect(() => {
        const term = searchTerm.toLowerCase()
        const filtered = users.filter(user =>
            user.displayName.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.profileData?.rollNumber?.toLowerCase().includes(term) ||
            user.role.toLowerCase().includes(term)
        )
        setFilteredUsers(filtered)
    }, [searchTerm, users])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Manage Members</h1>
                    <p className="text-muted-foreground">View and manage all registered accounts</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, roll no..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                    <Link
                        key={user.uid}
                        href={user.profileData?.rollNumber ? `/members/${user.profileData.rollNumber}` : '#'}
                        className={!user.profileData?.rollNumber ? 'cursor-not-allowed opacity-70' : ''}
                    >
                        <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer group">
                            <CardContent className="p-4 flex items-center gap-4">
                                <Avatar className="h-12 w-12 border border-border group-hover:border-primary/50 transition-colors">
                                    <AvatarImage src={user.profileData?.photoUrl} alt={user.displayName} />
                                    <AvatarFallback>{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold truncate pr-2">{user.displayName}</h3>
                                        {['admin', 'superadmin', 'president'].includes(user.role) ? (
                                            <Shield className="h-3 w-3 text-red-500" />
                                        ) : (
                                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] px-1 h-5">{user.role}</Badge>
                                        {user.profileData?.rollNumber && (
                                            <span className="font-mono">{user.profileData.rollNumber}</span>
                                        )}
                                    </div>
                                    {user.profileData?.tagline && (
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{user.profileData.tagline}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No members found matching your search.
                    </div>
                )}
            </div>
        </div>
    )
}
