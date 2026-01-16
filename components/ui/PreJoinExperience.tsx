"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, Hexagon, AtSign, Hash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { toast } from "sonner";

export default function PreJoinExperience() {
    const { signup } = useAuth();
    const router = useRouter();
    const [viewState, setViewState] = useState<'INTRO' | 'GALAXY' | 'FORM'>('INTRO');
    const [inputText, setInputText] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGalaxyInput, setShowGalaxyInput] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // ... refs ...

    // ... three.js setup ...

    // ... animations ...

    const handleSignup = async () => {
        if (!inputText || !email || !password || !confirmPassword) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setIsProcessing(true);
        try {
            await signup(email, password, inputText, 'guest');
            toast.success("Account created successfully! Redirecting...");
            router.push('/dashboard');
            // Don't set isProcessing(false) here to prevent UI flickering before navigation
        } catch (error: any) {
            console.error("Signup error:", error);
            toast.error(error.message || "Failed to create account.");
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
                    <div className="bg-black/95 backdrop-blur-xl border border-cyan-500/30 p-1 rounded-sm shadow-[0_0_40px_rgba(6,182,212,0.1)]">
                        <div className="bg-black border border-white/5 p-4 md:p-8 relative overflow-hidden">
                            {/* Decorative Corners */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-500"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-500"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-500"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-500"></div>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 md:mb-8">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm md:text-xl font-bold text-white font-orbitron tracking-widest leading-none">GUEST ACCESS PORTAL</h2>
                                        <p className="text-cyan-500/60 text-[8px] md:text-[10px] font-mono mt-0.5 md:mt-1 uppercase tracking-[0.2em]">Authorized Guest Entry</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 md:gap-1.5 opacity-50">
                                    <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
                                    <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
                                    <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
                                </div>
                            </div>



                            {/* Form Fields */}
                            <div className="space-y-3 md:space-y-6">
                                <div className="space-y-1 md:space-y-2 group">
                                    <Label className="text-cyan-500 text-[8px] md:text-[10px] font-bold font-orbitron uppercase tracking-widest pl-1 group-focus-within:text-cyan-300 transition-colors">Full Name</Label>
                                    <div className="flex h-9 md:h-12 bg-black border border-white/10 focus-within:border-cyan-500 transition-all duration-300 hover:border-white/20">
                                        <div className="w-9 md:w-12 flex items-center justify-center border-r border-white/10 group-focus-within:border-cyan-500/50 group-focus-within:bg-cyan-950/20 transition-colors">
                                            <Hexagon className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                                        </div>
                                        <input
                                            autoComplete="off"
                                            placeholder="John Doe"
                                            className="flex-1 bg-transparent px-2 md:px-4 text-white text-xs md:text-sm outline-none placeholder:text-gray-800 font-mono tracking-wide"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 md:space-y-2 group">
                                    <Label className="text-cyan-500 text-[8px] md:text-[10px] font-bold font-orbitron uppercase tracking-widest pl-1 group-focus-within:text-cyan-300 transition-colors">Email Address</Label>
                                    <div className="flex h-9 md:h-12 bg-black border border-white/10 focus-within:border-cyan-500 transition-all duration-300 hover:border-white/20">
                                        <div className="w-9 md:w-12 flex items-center justify-center border-r border-white/10 group-focus-within:border-cyan-500/50 group-focus-within:bg-cyan-950/20 transition-colors">
                                            <AtSign className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                                        </div>
                                        <input
                                            placeholder="your.email@example.com"
                                            type="email"
                                            autoComplete="off"
                                            className="flex-1 bg-transparent px-2 md:px-4 text-white text-xs md:text-sm outline-none placeholder:text-gray-800 font-mono tracking-wide"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:gap-4">
                                    <div className="space-y-1 md:space-y-2 group">
                                        <Label className="text-cyan-500 text-[8px] md:text-[10px] font-bold font-orbitron uppercase tracking-widest pl-1 group-focus-within:text-cyan-300 transition-colors">Password</Label>
                                        <div className="flex h-9 md:h-12 bg-black border border-white/10 focus-within:border-cyan-500 transition-all duration-300 hover:border-white/20">
                                            <div className="w-9 md:w-12 flex items-center justify-center border-r border-white/10 group-focus-within:border-cyan-500/50 group-focus-within:bg-cyan-950/20 transition-colors">
                                                <Hash className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                                            </div>
                                            <input
                                                placeholder="••••••"
                                                type="password"
                                                autoComplete="new-password"
                                                className="flex-1 bg-transparent px-2 md:px-4 text-white text-xs md:text-sm outline-none placeholder:text-gray-800 font-mono tracking-widest"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1 md:space-y-2 group">
                                        <Label className="text-cyan-500 text-[8px] md:text-[10px] font-bold font-orbitron uppercase tracking-widest pl-1 group-focus-within:text-cyan-300 transition-colors">Confirm</Label>
                                        <div className="flex h-9 md:h-12 bg-black border border-white/10 focus-within:border-cyan-500 transition-all duration-300 hover:border-white/20">
                                            <div className="w-9 md:w-12 flex items-center justify-center border-r border-white/10 group-focus-within:border-cyan-500/50 group-focus-within:bg-cyan-950/20 transition-colors">
                                                <Hash className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                                            </div>
                                            <input
                                                placeholder="••••••"
                                                type="password"
                                                autoComplete="new-password"
                                                className="flex-1 bg-transparent px-2 md:px-4 text-white text-xs md:text-sm outline-none placeholder:text-gray-800 font-mono tracking-widest"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleSignup}
                                disabled={isProcessing}
                                className="w-full h-10 md:h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm md:text-lg mt-4 md:mt-8 rounded-none border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] tracking-widest font-orbitron flex items-center justify-center gap-2 group transition-all duration-300">
                                {isProcessing ? (
                                    <>CREATING ACCOUNT <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /></>
                                ) : (
                                    <>SIGN UP <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </Button>

                            <div className="border-t border-white/10 mt-4 md:mt-8 pt-3 md:pt-6 text-center">
                                <Link href="/auth/login?type=guest" className="inline-flex flex-col items-center group">
                                    <span className="text-[8px] md:text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-1 group-hover:text-cyan-500/70 transition-colors">Already have an account?</span>
                                    <span className="text-cyan-400 group-hover:text-cyan-300 font-bold tracking-widest font-orbitron transition-all flex items-center gap-2 text-xs md:text-sm">
                                        <span className="text-[10px] md:text-xs opacity-50 group-hover:translate-x-1 transition-transform">{`>>`}</span> LOG IN
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </section>
    );
}
