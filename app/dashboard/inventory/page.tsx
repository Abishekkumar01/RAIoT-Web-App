"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from '@/lib/contexts/AuthContext'
import { auth } from '@/lib/firebase'
import { useRouter } from "next/navigation"
import { IComponent, IInventoryRequest, IRequestItem } from "@/types/inventory"
import { getInventory, getUserRequests, submitInventoryRequest, checkDailyRequestLimit } from "@/lib/inventory"
import { sendRequestReceivedEmail, sendNewRequestAlertEmail } from "@/app/actions/emailActions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShoppingCart, Plus, Minus, Trash2, Box, Send } from "lucide-react"

export default function UserInventoryPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const [components, setComponents] = useState<IComponent[]>([])
    const [myRequests, setMyRequests] = useState<IInventoryRequest[]>([])
    const [loading, setLoading] = useState(true)

    // Cart state
    const [cart, setCart] = useState<{ component: IComponent, quantity: number }[]>([])
    const [daysRequested, setDaysRequested] = useState(1)
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login')
        } else if (!authLoading && user) {
            // Block guests and public from seeing this
            if (['guest', 'public'].includes(user.role)) {
                toast({ title: "Access Denied", description: "You don't have permission to use the inventory system.", variant: "destructive" })
                router.push('/dashboard')
            } else {
                fetchData()
            }
        }
    }, [user, authLoading, router, toast])

    const fetchData = async () => {
        setLoading(true)
        if (!user) return
        try {
            const [compData, reqData] = await Promise.all([
                getInventory(),
                getUserRequests(user.uid)
            ])
            setComponents(compData) // Show all components, even if out of stock
            setMyRequests(reqData)
        } catch (error) {
            toast({ title: "Error", description: "Failed to load components.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const addToCart = (component: IComponent) => {
        setCart(prev => {
            const existing = prev.find(item => item.component.id === component.id)
            if (existing) {
                if (existing.quantity >= component.availableQuantity) return prev; // Cannot exceed
                return prev.map(item => item.component.id === component.id ? { ...item, quantity: item.quantity + 1 } : item)
            }
            return [...prev, { component, quantity: 1 }]
        })
        toast({ title: "Added to Cart", description: `${component.name} added to your request.` })
    }

    const updateCartQty = (id: string, newQty: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.component.id === id) {
                    const validQty = Math.max(1, Math.min(newQty, item.component.availableQuantity))
                    return { ...item, quantity: validQty }
                }
                return item
            })
        })
    }

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.component.id !== id))
    }

    const handleSubmitRequest = async () => {
        if (!user) return
        if (cart.length === 0) return
        if (daysRequested < 1 || daysRequested > 7) {
            toast({ title: "Invalid Duration", description: "You can request items for 1 to 7 days only.", variant: "destructive" })
            return
        }

        setIsSubmitting(true)
        try {
            // 1. Check daily limit
            // Limits are only for users with regular 'member' privileges
            const isLimitedUser = user.role === 'member';
            if (isLimitedUser) {
                const todaysRequests = await checkDailyRequestLimit(user.uid)
                if (todaysRequests >= 3) {
                    throw new Error("You have reached your daily limit of 3 component requests.")
                }
            }

            // 2. Prepare payload
            const items: IRequestItem[] = cart.map(item => ({
                componentId: item.component.id,
                componentName: item.component.name,
                quantity: item.quantity,
                imageUrl: item.component.imageUrl
            }))

            await submitInventoryRequest({
                userId: user.uid,
                userName: user.displayName || user.email,
                userEmail: user.email,
                items,
                daysRequested: daysRequested,
            })

            // Send confirmation emails (fire & forget)
            const componentNames = items.map(i => `${i.quantity}x ${i.componentName}`).join(', ')
            sendRequestReceivedEmail(user.email, componentNames).catch(console.error)
            sendNewRequestAlertEmail(user.displayName || user.email, componentNames).catch(console.error)

            toast({ title: "Request Submitted", description: "Your component request is now pending approval." })
            setCart([])
            setDaysRequested(1)
            setIsCartOpen(false)
            fetchData() // Refresh

        } catch (error: any) {
            toast({ title: "Request Failed", description: error.message || "Failed to submit request.", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRequestExtension = async (request: IInventoryRequest) => {
        if (!user) return;
        const maxPossible = 7 - Math.floor(request.daysRequested || 0);
        if (maxPossible <= 0) {
            toast({ title: "Limit Reached", description: "This issuance is already at the 7-day maximum.", variant: "destructive" });
            return;
        }

        const input = prompt(`Request extra days for this issuance (1-${maxPossible}):`);
        const days = parseInt(input || '0');
        if (!days || days <= 0) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Authentication token not available.");

            const response = await fetch('/api/inventory/request-extension', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ requestId: request.id, requestedDays: days })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to request extension.');
            }

            toast({ title: "Extension Requested", description: `Requested +${days} day(s). Awaiting admin approval.` });
            fetchData();
        } catch (error: any) {
            toast({ title: "Request Failed", description: error.message || "Failed to request extension.", variant: "destructive" });
        }
    }

    if (loading || authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>


    const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Resources & Inventory</h1>
                    <p className="text-muted-foreground mt-1">Request hardware components for your projects</p>
                </div>

                <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                    <DialogTrigger asChild>
                        <Button className="relative w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            View Cart {totalCartItems > 0 && `(${totalCartItems})`}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Your Request Cart</DialogTitle>
                            <DialogDescription>Review your components before submitting</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">Your cart is empty.</div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.component.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={item.component.imageUrl} alt={item.component.name} className="w-12 h-12 rounded object-cover border border-zinc-700 bg-zinc-800" />
                                                <div>
                                                    <p className="font-semibold text-sm">{item.component.name}</p>
                                                    <p className="text-xs text-zinc-400">Available: {item.component.availableQuantity}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQty(item.component.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="w-3 h-3" /></Button>
                                                <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCartQty(item.component.id, item.quantity + 1)} disabled={item.quantity >= item.component.availableQuantity}><Plus className="w-3 h-3" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10 ml-2" onClick={() => removeFromCart(item.component.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                                        <Label>Duration of Issuance (Max 7 Days)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input type="number" min="1" max="7" value={daysRequested} onChange={(e) => setDaysRequested(parseInt(e.target.value) || 1)} className="w-24 text-center" />
                                            <span className="text-sm text-zinc-400">Days</span>
                                        </div>
                                        <p className="text-xs text-zinc-500">Note: Failure to return items on time may result in penalties.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => setIsCartOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmitRequest} disabled={cart.length === 0 || isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Submit Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* My Active Issuances Carousel / List */}
            {myRequests.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Box className="w-5 h-5 text-blue-400" /> My Issuances</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {myRequests.map((req) => (
                            <Card key={req.id} className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
                                {/* Top colored border indicative of status */}
                                <div className={`absolute top-0 left-0 w-full h-1 ${req.status === 'pending' ? 'bg-yellow-500' :
                                    req.status === 'approved' ? 'bg-green-500' :
                                        req.status === 'returned' ? 'bg-blue-500' : 'bg-red-500'
                                    }`} />
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base truncate shrink-0 max-w-[70%]">
                                            {req.items[0]?.componentName} {req.items.length > 1 && `+${req.items.length - 1} more`}
                                        </CardTitle>
                                        <Badge variant="outline" className={`text-[10px] shrink-0 ${req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                                            req.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                                req.status === 'returned' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                                    'bg-red-500/20 text-red-400 border-red-500/50'
                                            }`}>
                                            {req.status}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs">
                                        Req: {new Date(req.createdAt).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3 text-sm">
                                    <div className="space-y-1">
                                        {req.items.slice(0, 2).map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-zinc-300">
                                                <span>{item.quantity}x {item.componentName}</span>
                                            </div>
                                        ))}
                                        {req.items.length > 2 && <div className="text-zinc-500 text-xs italic">...and more</div>}
                                    </div>
                                    {req.status === 'approved' && (
                                        <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-orange-300 font-medium">
                                            Due: {new Date(req.dueDate).toLocaleDateString()}
                                        </div>
                                    )}
                                    {req.status === 'approved' && req.extensionRequestStatus === 'pending' && (
                                        <div className="mt-2 text-xs text-yellow-300">
                                            Extension Pending: +{req.extensionRequestedDays || 0} day(s)
                                        </div>
                                    )}
                                    {req.status === 'approved' && req.extensionRequestStatus === 'rejected' && (
                                        <div className="mt-2 text-xs text-red-300">
                                            Extension Rejected: {req.extensionRejectionReason || 'No reason provided.'}
                                        </div>
                                    )}
                                    {req.status === 'rejected' && req.rejectionReason && (
                                        <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-red-300">
                                            Reason: {req.rejectionReason}
                                        </div>
                                    )}
                                    {req.status === 'approved' && (
                                        <div className="mt-3 pt-3 border-t border-zinc-700">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => handleRequestExtension(req)}
                                                disabled={req.extensionRequestStatus === 'pending' || req.daysRequested >= 7}
                                            >
                                                Request Extension
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Component Grid */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Available Components</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {components.map((component) => (
                        <Card key={component.id} className="bg-zinc-800 border-zinc-700 hover:scale-[1.02] transition-transform duration-200 group flex flex-col">
                            <div className="aspect-square bg-zinc-900 border-b border-zinc-700 relative overflow-hidden flex items-center justify-center p-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={component.imageUrl} alt={component.name} className={`object-contain max-w-full max-h-full transition-transform duration-300 ${component.availableQuantity <= 0 ? 'opacity-40 grayscale' : 'group-hover:scale-110'}`} />
                                <Badge className={`absolute top-2 right-2 backdrop-blur-sm text-[10px] ${component.availableQuantity <= 0 ? 'bg-red-600/80 text-white' : 'bg-blue-600/80'}`}>
                                    {component.availableQuantity <= 0 ? 'Out of Stock' : `${component.availableQuantity} left`}
                                </Badge>
                                <Badge className="absolute top-2 left-2 bg-zinc-800/80 backdrop-blur-sm text-[10px] text-zinc-300">
                                    {component.type}
                                </Badge>
                            </div>
                            <CardHeader className="p-4 pb-0 flex-grow">
                                <CardTitle className="text-center text-sm font-semibold line-clamp-2 leading-snug">
                                    {component.name}
                                </CardTitle>
                            </CardHeader>
                            <CardFooter className="p-4 pt-3 mt-auto">
                                <Button
                                    className="w-full text-xs bg-zinc-700 hover:bg-blue-600 transition-colors"
                                    onClick={() => addToCart(component)}
                                    disabled={component.availableQuantity <= 0 || cart.some(item => item.component.id === component.id && item.quantity >= component.availableQuantity)}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {components.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-500 border border-zinc-800 border-dashed rounded-lg bg-zinc-900/50">
                            No components available at the moment.
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}
