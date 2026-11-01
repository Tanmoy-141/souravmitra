import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";
import { Button } from "@/components/Button";
import Link from "next/link";
import TestimonialsSection from "@/components/TestimonialsSection";
import Counter from "@/components/Counter";
import ClientsSection from "@/components/ClientsSection";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";
import HeroSection from "@/components/HeroSection";

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
        or(eq(pages.slug, "/"), eq(pages.slug, "")),
        eq(pages.status, "published"),
        isNull(pages.deletedAt),
      ),
    )
    .orderBy(desc(pages.updatedAt))
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
    <div className="flex flex-col">
      {/* Hero Section — with Wix-style Reveal Curtain & Parallax Scroll Effect */}
      <HeroSection />

      {/* Subsequent Content — scrolls naturally */}
      <div className="relative z-10 bg-black flex flex-col gap-20 pt-16">
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

        {/* Animated Counters Section */}
        <section className="bg-[#111111] py-14 border-t border-b border-[#222222]">
          <div className="container mx-auto px-6 sm:px-10 max-w-6xl grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <Counter target={150} label="Projects Completed" />
            <Counter target={50} label="Happy Clients" />
            <Counter target={10} label="Years Experience" />
          </div>
        </section>

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

        {/* Client Logos Section (Animated & Customizable) — placed at the bottom, just above the footer */}
        <ClientsSection />
      </div>
    </div>
  );
}
