'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/lib/types/user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Loader from '@/components/ui/Loader'
import { Github, Linkedin, Globe, Mail, Phone, ExternalLink, Trophy, Star, Cpu, Network, Code, Terminal, ChevronRight, Share2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

export default function MemberProfilePage() {
  const params = useParams()
  const rollNumber = params.rollNumber as string
  const [member, setMember] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const usersRef = collection(db, 'users')
        // Convert to lowercase for case-insensitive matching
        const normalizedRollNumber = rollNumber.toLowerCase()
        const q = query(usersRef, where('profileData.rollNumber', '==', normalizedRollNumber))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0]
          setMember(userDoc.data() as User)
        } else {
          console.error(`Member not found with roll number: ${rollNumber} (normalized: ${normalizedRollNumber})`)
          setNotFound(true)
        }
      } catch (error) {
        console.error('Error fetching member:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (rollNumber) {
      fetchMember()
    }
  }, [rollNumber])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-r-2 border-purple-500 rounded-full animate-spin-reverse"></div>
            <div className="absolute inset-4 border-b-2 border-emerald-500 rounded-full animate-pulse"></div>
          </div>
          <p className="text-cyan-500 font-mono animate-pulse tracking-widest text-sm">INITIALIZING...</p>
        </div>
      </div>
    )
  }

  if (notFound || !member) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
        <Card className="max-w-md w-full bg-zinc-900/50 border-red-500/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-red-500 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              SYSTEM ERROR: 404
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-l-2 border-red-500/50 pl-4 py-2 bg-red-500/5">
              <p className="text-zinc-400">TARGET IDENTITY NOT FOUND.</p>
              <p className="text-red-400 text-sm mt-1">ID: {rollNumber}</p>
            </div>
            <Link href="/members" className="block">
              <Button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 uppercase tracking-wider">
                Return to Database
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Hero Section - Reduced Height */}
      <div className="relative w-full h-[30vh] min-h-[300px] border-b border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-900/50 to-transparent z-10" />

        {/* Animated Grid Overlay */}
        <div className="absolute inset-0 z-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] animate-pulse-slow"></div>

        <div className="relative z-20 h-full max-w-[94%] mx-auto px-4 flex flex-col justify-end pb-6">
          <div className="flex flex-col md:flex-row items-end gap-6">
            {/* Profile Avatar with Tech Border */}
            <div className="relative group flex-shrink-0">
              {/* Rotating Ring */}
              <div className="absolute -inset-2 rounded-full border border-dashed border-cyan-500/30 animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-sm"></div>

              <Avatar className="w-32 h-32 md:w-36 md:h-36 border-4 border-zinc-900 bg-zinc-950 shadow-2xl relative z-10">
                <AvatarImage src={member.profileData?.photoUrl} alt={member.displayName} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-zinc-900 text-zinc-500">
                  {member.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Status Indicator */}
              <div className="absolute bottom-3 right-3 z-20 bg-black border border-green-500 rounded-full p-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>

            <div className="flex-1 space-y-3 mb-1 w-full overflow-hidden">
              <div>
                <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase font-sans truncate">
                    {member.displayName}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 xl:mt-0">
                    <div className="h-px w-8 bg-cyan-500/50 hidden xl:block"></div>
                    <span className="text-[10px] md:text-xs font-mono text-cyan-500 uppercase tracking-widest border border-cyan-900 bg-cyan-950/30 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                      Unit: {member.role.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {member.profileData?.tagline && (
                  <p className="text-lg text-zinc-400 font-light tracking-wide flex items-center gap-2 truncate">
                    <ChevronRight className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    <span className="truncate">{member.profileData.tagline}</span>
                  </p>
                )}
              </div>

              {/* Identity Chips & Social Row */}
              <div className="flex flex-col xl:flex-row gap-4 pt-1 items-start xl:items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700 px-3 py-1.5 rounded-sm">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">ID</span>
                    <span className="text-sm font-mono text-white">{member.profileData?.rollNumber || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700 px-3 py-1.5 rounded-sm">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">DEPT</span>
                    <span className="text-sm font-mono text-white">{member.profileData?.branch || "N/A"}</span>
                  </div>
                </div>

                {/* Prominent Social Links Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white transition-all group rounded-sm">
                      <Mail className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono tracking-wider hidden sm:inline-block">EMAIL</span>
                    </a>
                  )}
                  {member.profileData?.githubLink && (
                    <a href={member.profileData.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-white text-zinc-400 hover:text-white transition-all group rounded-sm">
                      <Github className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono tracking-wider hidden sm:inline-block">GITHUB</span>
                    </a>
                  )}
                  {member.profileData?.linkedinLink && (
                    <a href={member.profileData.linkedinLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-[#0077b5]/10 border border-[#0077b5]/30 hover:bg-[#0077b5]/20 hover:border-[#0077b5] text-[#0077b5] hover:text-white transition-all group rounded-sm">
                      <Linkedin className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono tracking-wider hidden sm:inline-block">LINKEDIN</span>
                    </a>
                  )}
                  {member.profileData?.websiteLink && (
                    <a href={member.profileData.websiteLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 text-cyan-500 hover:text-white transition-all group rounded-sm">
                      <Globe className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono tracking-wider hidden sm:inline-block">WEBSITE</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Responsive Dashboard Layout */}
      <div className="relative z-10 max-w-[94%] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Main Column (Bio & Projects) */}
          <div className="xl:col-span-3 space-y-6">

            {/* About Module */}
            <div className="group">
              <div className="h-full bg-zinc-900/30 border border-zinc-800 backdrop-blur-md p-6 relative overflow-hidden rounded-lg hover:border-cyan-500/30 transition-colors duration-500">
                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 p-2">
                  <div className="w-20 h-20 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-xl"></div>
                </div>

                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-500" />
                  <span className="tracking-wider">SYSTEM_BIO</span>
                </h2>

                <p className="text-zinc-400 leading-relaxed text-base whitespace-pre-wrap font-light relative z-10">
                  {member?.profileData?.bio || "No biography data available in the system."}
                </p>
              </div>
            </div>

            {/* Projects Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent flex-1"></div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <Network className="w-5 h-5 text-emerald-500" />
                  PROJECT_LOGS
                </h2>
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent flex-1"></div>
              </div>

              {(member?.profileData?.projects && member.profileData.projects.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {member.profileData.projects.map((project: any, index: number) => (
                    <ProjectCard key={index} project={project} />
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center bg-zinc-900/20">
                  <Code className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 font-mono text-sm">NO PROJECTS DEPLOYED TO MAINFRAME</p>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column (Tech, Achievements, Contributions) */}
          <div className="xl:col-span-1 space-y-6">

            {/* Tech Stack Module */}
            <div className="bg-zinc-900/30 border border-zinc-800 backdrop-blur-md p-5 rounded-lg hover:border-purple-500/30 transition-colors duration-500">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-500" />
                <span className="tracking-wider">TECH_STACK</span>
              </h2>

              <div className="flex flex-wrap gap-2">
                {member?.profileData?.skills?.map((skill, index) => (
                  <div key={index} className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-300 hover:border-purple-500 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all cursor-default relative overflow-hidden group/skill">
                    <span className="relative z-10">{skill}</span>
                    <div className="absolute inset-0 bg-purple-500/10 transform -translate-x-full group-hover/skill:translate-x-0 transition-transform duration-300"></div>
                  </div>
                )) || <span className="text-zinc-600 font-mono text-xs">// NO DATA AVAILABLE</span>}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-zinc-900/30 border-l-2 border-yellow-500/50 p-5 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors rounded-r-lg">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                ACHIEVEMENTS
              </h3>
              <ul className="space-y-3">
                {member?.profileData?.achievements?.length ? (
                  member.profileData.achievements.map((item: string, index: number) => (
                    <li key={index} className="flex gap-3 text-xs text-zinc-300">
                      <span className="text-yellow-500 font-mono flex-shrink-0">0{index + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-600 italic text-xs">No records found.</li>
                )}
              </ul>
            </div>

            {/* Contributions */}
            <div className="bg-zinc-900/30 border-l-2 border-cyan-500/50 p-5 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors rounded-r-lg">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-500" />
                CONTRIBUTIONS
              </h3>
              <ul className="space-y-3">
                {member?.profileData?.contributions?.length ? (
                  member.profileData.contributions.map((item: string, index: number) => (
                    <li key={index} className="flex gap-3 text-xs text-zinc-300">
                      <span className="text-cyan-500 font-mono flex-shrink-0">//{index + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-600 italic text-xs">No records found.</li>
                )}
              </ul>
            </div>

          </div>

        </div>

        {/* System Footer */}
        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <div className="inline-flex items-center gap-4 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
            <span>System: RAIoT_OS v2.0</span>
            <span>•</span>
            <span>User_ID: {member?.uid?.substring(0, 8)}...</span>
            <span>•</span>
            <span>Status: ONLINE</span>
          </div>
        </div>
      </div>
    </div >
  )
}

// --- Tech Components ---

function TechSocialLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative p-2 overflow-hidden bg-zinc-950 border border-zinc-800 rounded-sm hover:border-cyan-500/50 transition-all"
    >
      <Icon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
      <span className="sr-only">{label}</span>
      <div className="absolute inset-0 bg-cyan-500/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
    </a>
  )
}

function ProjectCard({ project }: { project: any }) {
  return (
    <div className="group relative bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden hover:border-emerald-500/50 transition-all duration-300">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden bg-zinc-950 border-b border-zinc-800">
        {project.imageUrl ? (
          <>
            <img
              src={project.imageUrl}
              alt={project.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-800">
            <Code className="w-12 h-12" />
          </div>
        )}

        {/* Tag */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/80 backdrop-blur border border-emerald-500/30 text-emerald-500 text-[10px] font-mono uppercase px-2 py-1 rounded">
            Active Project
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
          {project.title}
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-2 font-light">
          {project.description}
        </p>

        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
          >
            Execute_Link <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}
