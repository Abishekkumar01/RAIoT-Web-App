"use client"

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserIssuances, requestComponent } from '@/lib/inventory';
import { db } from '@/lib/firebase'; // Direct import for onSnapshot
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { IComponent, IIssuance } from '@/types/inventory';
import { Loader2, Search, ArrowRight, Plus, X, Box, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function MemberInventoryPage() {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<IComponent[]>([]);
    const [myIssuances, setMyIssuances] = useState<IIssuance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Single Request State
    const [selectedComponent, setSelectedComponent] = useState<IComponent | null>(null);

    // Bulk Request State
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    // Real-time Inventory Sync
    useEffect(() => {
        const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IComponent));
            setInventory(items);
            setLoading(false);
        }, (error) => {
            console.error("Inventory sync error:", error);
            // Don't show toast on every snapshot error to avoid spam
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Real-time Issuance Sync
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'issuances'),
            where("userId", "==", user.uid),
            orderBy("issueDate", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IIssuance));
            setMyIssuances(items);
        }, (error) => {
            console.error("Issuance sync error:", error);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div className="min-h-screen bg-black text-white p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <h1 className="text-2xl font-bold text-blue-500">User Portal</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="hover:text-white cursor-pointer">My Issuances ({myIssuances.length})</span>
                </div>
            </div>

            {/* My Issuances Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold">My Issuances</h2>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border border-neutral-800 bg-neutral-900/50 p-4">
                    <div className="flex w-max space-x-4">
                        {myIssuances.map((issuance) => (
                            <div key={issuance.id} className="w-[250px] shrink-0">
                                <IssuanceCard issuance={issuance} />
                            </div>
                        ))}
                        {myIssuances.length === 0 && (
                            <div className="flex items-center justify-center w-full py-8 text-gray-500 italic">
                                No active issuances found. Start by requesting a component!
                            </div>
                        )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Available Components Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-xl font-bold">Available Components</h2>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search components..."
                                className="pl-8 bg-neutral-900 border-neutral-700 focus-visible:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsBulkOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Bulk Request
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {inventory
                            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(item => (
                                <ComponentCard
                                    key={item.id}
                                    item={item}
                                    onRequest={() => setSelectedComponent(item)}
                                />
                            ))}
                        {inventory.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500">
                                No inventory found. Please contact admin.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <SingleRequestModal
                component={selectedComponent}
                isOpen={!!selectedComponent}
                onClose={() => setSelectedComponent(null)}
                onSuccess={() => {
                    setSelectedComponent(null);
                }}
                userName={user?.displayName || ''}
                userEmail={user?.email || ''}
                userId={user?.uid || ''}
            />

            <BulkRequestModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                inventory={inventory}
                onSuccess={() => {
                    setIsBulkOpen(false);
                }}
                userName={user?.displayName || ''}
                userEmail={user?.email || ''}
                userId={user?.uid || ''}
            />
        </div>
    );
}

// --- Sub-Components ---

const IssuanceCard = ({ issuance }: { issuance: IIssuance }) => (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-2 relative group hover:border-neutral-700 transition-colors">
        <div className="flex items-start justify-between">
            <div className="font-bold text-lg truncate w-[160px]" title={issuance.componentName}>{issuance.componentName}</div>
            <Badge variant="outline" className={
                issuance.status === 'approved' || issuance.status === 'issued' ? 'text-green-500 border-green-900 bg-green-900/10' :
                    issuance.status === 'rejected' ? 'text-red-500 border-red-900 bg-red-900/10' :
                        'text-yellow-500 border-yellow-900 bg-yellow-900/10'
            }>
                {issuance.status}
            </Badge>
        </div>
        <div className="text-sm text-gray-400">Qty: {issuance.quantity} • Due: {new Date(issuance.dueDate).toLocaleDateString()}</div>
    </div>
);

const ComponentCard = ({ item, onRequest }: { item: IComponent, onRequest: () => void }) => (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 flex flex-col h-full group">
        <div className="relative aspect-video mb-4 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
            {item.imageUrl ? (
                <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
                />
            ) : (
                <Box className="w-12 h-12 text-gray-700" />
            )}
            {item.availableQuantity === 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-red-500 font-bold border-2 border-red-500 px-4 py-1 rounded -rotate-12">OUT OF STOCK</span>
                </div>
            )}
        </div>
        <div className="flex-1 space-y-1">
            <h3 className="font-bold text-lg text-white truncate" title={item.name}>{item.name}</h3>
            <p className="text-xs text-gray-400">{item.type}</p>
        </div>
        <div className="mt-4 flex justify-between items-center text-sm">
            <span className={item.availableQuantity > 0 ? "text-green-400" : "text-red-500"}>
                Avail: {item.availableQuantity}
            </span>
            <button
                onClick={onRequest}
                disabled={item.availableQuantity === 0}
                className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-blue-400"
            >
                Request <ArrowRight size={14} />
            </button>
        </div>
    </div>
);

// --- Modals ---

const SingleRequestModal = ({ component, isOpen, onClose, onSuccess, userName, userEmail, userId }: any) => {
    const [qty, setQty] = useState(1);
    const [days, setDays] = useState(7);
    const [loading, setLoading] = useState(false);

    if (!component) return null;

    const handleSubmit = async () => {
        if (qty <= 0 || qty > component.availableQuantity) return toast.error("Invalid Quantity");
        if (days < 1 || days > 7) return toast.error("Duration must be 1-7 days");

        setLoading(true);
        try {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + days);

            // 1. Critical: Database Update
            await requestComponent({
                componentId: component.id,
                componentName: component.name,
                componentImage: component.imageUrl,
                userId,
                userName,
                userEmail,
                quantity: qty,
                dueDate: dueDate.toISOString(),
            });

            // 2. Non-Critical: Send Email (Floating)
            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'new_request',
                    userName,
                    items: [{ componentName: component.name, quantity: qty, days }]
                })
            }).catch(console.error);

            toast.success("Request Submitted Successfully");
            onSuccess();
        } catch (error: any) {
            console.error(error);
            if (error?.code === 'permission-denied') {
                toast.error("Permission Error: Ask Admin to deploy Firestore Rules via CLI.");
            } else {
                toast.error("Failed to submit request: " + (error?.message || "Unknown error"));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle>Request {component.name}</DialogTitle>
                </DialogHeader>

                <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden mb-4 flex items-center justify-center border border-neutral-800">
                    <img src={component.imageUrl} className="w-full h-full object-contain" />
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Available</label>
                            <div className="font-mono text-green-400 text-lg">{component.availableQuantity}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Type</label>
                            <div className="text-gray-300">{component.type}</div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-400">Quantity Required</label>
                        <Input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(Number(e.target.value))}
                            max={component.availableQuantity}
                            min={1}
                            className="bg-neutral-950 border-neutral-800 focus-visible:ring-blue-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-gray-400">Issue For (Days)</label>
                        <Input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            max={7}
                            min={1}
                            className="bg-neutral-950 border-neutral-800 focus-visible:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Standard max 7 days.</p>
                    </div>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-neutral-800 hover:text-white">Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const BulkRequestModal = ({ isOpen, onClose, inventory, onSuccess, userName, userEmail, userId }: any) => {
    const [selectedId, setSelectedId] = useState('');
    const [qty, setQty] = useState(1);
    const [days, setDays] = useState(7);
    const [requestList, setRequestList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setRequestList([]);
            setQty(1);
            setDays(7);
            setSearchTerm('');
            setSelectedId('');
        }
    }, [isOpen]);

    const handleAddToList = () => {
        // If user typed name exactly but didn't click dropdown, try to find it
        let targetId = selectedId;
        if (!targetId && searchTerm) {
            const exactMatch = inventory.find((i: any) => i.name.toLowerCase() === searchTerm.toLowerCase() && i.availableQuantity > 0);
            if (exactMatch) targetId = exactMatch.id;
        }

        if (!targetId) return toast.error("Please select a valid component from the list");

        const component = inventory.find((i: any) => i.id === targetId);
        if (!component) return;

        // Check local accumulated quantity
        const existingInList = requestList.find(i => i.id === targetId);
        const currentListQty = existingInList ? existingInList.requestQty : 0;

        if ((qty + currentListQty) > component.availableQuantity) return toast.error(`Only ${component.availableQuantity} available`);

        if (existingInList) {
            setRequestList(requestList.map(i => i.id === targetId ? { ...i, requestQty: i.requestQty + qty } : i));
        } else {
            setRequestList([...requestList, { ...component, requestQty: qty }]);
        }

        setSelectedId('');
        setQty(1);
        setSearchTerm('');
        setShowDropdown(false);
    };

    const handleRemove = (id: string) => {
        setRequestList(requestList.filter(i => i.id !== id));
    };

    const handleSubmit = async () => {
        if (requestList.length === 0) return;
        setLoading(true);
        try {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + days);

            // Sequential requests
            for (const item of requestList) {
                await requestComponent({
                    componentId: item.id,
                    componentName: item.name,
                    componentImage: item.imageUrl,
                    userId,
                    userName,
                    userEmail,
                    quantity: item.requestQty,
                    dueDate: dueDate.toISOString(),
                });
            }

            // Send Bulk Email (Floating)
            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'new_request',
                    userName,
                    items: requestList.map(item => ({
                        componentName: item.name,
                        quantity: item.requestQty,
                        days
                    }))
                })
            }).catch(console.error);

            toast.success(`Submitted ${requestList.length} requests successfully`);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            if (error?.code === 'permission-denied') {
                toast.error("Permission Denied: Please ask Admin to deploy new Firestore Rules.");
            } else {
                toast.error("Failed to submit bulk request: " + (error?.message || "Unknown error"));
            }
        } finally {
            setLoading(false);
        }
    };

    // Filtered components for search
    // Exclude already added items
    const filteredInventory = inventory.filter((i: any) =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        i.availableQuantity > 0
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl overflow-visible">
                <DialogHeader>
                    <DialogTitle>Bulk Component Request</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Add multiple components to a single request batch.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-4 border border-neutral-800 rounded-lg bg-neutral-950/30">
                    <h3 className="text-blue-500 font-medium text-sm">Add Component to List</h3>
                    <div className="flex gap-4 items-start">
                        <div className="flex-1 relative z-50">
                            <Input
                                placeholder="Search & Select Component..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSelectedId(''); // Clear selection on type
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                // Don't close on blur immediately to allow clicks
                                className="bg-neutral-950 border-neutral-800 focus-visible:ring-blue-500"
                            />
                            {showDropdown && searchTerm && (
                                <div className="absolute top-full left-0 right-0 bg-neutral-900 border border-neutral-700 mt-1 max-h-60 overflow-y-auto rounded-md shadow-2xl ring-1 ring-black ring-opacity-5">
                                    {filteredInventory.length > 0 ? (
                                        filteredInventory.map((item: any) => (
                                            <div
                                                key={item.id}
                                                className="p-3 hover:bg-neutral-800 cursor-pointer flex justify-between items-center border-b border-neutral-800 last:border-0 transition-colors"
                                                onClick={() => {
                                                    setSelectedId(item.id);
                                                    setSearchTerm(item.name);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center overflow-hidden">
                                                        <img src={item.imageUrl || "https://via.placeholder.com/30"} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="font-medium">{item.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-neutral-800 text-green-400 border-neutral-700">
                                                    Avail: {item.availableQuantity}
                                                </Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 text-sm">No matching components found.</div>
                                    )}
                                </div>
                            )}
                            {/* Overlay to close dropdown when clicking outside */}
                            {showDropdown && (
                                <div className="fixed inset-0 z-[-1]" onClick={() => setShowDropdown(false)}></div>
                            )}
                        </div>
                        <Input
                            type="number"
                            className="w-24 bg-neutral-950 border-neutral-800 focus-visible:ring-blue-500"
                            value={qty}
                            onChange={(e) => setQty(Number(e.target.value))}
                            min={1}
                            placeholder="Qty"
                        />
                        <Button variant="secondary" onClick={handleAddToList}>Add</Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-sm font-medium text-gray-400">Request List ({requestList.length})</label>
                        {requestList.length > 0 && (
                            <Button variant="link" className="text-xs text-red-500 h-auto p-0" onClick={() => setRequestList([])}>Clear All</Button>
                        )}
                    </div>

                    <div className="min-h-[150px] max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {requestList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-neutral-800 rounded-lg py-8">
                                <Box className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-sm">No items added yet</span>
                            </div>
                        ) : (
                            requestList.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-neutral-900 p-3 rounded-lg border border-neutral-800 group hover:border-neutral-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center border border-neutral-800">
                                            <img src={item.imageUrl} className="w-8 h-8 object-contain" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{item.name}</div>
                                            <div className="text-xs text-gray-500">Requesting: <span className="text-white">{item.requestQty}</span></div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 h-8 w-8" onClick={() => handleRemove(item.id)}>
                                        <X size={16} />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-2 border-t border-neutral-800 pt-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Duration (Days)</label>
                        <span className="text-xs text-blue-400">Return Date: {new Date(Date.now() + days * 86400000).toLocaleDateString()}</span>
                    </div>

                    <Input
                        type="number"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bg-neutral-950 border-neutral-800 focus-visible:ring-blue-500"
                        min={1}
                        max={7}
                    />
                    <p className="text-xs text-gray-500">Standard policy allows up to 7 days.</p>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} className="hover:bg-neutral-800 hover:text-white">Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={loading || requestList.length === 0}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
