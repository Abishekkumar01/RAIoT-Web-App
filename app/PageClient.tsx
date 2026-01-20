"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import Link from "next/link";
import { Calendar, Users, Trophy, Cpu, Zap, Bot, Rocket, Wrench, BrainCircuit, Crown } from "lucide-react";
import LightRays from "@/components/ui/LightRay";
import CountUp from "@/components/ui/CountUp";
import GlitchText from "@/components/ui/GlitchText";
import HeroScrollAnimation from "@/components/ui/HeroScrollAnimation";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader";
import { useState, useEffect } from "react";

import Loader from "@/components/ui/Loader";

import { useLoader } from "@/lib/contexts/LoaderContext";

// Dynamic Imports for Code Splitting & Performance
const Drone3D = dynamic(() => import("@/components/Drone3D"), { ssr: false });
const HoneycombGallery = dynamic(() => import("@/components/ui/HoneycombGallery"));
const PreJoinExperience = dynamic(() => import("@/components/ui/PreJoinExperience"));
const ContactSection = dynamic(() => import("@/components/ui/ContactSection"));
const MarqueeGallery = dynamic(() => import("@/components/ui/MarqueeGallery"));
const RecruitmentBanner = dynamic(() => import("@/components/home/RecruitmentBanner"), { ssr: false });

interface PageClientProps {
    galleryImages: string[];
}

