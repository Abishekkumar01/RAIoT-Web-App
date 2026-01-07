'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'

export default function OperationsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        // We use 'student_coordinator' as the base requirement. 
        // Higher roles (like Admin) will also pass due to hierarchy if we used > comparison, 
        // but the sidebar links will adapt based on the user's actual role.
        <ProtectedRoute requiredRole="student_coordinator">
            <div className="flex h-screen bg-background">
                <div className="w-64 flex-shrink-0">
                    <DashboardSidebar />
                </div>
                <main className="flex-1 overflow-auto">
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    )
}
