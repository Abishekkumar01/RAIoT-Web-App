"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, ClipboardList, Users, LogOut, Hexagon } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const MobileTechLogin = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    // Animation variants
    const menuVariants = {
        hidden: {
            opacity: 0,
            scale: 0,
            x: 100,
            y: -100,
            transition: {
                duration: 0.3,
                ease: "backIn"
            }
        },
        visible: {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            transition: {
                duration: 0.5,
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: (i: number) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.3
            }
        })
    };

    return (
        <div className="relative z-50">
            {/* --- Trigger Button --- */}
            <motion.button
                onClick={toggleOpen}
                whileTap={{ scale: 0.9 }}
                className="relative group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg overflow-hidden"
            >
                {/* Tech Background Scanline */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-400/50 -translate-y-full group-hover:translate-y-[200%] transition-transform duration-1000" />

                {/* Icon */}
                {user ? (
                    <Avatar className="h-8 w-8 ring-1 ring-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-cyan-950 text-cyan-400 text-xs text-bold">
                            {user.displayName?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="relative">
                        <User className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />

                        {/* Corner Accents */}
                        <div className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t border-l border-cyan-400" />
                        <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b border-r border-cyan-400" />
                    </div>
                )}
            </motion.button>

            {/* --- Flying Menu Overlay --- */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />

                        {/* Menu Container */}
                        <motion.div
                            variants={menuVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="absolute top-14 right-0 min-w-[260px] bg-black/90 border border-cyan-500/40 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.3)] z-50"
                            style={{ transformOrigin: "top right" }}
                        >
                            {/* Tech Header */}
                            <div className="relative px-4 py-3 bg-cyan-950/20 border-b border-cyan-500/20 flex items-center justify-between">
                                <span className="text-xs font-orbitron tracking-widest text-cyan-400">
                                    ACCESS PROTOCOL
                                </span>
                                <div className="flex space-x-1">
                                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
                                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-75" />
                                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-150" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-2 space-y-1">
                                {user ? (
                                    <>
                                        {/* User Logged In State */}
                                        <motion.div variants={itemVariants} custom={0}>
                                            <div className="px-3 py-2 mb-2 flex items-center space-x-3 bg-cyan-900/10 rounded-lg">
                                                <Avatar className="h-10 w-10 ring-2 ring-cyan-500/30">
                                                    <AvatarFallback className="bg-black text-cyan-400">
                                                        {user.displayName?.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                                                    <p className="text-xs text-cyan-400/70 truncate capitalize">{user.role}</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <motion.div variants={itemVariants} custom={1} className="space-y-1">
                                            <Link
                                                href={user.role === "guest" ? "/guest/profile" : (user.role === "admin" || user.role === "superadmin" ? "/admin" : "/dashboard")}
                                                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-cyan-100 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors group"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <Shield className="w-4 h-4 text-cyan-500 group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                                                <span>Dashboard Access</span>
                                            </Link>

                                            <button
                                                onClick={() => { logout(); setIsOpen(false); }}
                                                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Terminate Session</span>
                                            </button>
                                        </motion.div>
                                    </>
                                ) : (
                                    <>
                                        {/* Login Options */}
                                        {[
                                            { href: "/auth/login?type=member", label: "Member Login", icon: User },
                                            { href: "/auth/login?type=admin", label: "Admin Login", icon: Shield },
                                            { href: "/auth/login?type=operations", label: "Operations Login", icon: ClipboardList },
                                            { href: "/auth/login?type=guest", label: "Guest Access", icon: Users },
                                        ].map((item, idx) => (
                                            <motion.div key={item.href} variants={itemVariants} custom={idx}>
                                                <Link
                                                    href={item.href}
                                                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-cyan-100 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors group relative overflow-hidden"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    <item.icon className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                                                    <span className="relative z-10">{item.label}</span>
                                                    {/* Hover Flash */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                </Link>
                                            </motion.div>
                                        ))}

                                        <div className="my-2 border-t border-cyan-500/20" />

                                        <motion.div variants={itemVariants} custom={4}>
                                            <Link
                                                href="/auth/guest-signup"
                                                className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-sm bg-cyan-900/20 text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/30 hover:border-cyan-400/60"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <Users className="w-4 h-4" />
                                                <span className="font-bold tracking-wide">JOIN AS GUEST</span>
                                            </Link>
                                        </motion.div>
                                    </>
                                )}
                            </div>

                            {/* Footer Deco */}
                            <div className="h-1 w-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-900" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
