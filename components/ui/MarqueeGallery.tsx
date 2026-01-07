"use client";

import styles from "./MarqueeGallery.module.css";
import Image from "next/image";

interface MarqueeGalleryProps {
    images: string[];
}

export default function MarqueeGallery({ images }: MarqueeGalleryProps) {
    // Duplicate images for seamless loop
    const displayImages = [...images, ...images];

    return (
        <div className={styles.marqueeContainer}>
            <div className={styles.track}>
                {displayImages.map((src, index) => (
                    <div key={`${src}-${index}`} className={styles.imageCard}>
                        <div className={styles.overlay} />
                        <Image
                            src={src}
                            alt={`Gallery Image ${index}`}
                            width={400}
                            height={250}
                            className={styles.image}
                            loading={index < 5 ? "eager" : "lazy"}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
