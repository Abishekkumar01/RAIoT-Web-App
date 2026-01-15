"use client"

import React from 'react';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { IComponent } from '@/types/inventory';
import { Edit, Trash2 } from 'lucide-react';

interface InventoryAdminTableProps {
    components: IComponent[];
    onEdit: (component: IComponent) => void;
    onDelete: (component: IComponent) => void;
}

export const InventoryAdminTable: React.FC<InventoryAdminTableProps> = ({ components, onEdit, onDelete }) => {
    return (
        <div className="rounded-md border border-gray-800 bg-gray-900/50">
            <Table>
                <TableHeader className="bg-gray-900">
                    <TableRow className="border-gray-800 hover:bg-gray-900">
                        <TableHead className="text-gray-400 w-[100px]">Image</TableHead>
                        <TableHead className="text-gray-400">Name</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400 text-right">Quantity</TableHead>
                        <TableHead className="text-gray-400 text-right">Available</TableHead>
                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {components.map((component) => (
                        <TableRow key={component.id} className="border-gray-800 hover:bg-gray-800/50">
                            <TableCell>
                                {component.imageUrl ? (
                                    <img src={component.imageUrl} alt={component.name} className="w-10 h-10 object-cover rounded bg-gray-800" />
                                ) : (
                                    <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">N/A</div>
                                )}
                            </TableCell>
                            <TableCell className="font-medium text-gray-200">{component.name}</TableCell>
                            <TableCell className="text-gray-400">{component.type}</TableCell>
                            <TableCell className="text-right text-gray-300">{component.quantity}</TableCell>
                            <TableCell className="text-right">
                                <span className={
                                    component.availableQuantity === 0 ? "text-red-400" :
                                        component.availableQuantity < 5 ? "text-yellow-400" : "text-green-400"
                                }>
                                    {component.availableQuantity}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(component)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete(component)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {components.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                No components found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
