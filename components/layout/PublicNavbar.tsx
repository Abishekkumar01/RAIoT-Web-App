"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Info, ChevronDown, User, Shield, Users, ClipboardList } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileTechLogin } from "./MobileTechLogin";

export const PublicNavbar = () => {
  const { user, logout, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/projects", label: "Projects" },
    { href: "/leaders", label: "Our Leaders" },
    { href: "/gallery", label: "Gallery" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <nav className="bg-background relative z-50">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-12">
          <div className="flex justify-between md:grid md:grid-cols-3 items-center h-24">

            {/* Logo Section (Left) */}
            {/* Logo Section (Left) */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center space-x-3 cursor-target group"
              >
                <div className="relative">
                  <Image
                    src="/logo.png"
                    alt="RAIoT Logo"
                    width={40}
                    height={40}
                    className="object-contain group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-300"
                  />
                </div>
                <span className="font-bold text-2xl font-orbitron tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white group-hover:text-cyan-400 transition-all duration-300">RAIoT</span>
              </Link>

              <span className="text-white font-bold text-2xl pb-1">X</span>

              <div className="relative flex items-center overflow-hidden w-[44px] h-[45px]">
                <Image
                  src="/amity_logo_transparent.png"
                  alt="Amity University Logo"
                  width={140}
                  height={45}
                  className="max-w-none object-contain object-left hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-300"
                />
              </div>
            </div>

            {/* Desktop Navigation (Center) - Hidden on Mobile */}
            <div className="hidden md:flex items-center justify-center space-x-12">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className="relative group px-3 py-2 whitespace-nowrap"
                >
                  <span className="relative z-10 text-foreground/90 group-hover:text-cyan-400 transition-colors duration-300 font-bold tracking-widest text-xl font-orbitron">
                    {link.label}
                  </span>
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-400 group-hover:w-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <span className="absolute bottom-0 left-0 w-full h-full bg-cyan-400/10 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-md -z-0" />
                </Link>
              ))}
            </div>

            {/* Right Side Actions (Desktop & Mobile) - Always in Col 3 */}
            <div className="col-start-3 flex items-center justify-end">

              {/* DESKTOP Content */}
              <div className="hidden md:flex items-center space-x-4">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : user ? (
                  <div className="flex items-center space-x-4">
                    {user.role === "guest" && (
                      <Link href="/guest/profile">
                        <Button variant="ghost" size="sm" className="p-0 h-9 w-9 rounded-full">
                          <Avatar className="h-9 w-9 ring-2 ring-cyan-500/50 hover:ring-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-cyan-400 font-bold border border-cyan-500/30">
                              {user.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </Link>
                    )}
                    {user.role !== "guest" && (
                      <Link href={user.role === "admin" || user.role === "superadmin" ? "/admin" : "/dashboard"}>
                        <Button variant="outline" className="cursor-target">Dashboard</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="relative group bg-black/40 hover:bg-cyan-950/30 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition-all duration-300 backdrop-blur-md overflow-hidden"
                          style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-sm" />
                          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 rounded-br-sm" />
                          <span className="font-mono tracking-wider font-bold z-10 mr-1 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all">LOGIN / ACCESS</span>
                          <ChevronDown className="h-4 w-4 z-10 transition-transform duration-300 group-hover:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Login</div>
                        <DropdownMenuItem asChild><Link href="/auth/login?type=member"><User className="h-4 w-4 mr-2" />Member Login</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/auth/login?type=admin"><Shield className="h-4 w-4 mr-2" />Admin Login</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/auth/login?type=operations"><ClipboardList className="h-4 w-4 mr-2" />Operations Login</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/auth/login?type=guest"><Users className="h-4 w-4 mr-2" />Guest Access</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Sign Up</div>
                        <DropdownMenuItem asChild><Link href="/auth/guest-signup"><Users className="h-4 w-4 mr-2" />As a Guest</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* MOBILE Content */}
              <div className="md:hidden flex items-center justify-end space-x-3">
                {/* Menu on Left */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="cursor-target hover:bg-cyan-500/10 hover:text-cyan-400"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>

                {/* Tech Login on Right */}
                <MobileTechLogin />
              </div>

            </div>
          </div>

          {/* Mobile Navigation - Tech Theme */}
          {isMenuOpen && (
            <div className="md:hidden fixed inset-0 top-24 z-40 bg-black/98 backdrop-blur-xl animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
              <div className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
                  backgroundSize: '30px 30px'
                }}
              />
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent animate-pulse" />

              <div className="relative h-full flex flex-col items-center justify-center space-y-4 px-6 py-8">
                {navLinks.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={true}
                    onClick={() => setIsMenuOpen(false)}
                    className="group relative w-full animate-in slide-in-from-left duration-500"
                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="relative pl-8 pr-6 py-3 overflow-visible">
                      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-cyan-400/50 transition-all duration-300 group-hover:w-4 group-hover:h-4 group-hover:border-cyan-400" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-cyan-400/50 transition-all duration-300 group-hover:w-4 group-hover:h-4 group-hover:border-cyan-400" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-cyan-400/50 transition-all duration-300 group-hover:w-4 group-hover:h-4 group-hover:border-cyan-400" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-cyan-400/50 transition-all duration-300 group-hover:w-4 group-hover:h-4 group-hover:border-cyan-400" />

                      <div className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/5 transition-all duration-300" />
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent -translate-y-full group-hover:translate-y-[200%] transition-transform duration-700 ease-out" />
                      </div>

                      <div className="relative flex items-center justify-between">
                        <span className="font-orbitron font-bold text-xl tracking-wider text-white group-hover:text-cyan-400 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] shadow-black drop-shadow-md">
                          {link.label.toUpperCase()}
                        </span>
                        <div className="w-0 group-hover:w-6 overflow-hidden transition-all duration-300">
                          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-cyan-400/70 group-hover:text-cyan-400 transition-colors">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </Link>
                ))}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 mt-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-mono text-[10px] text-cyan-400/50 tracking-widest">NAV ACTIVE</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-900/30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-100 blur-[0.5px] shadow-[0_0_10px_2px_rgba(34,211,238,0.5)]" />
        </div>
      </nav>
    </>
  );
};
