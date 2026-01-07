"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  const phoneNumber = "918690595763"; // Replace with your WhatsApp number (no +)
  const message = "Hello! I Need Help"; // Default message

  const handleClick = () => {
    window.open(
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-8 right-8 group z-50 flex items-center justify-center p-5
                 rounded-full bg-black/60 backdrop-blur-md border border-green-500/50
                 shadow-[0_0_30px_rgba(34,197,94,0.6)] 
                 hover:shadow-[0_0_50px_rgba(34,197,94,0.9)] hover:border-green-400
                 hover:bg-green-950/50 hover:scale-110
                 transition-all duration-500"
      aria-label="WhatsApp Help Desk"
    >
      {/* Tech Ring Animation */}
      <div className="absolute inset-0 rounded-full border border-green-500/30 w-full h-full scale-100 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500" />

      {/* Icon with Constant Neon Glow */}
      <FaWhatsapp size={40} className="text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,1)] transition-transform duration-300 group-hover:rotate-12" />
    </button>
  );
}
