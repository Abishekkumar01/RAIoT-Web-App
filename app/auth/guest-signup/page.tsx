"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Users, ArrowLeft, ChevronRight, Hexagon, Terminal, Building2, MapPin, GraduationCap, Briefcase } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function GuestSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    department: "",
    year: "",
    city: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }
      if (!formData.displayName.trim()) throw new Error("Full name is required")
      if (!formData.email.trim()) throw new Error("Email is required")
      if (!formData.organization.trim()) throw new Error("College/University is required")
      if (!auth || !db) throw new Error("Firebase configuration error")

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: "guest",
        profileData: {
          organization: formData.organization,
          department: formData.department,
          year: formData.year,
          city: formData.city
        },
        attendance: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })

      setSuccess(true)
      setTimeout(() => {
        router.push("/guest/profile")
      }, 2000)

    } catch (error: any) {
      let errorMessage = "Failed to create account"
      if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered'
      else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address'
      else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak'
      else if (error.message) errorMessage = error.message
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black font-orbitron text-cyan-500">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 rounded-full bg-cyan-500/10 border border-cyan-500 animate-pulse">
            <Users className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold tracking-widest">REGISTRATION COMPLETE</h2>
          <p className="text-cyan-400/60 font-mono">Redirecting to guest profile...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans selection:bg-cyan-500/30 py-10">
      {/* Background Grid */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
                linear-gradient(to right, #00111a 1px, transparent 1px),
                linear-gradient(to bottom, #00111a 1px, transparent 1px)
            `,
          backgroundSize: '40px 40px'
        }}
      />
      {/* Ambient Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-3xl z-10 relative px-4"
      >
        {/* Holographic Border Frame */}
        <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 via-transparent to-purple-600 opacity-30 blur-sm rounded-lg" />

        <div className="relative bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">

          {/* Header */}
          <div className="bg-cyan-950/20 p-8 md:p-10 border-b border-cyan-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent translate-y-[-100%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />

            {/* Back Button */}
            <Link
              href="/"
              className="absolute top-6 left-6 z-20 flex items-center gap-3 text-cyan-500 hover:text-cyan-300 transition-colors group"
            >
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-cyan-500/30 bg-black/40 backdrop-blur-md group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all">
                <ArrowLeft className="h-5 w-5" />
              </div>
              <span className="font-orbitron text-sm tracking-wider opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                RETURN_HOME
              </span>
            </Link>

            <div className="flex flex-col items-center justify-center text-center mt-6">
              <div className="p-3 bg-cyan-500/10 rounded border border-cyan-500/50 mb-4">
                <img src="/logo.png" alt="RAIoT Logo" className="h-12 w-12 object-contain" />
              </div>
              <h1 className="text-3xl font-black text-white font-orbitron tracking-widest uppercase">
                Guest Registration
              </h1>
              <p className="text-cyan-400/60 font-mono text-xs tracking-wider mt-2">
                        // PROTOCOL: EXTERNAL_ACCESS_GRANT
              </p>
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
          </div>

          <div className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-900/20 border-l-4 border-red-500 text-red-200 text-sm font-mono flex items-center gap-3"
                  >
                    <Terminal className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="uppercase">ERROR: {error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-6">
                {/* Basic Info */}
                <div className="space-y-6">
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Full Name</Label>
                    <div className="relative">
                      <Input name="displayName" value={formData.displayName} onChange={handleChange} required placeholder="John Doe" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><Users className="h-5 w-5" /></div>
                    </div>
                  </motion.div>
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Email</Label>
                    <div className="relative">
                      <Input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><span className="text-sm">@</span></div>
                    </div>
                  </motion.div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                      <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Password</Label>
                      <div className="relative">
                        <Input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><span className="text-sm">#</span></div>
                      </div>
                    </motion.div>
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                      <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Confirm</Label>
                      <div className="relative">
                        <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><span className="text-sm">#</span></div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-cyan-500/20"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-cyan-500/50 font-mono">Affiliation_Data</span></div>
                </div>

                {/* Affiliation Info */}
                <div className="space-y-6">
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">College / University</Label>
                    <div className="relative">
                      <Input name="organization" value={formData.organization} onChange={handleChange} required placeholder="Institute Name" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><Building2 className="h-5 w-5" /></div>
                    </div>
                  </motion.div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                      <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Department</Label>
                      <div className="relative">
                        <Input name="department" value={formData.department} onChange={handleChange} placeholder="Computer Science" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><Briefcase className="h-5 w-5" /></div>
                      </div>
                    </motion.div>
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                      <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Year</Label>
                      <div className="relative">
                        <Input name="year" value={formData.year} onChange={handleChange} placeholder="e.g. 3rd Year" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><GraduationCap className="h-5 w-5" /></div>
                      </div>
                    </motion.div>
                  </div>
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">City</Label>
                    <div className="relative">
                      <Input name="city" value={formData.city} onChange={handleChange} placeholder="City Name" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><MapPin className="h-5 w-5" /></div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }} className="pt-4">
                <Button type="submit" disabled={loading} className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron tracking-widest uppercase rounded-sm border border-cyan-400 group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> PROCESSING...</span> : <span className="flex items-center gap-2">COMPLETE REGISTRATION <ChevronRight className="h-4 w-4" /></span>}
                </Button>
              </motion.div>

              <div className="mt-8 text-center border-t border-white/5 pt-4">
                <Link href="/auth/login?type=guest" className="text-cyan-400 hover:text-cyan-300 font-orbitron text-sm tracking-wide hover:underline decoration-cyan-500/50 underline-offset-4 flex items-center justify-center gap-2 group transition-all">
                  <span className="group-hover:-translate-x-1 transition-transform">{'>>'}</span> ALREADY REGISTERED? LOG IN
                </Link>
              </div>
            </form>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-900" />
        </div>
      </motion.div>
    </div>
  )
}
