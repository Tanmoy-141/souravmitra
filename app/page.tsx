import { Button } from "@/components/Button";
import Link from "next/link";
import TestimonialsSection from "@/components/TestimonialsSection";

export default function Home() {
  return (
    <div className="flex flex-col gap-20">
      {/* Hero Section */}
      <section className="px-10 py-24 bg-[#111111] text-center">
        <div className="w-full h-96 bg-[#222222] mb-8 flex items-center justify-center text-[#555555]">
          [Hero Artwork Placeholder]
        </div>
        <h1 className="text-6xl font-serif text-[#FFFFFF] mb-4">
          Sourav Mitra
        </h1>
        <p className="text-2xl text-[#D4D4D4] mb-6">
          Illustrator • Book Cover Designer • Fine Artist
        </p>
        <Link href="/book-covers">
          <Button>Explore My Work</Button>
        </Link>
      </section>

      {/* Introductory Greeting */}
      <section className="px-10 text-center">
        <p className="text-2xl font-serif text-[#FFFFFF] max-w-3xl mx-auto leading-relaxed">
          Welcome to my portfolio. I am Sourav Mitra and I am dedicated to
          crafting bespoke visual narratives that bring stories and concepts to
          life with artistic precision and passion.
        </p>
      </section>

      {/* Portfolio Cards */}
      <section className="px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Book Cover Portfolio", href: "/book-covers" },
            { title: "Illustration Portfolio", href: "/illustration" },
            { title: "Fine Art", href: "/fine-art" },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group aspect-square bg-[#111111] p-8 flex flex-col justify-end transition-transform hover:scale-105 border border-[#333333]">
              <h2 className="text-2xl font-serif text-[#FFFFFF] group-hover:text-[#C5A059]">
                {item.title}
              </h2>
            </Link>
          ))}
        </div>
      </section>

      <TestimonialsSection />

      {/* Final CTA */}
      <section className="px-10 py-20 text-center">
        <h2 className="text-4xl font-serif mb-8 text-[#FFFFFF]">
          Let&apos;s Create Something Extraordinary Together
        </h2>
        <div className="flex gap-4 justify-center">
          <Link href="/contact" className="flex gap-4">
            <Button variant="primary">Start a Project</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
