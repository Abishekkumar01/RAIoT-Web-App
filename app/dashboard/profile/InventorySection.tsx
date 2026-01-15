"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { getInventory, requestComponent, getUserIssuances } from '@/lib/inventory';
import { IComponent, IIssuance } from '@/types/inventory';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Loader2, Box, History } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function InventorySection() {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<IComponent[]>([]);
    const [myIssuances, setMyIssuances] = useState<IIssuance[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [invData, issueData] = await Promise.all([
                getInventory(),
                getUserIssuances(user.uid)
            ]);
            setInventory(invData);
            setMyIssuances(issueData);
        } catch (error) {
            console.error("Failed to fetch inventory data:", error);
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleIssue = async (component: IComponent) => {
        if (!user) return;

        // Simple confirmation prompt or modal (could be improved)
        const quantity = 1; // Default to 1 for now or add a modal to select quantity

        try {
            toast.promise(
                requestComponent({
                    componentId: component.id,
                    componentName: component.name,
                    componentImage: component.imageUrl,
                    userId: user.uid,
                    userName: user.displayName || "Unknown",
                    userEmail: user.email || "",
                    quantity: quantity,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
                    purpose: "Project Component Request"
                }),
                {
                    loading: 'Requesting component...',
                    success: () => {
                        fetchData(); // Refresh data
                        return 'Component requested successfully!';
                    },
                    error: 'Failed to request component'
                }
            );
        } catch (error) {
            console.error(error);
        }
    };

    if (!user) return null;

    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Box className="h-5 w-5 mr-2" />
                    Components & Inventory
                </CardTitle>
                <CardDescription>Request components for your projects and track your issuances.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="available">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="available">Available Components</TabsTrigger>
                        <TabsTrigger value="history">My History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="available" className="mt-4">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                            </div>
                        ) : (
                            <InventoryGrid
                                components={inventory}
                                isMember={true}
                                onIssue={handleIssue}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                        <div className="rounded-md border border-gray-800 bg-gray-900/50">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Component</TableHead>
                                        <TableHead>Date Requested</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myIssuances.map((issuance) => (
                                        <TableRow key={issuance.id}>
                                            <TableCell className="font-medium">{issuance.componentName}</TableCell>
                                            <TableCell>{new Date(issuance.issueDate).toLocaleDateString()}</TableCell>
                                            <TableCell>{new Date(issuance.dueDate).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    issuance.status === 'issued' ? 'default' :
                                                        issuance.status === 'pending' ? 'secondary' :
                                                            issuance.status === 'rejected' ? 'destructive' : 'outline'
                                                } className={
                                                    issuance.status === 'issued' ? 'bg-green-600' :
                                                        issuance.status === 'pending' ? 'bg-yellow-600' :
                                                            issuance.status === 'returned' ? 'text-gray-400' : ''
                                                }>
                                                    {issuance.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {myIssuances.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                                No history found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
