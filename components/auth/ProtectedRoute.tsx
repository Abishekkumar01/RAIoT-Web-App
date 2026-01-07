'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { UserRole } from '@/lib/types/user'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  redirectTo?: string
}

const roleHierarchy: Record<UserRole, number> = {
  public: 0,
  guest: 1,
  member: 2,
  junior_developer: 3,
  senior_developer: 4,
  student_coordinator: 5,
  inventory_head: 6,
  public_relation_head: 7,
  content_creation_head: 8,
  management_head: 9,
  technical_head: 10,
  operations: 5,
  vice_president: 18,
  president: 19,
  admin: 20,
  superadmin: 30
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'member',
  redirectTo = '/'
}) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo)
        return
      }

      if (requiredRole && roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, loading, requiredRole, redirectTo, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || (requiredRole && roleHierarchy[user.role] < roleHierarchy[requiredRole])) {
    return null
  }

  return <>{children}</>
}
