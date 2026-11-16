"use client";

import Image from "next/image";
import Link from "next/link";

interface HeroSectionProps {
  title?: string;
  tagline?: string;
  buttonText?: string;
  buttonHref?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export default function HeroSection({
  title = "Sourav Mitra",
  tagline,
  buttonText = "Explore My Work",
  buttonHref = "/book-covers",
  imageUrl = "https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg",
  imageAlt = "Sourav Mitra - Hero Artwork",
}: HeroSectionProps) {
  return (
    <section
      data-hero-section="true"
      className="hero-reveal-container relative w-full min-h-[85vh] min-h-[85dvh] overflow-hidden flex items-center justify-center text-center px-4 py-8">
      {/* Background artwork covering hero section with proper aspect ratio */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          unoptimized
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Foreground Content: scrolls naturally with the page */}
      <div className="hero-content relative z-2 flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
        <h1
          style={{
            fontFamily: "'stingray', 'Playfair Display', cursive, serif",
          }}
          className="text-5xl sm:text-7xl md:text-8xl text-white mb-6 sm:mb-8 font-normal drop-shadow-xl leading-tight">
          {title}
        </h1>
        {tagline ? (
          <p className="text-base sm:text-xl md:text-2xl text-gray-200 mb-6 sm:mb-8 max-w-xl mx-auto drop-shadow-md px-2 leading-relaxed font-light">
            {tagline}
          </p>
        ) : null}
        <Link href={buttonHref}>
          <button className="px-6 sm:px-8 py-3 text-xs sm:text-sm tracking-wider uppercase bg-white text-black hover:bg-gray-200 font-medium transition-colors cursor-pointer shadow-lg flex items-center gap-2">
            <span>{buttonText}</span>
          </button>
        </Link>
      </div>
    </section>
  );
}
