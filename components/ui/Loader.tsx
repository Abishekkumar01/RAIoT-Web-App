"use client";

import { useState, useEffect } from "react";

interface LoaderProps {
  onLoadingComplete?: () => void;
}

function Loader({ onLoadingComplete }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);

  const loadingSteps = [
    "INITIALIZING NEURAL CORE",
    "LOADING ROBOTIC SYSTEMS",
    "SYNCING IOT PROTOCOLS",
    "CALIBRATING SENSORS",
    "SYSTEM OPERATIONAL",
  ];

  useEffect(() => {
    // Add random glitch effects
    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 1500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Slower progress: 0.5-2.0% per tick for realism
        const newProgress = prev + (Math.random() * 1.5 + 0.5);

        if (newProgress >= 100) {
          clearInterval(progressInterval);
          clearInterval(glitchInterval);
          // Wait a moment at 100% then trigger exit
          setTimeout(() => {
            const loaderElement = document.getElementById('loader-container');
            if (loaderElement) {
              loaderElement.style.opacity = '0';
              loaderElement.style.transition = 'opacity 1s ease-in-out';
            }
            // Wait for fade out to finish before unmounting
            setTimeout(() => {
              onLoadingComplete?.();
            }, 1000);
          }, 500);
          return 100;
        }

        const stepIndex = Math.floor(
          (newProgress / 100) * (loadingSteps.length - 1)
        );
        setCurrentStep(stepIndex);

        return newProgress;
      });
    }, 50); // Keep tick rate at 50ms for smooth updates

    return () => {
      clearInterval(progressInterval);
      clearInterval(glitchInterval);
    };
  }, [onLoadingComplete]);

  return (
    <div id="loader-container" className="fixed inset-0 z-[100] bg-black text-white overflow-hidden transition-opacity duration-1000">
      {/* Digital Grid Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="tech-grid"></div>
      </div>

      {/* Glitch Noise Overlay */}
      {glitchActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="glitch-noise"></div>
        </div>
      )}

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanlines"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {/* Central Loading Ring */}
        <div className="relative mb-16">
          <div className="w-64 h-64 relative">
            {/* Background Ring */}
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 256 256"
            >
              {/* Background Ring */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                strokeDasharray="2 4"
                className="animate-pulse"
              />

              {/* Progress Ring with Blue Gradient */}
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="url(#blue-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 754} 754`}
                className={`transition-all duration-300 ${glitchActive ? "animate-glitch-ring" : ""
                  }`}
                style={{
                  filter: "drop-shadow(0 0 8px rgba(6,182,212,0.6))",
                  strokeDashoffset: 0,
                }}
              />

              {/* Glitch Segments */}
              {glitchActive && (
                <>
                  <circle
                    cx="128"
                    cy="128"
                    r="115"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="1"
                    strokeDasharray="3 6"
                    className="animate-spin-fast opacity-60"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="125"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                    className="animate-spin-reverse opacity-40"
                  />
                </>
              )}

              {/* Gradient Definitions - Changed to Blue */}
              <defs>
                <linearGradient
                  id="blue-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="25%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="75%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#0c4a6e" />
                </linearGradient>
              </defs>
            </svg>

            {/* Central Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* RAIoT Logo */}
              <div
                className={`text-center ${glitchActive ? "animate-glitch-text" : ""
                  }`}
              >
                <h1 className="text-4xl font-bold mb-2 tracking-wider text-white">
                  RAI<span className="text-cyan-400">o</span>T
                </h1>
              </div>

              {/* Progress Percentage */}
              <div className="mt-8 text-center">
                <div
                  className={`text-2xl font-mono text-cyan-400 ${glitchActive ? "animate-glitch-text" : ""
                    }`}
                >
                  {Math.round(progress)}%
                </div>
                <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-2 animate-pulse"></div>
              </div>
            </div>

            {/* Second Circular Progress Ring (Outer Ring) */}
            <svg
              className="absolute inset-0 w-full h-full transform -rotate-90"
              viewBox="0 0 256 256"
            >
              <circle
                cx="128"
                cy="128"
                r="135"
                fill="none"
                stroke="url(#outer-blue-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${((100 - progress) / 100) * 848} 848`}
                className="transition-all duration-300"
                style={{
                  filter: "drop-shadow(0 0 10px rgba(59,130,246,0.6))",
                  strokeDashoffset: 0,
                  opacity: 0.7
                }}
              />
              <defs>
                <linearGradient
                  id="outer-blue-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Status Display Above Circle */}
        <div className="w-full max-w-lg px-8 mb-8">
          {/* Thin Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-1 mb-4 border border-cyan-400/30">
            <div
              className="h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px rgba(6,182,212,0.6)"
              }}
            />
          </div>

          {/* ROBOTICS • AUTOMATION • IOT Text */}
          <div className="text-center mb-4">
            <div className="text-sm text-gray-400 font-mono tracking-widest">
              ROBOTICS • AUTOMATION • IOT
            </div>
          </div>

          {/* Current Status */}
          <div className="text-center">
            <div
              className={`text-sm font-mono text-cyan-300 tracking-wider ${glitchActive ? "animate-glitch-text" : ""
                }`}
            >
              {loadingSteps[currentStep]}
            </div>
            <div className="flex justify-center mt-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-cyan-400 mx-1 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Scanner */}
        <div className="absolute bottom-8 w-full">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
        </div>
      </div>

      <style jsx>{`
        .tech-grid {
          background: linear-gradient(
              rgba(6, 182, 212, 0.05) 1px,
              transparent 1px
            ),
            linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          width: 100%;
          height: 100%;
          animation: grid-flow 20s linear infinite;
        }

        .glitch-noise {
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.03) 2px,
            rgba(255, 255, 255, 0.03) 4px
          );
          animation: glitch-noise 0.15s infinite;
        }

        .scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(6, 182, 212, 0.02) 2px,
            rgba(6, 182, 212, 0.02) 4px
          );
          animation: scanlines 2s linear infinite;
        }

        @keyframes grid-flow {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        @keyframes glitch-noise {
          0%,
          100% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
        }

        @keyframes scanlines {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }

        @keyframes glitch-ring {
          0%,
          100% {
            transform: rotate(-90deg);
          }
          20% {
            transform: rotate(-88deg);
          }
          40% {
            transform: rotate(-92deg);
          }
          60% {
            transform: rotate(-89deg);
          }
          80% {
            transform: rotate(-91deg);
          }
        }

        @keyframes glitch-text {
          0%,
          100% {
            transform: translate(0);
          }
          20% {
            transform: translate(-1px, 1px);
            text-shadow: 2px 0 #06b6d4, -2px 0 #3b82f6;
          }
          40% {
            transform: translate(-1px, -1px);
            text-shadow: 2px 0 #06b6d4, -2px 0 #3b82f6;
          }
          60% {
            transform: translate(1px, 1px);
            text-shadow: 2px 0 #06b6d4, -2px 0 #3b82f6;
          }
          80% {
            transform: translate(1px, -1px);
            text-shadow: 2px 0 #06b6d4, -2px 0 #3b82f6;
          }
        }

        @keyframes spin-fast {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes scan {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .animate-spin-fast {
          animation: spin-fast 1s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 1.5s linear infinite;
        }

        .animate-glitch-ring {
          animation: glitch-ring 0.15s infinite;
        }

        .animate-glitch-text {
          animation: glitch-text 0.15s infinite;
        }

        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }

        .animate-fade-out {
          animation: fade-out 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function LoaderComponent({ onLoadingComplete }: LoaderProps) {
  return <Loader onLoadingComplete={onLoadingComplete} />;
}