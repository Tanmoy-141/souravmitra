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
  const activeTestimonial = items[activeIndex];

  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % items.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!activeTestimonial) return null;

  return (
    <section
      aria-label="Publisher and client testimonials"
      aria-roledescription="carousel"
      className="border-y border-white/10 bg-[#0a0a0a] px-6 py-20 text-center text-white md:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-[#c5a059]">
          Kind Words
        </p>
        <h2 className="mb-10 text-3xl font-serif md:text-4xl">
          {heading || "What Publishers & Clients Say"}
        </h2>

        <div
          key={activeIndex}
          role="group"
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${items.length}`}
          className="testimonial-carousel-reveal mx-auto flex min-h-52 max-w-3xl flex-col items-center justify-center px-2 md:min-h-56">
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

        {items.length > 1 ? (
          <div
            aria-hidden="true"
            className="mt-8 flex items-center justify-center gap-2">
            {items.map((testimonial, index) => (
              <span
                key={testimonial.author}
                className={`h-1.5 rounded-full transition-[width,background-color] ${
                  index === activeIndex ? "w-8 bg-[#c5a059]" : "w-2 bg-white/40"
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
