"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ShieldAlert, ArrowLeft, ChevronRight, MessageSquare } from "lucide-react"
import { motion } from "framer-motion"

export default function MemberSignupPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home after 10 seconds for better UX reading time
    const timer = setTimeout(() => {
      router.push('/')
    }, 10000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans selection:bg-amber-500/30">
      {/* Background Grid - Amber Warning Tint */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
                linear-gradient(to right, #1a1000 1px, transparent 1px),
                linear-gradient(to bottom, #1a1000 1px, transparent 1px)
            `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-900/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-3 text-amber-500 hover:text-amber-300 transition-colors group"
      >
        <div className="h-10 w-10 flex items-center justify-center rounded-full border border-amber-500/30 bg-black/40 backdrop-blur-md group-hover:border-amber-400 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all">
          <ArrowLeft className="h-5 w-5" />
        </div>
        <span className="font-orbitron text-sm tracking-wider opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          RETURN_HOME
        </span>
      </Link>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg z-10 relative px-4"
      >
        {/* Holographic Border Frame (Amber) */}
        <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 via-transparent to-red-600 opacity-30 blur-sm rounded-lg" />

        <div className="relative bg-black/80 backdrop-blur-xl border border-amber-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)]">

          {/* Header */}
          <div className="bg-amber-950/20 p-10 border-b border-amber-500/20 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent translate-y-[-100%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />

            <div className="inline-block p-4 rounded-full bg-amber-500/10 border border-amber-500 animate-pulse mb-6">
              <ShieldAlert className="w-12 h-12 text-amber-500" />
            </div>

            <h1 className="text-3xl font-black text-white font-orbitron tracking-widest uppercase mb-2">
              Access Restricted
            </h1>
            <p className="text-amber-500/60 font-mono text-xs tracking-wider">
                        // PROTOCOL: MEMBER_REGISTRATION_LOCKED
            </p>

            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg" />
          </div>

          <div className="p-10 text-center space-y-6">
            <div className="space-y-4 text-amber-100/80 font-mono text-sm leading-relaxed">
              <p>
                Direct registration for RAioT Membership is currently structured for <strong className="text-amber-400">ADMINISTRATIVE ACTION ONLY</strong>.
              </p>
              <p>
                To obtain cleared credentials and ID access, please initiate contact with an authorized Administrator.
              </p>
            </div>

            <div className="grid gap-3 pt-4">
              <Link href="/auth/guest-signup">
                <Button className="w-full h-12 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 font-orbitron tracking-widest uppercase border border-amber-500/50">
                  REGISTER AS GUEST <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full h-12 border-white/10 text-white hover:bg-white/5 font-mono uppercase">
                  <MessageSquare className="mr-2 h-4 w-4" /> Contact Admin
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full h-12 text-white/50 hover:text-white font-mono uppercase">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
                </Button>
              </Link>
            </div>

            <p className="text-xs text-amber-500/30 font-mono mt-4">
              Auto-redirecting to Mainframe in 10s...
            </p>
          </div>

          <div className="h-1 w-full bg-gradient-to-r from-amber-900 via-amber-500 to-amber-900" />
        </div>
      </motion.div>
    </div>
  )
}
