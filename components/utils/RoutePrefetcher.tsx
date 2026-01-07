"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * RoutePrefetcher
 * 
 * This component aggressively prefetches critical routes in the background
 * to ensure instant navigation when the user clicks on them.
 * It renders hidden Links which Next.js will automatically prefetch.
 */
export function RoutePrefetcher() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Programmatic prefetching for deeper routes that might not be in the hidden links
        const routesToPrefetch = [
            "/dashboard",
            "/admin",
            "/events",
            "/projects",
            "/leaders",
            "/gallery"
        ];

        // staggering prefetch to avoid network congestion on initial load
        const prefetchRoutes = async () => {
            // Wait a bit for the main page to settle
            await new Promise(resolve => setTimeout(resolve, 2500));

            for (const route of routesToPrefetch) {
                router.prefetch(route);
                // Small delay between prefetches
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        };

        if (typeof window !== 'undefined') { // Safety check
            prefetchRoutes();
        }

    }, [router]);

    if (!mounted) return null;

    // We also render hidden links as a fallback/reinforcement for Next.js to pickup
    // This is often more reliable than imperative router.prefetch in some Next.js versions
    return (
        <div aria-hidden="true" style={{ display: "none", visibility: "hidden", width: 0, height: 0 }}>
            <Link href="/dashboard" prefetch={true}>Dashboard</Link>
            <Link href="/admin" prefetch={true}>Admin</Link>
            <Link href="/events" prefetch={true}>Events</Link>
            <Link href="/projects" prefetch={true}>Projects</Link>
            <Link href="/leaders" prefetch={true}>Leaders</Link>
        </div>
    );
}
