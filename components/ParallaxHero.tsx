"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/ui/LightRay";
import Drone3D from "@/components/Drone3D";

export default function ParallaxHero() {
  const ref = useRef(null);

  // Mouse interaction state
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Calculate normalized mouse position (-1 to 1)
    if (typeof window !== "undefined") {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    }
  };

  // Scroll Parallax State
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // --- TRANSFORMS ---

  // Sky: Fixed (almost), moves very slowly on scroll. No mouse effect.
  const skyY = useTransform(smoothScroll, [0, 1], ["0%", "10%"]);

  // Back Mountains: Moves slow on scroll, slight mouse opposite movement
  const mountY = useTransform(smoothScroll, [0, 1], ["0%", "20%"]);
  const mountXMouse = useTransform(mouseX, [-1, 1], ["2%", "-2%"]);
  const mountYMouse = useTransform(mouseY, [-1, 1], ["2%", "-2%"]);

  // Midground: Moves medium speed using scroll, more mouse movement
  const midY = useTransform(smoothScroll, [0, 1], ["0%", "50%"]);
  const midXMouse = useTransform(mouseX, [-1, 1], ["4%", "-4%"]);
  const midYMouse = useTransform(mouseY, [-1, 1], ["4%", "-4%"]);

  // Foreground: Moves fast on scroll, covers content. Lots of mouse movement.
  const frontY = useTransform(smoothScroll, [0, 1], ["0%", "80%"]);
  const frontXMouse = useTransform(mouseX, [-1, 1], ["6%", "-6%"]);
  const frontYMouse = useTransform(mouseY, [-1, 1], ["6%", "-6%"]);

  // Text: Fades out and moves up quickly
  const textY = useTransform(smoothScroll, [0, 0.6], ["0%", "100%"]);
  const textOpacity = useTransform(smoothScroll, [0, 0.4], [1, 0]);

  return (
    <div
      ref={ref}
      className="relative h-[200vh] overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* --- LIGHT RAYS (INTEGRATED) --- */}
      {/* Placing it behind mountains for depth, or in front for atmosphere? 
             User said "dont remove light ray effect". Usually rays cut through everything.
             Let's put it broadly in the scene. */}
      <div className="absolute inset-0 z-1 pointer-events-none h-screen mix-blend-screen">
        <LightRays
          raysOrigin="top-center"
          raysColor="#06b6d4" // Cyan to match sci-fi
          raysSpeed={1.5}
          lightSpread={0.6}
          rayLength={2.0}
          followMouse={true}
          mouseInfluence={0.2} // Reacts to mouse like the parallax layers
          noiseAmount={0.05}
          distortion={0.1}
          pulsating={true}
          fadeDistance={0.5}
          saturation={1.2}
          className="opacity-60"
        />
      </div>

      {/* --- DRONE 3D ELEMENT --- */}
      <Drone3D />

      {/* --- MAIN TEXT CONTENT (Sandwiched between Mid and Foreground) --- */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="fixed top-0 left-0 right-0 z-30 flex flex-col items-center justify-center h-screen pointer-events-none" // Fixed so it stays while layers scroll past, until fade out
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center pointer-events-auto" // Re-enable clicks
        >
          <h1 className="text-5xl md:text-8xl font-black text-white mb-6 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)] tracking-tight">
            RAIoT CLUB
          </h1>
          <p className="text-xl md:text-2xl text-cyan-200 font-light tracking-wide mb-10 max-w-2xl mx-auto drop-shadow-lg">
            Pioneering the Future of Automation & Robotics
          </p>
          <div className="flex gap-6 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg bg-cyan-600 hover:bg-cyan-500 hover:scale-105 transition-all shadow-[0_0_20px_rgba(8,145,178,0.5)]"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* --- LAYER 4: FOREGROUND (Very close, dark) --- */}
      <motion.div
        style={{ y: frontY, x: frontXMouse, translateY: frontYMouse }}
        className="absolute -bottom-20 inset-x-0 z-40 h-[60vh] w-[110%] -left-[5%]"
      >
        <Image
          src="/layer_4_foreground.png"
          alt="Foreground"
          fill
          className="object-cover object-top" // Use object-top to anchor the top edge of the rocks
        />
        {/* Gradient to blend into the content below */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black" />
      </motion.div>
    </div>
  );
}
