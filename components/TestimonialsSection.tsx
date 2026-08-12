'use client';
import { useState, useEffect } from 'react';
import { testimonials } from '@/data/content';

export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="px-10 py-20 bg-[#0A0A0A] text-center">
      <h2 className="text-3xl font-serif mb-12 text-[#FFFFFF]">Testimonials</h2>
      <div className="relative h-40 max-w-2xl mx-auto">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-xl italic text-[#D4D4D4] mb-4">&ldquo;{t.quote}&rdquo;</p>
            <p className="text-[#C5A059] font-medium">— {t.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
