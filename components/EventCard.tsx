"use client"

import React from 'react'

interface EventCardProps {
  image: string
  name: string
  details: {
    date: string
    location: string
    type: string
    capacity: string | number
  }
  onBrief?: () => void
  isRegistered?: boolean
  isFull?: boolean
  isOnline?: boolean
  isRegistrationClosed?: boolean
}

export const EventCard: React.FC<EventCardProps> = ({
  image,
  name,
  details,
  onBrief,
  isRegistered = false,
  isFull = false,
  isOnline = true,
  isRegistrationClosed = false
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)

  // Combined offline state for visual consistency
  const isOfflineState = isRegistrationClosed || !isOnline;

  // Debug logging
  React.useEffect(() => {
    console.log(`🎴 EventCard "${name}":`, {
      image: image,
      hasImage: !!image,
      imageLength: image?.length || 0,
      imageType: typeof image,
      imagePreview: image?.substring(0, 100)
    })
  }, [image, name])

  const handleMouseEnter = () => {
    setIsHovered(true)
    setIsScanning(true)
    // Stop scanning after one complete animation cycle
    setTimeout(() => setIsScanning(false), 1500)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}.${month}.${day}`
    } catch {
      return dateString
    }
  }

  return (
    <div className="flex justify-center items-center p-4">
      <div
        className="relative w-80 h-96 perspective-1000 group/card"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        style={{ perspective: '1000px' }}
      >

        {/* Opening Effect Layer - Shows image or default pattern */}
        <div className={`
          absolute inset-0 z-10
          rounded-2xl border-2 border-cyan-400/50
          transition-all duration-600 ease-out overflow-hidden
          ${isHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}
        `} style={{ pointerEvents: 'none' }}>
          {/* Image Background - Show if image exists */}
          {image && image.trim() !== '' && image !== '/placeholder.jpg' ? (
            <img
              src={image}
              alt={name}
              className="absolute inset-0 w-full h-full object-contain rounded-2xl bg-gray-900"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                console.error('❌ Image failed to load for event:', name)
                console.error('Image URL:', image)
                const target = e.target as HTMLImageElement

                // If it's a Google Drive URL, try alternative formats
                if (image.includes('drive.google.com') || image.includes('lh3.googleusercontent.com')) {
                  let fileId: string | null = null

                  const idMatch = image.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                    image.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                    image.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/) ||
                    image.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/)
                  if (idMatch) {
                    fileId = idMatch[1]
                  }

                  if (fileId) {
                    const cdnUrl = `https://lh3.googleusercontent.com/d/${fileId}`
                    if (!target.src.includes('lh3.googleusercontent.com')) {
                      console.log('🔄 Trying Google CDN format:', cdnUrl)
                      target.src = cdnUrl
                      return
                    }

                    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920-h1080`
                    if (!target.src.includes('thumbnail')) {
                      console.log('🔄 Trying thumbnail format:', thumbnailUrl)
                      target.src = thumbnailUrl
                      return
                    }
                  }
                }
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully for event:', name)
                console.log('Image URL:', image)
              }}
            />
          ) : (
            <>
              {/* Default Background Pattern */}
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700"
              />
              <div
                className="absolute inset-0 rounded-2xl opacity-30"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
            </>
          )}

          {/* Blue Grid Overlay - Always show, but lighter when image exists */}
          <div
            className={`absolute inset-0 rounded-2xl ${image && image.trim() !== '' && image !== '/placeholder.jpg' ? 'opacity-20' : 'opacity-40'}`}
            style={{
              backgroundImage: `
                linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          <div className={`absolute inset-0 rounded-2xl ${image && image.trim() !== '' && image !== '/placeholder.jpg' ? 'bg-black/5' : 'bg-black/10'}`} />

          {/* Front Grid Scan Line */}
          {isScanning && (
            <div
              className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{
                animation: 'frontScanLine 1.5s ease-in-out'
              }}
            />
          )}

          {/* INITIALIZING text - Only show if no image */}
          {(!image || image.trim() === '' || image === '/placeholder.jpg') && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-cyan-400 text-sm font-mono bg-black/50 px-4 py-2 rounded backdrop-blur-sm">
              INITIALIZING...
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className={`
          relative w-full h-full rounded-2xl overflow-visible
          bg-gradient-to-br from-gray-900/95 to-black/95
          border transition-all duration-500
          transform-gpu z-20
          ${isHovered
            ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.6)] scale-105'
            : isOfflineState
              ? 'border-gray-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.5)] scale-100'
              : 'border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] scale-100'
          }
        `} style={{ pointerEvents: 'auto' }}>

          {/* Header */}
          <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 border-b border-cyan-400/30 p-4">
            {/* Corner Brackets */}
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-cyan-400" />
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-cyan-400" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-cyan-400" />

            {/* Event Name */}
            <h3 className={`
              text-lg font-bold text-center font-mono
              text-transparent bg-clip-text
              bg-gradient-to-r from-cyan-400 to-purple-400
              transition-all duration-500
              ${isHovered ? 'scale-105' : 'scale-100'}
            `} style={{
                textShadow: isHovered ? '0 0 10px rgba(34,211,238,0.5)' : 'none',
                letterSpacing: '0.05em'
              }}>
              {name}

              {/* Typing cursor */}
              <span className={`
                inline-block w-0.5 h-4 bg-cyan-400 ml-1
                transition-opacity duration-300
                ${isHovered ? 'opacity-100 animate-pulse' : 'opacity-0'}
              `} />
            </h3>

            {/* Status indicators */}
            <div className="flex justify-between items-center mt-2">
              <div className={`
                flex items-center space-x-2 text-xs font-mono
                transition-opacity duration-500
                ${isHovered ? 'opacity-100' : 'opacity-60'}
              `}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isOfflineState ? 'bg-gray-500' : isFull ? 'bg-red-400' : 'bg-green-400'}`} />
                <span className={isOfflineState ? 'text-gray-500' : isFull ? 'text-red-400' : 'text-green-400'}>
                  {isOfflineState ? 'OFFLINE' : isFull ? 'FULL' : 'ONLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* Corner Indicators */}
          <div className={`
            absolute top-20 left-4 w-4 h-4 border-l-2 border-t-2 border-cyan-400
            transition-opacity duration-500
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `} />
          <div className={`
            absolute top-20 right-4 w-4 h-4 border-r-2 border-t-2 border-cyan-400
            transition-opacity duration-500
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `} />

          {/* Event Image */}
          <div className={`relative h-40 overflow-hidden bg-gray-800 transition-all duration-500 ${isOfflineState ? 'grayscale-[0.6] opacity-60' : ''}`}>
            {/* Offline Center Label */}
            {isOfflineState && (
              <div className="absolute inset-0 z-30 flex items-center justify-center">
                <div className="px-4 py-1.5 bg-black/60 border border-gray-500/50 rounded-sm backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <span className="text-gray-300 font-mono font-black text-2xl tracking-[0.25em] uppercase opacity-90">Offline</span>
                </div>
              </div>
            )}
            {image && image.trim() !== '' && image !== '/placeholder.jpg' ? (
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  console.error('❌ Image failed to load for event:', name)
                  console.error('Image URL:', image)
                  const target = e.target as HTMLImageElement

                  // If it's a Google Drive URL, try alternative formats
                  if (image.includes('drive.google.com') || image.includes('lh3.googleusercontent.com')) {
                    let fileId: string | null = null

                    // Try to extract file ID from various formats
                    const idMatch = image.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                      image.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                      image.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/) ||
                      image.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/)
                    if (idMatch) {
                      fileId = idMatch[1]
                    }

                    if (fileId) {
                      // Try Google CDN format first (best for embedding, no CORS)
                      const cdnUrl = `https://lh3.googleusercontent.com/d/${fileId}`
                      if (!target.src.includes('lh3.googleusercontent.com')) {
                        console.log('🔄 Trying Google CDN format:', cdnUrl)
                        target.src = cdnUrl
                        return
                      }

                      // If CDN failed, try thumbnail format
                      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920-h1080`
                      if (!target.src.includes('thumbnail')) {
                        console.log('🔄 Trying thumbnail format:', thumbnailUrl)
                        target.src = thumbnailUrl
                        return
                      }
                    }
                  }

                  // Try placeholder as final fallback
                  if (target.src !== '/placeholder.jpg' && !target.src.includes('placeholder')) {
                    console.log('🔄 Falling back to placeholder')
                    target.src = '/placeholder.jpg'
                  }
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully for event:', name)
                  console.log('Image URL:', image)
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <div className="text-cyan-400 text-xs font-mono mb-2">NO IMAGE</div>
                  <div className="text-gray-500 text-xs">
                    {image ? `URL: ${image.substring(0, 30)}...` : 'No image URL provided'}
                  </div>
                </div>
              </div>
            )}

            {/* Overlay gradients - only show if image exists */}
            {image && image.trim() !== '' && image !== '/placeholder.jpg' && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                <div className={`
                  absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10
                  transition-opacity duration-500 pointer-events-none
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `} />

                {/* HUD Grid - only on hover */}
                <div className={`
                  absolute inset-0 transition-opacity duration-500 pointer-events-none
                  ${isHovered ? 'opacity-40' : 'opacity-0'}
                `} style={{
                    backgroundImage: `
                    linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
                  `,
                    backgroundSize: '20px 20px'
                  }} />
              </>
            )}
          </div>

          {/* Event Type Badge */}
          <div className="absolute top-24 left-4">
            <div className={`
              px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full
              border border-cyan-400/50 text-xs font-mono text-cyan-400
              transition-all duration-500
              ${isHovered ? 'opacity-100 scale-105' : 'opacity-80 scale-100'}
            `}>
              {details.type.toUpperCase()}
            </div>
          </div>

          {/* Event Details - Always visible but with hover effect */}
          <div className={`
            absolute bottom-0 left-0 right-0 px-6 pb-6
            transform transition-all duration-500 ease-out
            ${isHovered
              ? 'translate-y-0 opacity-100'
              : 'translate-y-0 opacity-100'
            }
          `} style={{ pointerEvents: 'auto', zIndex: 999, position: 'relative' }}>
            <div className="bg-black/90 rounded-lg p-4 backdrop-blur-sm border border-cyan-400/30" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1000 }}>
              <div className={`space-y-2 text-sm font-mono transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-80'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">DATE</span>
                  <span className="text-cyan-400">{formatDate(details.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">LOCATION</span>
                  <span className="text-purple-400 text-right">{details.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">CAPACITY</span>
                  <span className="text-green-400">{details.capacity}</span>
                </div>
              </div>

              {/* Action Buttons - Always visible and clickable */}
              <div className="flex gap-2 mt-4" style={{ pointerEvents: 'auto' }}>
                {isRegistered ? (
                  <div className="flex gap-2 w-full mt-2">
                    <div className="flex-1 h-10 relative group/btn overflow-hidden">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-green-400 z-10" />
                      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-green-400 z-10" />

                      <div className="absolute inset-0 bg-green-950/20 border border-green-500/30 flex items-center justify-center gap-1.5 px-2 transition-all duration-300 group-hover/btn:bg-green-500/10"
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                        <span className="text-green-400 font-mono font-bold text-[10px] tracking-tighter truncate">Registered</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onBrief) onBrief()
                      }}
                      className="flex-1 h-10 relative group/view overflow-hidden focus:outline-none"
                    >
                      {/* Interactive Glow & Color Shift */}
                      <div className="absolute inset-0 bg-cyan-600/80 group-hover/view:bg-cyan-500 transition-all duration-300"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }} />

                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-2 transition-all duration-300 group-hover/view:scale-105 active:scale-95">
                        <svg className="w-3 h-3 text-cyan-100" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white font-mono font-bold text-[10px] tracking-tight group-hover/view:tracking-wider transition-all">Details</span>
                      </div>

                      <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-200/60 -translate-y-full group-hover/view:animate-button-scan" />
                    </button>
                  </div>
                ) : isFull ? (
                  <div className="w-full h-11 relative overflow-hidden flex items-center justify-center opacity-80">
                    <div className="absolute inset-0 bg-red-950/20 border border-red-500/40"
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }} />
                    <span className="relative text-red-500 font-mono font-black text-xs tracking-widest italic flex items-center gap-2">
                      <span className="w-1 h-3 bg-red-500 animate-pulse" /> SOLD OUT
                    </span>
                  </div>
                ) : !isOnline ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (onBrief) onBrief()
                    }}
                    className="w-full h-11 relative group/offline overflow-hidden focus:outline-none"
                  >
                    <div className="absolute inset-0 bg-zinc-800 border border-zinc-600 flex items-center justify-center gap-2 transition-all duration-300 group-hover/offline:brightness-125 active:scale-95"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                      <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-zinc-300 font-mono font-bold text-xs uppercase tracking-widest">OFFLINE</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (onBrief) onBrief()
                    }}
                    className="w-full h-12 relative group/active overflow-hidden focus:outline-none"
                  >
                    {/* Background Layer with Professional Symmetrical Cut */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 group-hover/active:from-cyan-500 group-hover/active:to-blue-500 transition-all duration-300"
                      style={{ clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)' }} />

                    {/* Inner Glow Border Effect */}
                    <div className="absolute inset-[1px] bg-black/20 group-hover/active:bg-black/10 transition-colors"
                      style={{ clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)' }} />

                    {/* Active HUD Glow */}
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-cyan-400 opacity-0 group-hover/active:opacity-100 blur-[2px] transition-all duration-300" />

                    <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 group-hover/active:scale-[1.02] active:scale-95">
                      <div className="relative flex items-center gap-3">
                        <svg className="w-5 h-5 text-cyan-100 group-hover/active:scale-110 group-hover/active:rotate-12 transition-all" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white font-mono font-black text-xs tracking-[0.15em] uppercase group-hover/active:tracking-[0.2em] transition-all">Details</span>
                      </div>
                    </div>

                    {/* Precision HUD markers */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-cyan-300/50" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-cyan-300/50" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Card Scan Line */}
          {isScanning && (
            <div
              className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{
                animation: 'scanLine 1.5s ease-in-out'
              }}
            />
          )}
        </div>

        <style jsx>{`
          @keyframes scanLine {
            0%, 100% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(384px); opacity: 0.5; }
          }
          @keyframes buttonScan {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(100%); opacity: 0; }
          }
          .animate-button-scan {
            animation: buttonScan 1s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  )
}

