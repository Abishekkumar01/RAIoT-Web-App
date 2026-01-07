"use client";

import type React from "react";
import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Loader2, Key, Lock, ChevronRight, Terminal, UserCog, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserRole } from "@/lib/types/user";

export default function AdminSignupPage() {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin" as UserRole,
    adminKey: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup, loading: authLoading } = useAuth();
  const router = useRouter();

  const ADMIN_REGISTRATION_KEY = "RAIOT_ADMIN_2024";

  const normalizeKey = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      role: value as UserRole,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (normalizeKey(formData.adminKey) !== normalizeKey(ADMIN_REGISTRATION_KEY)) {
      setError("INVALID_ADMIN_KEY");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("PASSWORDS_DO_NOT_MATCH");
      return;
    }

    if (formData.password.length < 6) {
      setError("PASSWORD_TOO_SHORT");
      return;
    }

    setLoading(true);

    try {
      await signup(
        formData.email,
        formData.password,
        formData.displayName,
        formData.role
      );
      router.push("/admin");
    } catch (error: any) {
      setError(error.message || "ADMIN_CREATION_FAILED");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black font-orbitron text-red-500">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin" />
          <p className="tracking-widest animate-pulse">VERIFYING_CREDENTIALS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans selection:bg-red-500/30 py-10">
      {/* Background Grid - Red Tint for Admin */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
                linear-gradient(to right, #1a0000 1px, transparent 1px),
                linear-gradient(to bottom, #1a0000 1px, transparent 1px)
            `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Ambient Glows - Red/Cyan */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-3 text-red-500 hover:text-red-300 transition-colors group"
      >
        <div className="h-10 w-10 flex items-center justify-center rounded-full border border-red-500/30 bg-black/40 backdrop-blur-md group-hover:border-red-400 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">
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
        className="w-full max-w-2xl z-10 relative px-4"
      >
        {/* Holographic Border Frame (Red Accent) */}
        <div className="absolute -inset-1 bg-gradient-to-br from-red-500 via-transparent to-cyan-600 opacity-30 blur-sm rounded-lg" />

        <div className="relative bg-black/80 backdrop-blur-xl border border-red-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]">

          {/* Header Section */}
          <div className="bg-red-950/20 p-10 md:p-12 pb-8 border-b border-red-500/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent translate-y-[-100%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />

            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-red-500/10 rounded border border-red-500/50 mb-4">
                <Shield className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-black text-white font-orbitron tracking-widest uppercase">
                Admin Access Grant
              </h1>
              <p className="text-red-400/60 font-mono text-xs tracking-wider mt-2">
                        // CLEARANCE_LEVEL: CLASSIFIED
              </p>
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500/50 rounded-tr-lg" />
          </div>

          <div className="p-10 md:p-12">
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

              <div className="space-y-6">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Label className="text-sm text-red-400 font-orbitron uppercase mb-2 block">Admin Key (Required)</Label>
                  <div className="relative">
                    <Input
                      name="adminKey"
                      type="password"
                      value={formData.adminKey}
                      onChange={handleChange}
                      required
                      placeholder="Enter Authorization Protocol"
                      className="h-12 bg-black/50 border-red-500/30 text-red-100 font-mono focus:border-red-500 pl-12 placeholder:text-red-500/20"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-red-500/30 bg-red-500/5 text-red-500"><Key className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs text-red-500/40 font-mono mt-2 ml-1">
                                // TEST_KEY: RAIOT_ADMIN_2024
                  </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Full Name</Label>
                    <div className="relative">
                      <Input name="displayName" value={formData.displayName} onChange={handleChange} required placeholder="Admin Name" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-4" />
                    </div>
                  </motion.div>
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">System Role</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-cyan-500/50 text-white font-mono">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                </div>

                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                  <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Control Email</Label>
                  <div className="relative">
                    <Input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="admin@raiot.edu" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-4" />
                  </div>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Password</Label>
                    <div className="relative">
                      <Input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><Lock className="h-5 w-5" /></div>
                    </div>
                  </motion.div>
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                    <Label className="text-sm text-cyan-400 font-orbitron uppercase mb-2 block">Confirm</Label>
                    <div className="relative">
                      <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" className="h-12 bg-black/50 border-white/10 text-white font-mono focus:border-cyan-500 pl-12" />
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center border-r border-white/10 bg-white/5 text-cyan-500/50"><Lock className="h-5 w-5" /></div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="pt-4">
                <Button type="submit" disabled={loading} className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-orbitron tracking-widest uppercase rounded-sm border border-red-400 group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
                  {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> PROVISIONING...</span> : <span className="flex items-center gap-2">GRANT ACCESS <ChevronRight className="h-4 w-4" /></span>}
                </Button>
              </motion.div>

              <div className="mt-8 text-center border-t border-white/5 pt-4">
                <p className="text-xs text-red-500/50 font-mono mb-2">ACCESS_LEVEL: RESTRICTED</p>
                <div className="flex justify-center gap-6">
                  <Link href="/auth/login" className="text-red-400 hover:text-red-300 font-orbitron text-sm tracking-wide hover:underline decoration-red-500/50">LOG IN</Link>
                  <Link href="/auth/signup" className="text-cyan-400 hover:text-cyan-300 font-orbitron text-sm tracking-wide hover:underline decoration-cyan-500/50">MEMBER SIGNUP</Link>
                </div>
              </div>
            </form>
          </div>

          <div className="h-1 w-full bg-gradient-to-r from-red-900 via-red-500 to-cyan-900" />
        </div>
      </motion.div>
    </div>
  );
}
