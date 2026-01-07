"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ScrollRevealRightProps {
    children: React.ReactNode;
    className?: string;
    xStart?: number; // Starting X position (off-screen positive)
}

export default function ScrollRevealRight({
    children,
    className = "",
    xStart = 300,
}: ScrollRevealRightProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["0 1", "1 1"], // Start when top enters bottom of viewport, end when bottom leaves. 
        // Actually, for "slides to center", we want it to animate *as it comes into view*.
        // "start completely outside... slowly slide toward center... happen while scrolling"
        // Let's try offset ["start end", "center center"] => standard for "animate in as it scrolls to center"
        // But the user wants it to *move*.
    });

    // Re-thinking existing HeroScrollAnimation logic:
    // It used useMotionValueEvent to set state. 
    // The user wants "move on scroll... not instant... happen only while scrolling".
    // This implies mapping scroll position directly to X position.

    // Usage of useTransform:
    // When element top is at viewport bottom (start 100%), x should be xStart.
    // When element center is at viewport center (center center), x should be 0.

    // Let's refine offset.
    // "start 90%": starts just before appearing? No, start 100% or "start end".
    const x = useTransform(scrollYProgress, [0, 1], [xStart, 0]);
    // Note: scrollYProgress is 0 when target is at 'start' of offset, 1 when at 'end'.

    // We'll use a specific offset for the scroll link.
    const { scrollYProgress: smoothProgress } = useScroll({
        target: ref,
        offset: ["start 100%", "center 55%"]
    });

    const xMove = useTransform(smoothProgress, [0, 1], [xStart, 0]);
    const opacity = useTransform(smoothProgress, [0, 0.3], [0, 1]); // Fade in quickly, then just move

    return (
        <motion.div
            ref={ref}
            className={className}
            style={{ x: xMove, opacity }}
        >
            {children}
        </motion.div>
    );
}
