"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from "next/navigation"
import { IComponent, IInventoryRequest, IDamagedLog, RequestStatus } from "@/types/inventory"
import { getInventory, addComponent, deleteComponent, getDamagedLogs, getAllRequests, updateRequestStatus, reportDamage, reviewIssuanceExtension } from "@/lib/inventory"
import { sendApprovalEmail, sendRejectionEmail } from "@/app/actions/emailActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, ShieldAlert, Check, X, Box, RefreshCw } from "lucide-react"
import { CloudinaryUpload } from "@/components/ui/CloudinaryUpload"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function AdminInventoryPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const [components, setComponents] = useState<IComponent[]>([])
    const [requests, setRequests] = useState<IInventoryRequest[]>([])
    const [damagedLogs, setDamagedLogs] = useState<IDamagedLog[]>([])
    const [loading, setLoading] = useState(true)

    // Form states
    const [newComponent, setNewComponent] = useState({ name: '', type: 'Sensor', quantity: 1, imageUrl: '' })
    const [damageReport, setDamageReport] = useState({ componentId: '', quantity: 1, reason: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login')
        } else if (!authLoading && user) {
            const isInventoryAdmin =
                user.email === 'chouhanchetan066@gmail.com' ||
                user.email === 'amanchoudhary.1502@gmail.com' ||
                user.profileData?.isInventoryManager;
            if (!isInventoryAdmin) {
                toast({ title: "Access Denied", description: "You don't have permission to access this page.", variant: "destructive" })
                router.push('/dashboard')
            } else {
                fetchData()
            }
        }
    }, [user, authLoading, router, toast])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [compData, reqData, dmgData] = await Promise.all([
                getInventory(),
                getAllRequests(),
                getDamagedLogs()
            ])
            setComponents(compData)
            setRequests(reqData)
            setDamagedLogs(dmgData)
        } catch (error) {
            console.error("DEBUG FETCH ERROR:", error)
            toast({ title: "Error", description: "Failed to load inventory data.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleAddComponent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComponent.name || !newComponent.imageUrl) {
            toast({ title: "Validation Error", description: "Name and Image are required.", variant: "destructive" })
            return
        }
        setIsSubmitting(true)
        try {
            await addComponent({
                name: newComponent.name,
                type: newComponent.type,
                quantity: newComponent.quantity,
                availableQuantity: newComponent.quantity,
                imageUrl: newComponent.imageUrl,
            })
            toast({ title: "Success", description: "Component added successfully." })
            setNewComponent({ name: '', type: 'Sensor', quantity: 1, imageUrl: '' })
            fetchData()
        } catch (error) {
            toast({ title: "Error", description: "Failed to add component.", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteComponent = async (id: string) => {
        if (!confirm("Are you sure you want to delete this component?")) return
        setIsSubmitting(true)
        try {
            await deleteComponent(id)
            toast({ title: "Deleted", description: "Component removed from inventory." })
            fetchData()
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete component.", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReportDamage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!damageReport.componentId || !damageReport.reason) return
        setIsSubmitting(true)
        try {
            await reportDamage(
                damageReport.componentId,
                damageReport.quantity,
                damageReport.reason,
                user?.displayName || 'Admin'
            )
            toast({ title: "Reported", description: "Damage report submitted. Stock updated." })
            setDamageReport({ componentId: '', quantity: 1, reason: '' })
            fetchData()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to report damage.", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRequestAction = async (request: IInventoryRequest, action: RequestStatus) => {
        setIsSubmitting(true)
        try {
            let reason = ""
            if (action === 'rejected') {
                const input = prompt("Brief reason for rejection:")
                if (input === null) return // Cancelled
                reason = input
            }

            await updateRequestStatus(request.id, action, reason)
            toast({ title: "Status Updated", description: `Request marked as ${action}.` })

            // Send Emails (Non-blocking)
            const componentNames = request.items.map(i => `${i.quantity}x ${i.componentName}`).join(', ')
            if (action === 'approved') {
                sendApprovalEmail(request.userEmail, componentNames).catch(console.error)
            } else if (action === 'rejected') {
                sendRejectionEmail(request.userEmail, componentNames, reason).catch(console.error)
            }

            fetchData()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Action failed.", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleExtensionDecision = async (request: IInventoryRequest, approve: boolean) => {
        setIsSubmitting(true)
        try {
            let reason = ""
            if (!approve) {
                const input = prompt("Reason for rejecting extension request:")
                if (input === null) return
                reason = input
            }

            await reviewIssuanceExtension(request.id, approve, reason)
            toast({
                title: approve ? "Extension Approved" : "Extension Rejected",
                description: approve
                    ? `Due date updated by +${request.extensionRequestedDays || 0} day(s).`
                    : "Extension request rejected."
            })
            fetchData()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to process extension.", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading || authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Manage Inventory</h1>

            <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="grid grid-cols-4 bg-zinc-800">
                    <TabsTrigger value="inventory">Inventory Setup</TabsTrigger>
                    <TabsTrigger value="add">Add Component</TabsTrigger>
                    <TabsTrigger value="issued">Issuance Requests</TabsTrigger>
                    <TabsTrigger value="damaged">Damaged Items</TabsTrigger>
                </TabsList>

                {/* --- INVENTORY LIST TAB --- */}
                <TabsContent value="inventory" className="mt-6">
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><Box className="w-5 h-5" /> Current Stock</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-700">
                                        <TableHead>Image</TableHead>
                                        <TableHead>Component</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Total Owned</TableHead>
                                        <TableHead>Available</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {components.map((c) => (
                                        <TableRow key={c.id} className="border-zinc-700">
                                            <TableCell>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={c.imageUrl} alt={c.name} className="w-12 h-12 rounded object-cover border border-zinc-600 bg-zinc-800" />
                                            </TableCell>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                                            <TableCell>{c.quantity}</TableCell>
                                            <TableCell className={c.availableQuantity < 5 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                                                {c.availableQuantity}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteComponent(c.id)} disabled={isSubmitting}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {components.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-zinc-500">No components in inventory.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ADD COMPONENT TAB --- */}
                <TabsContent value="add" className="mt-6">
                    <Card className="bg-zinc-800/50 border-zinc-700 max-w-2xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><Plus className="w-5 h-5" /> Add New Component</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddComponent} className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Component Image *</Label>
                                    <CloudinaryUpload
                                        currentImageUrl={newComponent.imageUrl}
                                        onUploadSuccess={(url) => setNewComponent(p => ({ ...p, imageUrl: url }))}
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Component Name *</Label>
                                        <Input value={newComponent.name} onChange={e => setNewComponent(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Arduino Uno" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Component Type</Label>
                                        <Select value={newComponent.type} onValueChange={v => setNewComponent(p => ({ ...p, type: v }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['Microcontroller', 'Sensor', 'Actuator', 'Tool', 'Module', 'Component', 'Other'].map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Initial Quantity *</Label>
                                        <Input type="number" min="1" value={newComponent.quantity} onChange={e => setNewComponent(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} required />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isSubmitting || !newComponent.imageUrl}>
                                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Add Component
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ISSUED COMPONENTS TAB --- */}
                <TabsContent value="issued" className="mt-6">
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="text-xl">Component Requests & Issuances</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-700">
                                        <TableHead>Request Date</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Items Requested</TableHead>
                                        <TableHead>Duration / Due</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id} className="border-zinc-700">
                                            <TableCell className="text-sm">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{req.userName}</div>
                                                <div className="text-xs text-zinc-400">{req.userEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {req.items.map((it, i) => (
                                                        <div key={i} className="text-sm flex items-center gap-2">
                                                            <span className="bg-zinc-700 text-zinc-300 px-1.5 rounded text-xs">{it.quantity}x</span>
                                                            {it.componentName}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{req.daysRequested} Days</div>
                                                {req.status === 'approved' && (
                                                    <div className="text-xs text-orange-400 mt-1">Due: {new Date(req.dueDate).toLocaleDateString()}</div>
                                                )}
                                                {req.extensionRequestStatus === 'pending' && (
                                                    <div className="text-xs text-yellow-300 mt-1">Extension Requested: +{req.extensionRequestedDays || 0} day(s)</div>
                                                )}
                                                {req.extensionRequestStatus === 'rejected' && (
                                                    <div className="text-xs text-red-300 mt-1">Extension Rejected</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                                                        req.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                                            req.status === 'returned' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                                                'bg-red-500/20 text-red-400 border-red-500/50'
                                                }>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="text-green-500 border-green-900 bg-green-950/30 hover:bg-green-900/50" onClick={() => handleRequestAction(req, 'approved')} disabled={isSubmitting}><Check className="w-4 h-4" /></Button>
                                                            <Button size="sm" variant="outline" className="text-red-500 border-red-900 bg-red-950/30 hover:bg-red-900/50" onClick={() => handleRequestAction(req, 'rejected')} disabled={isSubmitting}><X className="w-4 h-4" /></Button>
                                                        </>
                                                    )}
                                                    {req.status === 'approved' && (
                                                        <>
                                                            {req.extensionRequestStatus === 'pending' && (
                                                                <>
                                                                    <Button size="sm" variant="outline" className="text-green-500 border-green-900 bg-green-950/30 hover:bg-green-900/50" onClick={() => handleExtensionDecision(req, true)} disabled={isSubmitting}><Check className="w-4 h-4" /></Button>
                                                                    <Button size="sm" variant="outline" className="text-red-500 border-red-900 bg-red-950/30 hover:bg-red-900/50" onClick={() => handleExtensionDecision(req, false)} disabled={isSubmitting}><X className="w-4 h-4" /></Button>
                                                                </>
                                                            )}
                                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleRequestAction(req, 'returned')} disabled={isSubmitting}>Mark Returned</Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {requests.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-zinc-500">No requests found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- DAMAGED ITEMS TAB --- */}
                <TabsContent value="damaged" className="mt-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Card className="bg-zinc-800/50 border-zinc-700 lg:col-span-1 h-fit">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-400" /> Report Damage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleReportDamage} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Select Component</Label>
                                        <Select value={damageReport.componentId} onValueChange={v => setDamageReport(p => ({ ...p, componentId: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger>
                                            <SelectContent>
                                                {components.map(c => (
                                                    <SelectItem key={c.id} value={c.id} disabled={c.availableQuantity < 1}>{c.name} (Available: {c.availableQuantity})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantity Damaged</Label>
                                        <Input type="number" min="1" value={damageReport.quantity} onChange={e => setDamageReport(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason / Details</Label>
                                        <Input placeholder="e.g. Burnt pins, broken glass" value={damageReport.reason} onChange={e => setDamageReport(p => ({ ...p, reason: e.target.value }))} required />
                                    </div>
                                    <Button type="submit" variant="destructive" className="w-full" disabled={isSubmitting || !damageReport.componentId}>
                                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit Report
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-800/50 border-zinc-700 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-xl">Damage Logs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-zinc-700">
                                            <TableHead>Date</TableHead>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Reported By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {damagedLogs.map((log) => (
                                            <TableRow key={log.id} className="border-zinc-700">
                                                <TableCell className="text-sm">{new Date(log.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{log.componentName}</TableCell>
                                                <TableCell className="text-red-400 font-bold">{log.quantity}</TableCell>
                                                <TableCell className="text-sm text-zinc-400">{log.reason}</TableCell>
                                                <TableCell className="text-sm">{log.reportedBy}</TableCell>
                                            </TableRow>
                                        ))}
                                        {damagedLogs.length === 0 && (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-500">No damage reports yet.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
