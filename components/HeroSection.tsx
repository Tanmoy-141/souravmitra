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
      className="hero-reveal-container relative w-full h-90 sm:h-105 md:h-120 min-h-85 md:min-h-115 max-h-95 sm:max-h-110 md:max-h-130 overflow-hidden flex items-center justify-center text-center px-4 py-8 md:py-10"
      style={{ clipPath: "inset(0)", WebkitClipPath: "inset(0)" }}>
      {/* Fixed background layer pinned to viewport, revealed through this section window */}
      <div
        className="hero-fixed-bg fixed inset-0 w-screen h-screen pointer-events-none z-0"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
        }}>
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          unoptimized
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/45 z-1" />
      </div>

      {/* Foreground Content: scrolls naturally with the page */}
      <div className="hero-content relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
        <h1
          style={{
            fontFamily: "'stingray', 'Stingray', cursive, serif",
          }}
          className="text-4xl sm:text-6xl md:text-8xl lg:text-[100px] whitespace-nowrap text-white mb-4 sm:mb-6 font-normal leading-[1.1] tracking-normal drop-shadow-md">
          {title}
        </h1>
        {tagline ? (
          <p className="text-sm sm:text-lg md:text-2xl text-gray-200 mb-4 sm:mb-6 max-w-xl mx-auto drop-shadow-md px-2 leading-relaxed font-light">
            {tagline}
          </p>
        ) : null}
        <Link
          href={buttonHref}
          className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-black hover:bg-gray-200 transition-all font-medium text-xs sm:text-sm rounded-xs shadow-lg cursor-pointer">
          <span>{buttonText}</span>
          <svg
            viewBox="0 0 200 200"
            width="12"
            height="12"
            className="fill-current rotate-180"
            aria-hidden="true">
            <path d="M172.5 142a7.485 7.485 0 0 1-5.185-2.073L100 75.808l-67.315 64.12c-2.998 2.846-7.74 2.744-10.606-.234a7.454 7.454 0 0 1 .235-10.565l72.5-69.057a7.524 7.524 0 0 1 10.371 0l72.5 69.057a7.455 7.455 0 0 1 .235 10.565A7.503 7.503 0 0 1 172.5 142z" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
