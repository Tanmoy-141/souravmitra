"use client";

import { useEffect, useState } from "react";
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
  const activeTestimonial = items[activeIndex];

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

  return (
    <section
      suppressHydrationWarning
      aria-label="Publisher and client testimonials"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="border-y border-white/10 bg-[#0a0a0a] px-6 py-20 text-center text-white md:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a059]">
          Kind Words
        </p>
        <h2 className="mb-10 text-3xl font-serif md:text-4xl">
          {heading || "What Publishers & Clients Say"}
        </h2>

        <div className="relative flex items-center justify-center">
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous testimonial"
              className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 transition-all hover:border-[#c5a059] hover:bg-black hover:text-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059]">
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
            key={activeIndex}
            role="group"
            aria-roledescription="slide"
            aria-label={`${activeIndex + 1} of ${items.length}`}
            className="testimonial-carousel-reveal mx-auto flex min-h-52 max-w-3xl flex-col items-center justify-center px-12 md:min-h-56">
            <span
              aria-hidden="true"
              className="mb-3 text-5xl leading-none text-[#c5a059]">
              &ldquo;
            </span>
            <blockquote className="text-xl italic leading-relaxed text-[#e5e5e5] md:text-3xl">
              {activeTestimonial.quote}
            </blockquote>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a059]">
              {activeTestimonial.author}
            </p>
          </div>

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next testimonial"
              className="absolute right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 transition-all hover:border-[#c5a059] hover:bg-black hover:text-[#c5a059] focus:outline-none focus:ring-1 focus:ring-[#c5a059]">
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
            className="mt-8 flex items-center justify-center gap-2">
            {items.map((testimonial, index) => (
              <button
                key={`${testimonial.author}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Go to slide ${index + 1}: ${testimonial.author}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all focus:outline-none cursor-pointer ${
                  index === activeIndex
                    ? "w-8 bg-[#c5a059]"
                    : "w-2 bg-white/40 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default TestimonialsSection;
