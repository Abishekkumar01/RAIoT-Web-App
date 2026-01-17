'use client'

import { useState } from 'react'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'

export default function OperationsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        // We use 'student_coordinator' as the base requirement. 
        // Higher roles (like Admin) will also pass due to hierarchy if we used > comparison, 
        // but the sidebar links will adapt based on the user's actual role.
        <ProtectedRoute requiredRole="student_coordinator">
            <div className="flex min-h-screen bg-background relative">
                {/* Mobile Toggle Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary/20 backdrop-blur-md rounded-lg border border-primary/50 text-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] active:scale-95 transition-all"
                >
                    <div className={`space-y-1.5 transition-all duration-300 ${isMobileMenuOpen ? "rotate-180" : ""}`}>
                        <span className={`block w-6 h-0.5 bg-current transition-all ${isMobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
                        <span className={`block w-4 h-0.5 bg-current transition-all ${isMobileMenuOpen ? "opacity-0" : ""}`} />
                        <span className={`block w-6 h-0.5 bg-current transition-all ${isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                    </div>
                </button>

                {/* Backdrop for mobile */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar Container - FIXED */}
                <div className={`
                  fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 h-screen transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  ${isMobileMenuOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 md:translate-x-0 md:opacity-100"}
                `}>
                    <DashboardSidebar onClose={() => setIsMobileMenuOpen(false)} />
                </div>

                {/* Main Content - SCROLLS WINDOW */}
                <main className="flex-1 min-w-0 transition-all duration-300 md:ml-64">
                    <div className="p-4 pt-16 md:pt-6 md:p-6 pb-24 md:pb-6">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    )
}
