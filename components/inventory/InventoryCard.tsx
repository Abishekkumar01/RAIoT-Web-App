"use client"

import React from 'react'
import { IComponent } from '@/types/inventory'

interface InventoryCardProps {
    component: IComponent;
    isMember?: boolean;
    isAdmin?: boolean;
    onIssue?: (component: IComponent) => void;
    onEdit?: (component: IComponent) => void;
    onDelete?: (component: IComponent) => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    component,
    isMember = false,
    isAdmin = false,
    onIssue,
    onEdit,
    onDelete
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    // Determine status
    const isOutOfStock = component.availableQuantity <= 0;
    const isLowStock = component.availableQuantity > 0 && component.availableQuantity < 5;

    return (
        <div
            className="flex justify-center items-center p-4"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-72 h-[26rem] perspective-1000 group/card">

                {/* Main Card Container */}
                <div className={`
                    relative w-full h-full rounded-2xl overflow-visible
                    bg-gradient-to-br from-gray-900/95 to-black/95
                    border transition-all duration-500
                    transform-gpu z-20 flex flex-col
                    ${isHovered
                        ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)] scale-105'
                        : 'border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] scale-100'
                    }
                `}>
                    {/* Header: Component Name */}
                    <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 border-b border-cyan-400/30 p-4 rounded-t-2xl">
                        {/* Corner Accents */}
                        <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-cyan-400" />
                        <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-cyan-400" />

                        <h3 className={`
                            text-lg font-bold text-center font-mono truncate
                            text-transparent bg-clip-text
                            bg-gradient-to-r from-cyan-400 to-blue-400
                        `}>
                            {component.name}
                        </h3>

                        <div className="flex justify-between items-center mt-1 text-xs font-mono text-gray-400">
                            <span className={isOutOfStock ? "text-red-400" : isLowStock ? "text-yellow-400" : "text-green-400"}>
                                {isOutOfStock ? "OUT OF STOCK" : isLowStock ? `LOW STOCK (${component.availableQuantity})` : `AVAILABLE (${component.availableQuantity})`}
                            </span>
                        </div>
                    </div>

                    {/* Image Section */}
                    <div className="relative h-48 overflow-hidden bg-gray-800/50">
                        {component.imageUrl ? (
                            <img
                                src={component.imageUrl}
                                alt={component.name}
                                className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-xs">NO IMAGE</div>
                        )}

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />
                    </div>

                    {/* Details Section */}
                    <div className="flex-1 p-4 space-y-2 text-sm font-mono text-gray-300">
                        <div className="flex justify-between">
                            <span className="text-gray-500">TYPE</span>
                            <span className="text-cyan-300">{component.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">TOTAL QTY</span>
                            <span>{component.quantity}</span>
                        </div>
                        {/* Description - truncated */}
                        <p className="text-xs text-gray-500 h-8 overflow-hidden text-ellipsis line-clamp-2 mt-2">
                            {component?.description || "No description available."}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 pt-0 mt-auto">
                        {isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEdit?.(component)}
                                    className="flex-1 px-3 py-2 bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-mono rounded hover:bg-blue-800/50 transition-colors"
                                >
                                    EDIT
                                </button>
                                <button
                                    onClick={() => onDelete?.(component)}
                                    className="flex-1 px-3 py-2 bg-red-900/40 border border-red-500/30 text-red-300 text-xs font-mono rounded hover:bg-red-800/50 transition-colors"
                                >
                                    DELETE
                                </button>
                            </div>
                        )}

                        {isMember && !isAdmin && (
                            <button
                                onClick={() => onIssue?.(component)}
                                disabled={isOutOfStock}
                                className={`
                                    w-full py-3 relative overflow-hidden group/btn font-mono text-xs font-bold tracking-widest uppercase
                                    transition-all duration-300 border
                                    ${isOutOfStock
                                        ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                                    }
                                `}
                            >
                                {isOutOfStock ? "UNAVAILABLE" : "REQUEST COMPONENT"}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
