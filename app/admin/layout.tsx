'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex min-h-screen bg-background">
        <div className="w-64 flex-shrink-0 sticky top-0 h-screen">
          <DashboardSidebar />
        </div>
        <main className="flex-1">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
