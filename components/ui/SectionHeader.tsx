"use client";

import React from "react";

interface SectionHeaderProps {
    title: string;
    className?: string;
}

export default function SectionHeader({ title, className = "" }: SectionHeaderProps) {
    return (
        <div className={`relative w-full h-[100px] ${className}`}>
            {/* Decorative Top Line Container */}
            <div className="absolute bottom-0 left-0 w-full flex items-end">

                {/* Left Line with Angled End */}
                <div className="h-[2px] bg-cyan-500/50 flex-grow relative">
                    <div className="absolute right-0 bottom-0 w-6 h-[2px] bg-cyan-400 rotate-[-45deg] origin-right translate-y-[1px]"></div>
                </div>

                {/* Center Trapezoid Tab - Upscaled */}
                <div className="relative mx-4">
                    {/* The Shape - SVG for precise angles */}
                    <svg width="600" height="100" viewBox="0 0 600 100" className="drop-shadow-[0_-5px_20px_rgba(6,182,212,0.2)]">
                        {/* Main Fill */}
                        <path
                            d="M0,100 L40,10 L560,10 L600,100 Z"
                            fill="#000000"
                            stroke="#06b6d4"
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                        />

                        {/* Decorative Internal Lines - Adjusted for Scale */}
                        {/* Top parallel line */}
                        <path d="M50,25 L550,25" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.3" />

                        {/* Decorative Tech Marks */}
                        <rect x="280" y="85" width="40" height="4" fill="#06b6d4" fillOpacity="0.5" />
                    </svg>

                    {/* Title Text - Bigger & Bolder */}
                    <div className="absolute inset-0 flex items-center justify-center pt-2">
                        <h2 className="text-5xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] font-orbitron">
                            {title}
                        </h2>
                    </div>
                </div>

                {/* Right Line with Angled Start */}
                <div className="h-[2px] bg-cyan-500/50 flex-grow relative">
                    <div className="absolute left-0 bottom-0 w-6 h-[2px] bg-cyan-400 rotate-[45deg] origin-left translate-y-[1px]"></div>
                </div>
            </div>
        </div>
    );
}
