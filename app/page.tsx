import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";
import { Button } from "@/components/Button";
import Image from "next/image";
import Link from "next/link";
import TestimonialsSection from "@/components/TestimonialsSection";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";

// Always read the latest published content from the DB — this route has no
// dynamic API usage, so without this it's a candidate for static caching
// that would keep serving stale content after a publish.
export const dynamic = "force-dynamic";

export default async function Home() {
  const pageResult = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, "/"),
        eq(pages.status, "published"),
        isNull(pages.deletedAt),
      ),
    )
    .limit(1);

  const page = pageResult[0];

  if (page && page.htmlCache && page.htmlCache.trim() !== "") {
    const safeHtml = sanitizeHtml(page.htmlCache);
    return (
      <main className="min-h-screen pb-24">
        {page.cssCache && <style>{safeCssForStyleTag(page.cssCache)}</style>}
        <div id="cms-page-content" className="w-full" suppressHydrationWarning>
          <CmsDynamicBlockPortal html={safeHtml} />
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-20">
      {/* Hero Section — full-width image with text overlay */}
      <section className="relative w-full min-h-screen overflow-hidden">
        {/* Background Image */}
        <Image
          src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_900,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg"
          alt="Sourav Mitra - Hero Artwork"
          fill
          unoptimized
          className="object-cover"
          priority
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Text overlay — centered on the image */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl md:text-8xl font-serif text-white mb-4 tracking-tight drop-shadow-lg">
            Sourav Mitra
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-10 drop-shadow-md">
            550+ covers in 8+ years, and still learning.
          </p>
          <Link href="/book-covers">
            <Button>Explore My Work</Button>
          </Link>
        </div>
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
