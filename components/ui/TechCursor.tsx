"use client";

import React, { useEffect, useState } from "react";

const TechCursor = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        // Don't show custom cursor on touch devices
        if (window.matchMedia("(pointer: coarse)").matches) return;

        const updatePosition = (e: MouseEvent) => {
            // Use requestAnimationFrame for smoother performance if needed, 
            // but state update is usually fine for simple cursors.
            // For ultra-performance, we'd use useRef and direct DOM manipulation.
            // Let's stick to state for simplicity unless it lags.
            // Actually, for a cursor, direct DOM is better to avoid excessive re-renders.

            const cursor = document.getElementById("tech-cursor");
            const ring = document.getElementById("tech-cursor-ring");

            if (cursor) {
                cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            }
            if (ring) {
                // Add a slight delay/lag to the ring for a "follow" effect
                // We can't easily do lag with just this event listener without an animation loop.
                // So we'll just move it directly for now, or use CSS transition for lag.
                ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            }

            if (!isVisible) setIsVisible(true);
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "BUTTON" ||
                target.tagName === "A" ||
                target.closest("button") ||
                target.closest("a") ||
                target.getAttribute("role") === "button"
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };





        window.addEventListener("mousemove", updatePosition);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mouseover", handleMouseOver);

        // Hide default cursor
        document.body.style.cursor = "none";

        return () => {
            window.removeEventListener("mousemove", updatePosition);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("mouseover", handleMouseOver);
            document.body.style.cursor = "auto";
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <>
            {/* Main Center Dot */}
            <div
                id="tech-cursor"
                className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
                style={{
                    transform: "translate(-50%, -50%)", // Centering logic handled in JS + CSS
                    width: "8px",
                    height: "8px",
                    marginLeft: "-4px", // Half width to center exactly on point
                    marginTop: "-4px",
                    backgroundColor: "#00ffff", // Cyan
                    borderRadius: "50%",
                    boxShadow: "0 0 10px #00ffff, 0 0 20px #00ffff",
                    transition: "width 0.2s, height 0.2s, background-color 0.2s",
                }}
            />

            {/* Outer Ring */}
            <div
                id="tech-cursor-ring"
                className="fixed top-0 left-0 pointer-events-none z-[9998] mix-blend-difference"
                style={{
                    width: isHovering ? "40px" : "24px",
                    height: isHovering ? "40px" : "24px",
                    marginLeft: isHovering ? "-20px" : "-12px",
                    marginTop: isHovering ? "-20px" : "-12px",
                    border: "1px solid rgba(0, 255, 255, 0.5)",
                    borderRadius: "50%",
                    transition: "width 0.3s ease-out, height 0.3s ease-out, transform 0.15s ease-out", // CSS transition creates the "lag" effect
                    backgroundColor: isClicking ? "rgba(0, 255, 255, 0.1)" : "transparent",
                }}
            />
        </>
    );
};

export default TechCursor;
