"use client"

import React from 'react';
import { InventoryCard } from './InventoryCard';
import { IComponent } from '@/types/inventory';

interface InventoryGridProps {
    components: IComponent[];
    isMember?: boolean;
    isAdmin?: boolean;
    onIssue?: (component: IComponent) => void;
    onEdit?: (component: IComponent) => void;
    onDelete?: (component: IComponent) => void;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
    components,
    isMember,
    isAdmin,
    onIssue,
    onEdit,
    onDelete
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {components.map((component) => (
                <InventoryCard
                    key={component.id}
                    component={component}
                    isMember={isMember}
                    isAdmin={isAdmin}
                    onIssue={onIssue}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
            {components.length === 0 && (
                <div className="col-span-full h-64 flex items-center justify-center text-gray-500 font-mono border border-dashed border-gray-700 rounded-2xl bg-gray-900/30">
                    NO COMPONENTS FOUND IN INVENTORY
                </div>
            )}
        </div>
    );
};
