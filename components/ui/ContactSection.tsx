import React from 'react';
import styles from './ContactSection.module.css';
import { Instagram, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ContactSection() {
    const socialLinks = [
        {
            icon: Instagram,
            href: "https://www.instagram.com/theraiot.tech?igsh=MWJ6NGcyZ2Y2Z3FiYg==",
            label: "Instagram"
        },
        {
            icon: Linkedin,
            href: "https://www.linkedin.com/company/raiot-labs-amity-university-rajasthan/",
            label: "LinkedIn"
        },
        {
            icon: Mail,
            href: "mailto:theraiot.tech@gmail.com",
            label: "Email"
        }
    ];

    return (
        <section className="w-full bg-black py-20 overflow-hidden relative flex flex-col justify-between">
            {/* Marquee Section */}
            <div className={styles.container}>
                <div className={styles.marqueeWrapper}>
                    {/* Secondary Marquee (Counter-Motion) - Top Layer */}
                    <div className={`${styles.track} ${styles.trackTop}`}>
                        <ul className={styles.marqueeContent}>
                            <li>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#06b6d4' }}>RAIoT</span>
                                <span className={styles.textSecondary}> — WHERE THEORY </span>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#ef4444' }}>ENDS</span>
                                <span className={styles.textSecondary}> AND REAL ENGINEERING BEGINS.</span>
                            </li>
                            <li>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#06b6d4' }}>RAIoT</span>
                                <span className={styles.textSecondary}> — WHERE THEORY </span>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#ef4444' }}>ENDS</span>
                                <span className={styles.textSecondary}> AND REAL ENGINEERING BEGINS.</span>
                            </li>
                        </ul>
                        <ul className={styles.marqueeContent} aria-hidden="true">
                            <li>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#06b6d4' }}>RAIoT</span>
                                <span className={styles.textSecondary}> — WHERE THEORY </span>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#ef4444' }}>ENDS</span>
                                <span className={styles.textSecondary}> AND REAL ENGINEERING BEGINS.</span>
                            </li>
                            <li>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#06b6d4' }}>RAIoT</span>
                                <span className={styles.textSecondary}> — WHERE THEORY </span>
                                <span className={styles.textSecondary} style={{ backgroundImage: 'none', WebkitTextFillColor: '#ef4444' }}>ENDS</span>
                                <span className={styles.textSecondary}> AND REAL ENGINEERING BEGINS.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Primary Marquee - Bottom Layer */}
                    <div className={`${styles.track} ${styles.trackBottom}`}>
                        <ul className={styles.marqueeContentReverse}>
                            <li><span className={styles.text}>Get in touch</span></li>
                            <li><span className={styles.text}>Get in touch</span></li>
                            <li><span className={styles.text}>Get in touch</span></li>
                        </ul>
                        <ul className={styles.marqueeContentReverse} aria-hidden="true">
                            <li><span className={styles.text}>Get in touch</span></li>
                            <li><span className={styles.text}>Get in touch</span></li>
                            <li><span className={styles.text}>Get in touch</span></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Social Icons Section */}
            <div className="flex justify-end gap-8 px-10 pb-10 z-20 mt-4 sm:mt-0">
                {socialLinks.map((link, index) => (
                    <Link
                        key={index}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative w-32 h-32 md:w-48 md:h-48 xl:w-64 xl:h-64 rounded-[2.5rem] flex items-center justify-center transition-all duration-300 ${styles.proButton}`}
                    >
                        {/* Icon */}
                        <div className="relative z-10">
                            <link.icon className="w-16 h-16 md:w-20 md:h-20 xl:w-32 xl:h-32 text-white" />
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
