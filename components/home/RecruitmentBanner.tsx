'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import TraineeRegistrationModal from '@/components/trainee/TraineeRegistrationModal';
import { AnimatePresence, motion } from 'framer-motion';

export default function RecruitmentBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [isOpenSetting, setIsOpenSetting] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'recruitment'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().isOpen) {
                setIsOpenSetting(true);
                setIsVisible(true);
            } else {
                setIsOpenSetting(false);
                setIsVisible(false);
            }
        });
        return () => unsubscribe();
    }, []);

    if (!isOpenSetting || !isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ duration: 0.6, type: 'spring', damping: 20 }}
                    className="relative w-full z-50 overflow-hidden border-b border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.25)]"
                >
                    {/* Background Layer with gradients and texture */}
                    <div className="absolute inset-0 bg-[#050505] z-0" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 via-black to-purple-950/80 z-0" />
                    <div className="absolute inset-0 bg-[url('/assets/grid-pattern.png')] opacity-10 bg-repeat z-0 mix-blend-overlay" />

                    {/* Animated Light Sweep */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -skew-x-12 translate-x-[-100%] animate-shine z-1" />

                    <div className="w-full px-4 md:px-12 py-6 md:py-10 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">

                        {/* Left Side: Logos */}
                        <div className="flex items-center gap-2 md:gap-6 flex-shrink-0 scale-90 md:scale-100 origin-left">
                            {/* RAIoT Logo */}
                            <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 md:w-20 md:h-20 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                                    <Image src="/logo.png" alt="RAIoT Logo" fill className="object-contain" />
                                </div>
                                <div className="hidden sm:block">
                                    <h3 className="font-orbitron font-black text-2xl md:text-4xl text-white leading-none tracking-widest">RAIoT</h3>
                                </div>
                            </div>

                            {/* X Separator */}
                            <div className="text-cyan-500/50 font-thin text-xl md:text-3xl select-none mx-[-2px]">
                                <X className="w-4 h-4 md:w-8 md:h-8" />
                            </div>

                            {/* Amity Logo */}
                            <div className="flex items-center gap-4">
                                <div className="relative h-12 md:h-20 w-36 md:w-72 bg-white/95 -skew-x-12 border-r-4 border-cyan-500/50 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden">
                                    <div className="relative w-full h-full skew-x-12 flex items-center justify-center p-0">
                                        <Image
                                            src="/amity transperent logo.png"
                                            alt="Amity University"
                                            width={300}
                                            height={120}
                                            className="object-contain max-h-full w-auto scale-[2.0] md:scale-[2.5]"
                                        />
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <h3 className="font-serif font-bold text-lg md:text-xl text-gray-100 leading-tight tracking-wide">
                                        AMITY<br />UNIVERSITY<br />
                                        <span className="text-cyan-400 text-xs md:text-sm tracking-widest font-sans">JAIPUR</span>
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Center: Slogan - Visible on Mobile now, scaled down */}
                        <div className="flex flex-col items-center justify-center text-center flex-1 mx-0 md:mx-4 relative order-last lg:order-none w-full lg:w-auto mt-2 lg:mt-0">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl opacity-50 rounded-full scale-110" />

                            <h2 className="relative text-2xl md:text-6xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 animate-gradient-x flex items-center justify-center gap-2 md:gap-4 whitespace-nowrap drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] tracking-wide">
                                <Sparkles className="w-5 h-5 md:w-10 md:h-10 text-yellow-400 animate-spin-slow" />
                                JOIN THE BLADE
                                <Sparkles className="w-5 h-5 md:w-10 md:h-10 text-yellow-400 animate-spin-slow" />
                            </h2>
                            <p className="relative text-cyan-100/90 text-[10px] md:text-lg font-mono mt-1 md:mt-2 tracking-[0.2em] uppercase font-bold text-shadow-sm">
                                Master Robotics, Automation & IoT
                            </p>
                        </div>

                        {/* Right: CTA */}
                        <div className="flex items-center justify-center lg:justify-end flex-shrink-0 w-full lg:w-auto">
                            <TraineeRegistrationModal
                                triggerButton={
                                    <Button
                                        size="lg"
                                        className="relative overflow-hidden bg-cyan-600 hover:bg-cyan-500 text-white rounded-none skew-x-[-10deg] px-8 md:px-16 py-2 border-l-4 border-white/20 shadow-[0_0_30px_rgba(8,145,178,0.4)] transition-all duration-300 hover:scale-105 group h-12 md:h-20 w-full md:w-auto"
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shine transition-transform" />
                                        <span className="relative skew-x-[10deg] font-bold font-orbitron tracking-wider text-lg md:text-2xl flex items-center justify-center gap-2 md:gap-3">
                                            REGISTER <ChevronRight className="w-5 h-5 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </Button>
                                }
                            />
                        </div>

                        {/* Mobile Close */}
                        <button
                            onClick={() => setIsVisible(false)}
                            className="absolute top-2 right-2 p-1 text-white/40 hover:text-white transition-colors md:hidden"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
