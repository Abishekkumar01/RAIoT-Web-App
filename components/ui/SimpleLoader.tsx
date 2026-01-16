"use client";

import React from "react";

export default function SimpleLoader() {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
            data-nosnippet
        >
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-cyan-500 border-b-transparent border-l-purple-500 animate-spin-reverse"></div>
            </div>
        </div>
    );
}
