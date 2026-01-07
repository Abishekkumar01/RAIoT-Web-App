"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import Masonry from "@/components/Masonry"
import { GalleryEventWithImages } from "@/lib/gallery-data"

export default function GalleryClient({ initialData }: { initialData: GalleryEventWithImages[] }) {
    // We can add client-side filtering or load more logic here later if needed
    // For now it just renders the high-performance initial data

    if (!initialData || initialData.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                No gallery events found.
            </div>
        )
    }

    return (
        <div className="max-w-[1920px] mx-auto px-4">
            <div className="space-y-12">
                {initialData.map((event) => (
                    <div key={event.id} className="space-y-6 mb-24">
                        <div className="text-center mb-8">
                            <div className="flex flex-col items-center gap-4 mb-4">
                                <div className="flex flex-wrap items-center justify-center gap-4">
                                    <Badge className="bg-primary text-white">
                                        {event.tag || 'Event'}
                                    </Badge>
                                    <div className="flex items-center text-muted-foreground">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        {event.customDate ? new Date(event.customDate).toLocaleDateString() : (event.createdTime ? new Date(event.createdTime).toLocaleDateString() : 'Recent')}
                                    </div>
                                </div>
                                {event.batch && (
                                    <div className="bg-slate-900 border border-cyan-500/50 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md">
                                        <span className="text-cyan-400 font-mono text-sm font-semibold tracking-wider">
                                            {event.batch}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold mb-2">{event.name}</h2>
                            {event.description && (
                                <p className="text-lg text-muted-foreground max-w-6xl mx-auto">
                                    {event.description}
                                </p>
                            )}
                        </div>

                        <div className="w-full relative min-h-[400px]">
                            <Masonry
                                items={event.images.map((img, idx) => ({
                                    id: img.id,
                                    img: img.url || '', // Fallback
                                    url: img.url || '',
                                    height: [400, 300, 500, 350, 450][idx % 5]
                                }))}
                                ease="power3.out"
                                duration={0.6}
                                stagger={0.05}
                                animateFrom="bottom"
                                scaleOnHover={true}
                                hoverScale={0.95}
                                blurToFocus={true}
                                colorShiftOnHover={false}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
