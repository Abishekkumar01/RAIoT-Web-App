import React from "react";
import styles from "./HoneycombGallery.module.css";
/* Using Next.js Image component might be tricky with the complex clip-path and grid layout relying on standard img behavior 
   or specific sizing. The user provided standard <img> tags. 
   We will use standard <img> for exact fidelity to the CSS provided, or Next.js Image with unoptimized field if needed.
   Let's stick to standard <img> for the precise CSS behavior unless performance is critical, 
   but we should point to local assets.
*/

const images = [
    "/hero section - What we do/1.jpg",
    "/hero section - What we do/2.jpg",
    "/hero section - What we do/3.jpg",
    "/hero section - What we do/4.jpg",
    "/hero section - What we do/5.jpg",
    "/hero section - What we do/6.jpg",
    "/hero section - What we do/7.png",
    "/hero section - What we do/8.jpg",
    "/hero section - What we do/9.jpg",
    "/hero section - What we do/10.jpg",
    "/hero section - What we do/11.png",
    "/hero section - What we do/12.jpeg",
    "/hero section - What we do/13.jpeg"
];

export default function HoneycombGallery() {
    const textOverlays: { [key: number]: string } = {
        0: "R",
        3: "A",
        6: "I",
        9: "O",
        12: "T"
    };

    return (
        <article className={styles.galleryWrapper}>
            {images.map((src, idx) => {
                const letter = textOverlays[idx];

                return (
                    <div key={idx} className={styles.galleryItem}>
                        {letter ? (
                            <div
                                className="w-full h-full flex items-center justify-center bg-gray-900/90 backdrop-blur-md relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-100" />
                                <span className="text-4xl md:text-5xl font-black font-orbitron text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10 select-none">
                                    {letter}
                                </span>
                                <div className="absolute inset-0 bg-cyan-400/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        ) : (
                            <img
                                src={src}
                                alt={`Gallery Item ${idx}`}
                                className={styles.galleryContent}
                            />
                        )}
                    </div>
                );
            })}
        </article>
    );
}
