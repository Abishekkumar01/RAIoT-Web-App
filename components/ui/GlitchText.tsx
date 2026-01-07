"use client";

import React, { useEffect, useState, useRef } from "react";

interface GlitchTextProps {
    text: string;
    state: "dull" | "glitch" | "active";
    className?: string;
}

const NoiseParticle = () => {
    const style = {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${Math.random() * 4 + 1}px`,
        height: `${Math.random() * 4 + 1}px`,
        backgroundColor: Math.random() > 0.5 ? '#00ffff' : '#ff0000',
        opacity: Math.random(),
    };
    return <span className="absolute block pointer-events-none z-10" style={style} />;
};

export default function GlitchText({ text, state, className = "" }: GlitchTextProps) {
    const [rgbShadow, setRgbShadow] = useState("");
    const [textTransform, setTextTransform] = useState("none");
    const [particles, setParticles] = useState<number[]>([]);
    const [opacityNoise, setOpacityNoise] = useState(1);

    // Ref to manage animation loop
    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (state === 'dull') {
            setRgbShadow("none");
            setTextTransform("none");
            setParticles([]);
            setOpacityNoise(0.5); // Increase base opacity for visibility
        }
        else if (state === 'glitch') {
            // START CHAOS LOOP
            let frames = 0;

            const loop = () => {
                frames++;

                // 1. RGB Jitter (Scan Misalignment)
                const rX = (Math.random() - 0.5) * 10;
                const bX = (Math.random() - 0.5) * 10;
                const rY = (Math.random() - 0.5) * 5;
                const bY = (Math.random() - 0.5) * 5;
                setRgbShadow(`${rX}px ${rY}px 0 rgba(255, 0, 0, 0.7), ${bX}px ${bY}px 0 rgba(0, 255, 255, 0.7)`);

                // 2. Position Jitter (Jump)
                const tX = (Math.random() - 0.5) * 4;
                const tY = (Math.random() - 0.5) * 2;
                setTextTransform(`translate(${tX}px, ${tY}px)`);

                // 3. Digital Dust (Random Particles)
                // Re-generate particle ID array to force re-render of noise
                if (frames % 2 === 0) { // Every 2nd frame change particles
                    const particleCount = Math.floor(Math.random() * 15) + 5;
                    setParticles(new Array(particleCount).fill(0));
                }

                // 4. Opacity Flicker
                setOpacityNoise(Math.random() * 0.5 + 0.5);

                frameRef.current = requestAnimationFrame(loop);
            };

            frameRef.current = requestAnimationFrame(loop);

            return () => cancelAnimationFrame(frameRef.current);
        }
        else if (state === 'active') {
            // Stabilize
            cancelAnimationFrame(frameRef.current);
            setRgbShadow("0 0 20px rgba(6,182,212,0.6)");
            setTextTransform("none");
            setParticles([]);
            setOpacityNoise(1);
        }
    }, [state]);

    // Base styles
    const dullStyle = "transition-all duration-500 scale-[0.98] text-gray-900"; // Dark fill
    const activeStyle = "bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white animate-pulse-slow transition-all duration-1000 scale-100";
    const glitchStyle = "text-white font-orbitron tracking-widest";

    return (
        <span className={`relative inline-block ${className}`}>
            {/* Main Text Layer */}
            <span
                className={`block w-full transition-all duration-500 ${state === 'dull' ? dullStyle : state === 'active' ? activeStyle : glitchStyle}`}
                style={{
                    textShadow: state === 'glitch' ? rgbShadow : (state === 'active' ? undefined : 'none'),
                    transform: textTransform,
                    opacity: opacityNoise,
                    filter: state === 'glitch' ? 'contrast(1.5)' : undefined,
                    WebkitTextStroke: state === 'dull' ? '1px rgba(255, 255, 255, 0.5)' : '0px', // Visible outline
                }}
            >
                {text}
            </span>

            {/* Noise Particle Layer (Overlay) - Only in Glitch Mode */}
            {state === 'glitch' && (
                <span className="absolute inset-0 w-full h-full overflow-visible">
                    {particles.map((_, i) => <NoiseParticle key={i} />)}
                </span>
            )}
        </span>
    );
}
