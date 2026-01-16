"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Github, Linkedin, Mail, Cpu, Globe, MapPin } from "lucide-react";

import { usePathname } from "next/navigation";

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const pathname = usePathname();

    // Only show footer on Home page
    if (pathname !== "/") {
        return null;
    }

    return (
        <footer className="relative w-full bg-black text-white pt-20 pb-8 overflow-hidden border-t border-white/10">
            {/* Background Tech Elements */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
                <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />

                {/* Dotted Grid Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        maskImage: 'linear-gradient(to bottom, transparent, black)'
                    }}
                />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 mb-16">

                    {/* Brand Column (Left) */}
                    <div className="lg:col-span-4 lg:col-start-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="flex items-start gap-5"
                        >
                            {/* Logo */}
                            <div className="relative w-16 h-16 shrink-0">
                                <Image
                                    src="/logo.png"
                                    alt="RAIoT Logo"
                                    fill
                                    className="object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                                />
                            </div>

                            {/* Brand Text */}
                            <div className="pt-1">
                                <h2 className="font-orbitron text-3xl font-bold tracking-wider text-white">RAIoT</h2>
                                <p className="text-sm text-white/50 tracking-[0.2em] uppercase mt-1">ROBOTICS & AUTOMATION</p>
                            </div>
                        </motion.div>

                        <p className="text-white/60 text-base leading-relaxed max-w-md font-light">
                            Pioneering the future of autonomous systems and intelligent machines.
                            We are a community of makers, engineers, and innovators building the next generation of robotics.
                        </p>

                        <div className="flex flex-col gap-3 pt-2">
                            <div className="flex items-center gap-3 text-white/50 hover:text-primary transition-colors cursor-pointer group">
                                <MapPin className="w-5 h-5 group-hover:text-primary transition-colors" />
                                <span className="text-base font-mono">Amity University Rajasthan, Jaipur</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/50 hover:text-primary transition-colors cursor-pointer group">
                                <Mail className="w-5 h-5 group-hover:text-primary transition-colors" />
                                <span className="text-base font-mono">theraiot.tech@gmail.com</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation (Center - Offset to right slightly) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-1 h-6 bg-purple-600 rounded-sm" />
                            <h3 className="font-orbitron text-2xl font-semibold text-white/90">Navigation</h3>
                        </div>

                        <ul className="space-y-4">
                            {['Home', 'Events', 'Projects', 'Team', 'Gallery'].map((item) => (
                                <li key={item}>
                                    <Link
                                        href={`/${item.toLowerCase() === 'home' ? '' : item.toLowerCase()}`}
                                        className="text-white/60 hover:text-white transition-all duration-300 flex items-center gap-3 group w-fit"
                                    >
                                        <span className="w-1.5 h-1.5 bg-white/20 rounded-full group-hover:bg-primary group-hover:scale-125 transition-all" />
                                        <span className="text-base tracking-wide group-hover:translate-x-1 transition-transform">{item}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Connect (Right) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-1 h-6 bg-purple-600 rounded-sm" />
                            <h3 className="font-orbitron text-2xl font-semibold text-white/90">Connect</h3>
                        </div>

                        <div className="flex gap-4">
                            {[
                                { icon: Github, href: "https://github.com/raiot-lab", target: "_blank" },
                                { icon: Linkedin, href: "https://www.linkedin.com/company/raiot-labs-amity-university-rajasthan/", target: "_blank" },
                                { icon: Globe, href: "#" },
                            ].map((Social, index) => (
                                <Link
                                    key={index}
                                    href={Social.href}
                                    target={Social.target || "_self"}
                                    rel={Social.target === "_blank" ? "noopener noreferrer" : undefined}
                                    className="w-12 h-12 flex items-center justify-center border border-white/10 bg-white/5 rounded-sm hover:bg-primary hover:border-primary hover:text-white text-white/70 transition-all duration-300"
                                >
                                    <Social.icon className="w-5 h-5" />
                                </Link>
                            ))}
                        </div>

                        <div className="pt-4">
                            <Link
                                href="/auth/signup"
                                className="group relative w-full flex items-center justify-between px-6 py-5 bg-black border border-white/20 hover:border-purple-500/50 transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="absolute left-0 top-0 h-full w-[2px] bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <span className="relative z-10 font-orbitron text-base font-bold tracking-[0.1em] text-white group-hover:translate-x-1 transition-transform">
                                    JOIN GUEST<br />COMMUNITY
                                </span>
                                <span className="relative z-10 text-purple-500 text-xl group-hover:translate-x-1 transition-transform duration-300">
                                    →
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Bottom Bar */}
                <div className="border-t border-white/10 pt-8 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-white/30 font-mono tracking-wider">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span>SYSTEM STATUS: ONLINE</span>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <span>© {currentYear} RAIoT. All Systems Operational.</span>
                        <div className="flex gap-6">
                            <Link href="#" className="hover:text-white transition-colors">Privacy Protocol</Link>
                            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
