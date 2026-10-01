"use client";

import { useEffect, useState, useRef } from "react";
import { testimonials } from "@/data/content";

type Testimonial = (typeof testimonials)[number];

interface TestimonialsSectionProps {
  items?: Testimonial[];
  heading?: string;
}

export function TestimonialsSection({
  items = testimonials,
  heading,
}: TestimonialsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const safeIndex = items.length > 0 ? activeIndex % items.length : 0;
  const activeTestimonial = items[safeIndex];

  useEffect(() => {
    if (isPaused || items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % items.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [isPaused, items.length]);

  if (!activeTestimonial) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex(
      (index) => (index + direction + items.length) % items.length,
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        move(1);
      } else {
        move(-1);
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <section
      suppressHydrationWarning
      aria-label="Publisher and client testimonials"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="border-y border-white/10 bg-[#0a0a0a] px-4 sm:px-6 py-14 sm:py-20 text-center text-white md:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a059]">
          Kind Words
        </p>
        <h2 className="mb-8 sm:mb-10 text-2xl sm:text-3xl font-serif md:text-4xl">
          {heading || "What Publishers & Clients Say"}
        </h2>

        <div
          className="relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous testimonial"
              className="absolute left-0 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/80 transition-all hover:border-[#c5a059] hover:bg-black hover:text-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059] cursor-pointer">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          <div
            key={safeIndex}
            role="group"
            aria-roledescription="slide"
            aria-label={`${safeIndex + 1} of ${items.length}`}
            className="testimonial-carousel-reveal mx-auto flex min-h-48 max-w-3xl flex-col items-center justify-center px-8 sm:px-12 md:min-h-56">
            <span
              aria-hidden="true"
              className="mb-2 sm:mb-3 text-4xl sm:text-5xl leading-none text-[#c5a059]">
              &ldquo;
            </span>
            <blockquote className="text-base sm:text-xl md:text-3xl italic leading-relaxed text-[#e5e5e5]">
              {activeTestimonial.quote}
            </blockquote>
            <p className="mt-5 sm:mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">
              {activeTestimonial.author}
            </p>
          </div>

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next testimonial"
              className="absolute right-0 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/80 transition-all hover:border-[#c5a059] hover:bg-black hover:text-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059] cursor-pointer">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>

        {items.length > 1 ? (
          <div
            role="tablist"
            aria-label="Testimonial navigation"
            className="mt-6 sm:mt-8 flex items-center justify-center gap-1.5 flex-wrap">
            {items.map((testimonial, index) => (
              <button
                key={`${testimonial.author}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === safeIndex}
                aria-label={`Go to slide ${index + 1}: ${testimonial.author}`}
                onClick={() => setActiveIndex(index)}
                className="p-2 -m-1 inline-flex items-center justify-center cursor-pointer">
                <span
                  className={`h-2 rounded-full transition-all block ${
                    index === safeIndex
                      ? "w-8 bg-[#c5a059]"
                      : "w-2 bg-white/40 hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default TestimonialsSection;
