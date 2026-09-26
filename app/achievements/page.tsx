"use client"

import { useState, useEffect, useRef } from "react"
import { PublicNavbar } from "@/components/layout/PublicNavbar"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { motion, useScroll, useSpring } from "framer-motion"
import { Trophy, Award, Calendar, CheckCircle2, ChevronRight, Sparkles, Star, ExternalLink, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Achievement } from "@/lib/types/achievement"

export default function AchievementsPage() {
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [loading, setLoading] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    })

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const q = query(collection(db, "achievements"), orderBy("order", "asc"))
                const snapshot = await getDocs(q)

                const items: Achievement[] = []
                snapshot.forEach((doc) => {
                    const data = doc.data()
                    if (data.status !== 'draft') {
                        items.push({
                            id: doc.id,
                            title: data.title || "",
                            batch: data.batch || new Date().getFullYear().toString(),
                            date: data.date || "",
                            tag: data.tag || "",
                            imageUrl: data.imageUrl || "",
                            description: data.description || "",
                            points: Array.isArray(data.points) ? data.points : [],
                            order: typeof data.order === 'number' ? data.order : 0,
                            status: data.status || 'published'
                        })
                    }
                })

                // Sort by Batch Descending then Order Ascending
                items.sort((a, b) => parseInt(b.batch) - parseInt(a.batch) || a.order - b.order)
                setAchievements(items)
            } catch (e) {
                console.error("Error fetching achievements:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchAchievements()
    }, [])

    // Group achievements by batch
    const groupedAchievements = achievements.reduce((acc, item) => {
        if (!acc[item.batch]) acc[item.batch] = []
        acc[item.batch].push(item)
        return acc
    }, {} as Record<string, Achievement[]>)

    const sortedBatches = Object.keys(groupedAchievements).sort((a, b) => parseInt(b) - parseInt(a))

    return (
        <div ref={containerRef} className="min-h-screen bg-black text-slate-100 overflow-x-hidden selection:bg-cyan-500/30">
            <PublicNavbar />

            {/* Hero Section */}
            <div className="relative py-12 md:py-20 text-center overflow-hidden">
                {/* Abstract Background Orbs */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[128px]" />
                    <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[128px]" />
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
                            className="object-contain md:w-20 md:h-20 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                        />
                    </div>

                    {/* Cyber Badge */}
                    <div className="flex justify-center mb-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/40 text-cyan-400 font-mono text-xs md:text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md">
                            <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
                            <span>HALL OF FAME & VICTORIES</span>
                        </div>
                    </div>

                    <h1
                        className="text-4xl md:text-7xl font-black font-orbitron mb-4 md:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] tracking-wide uppercase"
                        style={{ fontFamily: 'var(--font-orbitron)' }}
                    >
                        Our Achievements
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto px-4 leading-relaxed font-sans">
                        Honoring the groundbreaking projects, hackathon championships, and technological triumphs engineered by RAIoTians.
                    </p>
                </motion.div>
            </div>

            {/* Tree-like Timeline Section */}
            <div className="max-w-[1400px] mx-auto relative px-4 sm:px-6 md:px-16 pb-20 md:pb-36">
                {!loading && (
                    <>
                        {/* Central Animated Timeline Line (Desktop & Mobile) */}
                        {achievements.length > 0 && (
                            <>
                                <motion.div
                                    style={{ scaleY: scaleY, originY: 0 }}
                                    className="absolute left-[20px] md:left-1/2 top-4 bottom-0 w-[4px] bg-gradient-to-b from-cyan-500 via-purple-500 to-cyan-500 -translate-x-1/2 shadow-[0_0_20px_rgba(6,182,212,0.7)] z-0 rounded-full"
                                />
                                <div className="absolute left-[20px] md:left-1/2 top-4 bottom-0 w-[2px] bg-slate-800 -translate-x-1/2 z-0" />
                            </>
                        )}

                        {achievements.length === 0 ? (
                            <div className="text-center py-24 text-slate-500 border border-dashed border-slate-800 rounded-3xl max-w-xl mx-auto p-8 bg-slate-950/40">
                                <Trophy className="w-16 h-16 text-cyan-500/40 mx-auto mb-4 animate-pulse" />
                                <p className="text-2xl font-orbitron text-cyan-400/80 uppercase">No Achievements Recorded Yet</p>
                                <p className="text-sm mt-2 text-slate-400">Initializing database milestones sequence...</p>
                            </div>
                        ) : (
                            sortedBatches.map((batch) => (
                                <div key={batch} className="mb-24 md:mb-36 relative z-10">
                                    {/* Sticky Batch Year Marker */}
                                    <div className="flex justify-start md:justify-center mb-10 md:mb-16 sticky top-20 md:top-24 z-20 pl-8 md:pl-0">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            viewport={{ once: true }}
                                            className="bg-slate-950/95 border-2 border-cyan-400/60 px-6 py-2 md:py-2.5 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-xl flex items-center gap-3"
                                        >
                                            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                                            <span className="text-base md:text-2xl font-black font-orbitron text-cyan-300 tracking-wider">
                                                BATCH {batch}
                                            </span>
                                            <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 font-mono text-xs">
                                                {groupedAchievements[batch].length} {groupedAchievements[batch].length === 1 ? 'Milestone' : 'Milestones'}
                                            </Badge>
                                        </motion.div>
                                    </div>

                                    {/* Achievements under this batch */}
                                    <div className="space-y-16 md:space-y-24">
                                        {groupedAchievements[batch].map((achievement, idx) => {
                                            const isLeft = idx % 2 === 0

                                            return (
                                                <motion.div
                                                    key={achievement.id}
                                                    initial={{ opacity: 0, y: 40 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true, margin: "-80px" }}
                                                    transition={{ duration: 0.6, delay: 0.1 }}
                                                    className="relative pl-10 md:pl-0"
                                                >
                                                    {/* Central Stem Connecting Nodes (Desktop) */}
                                                    <div className="hidden md:flex absolute top-12 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 items-center justify-center z-10 shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                                                        <Trophy className="w-4 h-4 text-amber-400" />
                                                    </div>

                                                    {/* Connecting Node (Mobile) */}
                                                    <div className="md:hidden absolute top-6 -left-[27px] w-5 h-5 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                    </div>

                                                    {/* Main Landscape Card */}
                                                    <div className="max-w-4xl mx-auto">
                                                        <Card className="bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/60 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] group">
                                                            {/* Cyber Top Accent Bar */}
                                                            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                                                            <CardContent className="p-0">
                                                                {/* Big Landscape Image */}
                                                                <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-slate-900 overflow-hidden border-b border-slate-800/80">
                                                                    {achievement.imageUrl ? (
                                                                        <img
                                                                            src={achievement.imageUrl}
                                                                            alt={achievement.title}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-slate-500">
                                                                            <Trophy className="w-16 h-16 mb-2 text-slate-600 group-hover:text-amber-400 transition-colors" />
                                                                            <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
                                                                                Landscape Image Not Uploaded
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Overlay gradient */}
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

                                                                    {/* Badges on Landscape Image */}
                                                                    <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                                                                        {achievement.tag && (
                                                                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs md:text-sm px-3 py-1 shadow-[0_0_15px_rgba(245,158,11,0.5)] border-none">
                                                                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                                                                {achievement.tag}
                                                                            </Badge>
                                                                        )}
                                                                        <Badge variant="outline" className="bg-black/70 backdrop-blur-md border-cyan-400/50 text-cyan-300 font-mono text-xs px-3 py-1">
                                                                            Batch {achievement.batch}
                                                                        </Badge>
                                                                    </div>

                                                                    {achievement.date && (
                                                                        <div className="absolute bottom-4 right-4 z-10">
                                                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300">
                                                                                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                                                                <span>{achievement.date}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Content Container Below Image */}
                                                                <div className="p-6 md:p-8 space-y-6">
                                                                    <div>
                                                                        <h3 className="text-2xl md:text-3xl font-black font-orbitron text-white group-hover:text-cyan-300 transition-colors tracking-wide">
                                                                            {achievement.title}
                                                                        </h3>
                                                                        {achievement.description && (
                                                                            <p className="text-slate-300 text-sm md:text-base mt-2.5 leading-relaxed font-sans">
                                                                                {achievement.description}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    {/* Text Box Below Image Listing Points One by One */}
                                                                    {achievement.points && achievement.points.length > 0 && (
                                                                        <div className="relative rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5 md:p-6 overflow-hidden">
                                                                            {/* Subtle background glow */}
                                                                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                                                                            {/* Header inside text box */}
                                                                            <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-800">
                                                                                <Trophy className="w-4 h-4 text-amber-400" />
                                                                                <span className="font-mono text-xs md:text-sm text-cyan-400 font-bold uppercase tracking-wider">
                                                                                    Key Highlights & Milestones
                                                                                </span>
                                                                            </div>

                                                                            {/* Points List */}
                                                                            <ul className="space-y-3">
                                                                                {achievement.points.map((point, pIdx) => (
                                                                                    <motion.li
                                                                                        key={pIdx}
                                                                                        initial={{ opacity: 0, x: -10 }}
                                                                                        whileInView={{ opacity: 1, x: 0 }}
                                                                                        viewport={{ once: true }}
                                                                                        transition={{ duration: 0.3, delay: pIdx * 0.05 }}
                                                                                        className="flex items-start gap-3 group/point"
                                                                                    >
                                                                                        <div className="mt-1 shrink-0 w-5 h-5 rounded-md bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center group-hover/point:border-cyan-400 transition-colors shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                                                                                            <span className="text-cyan-400 font-mono text-[10px] font-bold">
                                                                                                {String(pIdx + 1).padStart(2, '0')}
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans">
                                                                                            {point}
                                                                                        </p>
                                                                                    </motion.li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
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
                    </>
                )}
            </div>
        </div>
    )
}
