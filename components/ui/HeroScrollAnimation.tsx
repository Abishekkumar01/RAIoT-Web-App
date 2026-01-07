"use client";

import React, { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

interface HeroScrollAnimationProps {
    children: React.ReactNode;
    className?: string;
    triggerY?: number; // Scroll point to trigger animation. Default 150px.
    xDistance?: number;
    yDistance?: number;
}

export default function HeroScrollAnimation({
    children,
    className = "",
    triggerY = 150,
    xDistance = 200,
    yDistance = 0
}: HeroScrollAnimationProps) {
    const { scrollY } = useScroll();
    const [triggered, setTriggered] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        if (latest > triggerY && !triggered) {
            setTriggered(true);
        } else if (latest <= triggerY && triggered) {
            setTriggered(false);
        }
    });

    return (
        <motion.div
            className={className}
            animate={{
                x: triggered ? xDistance : 0,
                y: triggered ? yDistance : 0,
                opacity: triggered ? 0 : 1,
            }}
            transition={{
                duration: triggered ? 0.8 : 0.3, // Smooth exit, fast-ish return
                ease: "easeInOut"
            }}
        >
            {children}
        </motion.div>
    );
}
