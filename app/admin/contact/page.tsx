"use client"

import React, { useState, useEffect } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, Plus, Trash2, Mail, Phone, MapPin, Clock, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface Leader {
    name: string
    role: string
    email: string
}

interface ContactData {
    address: string
    labHours: {
        weekdays: string
        sunday: string
    }
    leadership: Leader[]
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

export default function AdminContactPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [data, setData] = useState<ContactData>(DEFAULT_DATA)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const docRef = doc(db, "site_settings", "contact")
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
                setData(docSnap.data() as ContactData)
            } else {
                // initializing with default if not exists
                await setDoc(docRef, DEFAULT_DATA)
                setData(DEFAULT_DATA)
            }
        } catch (err: any) {
            console.error("Error fetching contact data:", err)
            setError("Failed to load contact information.")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError("")
        setSuccess("")

        try {
            await setDoc(doc(db, "site_settings", "contact"), data)
            setSuccess("Contact information updated successfully!")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            console.error("Error saving contact data:", err)
            setError("Failed to save changes.")
        } finally {
            setSaving(false)
        }
    }

    const handleLeadershipChange = (index: number, field: keyof Leader, value: string) => {
        const newLeadership = [...data.leadership]
        newLeadership[index] = { ...newLeadership[index], [field]: value }
        setData({ ...data, leadership: newLeadership })
    }

    const addLeader = () => {
        setData({
            ...data,
            leadership: [...data.leadership, { name: "", role: "", email: "" }]
        })
    }

    const removeLeader = (index: number) => {
        const newLeadership = data.leadership.filter((_, i) => i !== index)
        setData({ ...data, leadership: newLeadership })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 w-full max-w-[1920px] mx-auto pb-10 px-4 md:px-6">
            <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b -mx-4 px-4 md:-mx-6 md:px-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Manage Contact Info</h1>
                    <p className="text-sm text-muted-foreground hidden md:block">Update public-facing contact details, hours, and leadership.</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-500 text-green-500 bg-green-500/10">
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column: Contact Details (1 col) */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Visit Us / Address */}
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="h-4 w-4 text-primary" />
                                Visit Us
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 pt-0">
                            <Label className="text-xs mb-1.5 block">Address (supports line breaks)</Label>
                            <Textarea
                                value={data.address}
                                onChange={(e) => setData({ ...data, address: e.target.value })}
                                className="font-mono min-h-[100px] text-sm resize-none"
                            />
                        </CardContent>
                    </Card>

                    {/* Lab Hours */}
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock className="h-4 w-4 text-primary" />
                                Lab Hours
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 py-4 pt-0">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Monday - Saturday</Label>
                                <Input
                                    className="h-8"
                                    value={data.labHours.weekdays}
                                    onChange={(e) => setData({ ...data, labHours: { ...data.labHours, weekdays: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Sunday</Label>
                                <Input
                                    className="h-8"
                                    value={data.labHours.sunday}
                                    onChange={(e) => setData({ ...data, labHours: { ...data.labHours, sunday: e.target.value } })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Mail className="h-4 w-4 text-primary" />
                                Direct Contact
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 py-4 pt-0">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Main Email</Label>
                                <Input
                                    className="h-8"
                                    value={data.contactInfo.email}
                                    onChange={(e) => setData({ ...data, contactInfo: { ...data.contactInfo, email: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Phone Number</Label>
                                <Input
                                    className="h-8"
                                    value={data.contactInfo.phone}
                                    onChange={(e) => setData({ ...data, contactInfo: { ...data.contactInfo, phone: e.target.value } })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Leadership Team (2 cols) */}
                <Card className="lg:col-span-2 h-fit">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-4 w-4 text-primary" />
                                Leadership Team
                            </CardTitle>
                        </div>
                        <Button variant="secondary" size="sm" onClick={addLeader}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Leader
                        </Button>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 p-4">
                        {data.leadership.map((leader, index) => (
                            <div key={index} className="flex gap-3 items-start p-3 border rounded-md bg-secondary/5 hover:bg-secondary/10 transition-colors">
                                <div className="grid gap-3 flex-1 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Name</Label>
                                        <Input
                                            className="h-8"
                                            value={leader.name}
                                            onChange={(e) => handleLeadershipChange(index, "name", e.target.value)}
                                            placeholder="Name"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Role</Label>
                                        <Input
                                            className="h-8"
                                            value={leader.role}
                                            onChange={(e) => handleLeadershipChange(index, "role", e.target.value)}
                                            placeholder="Role"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Email</Label>
                                        <Input
                                            className="h-8"
                                            value={leader.email}
                                            onChange={(e) => handleLeadershipChange(index, "email", e.target.value)}
                                            placeholder="Email"
                                        />
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeLeader(index)} className="h-8 w-8 mt-4 md:mt-0 md:h-8 md:w-8 md:self-center text-muted-foreground hover:text-destructive shrink-0">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        {data.leadership.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No leaders added yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

