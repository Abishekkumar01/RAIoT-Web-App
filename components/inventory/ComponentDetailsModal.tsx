"use client"

import React, { useState } from 'react';
import { IComponent } from '@/types/inventory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restockComponent, deleteComponent } from '@/lib/inventory';
import { toast } from 'sonner';
import { Loader2, Trash2, Calendar, Archive, Box } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ComponentDetailsModalProps {
    component: IComponent | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ComponentDetailsModal: React.FC<ComponentDetailsModalProps> = ({ component, open, onClose, onUpdate }) => {
    const [restockQty, setRestockQty] = useState(0);
    const [isRestocking, setIsRestocking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    if (!component) return null;

    const handleRestock = async () => {
        if (restockQty <= 0) {
            toast.error("Please enter a valid quantity to add.");
            return;
        }

        setIsRestocking(true);
        try {
            await restockComponent(component.id, restockQty);
            toast.success(`Successfully added ${restockQty} items to stock.`);
            setRestockQty(0);
            onUpdate(); // Refresh data
        } catch (error) {
            console.error("Restock failed:", error);
            toast.error("Failed to update stock.");
        } finally {
            setIsRestocking(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteComponent(component.id);
            toast.success("Component deleted details.");
            onClose();
            onUpdate();
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete component.");
        } finally {
            setIsDeleting(false);
            setShowDeleteAlert(false);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent className="bg-gray-950 border-gray-800 text-white sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Box className="w-5 h-5 text-cyan-500" />
                            Component Details
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col md:flex-row gap-6 mt-4">
                        {/* Image Section */}
                        <div className="w-full md:w-1/3">
                            <div className="aspect-square rounded-lg overflow-hidden border border-gray-800 bg-gray-900 relative">
                                {component.imageUrl ? (
                                    <img
                                        src={component.imageUrl}
                                        alt={component.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        No Image
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{component.name}</h2>
                                <p className="text-cyan-400 font-medium">{component.type}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
                                    <p className="text-gray-500">Total Quantity</p>
                                    <p className="text-xl font-bold text-white">{component.quantity}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
                                    <p className="text-gray-500">Available</p>
                                    <p className={`text-xl font-bold ${component.availableQuantity === 0 ? 'text-red-500' :
                                            component.availableQuantity < 5 ? 'text-yellow-500' : 'text-green-500'
                                        }`}>
                                        {component.availableQuantity}
                                    </p>
                                </div>
                            </div>

                            {component.description && (
                                <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded border border-gray-800/50">
                                    {component.description}
                                </div>
                            )}

                            {/* Restock Section */}
                            <div className="pt-4 border-t border-gray-800">
                                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-gray-300">
                                    <Archive className="w-4 h-4" /> Add Stock
                                </h4>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={restockQty}
                                        onChange={(e) => setRestockQty(Number(e.target.value))}
                                        className="bg-gray-900 border-gray-700 h-9"
                                        placeholder="Qty"
                                        min={1}
                                    />
                                    <Button
                                        onClick={handleRestock}
                                        disabled={isRestocking}
                                        className="bg-cyan-600 hover:bg-cyan-700 h-9"
                                    >
                                        {isRestocking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrival History */}
                    <div className="mt-6 pt-4 border-t border-gray-800">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-300">
                            <Calendar className="w-4 h-4" /> Arrival History
                        </h4>
                        <div className="bg-gray-900 rounded-md border border-gray-800 max-h-40 overflow-y-auto">
                            {component.arrivalDates && component.arrivalDates.length > 0 ? (
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-800">
                                        {component.arrivalDates.map((arrival, idx) => (
                                            <tr key={idx} className="hover:bg-gray-800/50">
                                                <td className="p-2 text-gray-400 pl-4">{new Date(arrival.date).toLocaleDateString()}</td>
                                                <td className="p-2 text-gray-500 text-xs">{new Date(arrival.date).toLocaleTimeString()}</td>
                                                <td className="p-2 text-right pr-4 font-mono text-green-500">+{arrival.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="p-4 text-center text-gray-500 text-sm">No history recorded.</p>
                            )}
                        </div>
                    </div>

                    {/* Delete Button */}
                    <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setShowDeleteAlert(true)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Component
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Separate Alert for Deletion to avoid nesting dialogs issues if strictly enforced, but here handled via state */}
            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {component.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            This action cannot be undone. This will permanently remove this component and all its history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 border-gray-700 hover:bg-gray-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
