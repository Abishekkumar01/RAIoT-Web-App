"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Users, MessageSquare } from "lucide-react";

interface ContactData {
  address: string
  labHours: {
    weekdays: string
    sunday: string
  }
  leadership: {
    name: string
    role: string
    email: string
  }[]
  contactInfo: {
    email: string
    phone: string
  }
}

const DEFAULT_DATA: ContactData = {
  address: "Amity University Jaipur, ASET Building, B Block, Ground Floor\nRaiot Labs\nSP-1 Kant Kalwar, NH11C, RIICO Industrial Area\nRajasthan 303002",
  labHours: {
    weekdays: "5:00 PM - 7:30 PM",
    sunday: "Closed"
  },
  leadership: [
    { name: "Raj Singh Chouhan", role: "President", email: "president@raiot.edu" },
    { name: "Chetan Singh Chouhan", role: "Vice President", email: "vp@raiot.edu" },
    { name: "Abishek Kumar TS", role: "PR & Content", email: "tech@raiot.edu" }
  ],
  contactInfo: {
    email: "info@raiot.edu",
    phone: "+1 (555) 123-4567"
  }
}

export default function ContactPage() {
  const [data, setData] = useState<ContactData>(DEFAULT_DATA)

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        const docRef = doc(db, "site_settings", "contact")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setData(docSnap.data() as ContactData)
        }
      } catch (error) {
        console.error("Failed to fetch contact data:", error)
      }
    }

    fetchContactData()
  }, [])

  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-cyan-500/30">
      <PublicNavbar />
      <div className="max-w-[1920px] mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1
            className="text-5xl md:text-7xl font-black font-orbitron mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Contact Us
          </h1>
          <p className="text-xl text-slate-400">
            Get in touch with RAIoT - we are listening.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <Card className="bg-gradient-to-br from-slate-900 via-black to-slate-950 border-l-4 border-l-cyan-500 border-y-0 border-r-0 rounded-r-lg rounded-l-none shadow-[0_0_30px_-10px_rgba(6,182,212,0.15)] hover:bg-slate-900 transition-all duration-300">
              <CardHeader className="bg-cyan-950/10 border-b border-white/5 pb-4">
                <CardTitle className="flex items-center font-orbitron text-cyan-100 tracking-wide text-xl">
                  <MapPin className="h-5 w-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                  Visit Us
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-slate-300 leading-relaxed font-mono text-sm tracking-wide whitespace-pre-line">
                  {data.address}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900 via-black to-slate-950 border-l-4 border-l-cyan-500 border-y-0 border-r-0 rounded-r-lg rounded-l-none shadow-[0_0_30px_-10px_rgba(6,182,212,0.15)] hover:bg-slate-900 transition-all duration-300">
              <CardHeader className="bg-cyan-950/10 border-b border-white/5 pb-4">
                <CardTitle className="flex items-center font-orbitron text-cyan-100 tracking-wide text-xl">
                  <Clock className="h-5 w-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                  Lab Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 text-slate-300 font-mono text-sm tracking-wide">
                  <p className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-cyan-200">Monday - Saturday</span>
                    <span className="bg-cyan-950/30 px-2 py-1 rounded text-cyan-400">{data.labHours.weekdays}</span>
                  </p>
                  <p className="flex items-center justify-between pt-1">
                    <span className="text-cyan-200">Sunday</span>
                    <span className="text-slate-500">{data.labHours.sunday}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900 via-black to-slate-950 border-l-4 border-l-cyan-500 border-y-0 border-r-0 rounded-r-lg rounded-l-none shadow-[0_0_30px_-10px_rgba(6,182,212,0.15)] hover:bg-slate-900 transition-all duration-300">
              <CardHeader className="bg-cyan-950/10 border-b border-white/5 pb-4">
                <CardTitle className="flex items-center font-orbitron text-cyan-100 tracking-wide text-xl">
                  <Users className="h-5 w-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                  Leadership Team
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {data.leadership.map((leader, i) => (
                    <div key={i} className="group flex items-center justify-between p-3 rounded bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all">
                      <div>
                        <p className="font-orbitron text-white text-sm tracking-wide group-hover:text-cyan-400 transition-colors">{leader.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{leader.role}</p>
                      </div>
                      <a href={`mailto:${leader.email}`} className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors group/email">
                        <span className="text-xs font-mono hidden sm:inline-block opacity-70 group-hover/email:opacity-100 transition-opacity">{leader.email}</span>
                        <Mail className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900 via-black to-slate-950 border-l-4 border-l-cyan-500 border-y-0 border-r-0 rounded-r-lg rounded-l-none shadow-[0_0_30px_-10px_rgba(6,182,212,0.15)] hover:bg-slate-900 transition-all duration-300">
              <CardHeader className="bg-cyan-950/10 border-b border-white/5 pb-4">
                <CardTitle className="flex items-center font-orbitron text-cyan-100 tracking-wide text-xl">
                  <MessageSquare className="h-5 w-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                  Connect With Us
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <a href={`mailto:${data.contactInfo.email}`} className="flex items-center text-slate-300 p-3 rounded bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-950/20 hover:text-cyan-400 transition-all font-mono text-sm cursor-pointer group">
                    <Mail className="h-4 w-4 mr-3 text-slate-500 group-hover:text-cyan-500 transition-colors" />
                    {data.contactInfo.email}
                  </a>
                  <a href={`tel:${data.contactInfo.phone}`} className="flex items-center text-slate-300 p-3 rounded bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-950/20 hover:text-cyan-400 transition-all font-mono text-sm cursor-pointer group">
                    <Phone className="h-4 w-4 mr-3 text-slate-500 group-hover:text-cyan-500 transition-colors" />
                    {data.contactInfo.phone}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="bg-gradient-to-b from-slate-900 to-black border-t-4 border-t-cyan-600 border-x-0 border-b-0 shadow-2xl h-fit">
            <CardHeader className="border-b border-white/5 pb-8">
              <CardTitle className="font-orbitron text-3xl text-white tracking-wide">
                Send us a Message
              </CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                Have questions regarding robotics? Let's connect.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <form
                className="space-y-6"
                action="https://api.web3forms.com/submit"
                method="POST"
              >
                {/* Web3Forms Access Key */}
                <input
                  type="hidden"
                  name="access_key"
                  value="de848823-c7ca-41c2-bb0f-82548e9c718e"
                />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-cyan-500 font-mono text-xs uppercase tracking-widest pl-1">First Name</Label>
                    <Input
                      id="firstName"
                      name="first_name"
                      placeholder="John"
                      className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-700 focus:border-cyan-500 focus:ring-0 rounded-none border-t-0 border-x-0 border-b-2 px-0 transition-all focus:bg-slate-900/50 h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-cyan-500 font-mono text-xs uppercase tracking-widest pl-1">Last Name</Label>
                    <Input
                      id="lastName"
                      name="last_name"
                      placeholder="Doe"
                      className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-700 focus:border-cyan-500 focus:ring-0 rounded-none border-t-0 border-x-0 border-b-2 px-0 transition-all focus:bg-slate-900/50 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-cyan-500 font-mono text-xs uppercase tracking-widest pl-1">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-700 focus:border-cyan-500 focus:ring-0 rounded-none border-t-0 border-x-0 border-b-2 px-0 transition-all focus:bg-slate-900/50 h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-cyan-500 font-mono text-xs uppercase tracking-widest pl-1">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="What's this about?"
                    className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-700 focus:border-cyan-500 focus:ring-0 rounded-none border-t-0 border-x-0 border-b-2 px-0 transition-all focus:bg-slate-900/50 h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-cyan-500 font-mono text-xs uppercase tracking-widest pl-1">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                    className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-700 focus:border-cyan-500 focus:ring-0 rounded-none border-t-0 border-x-0 border-b-2 px-0 transition-all focus:bg-slate-900/50 resize-none min-h-[120px]"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-black font-orbitron tracking-widest uppercase py-6 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] border-none clip-path-polygon">
                  INITIATE TRANSMISSION
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
