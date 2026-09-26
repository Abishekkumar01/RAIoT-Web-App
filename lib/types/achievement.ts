export interface Achievement {
    id: string
    title: string
    batch: string // e.g. "2026", "2025"
    date?: string // e.g. "2025", "October 2024"
    tag?: string // e.g. "1st Place", "National Winner", "Gold Medal", "Hackathon"
    imageUrl: string // Big landscape image
    description?: string // Short overview/summary
    points: string[] // List of achievement bullet points
    order: number // Sort order within batch or overall
    status?: 'published' | 'draft'
    createdAt?: any
    updatedAt?: any
}
