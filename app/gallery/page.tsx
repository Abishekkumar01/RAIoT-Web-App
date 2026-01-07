import { PublicNavbar } from "@/components/layout/PublicNavbar"
import { getGalleryData } from "@/lib/gallery-data"
import GalleryClient from "@/components/GalleryClient"

// Force dynamic because we want to check the config, though cache handles the heavy lifting
export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const galleryData = await getGalleryData()

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <PublicNavbar />

      <div className="w-full py-12">
        <div className="text-center mb-12 px-4">
          <h1
            className="text-5xl md:text-7xl font-black font-orbitron mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Gallery
          </h1>
          <p className="text-xl text-muted-foreground">Memories from our events, workshops, and achievements</p>
        </div>

        <GalleryClient initialData={galleryData || []} />
      </div>
    </div>
  )
}
