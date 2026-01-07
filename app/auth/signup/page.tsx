"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Loader2, Info, ChevronRight, Hexagon, Terminal, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [formStep, setFormStep] = useState(0) // For staggered reveal

  const { signup, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Staggered reveal effect simulation
    const timer = setTimeout(() => {
      setFormStep(1);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Map obfuscated names back to state keys
    let stateKey = name;
    if (name === 'val_display_name') stateKey = 'displayName';
    if (name === 'val_user_email') stateKey = 'email';
    if (name === 'val_new_password') stateKey = 'password';
    if (name === 'val_confirm_password') stateKey = 'confirmPassword';

    setFormData((prev) => ({
      ...prev,
      [stateKey]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("PASSWORDS_DO_NOT_MATCH")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("INVALID_EMAIL_FORMAT")
      return
    }

    if (formData.password.length < 6) {
      setError("PASSWORD_MIN_LENGTH_ERR: 6_CHARS")
      return
    }

    setLoading(true)

    try {
      await signup(formData.email, formData.password, formData.displayName, "guest")
      router.push("/dashboard")
    } catch (error: any) {
      console.error(error); // Log full error for debugging
      let msg = error.message || "ACCOUNT_CREATION_FAILED";

      // Translate common Firebase errors
      if (msg.includes("email-already-in-use")) {
        msg = "Email already registered. Please Log In.";
      } else if (msg.includes("weak-password")) {
        msg = "Password too weak. Use a stronger password.";
      } else if (msg.includes("invalid-email")) {
        msg = "Invalid format. Check your email address.";
      } else if (msg.includes("network-request-failed")) {
        msg = "Network Error. Check your connection.";
      }

      setError(msg);
    } finally {
      setLoading(false)
    }
  }

  // Loading Screen (Robotic)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-cyan-500 font-orbitron">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin" />
          <p className="tracking-widest animate-pulse">SYSTEM_INITIALIZING...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Background Grid - Cyberpunk Vibe */}
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

      {/* Main Terminal Container */}
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
          <div className="bg-cyan-950/20 p-8 border-b border-cyan-500/20 relative overflow-hidden group">
            {/* Scanline Effect in Header */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent translate-y-[-100%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/50">
                  <img src="/logo.png" alt="RAIoT Logo" className="h-8 w-8 object-contain" />
                </div>
                <h1 className="text-2xl font-black text-white font-orbitron tracking-widest uppercase">
                  Guest Access Portal
                </h1>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-cyan-500/30 rounded-full" />
                <div className="w-2 h-2 bg-cyan-500/30 rounded-full" />
              </div>
            </div>
            <p className="text-cyan-400/60 font-mono text-xs tracking-wider">
              Authorized Guest Entry
            </p>

            {/* Decorative corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
          </div>

          <div className="p-10 md:p-12 pb-8">
            {/* Demo Mode Alert - Styled as System Notice */}
            {/* Demo Mode Alert Removed */}

            <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-mono flex items-center gap-2"
                  >
                    <Terminal className="h-4 w-4" />
                    <span className="uppercase">ERROR: {error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dummy Fields to trick Browser Autofill */}
              <input type="text" name="fake_email" style={{ display: 'none' }} autoComplete="off" tabIndex={-1} />
              <input type="password" name="fake_password" style={{ display: 'none' }} autoComplete="off" tabIndex={-1} />
              <input type="password" name="fake_confirm_password" style={{ display: 'none' }} autoComplete="off" tabIndex={-1} />

              {/* Name Field */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="group"
              >
                <Label htmlFor="field_display_name" className="text-sm text-cyan-400 font-semibold font-orbitron mb-2 block uppercase tracking-wider group-focus-within:text-cyan-300 transition-colors">
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="field_display_name"
                    name="val_display_name" // Obfuscated name
                    value={formData.displayName}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    autoComplete="off"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    className="h-12 bg-black/50 border-white/10 text-white placeholder:text-white/20 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all rounded-sm pl-12 text-base"
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50">
                    <Hexagon className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>

              {/* Email Field */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="group"
              >
                <Label htmlFor="field_user_email" className="text-sm text-cyan-400 font-semibold font-orbitron mb-2 block uppercase tracking-wider group-focus-within:text-cyan-300 transition-colors">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="field_user_email"
                    name="val_user_email" // Obfuscated name
                    type="text" // Initially text to avoid email heuristic
                    inputMode="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your.email@example.com"
                    autoComplete="off"
                    readOnly
                    onFocus={(e) => {
                      e.target.removeAttribute('readonly');
                      // Optional: could switch type here if needed, but text is fine for email input functionally
                    }}
                    className="h-12 bg-black/50 border-white/10 text-white placeholder:text-white/20 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all rounded-sm pl-12 text-base"
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50">
                    <span className="text-xs">@</span>
                  </div>
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="group"
              >
                <Label htmlFor="field_new_password" className="text-sm text-cyan-400 font-semibold font-orbitron mb-2 block uppercase tracking-wider group-focus-within:text-cyan-300 transition-colors">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="field_new_password"
                    name="val_new_password" // Obfuscated name
                    type="text" // HACK: detecting password field
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => {
                      e.target.removeAttribute('readonly');
                      e.target.type = "password"; // Switch to password on focus
                    }}
                    className="h-12 bg-black/50 border-white/10 text-white placeholder:text-white/20 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all rounded-sm pl-12 text-base"
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50">
                    <span className="text-xs">#</span>
                  </div>
                </div>
              </motion.div>

              {/* Confirm Password Field */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="group"
              >
                <Label htmlFor="field_confirm_password" className="text-sm text-cyan-400 font-semibold font-orbitron mb-2 block uppercase tracking-wider group-focus-within:text-cyan-300 transition-colors">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="field_confirm_password"
                    name="val_confirm_password" // Obfuscated name
                    type="text" // HACK
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => {
                      e.target.removeAttribute('readonly');
                      e.target.type = "password";
                    }}
                    className="h-12 bg-black/50 border-white/10 text-white placeholder:text-white/20 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all rounded-sm pl-12 text-base"
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50">
                    <span className="text-xs">#</span>
                  </div>
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
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
                      <Loader2 className="h-4 w-4 animate-spin" /> PROCESSING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      SIGN UP <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-4">
              <p className="text-xs text-cyan-500/50 font-mono mb-2">
                Already have an account?
              </p>
              <Link
                href="/auth/login?type=guest"
                className="text-cyan-400 hover:text-cyan-300 font-orbitron text-sm tracking-wide hover:underline decoration-cyan-500/50 underline-offset-4 flex items-center justify-center gap-2 group transition-all"
              >
                <span className="group-hover:-translate-x-1 transition-transform">{'>>'}</span> LOG IN
              </Link>
            </div>
          </div>

          {/* Decorative Bottom Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-900" />
        </div >
      </motion.div >
    </div >
  )
}
