"use client";
import React from 'react';

import { useAuth } from "@/lib/contexts/AuthContext";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import MaintenanceScreen from "@/components/ui/MaintenanceScreen";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

const EXEMPT_ROLES = [
    'admin',
    'superadmin',
    'president',
    'vice_president',
    'operations_head',
    'management_head',
    'public_relation_head',
    'content_creation_head',
    'technical_head',
    'inventory_head',
    'operations',
    'student_coordinator',
    'junior_developer',
    'senior_developer'
];

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
    const { user, loading: authLoading } = useAuth();
    const pathname = usePathname();

    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || maintenanceLoading || authLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If maintenance mode is OFF, just show content
    if (!isMaintenanceMode) {
        return <>{children}</>;
    }

    // Maintenance is ON. Check exemptions.

    // 1. Allow Auth pages so admins can log in
    if (pathname?.startsWith('/auth')) {
        return <>{children}</>;
    }

    // 2. Allow privileged users
    if (user && EXEMPT_ROLES.includes(user.role)) {
        return (
            <>
                {/* Optional: Add a subtle indicator that maintenance is active */}
                <div className="fixed top-0 left-0 w-full bg-yellow-500/10 border-b border-yellow-500/50 text-yellow-500 text-[10px] px-2 py-0.5 z-[10000] text-center pointer-events-none">
                    MAINTENANCE MODE ACTIVE
                </div>
                {children}
            </>
        );
    }

    // 3. Block everyone else (Guests, Members, Unauthenticated non-auth-page visitors)
    return <MaintenanceScreen />;
}
