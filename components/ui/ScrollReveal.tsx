"use client";

import React from "react";
import { motion } from "framer-motion";

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    direction?: 'left' | 'right' | 'up' | 'down' | 'none';
    xDistance?: number;
    yDistance?: number;
    delay?: number;
    viewportAmount?: number;
    forceAnimate?: boolean;
}

export default function ScrollReveal({
    children,
    className = "",
    direction = 'right',
    xDistance = 400,
    yDistance = 50,
    delay = 0,
    viewportAmount = 0.2,
    forceAnimate = false,
}: ScrollRevealProps) {

    const getInitialVariant = () => {
        switch (direction) {
            case 'left': return { opacity: 0, x: -xDistance, y: 0 };
            case 'right': return { opacity: 0, x: xDistance, y: 0 };
            case 'up': return { opacity: 0, x: 0, y: yDistance };
            case 'down': return { opacity: 0, x: 0, y: -yDistance };
            default: return { opacity: 0, x: 0, y: 0 };
        }
    };

    const animationProps = forceAnimate
        ? { animate: { opacity: 1, x: 0, y: 0 } }
        : { whileInView: { opacity: 1, x: 0, y: 0 }, viewport: { once: false, amount: viewportAmount } };

    return (
        <motion.div
            className={className}
            initial={getInitialVariant()}
            {...animationProps}
            transition={{
                type: "spring",
                stiffness: 70,
                damping: 20,
                duration: 0.8,
                delay: delay
            }}
        >
            {children}
        </motion.div>
    );
}
