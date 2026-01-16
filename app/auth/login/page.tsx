"use client"

import type React from "react"
import { Suspense, useState, useEffect } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Shield, Users, Mail, ChevronRight, Hexagon, Terminal, Lock, Key, ClipboardList, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState<'member' | 'admin' | 'guest' | 'operations'>('member')
  const [resetEmail, setResetEmail] = useState("")
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const { login, logout, loading: authLoading, resetPassword } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'admin' || type === 'guest' || type === 'operations') {
      setLoginType(type as 'admin' | 'guest' | 'operations')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const loggedInUser = await login(email, password)
      if (loggedInUser) {
        // Try to read user doc for role; if blocked, fallback to local role
        try {
          const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()

            // STRICT ROLE ENFORCEMENT - ALLOWLIST APPROACH
            const rawRole = userData.role || 'member'
            // Normalize: lowercase and trim whitespace
            const userRole = rawRole.toLowerCase().trim()

            console.log('Login Attempt:', {
              email: loggedInUser.email,
              rawRole,
              normalizedRole: userRole,
              loginType
            })

            // Define allowed roles for each portal
            // Define allowed roles for each portal
            const allowedMemberRoles = [
              'member',
              'junior_developer',
              'senior_developer',
              'junior developer',
              'senior developer'
            ]
            const allowedOpsRoles = [
              'student_coordinator',
              'operations',
              'inventory_head',
              'public_relation_head',
              'content_creation_head',
              'management_head',
              'technical_head',
              'admin',
              'superadmin'
            ]
            const allowedAdminRoles = [
              'admin',
              'superadmin',
              'president',
              'vice_president'
            ]

            console.log("Role Check -- Raw:", rawRole, "Normalized:", userRole)
            console.log("Is Allowed Member?", allowedMemberRoles.includes(userRole))

            // STRICT CHECKING based on login type
            if (loginType === 'member') {
              // STRICT ENFORCEMENT: ONLY allow defined member/developer roles
              // Everyone else (Ops, Heads, etc.) must use their specific portals
              if (!allowedMemberRoles.includes(userRole)) {
                console.warn('Blocking Restricted Role from Member Login:', userRole)
                await logout()
                throw new Error(`Access Denied: Your role [${rawRole}] is not authorized for the Member Portal.`)
              }
            }
            else if (loginType === 'operations') {
              // ONLY allow ops roles
              if (!allowedOpsRoles.includes(userRole)) {
                // Check specifically for VP/President to give the custom message requested
                if (userRole === 'vice_president' || userRole === 'president') {
                  console.warn('Blocking Leadership from Ops Login:', userRole)
                  await logout()
                  await new Promise(resolve => setTimeout(resolve, 100))
                  throw new Error(`Access Denied: Your role [${userRole}] is not authorized for the operation login Portal.`)
                }

                console.warn('Blocking Non-Ops from Ops Login:', userRole)
                // FORCE LOGOUT to ensure they are not considered "logged in" by the app
                await logout()
                // Small delay to ensure state clears
                await new Promise(resolve => setTimeout(resolve, 100))
                throw new Error(`Access Denied: This area is strictly for Operations & Leadership staff.`)
              }
            }
            else if (loginType === 'admin') {
              // ONLY allow admin/superadmin AND executives
              if (!allowedAdminRoles.includes(userRole)) {
                console.warn('Blocking Non-Admin from Admin Login:', userRole)
                await logout()
                await new Promise(resolve => setTimeout(resolve, 100))
                throw new Error("Access Denied: Administrative Clearance Required.")
              }
            }
            else if (loginType === 'guest') {
              // STRICT ENFORCEMENT: ONLY allow 'guest' role
              if (userRole !== 'guest') {
                console.warn('Blocking Non-Guest from Guest Login:', userRole)
                await logout()
                throw new Error(`Access Denied: Your role [${rawRole}] is not authorized for Guest Access. Please use your designated login portal.`)
              }
            }

            // Routing Logic after successful check
            if (allowedAdminRoles.includes(userRole)) {
              // Prioritize Admin Dashboard for Executives if they used Admin Login
              // However, since we guide them here, let's just send them to Admin Dashboard
              // regardless of whether they *could* go to Ops.
              router.push('/admin')
              return
            } else if (allowedOpsRoles.includes(userRole)) {
              // Even if they logged in via 'member' (admin case), route them correctly?
              // Actually, if they are admin, they go to admin.
              // If they are Ops, they are BLOCKED from member login above.
              // So if they are here, and role is Ops, they MUST have used Ops login.
              router.push('/operations')
              return
            } else if (userRole === 'guest') {
              router.push('/')
              return
            } else {
              // Default Member Dashboard
              router.push('/dashboard')
              return
            }
          } else {
            // If user exists in Auth but not in Firestore, it means they were deleted/banned
            await useAuth().logout()
            throw new Error("Account access revoked. Please contact administration.")
          }
        } catch (permErr: any) {
          // If this is an intentional access denied error, rethrow it so it shows in the UI
          if (permErr.message.includes("Access Denied") || permErr.message.includes("Account access revoked")) {
            throw permErr
          }

          // Only fallback to local role redirection if it was a genuine fetch error (not an auth block)
          // BUT since we are blocking tightly now, we should be careful with fallbacks.
          // Let's rely on the Firestore check mainly. If Firestore fails, blocking is safer.
          // However, for UX in case of network glitch:
          console.error("Role Check Error:", permErr)
          // If we can't verify role, safety triggers -> Logout
          await useAuth().logout()
          throw new Error("Security Verification Failed. Please check your connection and try again.")
        }
      }
    } catch (error: any) {
      setError(error.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError("")
    setResetSuccess(false)
    setResetLoading(true)

    try {
      await resetPassword(resetEmail)
      setResetSuccess(true)
      setTimeout(() => {
        setResetDialogOpen(false)
        setResetEmail("")
        setResetSuccess(false)
      }, 2000)
    } catch (error: any) {
      setResetError(error.message || "Failed to send password reset email")
    } finally {
      setResetLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-cyan-500 font-orbitron">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin" />
          <p className="tracking-widest animate-pulse">AUTHENTICATING_SYSTEMS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans selection:bg-cyan-500/30">

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
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 blur-[100px] rounded-full pointer-events-none" />

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

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl z-10 relative"
      >
        {/* Holographic Border Frame */}
        <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 via-transparent to-purple-600 opacity-30 blur-sm rounded-lg" />

        <div className="relative bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">

          {/* Header Section */}
          <div className="bg-cyan-950/20 p-10 md:p-12 pb-8 border-b border-cyan-500/20 relative overflow-hidden group">
            {/* Scanline */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent translate-y-[-100%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/50">
                  <img src="/logo.png" alt="RAIoT Logo" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white font-orbitron tracking-widest uppercase">
                    Welcome Back
                  </h1>
                  <p className="text-cyan-400/60 font-mono text-sm tracking-wider mt-1">
                                    // ESTABLISH_CONNECTION
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex gap-1">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-cyan-500/30 rounded-full" />
                <div className="w-2 h-2 bg-cyan-500/30 rounded-full" />
              </div>
            </div>

            {/* Login Type Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs font-mono text-cyan-400 uppercase tracking-widest">
              {loginType === 'admin' && <Shield className="h-3 w-3" />}
              {loginType === 'guest' && <Users className="h-3 w-3" />}
              {loginType === 'member' && <User className="h-3 w-3" />}
              {loginType === 'operations' && <ClipboardList className="h-3 w-3" />}
              STATUS: {loginType}_ACCESS_POINT
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
          </div>

          <div className="p-10 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-900/20 border-l-4 border-red-500 text-red-200 text-sm font-mono flex items-center gap-3"
                  >
                    <Terminal className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="uppercase">LOGIN_ERROR: {error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                {/* Email Field */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="group"
                >
                  <Label htmlFor="email" className="text-sm text-cyan-400 font-semibold font-orbitron mb-2 block uppercase tracking-wider group-focus-within:text-cyan-300 transition-colors">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="off"
                      placeholder="your.email@example.com"
                      className="h-12 bg-black/50 border-white/10 text-white placeholder:text-white/20 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all rounded-sm pl-12 text-base"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50">
                      <Mail className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="password" className="text-sm text-cyan-400 font-semibold font-orbitron block uppercase tracking-wider group-focus-within:text-cyan-300 transition-colors">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email)
                        setResetDialogOpen(true)
                      }}
                      className="text-xs text-cyan-500/70 hover:text-cyan-400 hover:underline font-mono uppercase tracking-wide flex items-center gap-1 transition-all"
                    >
                      <Key className="h-3 w-3" /> RECOVERY_PROTOCOL?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Enter your password"
                      className="h-12 bg-black/50 border-white/10 text-white placeholder:text-white/20 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all rounded-sm pl-12 text-base"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50">
                      <Lock className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Submit Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron tracking-widest uppercase rounded-sm border border-cyan-400 group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> AUTHENTICATING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      SIGN IN <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-4">
              <p className="text-xs text-cyan-500/50 font-mono mb-2">
                New to the system?
              </p>
              <Link
                href="/auth/signup"
                className="text-cyan-400 hover:text-cyan-300 font-orbitron text-sm tracking-wide hover:underline decoration-cyan-500/50 underline-offset-4 flex items-center justify-center gap-2 group transition-all"
              >
                <span className="group-hover:-translate-x-1 transition-transform">{'>>'}</span> CREATE ACOUNT
              </Link>
            </div>

          </div>
          {/* Decorative Bottom Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-900" />
        </div>
      </motion.div>

      {/* Password Reset Dialog - Outside main form */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-black border border-cyan-500/50 text-white font-mono sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 font-orbitron tracking-wider text-xl">RESET_ACCESS_KEY</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your authorized email to receive a password reset uplink.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            {resetError && <p className="text-red-500 text-sm">ERROR: {resetError}</p>}
            {resetSuccess && <p className="text-green-500 text-sm">UPLINK SUCCESSFUL: Check inbox.</p>}

            <div className="space-y-2">
              <Label htmlFor="resetEmail" className="text-cyan-500 text-xs uppercase">Target Email</Label>
              <Input
                id="resetEmail"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="bg-black/50 border-cyan-500/30 text-white focus:border-cyan-500"
                placeholder="user@system.net"
              />
            </div>
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron tracking-widest border border-cyan-400">
              {resetLoading ? "SENDING..." : "INITIATE_RESET"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4 text-cyan-500 font-orbitron">
            <Loader2 className="h-12 w-12 animate-spin" />
            <p>LOADING_INTERFACE...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
