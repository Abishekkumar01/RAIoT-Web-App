"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, ArrowRight, Loader2, Sparkles, Hexagon, AtSign, MessageSquare } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function PreJoinExperience() {
    const [viewState, setViewState] = useState<'INTRO' | 'GALAXY' | 'FORM'>('INTRO');
    const [inputText, setInputText] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGalaxyInput, setShowGalaxyInput] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // ... refs ...

    // ... three.js setup ...

    // ... animations ...

    const handleSendMessage = async () => {
        if (!inputText || !email || !message) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    access_key: "de848823-c7ca-41c2-bb0f-82548e9c718e",
                    name: inputText,
                    email: email,
                    message: `New message from ${inputText}:\n\n${message}`,
                    subject: `Contact Form: New Message from ${inputText}`,
                    from_name: "RAIoT Website"
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Message sent successfully!");
                setSubmitted(true);
            } else {
                console.error("Web3Forms error:", result);
                toast.error("Something went wrong. It might be an invalid access key or rate limit.");
            }
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error("Failed to send message.");
        } finally {
            setIsProcessing(false);
        }
    };

    // ... existing logic ...

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const introRef = useRef<HTMLDivElement>(null);
    const galaxyInputRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // Three.js Refs
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const frameIdRef = useRef<number>(0);
    const animationModeRef = useRef<'SPHERE' | 'TEXT'>('SPHERE');

    // Initialize Galaxy
    useEffect(() => {
        // Detect mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // We initialize Three.js always but control opacity via CSS for smooth transitions
        if (!canvasContainerRef.current) return;

        // SCENE SETUP
        const scene = new THREE.Scene();
        // No background color set in Three.js to allow transparency (handling bg in CSS) or set strictly black
        scene.background = new THREE.Color(0x000000);
        sceneRef.current = scene;

        const width = canvasContainerRef.current.clientWidth;
        const height = canvasContainerRef.current.clientHeight;

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        // Adjust camera distance based on screen size
        camera.position.z = window.innerWidth < 768 ? 24 : 25;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        canvasContainerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // PARTICLES SETUP
        const count = 12000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        // Responsive sphere radius
        const sphereRadius = window.innerWidth < 768 ? 6.5 : 14;

        const sphericalDistribution = (i: number) => {
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            return {
                x: sphereRadius * Math.cos(theta) * Math.sin(phi),
                y: sphereRadius * Math.sin(theta) * Math.sin(phi),
                z: sphereRadius * Math.cos(phi)
            };
        };

        for (let i = 0; i < count; i++) {
            const point = sphericalDistribution(i);
            positions[i * 3] = point.x + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5;

            // Color Logic: HSL based on depth
            const depth = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) / sphereRadius;
            const color = new THREE.Color();
            color.setHSL(0.6 + depth * 0.2, 0.8, 0.5 + depth * 0.2); // Blueish/Cyan-Purple

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        particlesRef.current = particles;

        // Store original sphere positions for reformation
        const originalPositions = new Float32Array(positions);
        const originalColors = new Float32Array(colors);

        // ANIMATION LOOP
        const animate = () => {
            if (!particlesRef.current) return;

            // Idle Rotation
            if (animationModeRef.current === 'SPHERE') {
                particlesRef.current.rotation.y += 0.002;
            }

            renderer.render(scene, camera);
            frameIdRef.current = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            if (!canvasContainerRef.current || !camera || !renderer) return;
            const w = canvasContainerRef.current.clientWidth;
            const h = canvasContainerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', checkMobile);

            window.removeEventListener('resize', handleResize);
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);

            const renderer = rendererRef.current;
            const container = canvasContainerRef.current;

            if (renderer && container) {
                const canvas = renderer.domElement;
                if (canvas && container.contains(canvas)) {
                    container.removeChild(canvas);
                }
                renderer.dispose();
            }
        };
    }, []); // Run once on mount

    // MORPH LOGIC
    const morphText = async (text: string) => {
        if (!particlesRef.current || !cameraRef.current) return;
        animationModeRef.current = 'TEXT';

        const count = particlesRef.current.geometry.attributes.position.count;
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

        // Create Text Points
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Responsive font size and text wrapping
        const isMobileView = window.innerWidth < 768;
        const fontSize = isMobileView ? 45 : 100;
        const maxWidth = isMobileView ? 300 : 800;

        ctx.font = `bold ${fontSize}px Arial`;
        const measures = ctx.measureText(text);

        // Handle text wrapping for long names on mobile
        let lines: string[] = [text];
        if (isMobileView && measures.width > maxWidth) {
            const words = text.split(' ');
            lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;

                if (testWidth > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
        }

        canvas.width = Math.min(measures.width + 40, maxWidth + 40);
        canvas.height = (fontSize + 20) * lines.length + 40;

        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw each line
        lines.forEach((line, index) => {
            const y = canvas.height / 2 + (index - (lines.length - 1) / 2) * (fontSize + 20);
            ctx.fillText(line, canvas.width / 2, y);
        });

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const textPoints: { x: number, y: number }[] = [];

        // Sampling
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 128) {
                // Reduced sampling for mobile to avoid density
                const samplingRate = isMobileView ? 0.40 : 0.25;
                if (Math.random() < samplingRate) {
                    const pX = (i / 4) % canvas.width;
                    const pY = Math.floor((i / 4) / canvas.width);
                    const scaleFactor = isMobileView ? 0.03 : 0.05;
                    textPoints.push({
                        x: (pX - canvas.width / 2) * scaleFactor,
                        y: -(pY - canvas.height / 2) * scaleFactor
                    });
                }
            }
        }

        // Calculate Target Positions
        const targetPositions = new Float32Array(count * 3);

        // Stop rotation (store current rotation to blend back later if needed, but we reset usually)
        gsap.to(particlesRef.current.rotation, { x: 0, y: 0, z: 0, duration: 1 });

        for (let i = 0; i < count; i++) {
            if (i < textPoints.length) {
                targetPositions[i * 3] = textPoints[i].x;
                targetPositions[i * 3 + 1] = textPoints[i].y;
                targetPositions[i * 3 + 2] = 0;
            } else {
                // Scatter background - constrained for mobile to stay in frame
                const angle = Math.random() * Math.PI * 2;
                // Reduce scatter radius for mobile
                const minR = isMobileView ? 8 : 20;
                const maxR = isMobileView ? 5 : 10;
                const radius = minR + Math.random() * maxR;

                targetPositions[i * 3] = Math.cos(angle) * radius;
                targetPositions[i * 3 + 1] = Math.sin(angle) * radius;
                targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
            }
        }

        // Morph Animation
        const progressObj = { t: 0 };
        const startPositions = Float32Array.from(positions);

        return new Promise<void>((resolve) => {
            gsap.to(progressObj, {
                t: 1,
                duration: 1,
                ease: "power2.inOut",
                onUpdate: () => {
                    for (let i = 0; i < count; i++) {
                        const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
                        positions[ix] = THREE.MathUtils.lerp(startPositions[ix], targetPositions[ix], progressObj.t);
                        positions[iy] = THREE.MathUtils.lerp(startPositions[iy], targetPositions[iy], progressObj.t);
                        positions[iz] = THREE.MathUtils.lerp(startPositions[iz], targetPositions[iz], progressObj.t);
                    }
                    if (particlesRef.current) particlesRef.current.geometry.attributes.position.needsUpdate = true;
                },
                onComplete: () => {
                    resolve();
                }
            });
        });
    };

    const morphSphere = async () => {
        if (!particlesRef.current) return;
        animationModeRef.current = 'SPHERE';
        const count = particlesRef.current.geometry.attributes.position.count;
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

        // Recalculate Sphere Distribution
        const targetPositions = new Float32Array(count * 3);
        const sphereRadius = window.innerWidth < 768 ? 6.5 : 14;
        const sphericalDistribution = (i: number) => {
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            return {
                x: sphereRadius * Math.cos(theta) * Math.sin(phi),
                y: sphereRadius * Math.sin(theta) * Math.sin(phi),
                z: sphereRadius * Math.cos(phi)
            };
        };

        for (let i = 0; i < count; i++) {
            const p = sphericalDistribution(i);
            targetPositions[i * 3] = p.x + (Math.random() - 0.5);
            targetPositions[i * 3 + 1] = p.y + (Math.random() - 0.5);
            targetPositions[i * 3 + 2] = p.z + (Math.random() - 0.5);
        }

        const progressObj = { t: 0 };
        const startPositions = Float32Array.from(positions);

        return new Promise<void>((resolve) => {
            gsap.to(progressObj, {
                t: 1,
                duration: 1,
                ease: "power2.inOut",
                onUpdate: () => {
                    for (let i = 0; i < count; i++) {
                        const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
                        positions[ix] = THREE.MathUtils.lerp(startPositions[ix], targetPositions[ix], progressObj.t);
                        positions[iy] = THREE.MathUtils.lerp(startPositions[iy], targetPositions[iy], progressObj.t);
                        positions[iz] = THREE.MathUtils.lerp(startPositions[iz], targetPositions[iz], progressObj.t);
                    }
                    if (particlesRef.current) particlesRef.current.geometry.attributes.position.needsUpdate = true;
                },
                onComplete: () => resolve()
            });
        });
    };

    const handleStart = () => {
        // Step 1: Fade out Intro
        if (introRef.current) {
            gsap.to(introRef.current, {
                opacity: 0,
                y: -20,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                    setViewState('GALAXY');
                    setTimeout(() => setShowGalaxyInput(true), 1000); // Slight delay for galaxy entrance
                }
            });
        }
    };

    const handleSubmitName = async () => {
        if (!inputText.trim()) return;
        setIsProcessing(true);
        setShowGalaxyInput(false); // Hide input

        // Step 4: Morph to Name
        const name = inputText.trim();
        await morphText(`Welcome ${name}`);

        // Wait for impact
        await new Promise(r => setTimeout(r, 800));

        // Step 5: Reformation
        await morphSphere();

        // Step 6: Final Transition
        if (canvasContainerRef.current) {
            gsap.to(canvasContainerRef.current, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => {
                    setViewState('FORM');
                    // Reveal form
                }
            });
        }
        setIsProcessing(false);
    };

    return (
        <section className="w-full h-screen min-h-[700px] bg-black relative flex flex-col items-center justify-center overflow-hidden">

            {/* VIEW 1: INTRO */}
            {viewState === 'INTRO' && (
                <div ref={introRef} className="z-20 text-center px-4 max-w-3xl relative">
                    <h2 className="text-4xl md:text-6xl font-black font-orbitron text-white mb-8 tracking-tight drop-shadow-xl animate-fade-in-up">
                        Innovation knows no borders.
                    </h2>
                    <Button
                        onClick={handleStart}
                        size="lg"
                        className="bg-white text-black hover:bg-cyan-100 font-bold text-xl px-12 py-8 rounded-full transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-fade-in-up animation-delay-200"
                    >
                        Join the Network
                    </Button>

                    {/* Do not Touch with Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 mt-8 animate-fade-in-up animation-delay-400">
                        {/* Arrow SVG */}
                        <svg
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                            className="mx-auto mb-2"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))' }}
                        >
                            {/* Curved arrow shaft */}
                            <path
                                d="M 50 90 Q 30 60, 35 30 Q 38 15, 45 5"
                                stroke="#22c55e"
                                strokeWidth="4"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="animate-pulse"
                            />
                            {/* Arrowhead */}
                            <path
                                d="M 45 5 L 35 15 M 45 5 L 52 12"
                                stroke="#22c55e"
                                strokeWidth="4"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="animate-pulse"
                            />
                        </svg>

                        {/* Text */}
                        <p
                            className="text-green-500 text-2xl md:text-3xl font-bold tracking-wide"
                            style={{
                                fontFamily: 'Comic Sans MS, cursive',
                                transform: 'rotate(-8deg)',
                                textShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
                            }}
                        >
                            Dare to touch!
                        </p>
                    </div>
                </div>
            )}

            {/* VIEW 2: GALAXY CANVAS */}
            <div
                ref={canvasContainerRef}
                className={`absolute inset-0 z-10 transition-all duration-1000 ${viewState === 'GALAXY' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            />

            {/* OVERLAY: GALAXY INPUT */}
            {viewState === 'GALAXY' && (
                <div
                    ref={galaxyInputRef}
                    className={`absolute z-30 w-full max-w-md px-4 transition-all duration-700 ${showGalaxyInput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                    style={{ bottom: '20%' }}
                >
                    <div className="relative">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitName()}
                            placeholder="Type your name..."
                            className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-full py-4 pl-6 pr-14 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:bg-black/60 transition-all text-center font-orbitron"
                            autoFocus
                        />
                        <button
                            onClick={handleSubmitName}
                            disabled={isProcessing}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 rounded-full text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW 3: CREATE ACCOUNT FORM */}
            {viewState === 'FORM' && (
                <div ref={formRef} className="z-20 w-full max-w-lg px-4 animate-fade-in-up scale-[0.85] md:scale-100 origin-center">
                    {/* CYBER-HUD CONTAINER */}
                    <div className="relative group">
                        {/* GLOWING BACKDROP */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-cyan-500/20 blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000" />

                        {/* MAIN STRUCTURE WITH CLIPPED CORNERS */}
                        <div className="relative bg-black/90 backdrop-blur-xl p-1" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}>
                            {/* BORDER ACCENTS (Pseudo-borders since real borders don't follow clip-path) */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/50 to-blue-600/50" style={{ zIndex: -1 }} />
                            <div className="absolute inset-[1px] bg-black" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }} />

                            {/* CONTENT AREA */}
                            <div className="relative p-6 md:p-8 bg-grid-white/[0.02]">
                                {submitted ? (
                                    <div className="text-center flex flex-col items-center justify-center min-h-[400px]">
                                        <div className="w-24 h-24 mb-6 relative">
                                            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20"></div>
                                            <div className="absolute inset-0 rounded-full border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                                <Sparkles className="w-10 h-10 text-cyan-400" />
                                            </div>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-bold text-white font-orbitron tracking-widest mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">TRANSMISSION SENT</h2>
                                        <p className="text-cyan-500/80 font-mono text-xs md:text-sm tracking-widest uppercase mb-8">SECURE CHANNEL CONFIRMED</p>
                                        <Button
                                            onClick={() => {
                                                setSubmitted(false);
                                                setMessage("");
                                            }}
                                            className="bg-cyan-950/30 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold tracking-widest px-8 py-6 font-orbitron transition-all relative z-50 cursor-pointer pointer-events-auto hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] skew-x-[-10deg]"
                                        >
                                            <span className="skew-x-[10deg]">SEND ANOTHER</span>
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* DECORATIVE TOP BAR */}
                                        <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/60 transition-colors">
                                                    <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                                    <MessageSquare className="w-6 h-6 text-cyan-400 relative z-10" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white font-orbitron tracking-widest leading-none">CONTACT US</h2>
                                                    <p className="text-cyan-500/60 text-[10px] font-mono mt-1 uppercase tracking-[0.2em]">Send us a message directly</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end opacity-50">
                                                <div className="w-16 h-[2px] bg-cyan-500/50"></div>
                                                <div className="w-8 h-[2px] bg-cyan-500/30"></div>
                                            </div>
                                        </div>

                                        {/* INPUT FIELDS */}
                                        <div className="space-y-5">
                                            <div className="space-y-1 group">
                                                <div className="flex justify-between text-[10px] text-cyan-500/70 font-mono uppercase tracking-widest px-1">
                                                    <span>Name</span>
                                                    <span className="opacity-0 group-focus-within:opacity-100 transition-opacity text-cyan-400">Targeting...</span>
                                                </div>
                                                <div className="relative flex items-center bg-black/50 border-b border-white/20 focus-within:border-cyan-500 focus-within:bg-cyan-950/10 transition-all duration-300">
                                                    <div className="w-10 flex items-center justify-center text-cyan-600/50">
                                                        <Hexagon className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        autoComplete="off"
                                                        placeholder="Your Name"
                                                        className="w-full bg-transparent py-3 pr-4 text-white placeholder-white/20 font-mono text-sm focus:outline-none"
                                                        value={inputText}
                                                        onChange={(e) => setInputText(e.target.value)}
                                                    />
                                                    <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 w-0 group-focus-within:w-full transition-all duration-500" />
                                                </div>
                                            </div>

                                            <div className="space-y-1 group">
                                                <div className="flex justify-between text-[10px] text-cyan-500/70 font-mono uppercase tracking-widest px-1">
                                                    <span>Email</span>
                                                    <span className="opacity-0 group-focus-within:opacity-100 transition-opacity text-cyan-400">Locking...</span>
                                                </div>
                                                <div className="relative flex items-center bg-black/50 border-b border-white/20 focus-within:border-cyan-500 focus-within:bg-cyan-950/10 transition-all duration-300">
                                                    <div className="w-10 flex items-center justify-center text-cyan-600/50">
                                                        <AtSign className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        placeholder="name@example.com"
                                                        type="email"
                                                        autoComplete="off"
                                                        className="w-full bg-transparent py-3 pr-4 text-white placeholder-white/20 font-mono text-sm focus:outline-none"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                    />
                                                    <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 w-0 group-focus-within:w-full transition-all duration-500" />
                                                </div>
                                            </div>

                                            <div className="space-y-1 group">
                                                <div className="flex justify-between text-[10px] text-cyan-500/70 font-mono uppercase tracking-widest px-1">
                                                    <span>Message</span>
                                                    <span className="opacity-0 group-focus-within:opacity-100 transition-opacity text-cyan-400">Uploading...</span>
                                                </div>
                                                <div className="relative flex items-start bg-black/50 border-b border-white/20 focus-within:border-cyan-500 focus-within:bg-cyan-950/10 transition-all duration-300">
                                                    <div className="w-10 pt-3 flex justify-center text-cyan-600/50">
                                                        <MessageSquare className="w-4 h-4" />
                                                    </div>
                                                    <textarea
                                                        placeholder="Write your message here..."
                                                        rows={4}
                                                        className="w-full bg-transparent py-3 pr-4 text-white placeholder-white/20 font-mono text-sm focus:outline-none resize-none"
                                                        value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                    />
                                                    <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 w-0 group-focus-within:w-full transition-all duration-500" />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={isProcessing}
                                            className="w-full h-14 mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg rounded-none shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] tracking-widest font-orbitron flex items-center justify-center gap-2 group transition-all duration-300 relative overflow-hidden"
                                            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                                            {isProcessing ? (
                                                <>SENDING <Loader2 className="w-5 h-5 animate-spin" /></>
                                            ) : (
                                                <>SEND MESSAGE <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                            )}
                                        </Button>

                                        <div className="mt-6 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                            <span>ENCRYPTED_SHA256</span>
                                            <span className="flex items-center gap-1 text-cyan-500/50"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> NETWORK ONLINE</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </section>
    );
}
