"use client";

import { FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import { useRef } from "react";

export default function WhatsAppButton() {
  const phoneNumber = "918690595763"; // Replace with your WhatsApp number (no +)
  const message = "Hello! I Need Help"; // Default message
  const constraintsRef = useRef(null);
  const isDragging = useRef(false);

  const handleClick = () => {
    if (isDragging.current) return;

    window.open(
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-50" ref={constraintsRef} />
      <motion.button
        drag
        dragConstraints={constraintsRef} // Keep within screen bounds
        dragMomentum={false} // Stops immediately on release
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={() => { setTimeout(() => { isDragging.current = false; }, 200); }}
        onClick={handleClick}
        initial={{ x: 0, y: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-[60] group flex items-center justify-center p-5
                 rounded-full bg-black/60 backdrop-blur-md border border-green-500/50
                 shadow-[0_0_30px_rgba(34,197,94,0.6)] 
                 hover:shadow-[0_0_50px_rgba(34,197,94,0.9)] hover:border-green-400
                 hover:bg-green-950/50
                 transition-colors duration-500 pointer-events-auto cursor-grab active:cursor-grabbing"
        aria-label="WhatsApp Help Desk"
      >
        {/* Tech Ring Animation */}
        <div className="absolute inset-0 rounded-full border border-green-500/30 w-full h-full scale-100 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500" />

        {/* Icon with Constant Neon Glow */}
        <FaWhatsapp size={40} className="text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,1)] transition-transform duration-300 group-hover:rotate-12" />
      </motion.button>
    </>
  );
}
