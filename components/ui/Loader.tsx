"use client";

import { useState, useEffect } from "react";

interface LoaderProps {
  onLoadingComplete?: () => void;
}

export default function Loader({ onLoadingComplete }: LoaderProps) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    // Quick artificial delay to show the branding (1.2s total)
    const timer = setTimeout(() => {
      const loaderElement = document.getElementById('loader-container');
      if (loaderElement) {
        loaderElement.style.opacity = '0';
        loaderElement.style.transition = 'opacity 0.5s ease-out';
      }
      // Unmount after fade out
      setTimeout(() => {
        setMounted(false);
        onLoadingComplete?.();
      }, 500);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  if (!mounted) return null;

  return (
    <div
      id="loader-container"
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Subtle Background Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
               linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)
             `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Spinning Ring */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500 animate-spin" style={{ animationDuration: '1s' }}></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
          </div>
        </div>

        {/* Branding Text */}
        <h1 className="text-3xl font-bold font-orbitron tracking-[0.2em] text-white animate-pulse">
          RAI<span className="text-cyan-400">o</span>T
        </h1>

        {/* Loading Indicator */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="text-xs font-mono text-cyan-500/70 tracking-widest uppercase">
            Initializing...
          </div>
          <div className="w-32 h-0.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 animate-[loading-bar_1s_ease-in-out_forwards] w-full origin-left"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
            @keyframes loading-bar {
                0% { transform: scaleX(0); }
                100% { transform: scaleX(1); }
            }
        `}</style>
    </div>
  );
}