export default function PageClient({ galleryImages }: PageClientProps) {
    const { hasLoaded, setHasLoaded } = useLoader();
    const [isLoading, setIsLoading] = useState(!hasLoaded);
    const [textState, setTextState] = useState<'dull' | 'glitch' | 'active'>('dull');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle Glitch -> Active transition
    useEffect(() => {
        if (textState === 'glitch') {
            const timer = setTimeout(() => setTextState('active'), 600); // 0.6s glitch duration
            return () => clearTimeout(timer);
        }
    }, [textState]);

    const handleLoadingComplete = () => {
        setIsLoading(false);
        setHasLoaded(true);
    };

    return (
        <div className="min-h-screen bg-black animate-fade-in relative" style={{ overflowX: 'clip' }}>
            {isLoading && <Loader onLoadingComplete={handleLoadingComplete} />}

            {/* Fail-Safe Black Background to prevent transparency checkerboard */}
            <div
                className="fixed inset-0 z-[-50]"
                style={{
                    background: "radial-gradient(circle at center, #660606 0%, #290840 50%, #050505 100%)",
                }}
            />

            {/* Tech Spotlight Effect - From above Navbar */}
            <div className="fixed top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-cyan-900/20 via-transparent to-transparent z-[60] pointer-events-none" />
            <div className="fixed -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/15 blur-[120px] rounded-full z-[60] pointer-events-none mix-blend-screen" />

            <RecruitmentBanner />
            <PublicNavbar />

            {/* Hero Section with Light Rays - Sticky/Fixed Behavior */}
            <section className="relative min-h-[50vh] md:min-h-screen flex flex-col justify-center overflow-visible bg-black text-foreground pt-16 sticky top-0 z-0">
                {/* Light Rays Background Effect */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                    <LightRays
                        raysOrigin={isMobile ? "top-center" : "top-left"}
                        raysColor="#60a5fa"
                        raysSpeed={1.2}
                        lightSpread={0.4}
                        rayLength={2.0}
                        followMouse={!isMobile}
                        mouseInfluence={0.15}
                        noiseAmount={0.08}
                        distortion={0.05}
                        pulsating={true}
                        fadeDistance={0.6}
                        saturation={1.2}
                        className="opacity-40"
                    />
                </div>

                {/* Drone Layer - Full Screen - Flies Up & Fades on Scroll */}
                <HeroScrollAnimation className="absolute inset-0 w-full h-full pointer-events-none z-10" triggerY={50} yDistance={-500} xDistance={0}>
                    <Drone3D className="w-full h-full" onActivate={() => setTextState('glitch')} shouldStart={!isLoading} />
                </HeroScrollAnimation>



                {/* Background Layers - Fresh Start Layer 1 - Ditto Copy Cleaned */}
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                    {/* Layer 1: Foreground Rocks (Cleaned v7) */}
                    <HeroScrollAnimation className="absolute inset-0 w-full h-full" triggerY={0} yDistance={150}>
                        <div className="absolute bottom-0 left-0 w-full z-20 translate-y-[-90%] md:translate-y-[28%]">
                            <Image
                                src="/layer_1_rocks_v8.png"
                                alt="Foreground Rocks Layer 1"
                                width={0}
                                height={0}
                                sizes="100vw"
                                style={{ width: "100%", height: "auto" }}
                                priority
                            />
                        </div>
                    </HeroScrollAnimation>
                </div>


                <div className="w-full relative z-30 h-full flex flex-col justify-start items-center md:items-start pt-20 md:pt-40 min-h-screen px-4 md:px-0 md:pl-48">

                    {/* Hero Content Wrapper - Left Aligned */}
                    <div className="relative w-full max-w-none">

                        {/* Animated Scroll Group - Triggers Early (50px Scroll) - Moves Far Right */}
                        <HeroScrollAnimation triggerY={50} xDistance={600}>
                            <div className="flex flex-col items-center text-center md:items-start md:text-left">
                                {/* Logo */}
                                {/* Logo with Shloka */}
                                <div className="mb-6 animate-fade-in-up md:pl-1 mx-auto md:mx-0 flex items-center justify-center md:justify-start gap-5">
                                    <Image
                                        src="/logo.png"
                                        alt="RAIoT Logo"
                                        width={90}
                                        height={90}
                                        className="w-20 h-20 md:w-[90px] md:h-[90px] object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                                        priority
                                    />
                                    <div className="flex flex-col justify-center h-[90px]">
                                        <p className="text-4xl md:text-5xl font-black text-white tracking-wide font-sans drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] leading-none mt-2">
                                            यत्र ज्ञानं, तत्र सृष्टिः।
                                        </p>
                                    </div>
                                </div>

                                {/* Headings */}
                                <h1
                                    className="text-6xl md:text-[6.5rem] font-black font-orbitron text-white drop-shadow-2xl z-5 relative flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 leading-tight select-none mix-blend-screen"
                                    style={{ fontFamily: 'var(--font-orbitron)' }}
                                >
                                    Welcome to <GlitchText text="RAIoT" state={textState} className="md:ml-2 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]" />
                                </h1>

                                <p className="text-2xl md:text-4xl text-cyan-100/80 font-light mb-12 animate-fade-in-up animation-delay-200 tracking-wide text-center md:text-left md:pl-1">
                                    Robotics, Automation & IoT Club
                                </p>

                                {/* CTA Buttons - Inside Animation Group */}
                                <div className="flex justify-center md:justify-start gap-6 animate-fade-in-up animation-delay-400 w-full md:w-auto md:pl-1">
                                    <Link href="/auth/signup">
                                        <Button
                                            size="lg"
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full px-10 py-7 text-lg shadow-[0_0_25px_rgba(8,145,178,0.4)] transition-all duration-300 hover:scale-105 cursor-target border border-cyan-400/30 min-w-[160px] h-[52px]"
                                        >
                                            Join the Network
                                        </Button>
                                    </Link>
                                    <Link href="/events">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="border-cyan-500/50 text-cyan-100 hover:bg-cyan-950/50 hover:border-cyan-400 rounded-full px-10 py-7 text-lg transition-all duration-300 cursor-target backdrop-blur-sm min-w-[160px] h-[52px]"
                                        >
                                            View Events
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </HeroScrollAnimation>


                    </div>
                </div>
            </section>

            {/* Features Section - Slides Up Over Hero */}
            {/* Features Section - Slides Up Over Hero */}
            <section className="relative z-10 bg-black min-h-screen flex flex-col -mt-[50vh] md:mt-0 pt-16 md:pt-32 pb-20 px-4">
                {/* Custom Divider - Absolute Top Border */}
                <div className="absolute top-0 left-0 w-full -translate-y-[70px]">
                    <SectionHeader title="WHAT WE DO" className="w-full" />
                </div>

                <div className="w-full relative z-10 md:px-16 max-w-[95%] mx-auto">

                    {/* Header Section */}
                    <div className="text-center mb-16 space-y-6">
                        {/* Split Text with Individual Animations */}
                        <div className="flex flex-col items-center justify-center space-y-2 md:space-y-4">
                            <ScrollReveal direction="right" xDistance={isMobile ? 0 : 500} delay={isMobile ? 0.2 : 0} viewportAmount={0.1} forceAnimate={isMobile}>
                                <h2 className="text-3xl md:text-7xl font-black font-orbitron leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                                    Built by makers.
                                </h2>
                            </ScrollReveal>
                            <ScrollReveal direction="left" xDistance={isMobile ? 0 : 500} delay={isMobile ? 0.4 : 0} viewportAmount={0.1} forceAnimate={isMobile}>
                                <h2 className="text-3xl md:text-7xl font-black font-orbitron leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                                    Driven by innovation.
                                </h2>
                            </ScrollReveal>
                            <ScrollReveal direction="right" xDistance={isMobile ? 0 : 500} delay={isMobile ? 0.6 : 0} viewportAmount={0.1} forceAnimate={isMobile}>
                                <h2 className="text-3xl md:text-7xl font-black font-orbitron leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                                    Proven in competition.
                                </h2>
                            </ScrollReveal>
                        </div>
                        <ScrollReveal direction="up" className="max-w-3xl mx-auto text-base md:text-lg text-cyan-100/80 font-mono tracking-wide" delay={isMobile ? 0.8 : 0} forceAnimate={isMobile}>
                            <div className="inline-block">
                                <span className="text-cyan-400 font-bold">RAIoT</span> is a hands-on robotics and automation community where innovation meets execution.
                                We design, build, and compete with cutting-edge systems that solve real-world problems.
                            </div>
                        </ScrollReveal>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Column: Honeycomb Gallery */}
                        <div className="w-full flex items-center justify-center -my-24 md:my-0 lg:justify-start lg:items-start">
                            <div className="scale-[0.45] md:scale-90 origin-center lg:origin-top-left ml-8 md:ml-0">
                                <HoneycombGallery />
                            </div>
                        </div>

                        {/* Right Column: Content */}
                        <div className="relative group h-fit self-center">
                            <div
                                className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"
                            />
                            <div className="relative h-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-10 md:p-14 rounded-2xl flex flex-col justify-center shadow-2xl">

                                {/* Decorative Element */}
                                <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                                    <Cpu className="w-32 h-32 text-cyan-500 rotate-12" />
                                </div>

                                <div className="space-y-10 relative z-10">
                                    <div>
                                        <h3 className="text-4xl md:text-5xl font-black font-orbitron text-white mb-2 tracking-tight">
                                            BEYOND <span className="text-cyan-400">THEORY.</span>
                                        </h3>
                                        <p className="text-xl text-cyan-100/60 font-mono tracking-widest uppercase">
                                            Where Mechanics Meets Intelligence
                                        </p>
                                    </div>

                                    <p className="text-gray-300 text-xl leading-relaxed font-light">
                                        At <strong className="text-white font-bold">RAIoT</strong>, we don't just study robotics—we define its future. We operate at the bleeding edge where embedded systems, AI, and mechanical engineering converge.
                                    </p>

                                    <div className="space-y-8 pt-2">
                                        {/* Feature 1 */}
                                        <div className="flex items-start gap-5">
                                            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 shrink-0">
                                                <BrainCircuit className="w-6 h-6 text-cyan-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-1 font-orbitron">Software & Intelligence</h4>
                                                <p className="text-gray-400 text-sm leading-relaxed">Building advanced generative AI models, LLMs, and intelligent systems that power next-gen autonomy.</p>
                                            </div>
                                        </div>

                                        {/* Feature 2 */}
                                        <div className="flex items-start gap-5">
                                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 shrink-0">
                                                <Cpu className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-1 font-orbitron">Hardware & Mechanics</h4>
                                                <p className="text-gray-400 text-sm leading-relaxed">Building high-performance RC vehicles and aircrafts through practical, hands-on engineering.</p>
                                            </div>
                                        </div>

                                        {/* Feature 3 */}
                                        <div className="flex items-start gap-5">
                                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 shrink-0">
                                                <Crown className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-1 font-orbitron">National Dominance</h4>
                                                <p className="text-gray-400 text-sm leading-relaxed">Proving our mettle in hackathons and robotics challenges across the country.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Domain Cards Section */}
                    <div className="max-w-7xl mx-auto w-full mt-24">
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Robotics Card */}
                            <div className="p-8 rounded-xl border border-purple-500/20 bg-black/40 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 group hover:bg-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                <div className="mb-6 relative">
                                    <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <Cpu className="w-10 h-10 text-purple-600 relative z-10 drop-shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white font-orbitron tracking-wide">Robotics</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Design and build autonomous robots for competitions and research.
                                </p>
                            </div>

                            {/* Automation Card */}
                            <div className="p-8 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm hover:border-cyan-500/50 transition-all duration-300 group hover:bg-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                <div className="mb-6 relative">
                                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <Zap className="w-10 h-10 text-cyan-200 relative z-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white font-orbitron tracking-wide">Automation</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Create smart systems that streamline processes and improve efficiency.
                                </p>
                            </div>

                            {/* IoT Card */}
                            <div className="p-8 rounded-xl border border-indigo-500/20 bg-black/40 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300 group hover:bg-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                <div className="mb-6 relative">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <Bot className="w-10 h-10 text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white font-orbitron tracking-wide">IoT</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Connect devices to the cloud and build intelligent networks.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Marquee Gallery Section - Placed Below Domain Cards */}
                <div className="mt-24">
                    <MarqueeGallery images={galleryImages} />
                </div>
            </section>

            {/* Stats Section */}
            {/* Stats Section - Enhanced */}
            <section className="py-32 px-4 relative overflow-hidden bg-black/40">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-transparent pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="grid md:grid-cols-3 gap-12 text-center">

                        {/* Active Members */}
                        <ScrollReveal direction="up" className="group">
                            <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:scale-105 group-hover:border-cyan-500/30 group-hover:shadow-[0_0_40px_rgba(6,182,212,0.2)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                                <Users className="w-12 h-12 mx-auto text-cyan-400 mb-6 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />

                                <div className="text-6xl font-black font-orbitron mb-2 flex justify-center items-center text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
                                    <CountUp to={500} duration={2.5} />
                                    <span>+</span>
                                </div>

                                <p className="text-cyan-100/70 text-lg uppercase tracking-widest font-bold">Active Members</p>
                            </div>
                        </ScrollReveal>

                        {/* Events/Year */}
                        <ScrollReveal direction="up" className="group" delay={0.2}>
                            <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:scale-105 group-hover:border-purple-500/30 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                                <Calendar className="w-12 h-12 mx-auto text-purple-400 mb-6 group-hover:text-purple-300 transition-colors drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />

                                <div className="text-6xl font-black font-orbitron mb-2 flex justify-center items-center text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400">
                                    <CountUp to={50} duration={2.5} />
                                    <span>+</span>
                                </div>

                                <p className="text-purple-100/70 text-lg uppercase tracking-widest font-bold">Events/Year</p>
                            </div>
                        </ScrollReveal>

                        {/* Awards Won */}
                        <ScrollReveal direction="up" className="group" delay={0.4}>
                            <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:scale-105 group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                                <Trophy className="w-12 h-12 mx-auto text-amber-400 mb-6 group-hover:text-amber-300 transition-colors drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />

                                <div className="text-6xl font-black font-orbitron mb-2 flex justify-center items-center text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
                                    <CountUp to={20} duration={2.5} />
                                    <span>+</span>
                                </div>

                                <p className="text-amber-100/70 text-lg uppercase tracking-widest font-bold">Awards Won</p>
                            </div>
                        </ScrollReveal>

                    </div>
                </div>
            </section>

            {/* Experimental Pre-Join Experience Section */}
            <PreJoinExperience />

            <ContactSection />
        </div>
    );
}
