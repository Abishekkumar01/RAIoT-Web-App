"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

interface TechScrollbarProps {
    orientation?: "vertical" | "horizontal";
}

export default function TechScrollbar({ orientation = "vertical" }: TechScrollbarProps) {
    const { scrollYProgress } = useScroll();
    const trackRef = useRef<HTMLDivElement>(null);
    const [trackLength, setTrackLength] = useState(0);

    // Smooth mechanical movement
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 20,
        mass: 0.5,
    });

    useEffect(() => {
        if (!trackRef.current) return;

        const updateLength = () => {
            if (trackRef.current) {
                // Measure Height for vertical, Width for horizontal
                const totalLength = orientation === "vertical"
                    ? trackRef.current.clientHeight
                    : trackRef.current.clientWidth;
                // Subtract thumb size (64px) from travel distance
                setTrackLength(totalLength - 64);
            }
        };

        updateLength();
        const resizeObserver = new ResizeObserver(updateLength);
        resizeObserver.observe(trackRef.current);

        return () => resizeObserver.disconnect();
    }, [orientation]);

    // Position Transform
    const progressPos = useTransform(smoothProgress, [0, 1], [0, trackLength]);

    // Generate ticks
    const tickCount = orientation === "vertical" ? 40 : 60;
    const ticks = Array.from({ length: tickCount });

    const isVertical = orientation === "vertical";

    return (
        <div
            className={`fixed z-[100] flex items-center justify-center pointer-events-none mix-blend-normal
                ${isVertical
                    ? "right-2 top-0 bottom-0 w-12 flex-col"
                    : "bottom-2 left-0 right-0 h-12 flex-row"
                }`}
            aria-hidden="true"
        >
            {/* Track Container */}
            <div
                ref={trackRef}
                className={`relative flex ${isVertical ? "h-[80vh] w-full flex-col items-end" : "w-[80vw] h-full flex-row items-end"}`}
            >
                {/* Track Line */}
                <div className={`absolute bg-slate-800/50 
                    ${isVertical
                        ? "right-[6px] top-0 bottom-0 w-[1px]"
                        : "bottom-[6px] left-0 right-0 h-[1px]"}`}
                />

                {/* Ticks */}
                <div className={`absolute flex justify-between
                    ${isVertical
                        ? "top-0 bottom-0 right-0 flex-col items-end h-full py-2"
                        : "left-0 right-0 bottom-0 flex-row items-end w-full px-2"}`}
                >
                    {ticks.map((_, i) => {
                        const isMajor = i % 5 === 0;
                        return (
                            <div
                                key={i}
                                className={`bg-slate-700/80 transition-all duration-300 
                                    ${isVertical
                                        ? `h-[1px] ${isMajor ? "w-3 opacity-80" : "w-1.5 opacity-40 ml-auto"}`
                                        : `w-[1px] ${isMajor ? "h-3 opacity-80" : "h-1.5 opacity-40 mt-auto"}`
                                    }`}
                            />
                        );
                    })}
                </div>

                {/* Moving Group (Thumb + Readout) */}
                <motion.div
                    style={isVertical ? { y: progressPos } : { x: progressPos }}
                    className={`absolute flex items-center
                        ${isVertical
                            ? "top-0 right-0 pr-[3px]"
                            : "left-0 bottom-0 pb-[3px] flex-col-reverse"
                        }`}
                >
                    {/* Readout Text */}
                    <div className={`font-mono text-[10px] text-red-500/80 tracking-tighter tabular-nums whitespace-nowrap
                        ${isVertical ? "mr-3" : "mb-2"}`}
                    >
                        CAL. <motion.span>{useTransform(smoothProgress, (v) => Math.round(v * 100))}</motion.span>%
                    </div>

                    {/* Thumb Capsule */}
                    <div className={`rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] relative overflow-hidden
                        ${isVertical ? "w-1.5 h-16" : "h-1.5 w-16"}`}
                    >
                        {/* Inner Detail */}
                        <div className={`absolute bg-gradient-to-b from-transparent via-white/40 to-transparent mx-auto
                            ${isVertical
                                ? "top-1/2 left-0 right-0 h-[60%] -translate-y-1/2 w-[1px]"
                                : "left-1/2 top-0 bottom-0 w-[60%] -translate-x-1/2 h-[1px] bg-gradient-to-r"}`}
                        />
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
