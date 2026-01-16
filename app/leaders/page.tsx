"use client"


import { useState, useEffect, useRef } from "react"
import { PublicNavbar } from "@/components/layout/PublicNavbar"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion"
import { Linkedin, Cpu, Terminal, Shield, Zap, Code, Users, GraduationCap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Leader {
    id: string
    displayId?: string // New field for custom display ID
    name: string
    role: string
    batch: string
    status: 'active' | 'alumni'
    type?: 'leader' | 'faculty' // New field
    linkedin: string
    imageUrl: string
    order: number
    skills?: string[] // New field for visual enhancement
    bio?: string // New field
    contributionLevel?: number // Percentage 0-100
}

// Neon color palette for random selection or mapping
const neonColors = [
    "shadow-[0_0_15px_rgba(6,182,212,0.5)] border-cyan-500 text-cyan-500", // Cyan
    "shadow-[0_0_15px_rgba(168,85,247,0.5)] border-purple-500 text-purple-500", // Purple
    "shadow-[0_0_15px_rgba(236,72,153,0.5)] border-pink-500 text-pink-500", // Pink
    "shadow-[0_0_15px_rgba(34,197,94,0.5)] border-green-500 text-green-500", // Green
]

export default function LeadersPage() {
    const [leaders, setLeaders] = useState<Leader[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'leader' | 'faculty'>('leader')
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    // Smooth out the scroll progress
    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    })

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const q = query(collection(db, "leaders"), orderBy("order", "asc"))
                const snapshot = await getDocs(q)

                const items: Leader[] = []
                snapshot.forEach((doc) => {
                    const data = doc.data()
                    items.push({ id: doc.id, ...data, displayId: data.displayId || doc.id, type: data.type || 'leader' } as Leader)
                })

                if (items.length > 0) {
                    // Sort client side by batch descending if needed, or rely on order
                    // Default: Sort by Batch (Desc) then Order (Asc)
                    items.sort((a, b) => parseInt(b.batch) - parseInt(a.batch) || a.order - b.order)
                    setLeaders(items)
                } else {
                    setLeaders([])
                }

            } catch (e) {
                console.error("Error fetching leaders:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchLeaders()
    }, [])

    // Filter by View Mode
    const filteredLeaders = leaders.filter(l => (l.type || 'leader') === viewMode)

    // Group by Batch
    const groupedLeaders = filteredLeaders.reduce((acc, leader) => {
        if (!acc[leader.batch]) acc[leader.batch] = []
        acc[leader.batch].push(leader)
        return acc
    }, {} as Record<string, Leader[]>)

    const sortedBatches = Object.keys(groupedLeaders).sort((a, b) => parseInt(b) - parseInt(a))

    // Pre-calculate batch offsets for global alignment (ZigZag Tree Pattern) for Faculty view
    let globalIndexCounter = 0
    const batchOffsets: Record<string, number> = {}

    if (viewMode === 'faculty') {
        sortedBatches.forEach(batch => {
            batchOffsets[batch] = globalIndexCounter
            globalIndexCounter += groupedLeaders[batch].length
        })
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-black text-slate-100 overflow-x-hidden selection:bg-cyan-500/30">
            <PublicNavbar />

            {/* Hero Section */}
            <div className="relative py-12 md:py-20 text-center overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500 rounded-full blur-[128px]" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600 rounded-full blur-[128px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 space-y-4 px-4"
                >
                    <div className="flex justify-center mb-4 md:mb-6">
                        <Image
                            src="/logo.png"
                            alt="RAIoT Logo"
                            width={60}
                            height={60}
                            className="object-contain md:w-20 md:h-20"
                        />
                    </div>

                    {/* View Switcher - Cyber Style */}
                    <div className="flex justify-center mb-6 md:mb-8">
                        <div className="bg-slate-900/80 p-1 rounded-full border border-slate-700 backdrop-blur-md relative flex items-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            <button
                                onClick={() => setViewMode('leader')}
                                className={cn(
                                    "relative px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold tracking-wider transition-all duration-300 z-10 flex items-center gap-1.5 md:gap-2",
                                    viewMode === 'leader' ? "text-slate-950" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                <Users className="w-3 h-3 md:w-4 md:h-4" />
                                LEADERS
                            </button>
                            <button
                                onClick={() => setViewMode('faculty')}
                                className={cn(
                                    "relative px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold tracking-wider transition-all duration-300 z-10 flex items-center gap-1.5 md:gap-2",
                                    viewMode === 'faculty' ? "text-slate-950" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                <GraduationCap className="w-3 h-3 md:w-4 md:h-4" />
                                FACULTY
                            </button>

                            {/* Sliding Background */}
                            <motion.div
                                className="absolute top-1 bottom-1 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                                initial={false}
                                animate={{
                                    left: viewMode === 'leader' ? '4px' : '50%',
                                    width: viewMode === 'leader' ? 'calc(50% - 4px)' : 'calc(50% - 4px)',
                                    x: viewMode === 'leader' ? 0 : 0
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        </div>
                    </div>

                    <h1
                        className="text-4xl md:text-7xl font-black font-orbitron mb-4 md:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] tracking-wide uppercase"
                        style={{ fontFamily: 'var(--font-orbitron)' }}
                    >
                        {viewMode === 'leader' ? "Our Leaders" : "Our Faculty"}
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto px-4">
                        {viewMode === 'leader'
                            ? "The visionaries who built the circuits, coded the future, and led our revolution."
                            : "The mentors who guided our path, shared their wisdom, and shaped our potential."}
                    </p>
                </motion.div>
            </div>

            {/* Timeline Section - Full Width */}
            <div className="max-w-[1920px] mx-auto relative px-6 md:px-48 pb-16 md:pb-32">
                {/* Scroll Progress Line (Animated) */}


                {!loading && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={viewMode}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Scroll Progress Line (Refreshed per view) */}
                            {filteredLeaders.length > 0 && (
                                <>
                                    <motion.div
                                        style={{ scaleY: scaleY, originY: 0 }}
                                        className="absolute left-[20px] md:left-1/2 top-4 bottom-0 w-[4px] bg-gradient-to-b from-cyan-500 via-purple-500 to-cyan-500 -translate-x-1/2 shadow-[0_0_15px_rgba(6,182,212,0.6)] z-0 rounded-full"
                                    />
                                    <div className="absolute left-[20px] md:left-1/2 top-4 bottom-0 w-[2px] bg-slate-800 -translate-x-1/2 z-0" />
                                </>
                            )}

                            {filteredLeaders.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <p className="text-2xl font-orbitron text-cyan-500/50 uppercase">No {viewMode} Records Found</p>
                                    <p className="text-sm mt-2">Initializing database sequence...</p>
                                </div>
                            ) : (
                                sortedBatches.map((batch, batchIdx) => (
                                    <div key={batch} className="mb-24 relative z-10">
                                        {/* Batch Year Marker */}
                                        <div className="flex justify-start md:justify-center mb-8 md:mb-12 sticky top-20 md:top-24 z-20 pl-8 md:pl-0">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                whileInView={{ scale: 1 }}
                                                viewport={{ once: true }}
                                                className="bg-slate-900 border border-cyan-500/50 px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md"
                                            >
                                                <span className="text-sm md:text-2xl font-bold font-mono text-cyan-400">
                                                    {viewMode === 'faculty' ? 'Joined ' : 'Batch '}{batch}
                                                </span>
                                            </motion.div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6 md:gap-8 md:gap-x-24">
                                            {groupedLeaders[batch].map((leader, idx) => {
                                                // Calculate index for ZigZag pattern
                                                let effectiveIndex = idx
                                                if (viewMode === 'faculty') {
                                                    effectiveIndex = (batchOffsets[batch] || 0) + idx
                                                }
                                                const isLeft = effectiveIndex % 2 === 0

                                                // Random Neon Access Style
                                                const neonStyle = neonColors[(leader.name.length + idx) % neonColors.length]
                                                const bgGlow = neonStyle.split(' ')[1].replace("border", "bg"); // Extract color for bg opacity

                                                return (
                                                    <motion.div
                                                        key={leader.id}
                                                        initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        viewport={{ once: true, margin: "-100px" }}
                                                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                                                        className={`relative pl-12 md:pl-0 ${isLeft ? 'md:text-right' : 'md:text-left'} ${isLeft ? 'md:col-start-1' : 'md:col-start-2 md:mt-16'}`}
                                                    >
                                                        <div className={`relative group`}>
                                                            {/* Connecting Line (Desktop) */}
                                                            <div className={`absolute top-8 ${isLeft ? '-right-12' : '-left-12'} w-12 h-[2px] bg-cyan-500/30 hidden md:block`} />
                                                            <div className={`absolute top-[30px] ${isLeft ? '-right-[52px]' : '-left-[52px]'} w-3 h-3 rounded-full bg-cyan-400 hidden md:block shadow-[0_0_10px_rgba(34,211,238,1)] ring-4 ring-slate-950`} />

                                                            {/* Connecting Line (Mobile) */}
                                                            <div className="absolute top-6 -left-[20px] w-6 h-[2px] bg-cyan-500/30 md:hidden" />
                                                            <div className="absolute top-[22px] -left-[26px] w-2.5 h-2.5 rounded-full bg-cyan-400 md:hidden shadow-[0_0_10px_rgba(34,211,238,1)] ring-2 ring-slate-950" />

                                                            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm overflow-hidden hover:border-cyan-500/50 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] h-full">
                                                                <CardContent className="p-0 relative h-full">
                                                                    {/* Cyber Grid Background Pattern */}
                                                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                                                        style={{ backgroundImage: `radial-gradient(circle, ${isLeft ? 'cyan' : '#a855f7'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
                                                                    />

                                                                    <div className={`flex ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-stretch gap-4 md:gap-6 h-full`}>
                                                                        {/* Avatar Section */}
                                                                        <div className={`relative p-4 md:p-6 shrink-0 flex flex-col items-center justify-center ${isLeft ? 'border-l' : 'border-r'} border-slate-800 bg-slate-900/50`}>
                                                                            <div className={`relative h-20 w-20 md:h-24 md:w-24 rounded-full border-2 p-1 ${neonStyle.split(' ')[0]} ${neonStyle.split(' ')[1]} transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6`}>
                                                                                <div className="rounded-full overflow-hidden h-full w-full bg-slate-950 relative">
                                                                                    {leader.imageUrl ? (
                                                                                        <img src={leader.imageUrl} alt={leader.name} className="h-full w-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-500">
                                                                                            <Cpu className="h-6 w-6 md:h-8 md:w-8" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {leader.status === 'active' && (
                                                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 md:h-4 md:w-4 rounded-full border-2 border-slate-900 animate-pulse" />
                                                                                )}
                                                                            </div>
                                                                            <div className="mt-2 md:mt-3 text-center">
                                                                                {leader.linkedin && (
                                                                                    <Link href={leader.linkedin} target="_blank" className="inline-flex items-center text-[10px] md:text-xs text-muted-foreground hover:text-white transition-colors bg-slate-800/50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-slate-700 hover:border-cyan-500">
                                                                                        <Linkedin className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                                                                        <span>Connect</span>
                                                                                    </Link>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Main Content (Middle) */}
                                                                        <div className={`flex-1 py-4 md:py-6 flex flex-col justify-center ${isLeft ? 'text-right' : 'text-left'}`}>
                                                                            <h3 className="text-base md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                                                                {leader.name}
                                                                            </h3>
                                                                            <div className={`flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 mb-2 md:mb-3 ${isLeft ? 'justify-end' : 'justify-start'} flex-wrap`}>
                                                                                <Badge variant="outline" className={`border-slate-700 ${neonStyle.split(' ')[2]} bg-slate-900/50 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5`}>
                                                                                    {leader.role}
                                                                                </Badge>
                                                                                <Badge variant="secondary" className="text-[9px] md:text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 md:px-2 py-0.5">
                                                                                    ID: {leader.displayId || leader.id}
                                                                                </Badge>
                                                                            </div>
                                                                            {leader.bio ? (
                                                                                <p className="text-xs md:text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-2 md:pl-3">
                                                                                    "{leader.bio}"
                                                                                </p>
                                                                            ) : (
                                                                                <p className="text-xs md:text-sm text-slate-500 font-mono">
                                                                                    System.User.Status = {leader.status.toUpperCase()}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        {/* Stats/Skills (Far Edge) - Filling the Empty Space */}
                                                                        <div className={`hidden md:flex flex-col justify-center p-6 w-1/3 min-w-[140px] bg-slate-950/30 ${isLeft ? 'items-start text-left border-r border-slate-800' : 'items-end text-right border-l border-slate-800'}`}>
                                                                            <div className="space-y-3 w-full">
                                                                                <div className={`flex items-center gap-2 text-xs font-mono text-cyan-500/70 border-b border-slate-800 pb-1 ${isLeft ? '' : 'flex-row-reverse'}`}>
                                                                                    <Terminal className="h-3 w-3" />
                                                                                    <span>SKILL_MATRIX</span>
                                                                                </div>

                                                                                <div className={`flex flex-wrap gap-2 ${isLeft ? 'justify-start' : 'justify-end'}`}>
                                                                                    {leader.skills ? leader.skills.map((skill, i) => (
                                                                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-slate-800/80 text-[10px] text-slate-300 border border-slate-700/50">
                                                                                            {i % 2 === 0 ? <Code className="h-2 w-2 mr-1 text-purple-400" /> : <Zap className="h-2 w-2 mr-1 text-yellow-400" />}
                                                                                            {skill}
                                                                                        </span>
                                                                                    )) : (
                                                                                        <>
                                                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-800/80 text-[10px] text-slate-300">Robotics</span>
                                                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-800/80 text-[10px] text-slate-300">Innovation</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>

                                                                                <div className="pt-2">
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <div className="text-[10px] text-slate-300 font-mono font-semibold">CONTRIBUTION LEVEL</div>
                                                                                        <div className="text-[10px] text-cyan-400 font-mono font-bold">{leader.contributionLevel || 85}%</div>
                                                                                    </div>
                                                                                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                                                                        <div
                                                                                            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                                                            style={{ width: `${leader.contributionLevel || 85}%` }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
