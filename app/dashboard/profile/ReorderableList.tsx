"use client"

import React, { useEffect, useState } from "react"
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion"
import { GripVertical, Trash2, Plus, Grip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ReorderableListProps {
    title: string
    icon: React.ReactNode
    items: string[]
    onUpdate: (items: string[]) => void
    isEditing: boolean
    placeholder?: string
}

interface ListItem {
    id: string
    text: string
}

export function ReorderableList({
    title,
    icon,
    items,
    onUpdate,
    isEditing,
    placeholder = "Add item..."
}: ReorderableListProps) {
    const [listItems, setListItems] = useState<ListItem[]>([])

    // Sync items from prop to local state with stable IDs
    useEffect(() => {
        // Only update if length differs or content differs significantly
        // This simple check prevents loop if internal update triggers prop update which triggers effect
        // We assume the prop 'items' is the source of truth.
        // However, to maintain drag state, we strictly rely on Reorder.Group state, 
        // BUT we need to handle external additions (like when user clicks "Add").

        setListItems(prev => {
            // If lengths match and content matches, keep existing to preserve IDs if possible?
            // Actually, simpler strategy: map incoming strings to existing IDs if match, or new IDs.

            let newItems: ListItem[] = []

            // This is a naive sync. For a perfect reorder experience, we usually control state locally 
            // and only push to parent on change. Parent shouldn't push back unless it's a save or reload.
            // Assuming 'items' updates whenever we call 'onUpdate'.

            if (items.length === prev.length && items.every((val, i) => val === prev[i].text)) {
                return prev
            }

            // Map strings to items, reusing IDs where possible to avoid re-renders or flash
            // Since we don't track original IDs, we just generate new ones if length changed or order totally diff?
            // Let's just create new items for simplicity, assuming reorder interactions won't be interrupted by external fetch
            // unless it's the own update.

            return items.map((text) => ({
                id: Math.random().toString(36).substr(2, 9),
                text
            }))
        })
    }, [items])

    const handleReorder = (newOrder: ListItem[]) => {
        setListItems(newOrder)
        onUpdate(newOrder.map(i => i.text))
    }

    const handleTextChange = (id: string, newText: string) => {
        const updated = listItems.map(item => item.id === id ? { ...item, text: newText } : item)
        setListItems(updated)
        onUpdate(updated.map(i => i.text))
    }

    const handleDelete = (id: string) => {
        const updated = listItems.filter(item => item.id !== id)
        setListItems(updated)
        onUpdate(updated.map(i => i.text))
    }

    const handleAdd = () => {
        const newItem = ""
        // We update parent, which will trigger effect to update local
        onUpdate([...items, newItem])
    }

    return (
        <Card className="overflow-hidden border-zinc-800 bg-black/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg font-medium">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-zinc-100">
                            {icon}
                            {title}
                        </div>
                        {isEditing && (
                            <p className="text-xs font-normal text-muted-foreground ml-7">
                                Drag items to reorder
                            </p>
                        )}
                    </div>
                    {isEditing && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAdd}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <Reorder.Group axis="y" values={listItems} onReorder={handleReorder} className="space-y-3">
                        {listItems.map((item) => (
                            <Reorder.Item key={item.id} value={item}>
                                <div className="group relative flex items-center gap-3 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                    <GripVertical className="h-5 w-5 text-zinc-600 cursor-grab active:cursor-grabbing flex-shrink-0 hover:text-cyan-500 transition-colors" />
                                    <Input
                                        value={item.text}
                                        onChange={(e) => handleTextChange(item.id, e.target.value)}
                                        placeholder={placeholder}
                                        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-1 shadow-none text-zinc-200 placeholder:text-zinc-600"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(item.id)}
                                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                ) : (
                    <div className="space-y-3">
                        {items.map((text, i) => (
                            text && (
                                <div key={i} className="group flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                                    <div className="mt-1 text-cyan-500/50 group-hover:text-cyan-400 transition-colors">
                                        {icon}
                                    </div>
                                    <span className="text-zinc-300 text-sm leading-relaxed">{text}</span>
                                </div>
                            )
                        ))}
                        {items.length === 0 && (
                            <div className="text-center py-6 text-zinc-600 italic text-sm border border-dashed border-zinc-800 rounded-lg">
                                No {title.toLowerCase()} added yet.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
