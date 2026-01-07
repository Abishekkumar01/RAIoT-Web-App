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
        <footer className="relative w-full bg-black text-white pt-20 pb-10 overflow-hidden border-t border-white/10">
            {/* Background Tech Elements */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
                <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                {/* Animated Grid Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                        maskImage: 'linear-gradient(to bottom, transparent, black)'
                    }}
                />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="md:col-span-5 space-y-6 relative">
                        {/* Floating Logo - Absolute Positioned to Left */}
                        <div className="hidden xl:block absolute -left-64 top-10 w-40 h-40 opacity-80 pointer-events-none">
                            <Image
                                src="/logo.png"
                                alt="RAIoT Logo"
                                fill
                                className="object-contain drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                            />
                        </div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex items-center gap-3"
                        >
                            <div className="relative w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <Cpu className="w-6 h-6 text-primary relative z-10" />
                            </div>
                            <div>
                                <h2 className="font-orbitron text-2xl font-bold tracking-wider">RAIoT</h2>
                                <p className="text-xs text-white/50 tracking-[0.2em] uppercase">Robotics & Automation</p>
                            </div>
                        </motion.div>

                        <p className="text-white/60 leading-relaxed max-w-md font-light">
                            Pioneering the future of autonomous systems and intelligent machines.
                            We are a community of makers, engineers, and innovators building the next generation of robotics.
                        </p>

                        <div className="flex flex-col gap-2 pt-4">
                            <div className="flex items-center gap-3 text-white/60 hover:text-primary transition-colors cursor-pointer">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">Amity University Rajasthan, Jaipur</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/60 hover:text-primary transition-colors cursor-pointer">
                                <Mail className="w-4 h-4" />
                                <span className="text-sm">theraiot.tech@gmail.com</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="md:col-span-3 md:col-start-7 space-y-6">
                        <h3 className="font-orbitron text-lg font-semibold text-primary/90 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-sm" />
                            Navigation
                        </h3>
                        <ul className="space-y-3">
                            {['Home', 'Events', 'Projects', 'Team', 'Gallery'].map((item) => (
                                <li key={item}>
                                    <Link
                                        href={`/${item.toLowerCase() === 'home' ? '' : item.toLowerCase()}`}
                                        className="text-white/60 hover:text-white transition-all duration-300 flex items-center gap-2 group"
                                    >
                                        <span className="w-1 h-1 bg-white/20 rounded-full group-hover:bg-primary transition-colors" />
                                        <span className="group-hover:translate-x-1 transition-transform">{item}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Social / Connect */}
                    <div className="md:col-span-3 space-y-6">
                        <h3 className="font-orbitron text-lg font-semibold text-primary/90 flex items-center gap-2">
                            <span className="w-1 h-4 bg-primary rounded-sm" />
                            Connect
                        </h3>
                        <div className="flex gap-4">
                            {[
                                { icon: Github, href: "https://github.com/raiot-lab", target: "_blank" },
                                { icon: Linkedin, href: "#" },
                                { icon: Globe, href: "#" },
                            ].map((Social, index) => (
                                <Link
                                    key={index}
                                    href={Social.href}
                                    target={Social.target || "_self"}
                                    rel={Social.target === "_blank" ? "noopener noreferrer" : undefined}
                                    className="w-10 h-10 flex items-center justify-center border border-white/20 bg-white/5 rounded-sm hover:bg-primary hover:border-primary hover:text-black transition-all duration-300 group relative overflow-hidden"
                                >
                                    <Social.icon className="w-5 h-5 relative z-10" />
                                </Link>
                            ))}
                        </div>

                        <div className="pt-4">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded opacity-50 blur group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                                <Link href="/auth/signup" className="relative w-full bg-black border border-white/10 px-6 py-4 text-sm font-orbitron tracking-[0.2em] font-bold text-white hover:text-purple-400 transition-colors uppercase flex items-center justify-between group-hover:border-purple-500/30">
                                    <span>JOIN GUEST COMMUNITY</span>
                                    <span className="text-xl text-purple-500">→</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="border-t border-white/10 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40 font-mono">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>SYSTEM STATUS: ONLINE</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span>© {currentYear} RAIoT. All Systems Operational.</span>
                        <Link href="#" className="hover:text-white transition-colors">Privacy Protocol</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* Decorative Bottom Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        </footer>
    );
}
