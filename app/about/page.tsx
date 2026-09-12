import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { sanitizeHtml } from "@/lib/sanitize";
import ClientsSection from "@/components/ClientsSection";

export default async function AboutPage() {
  const pageResult = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, "about"),
        eq(pages.status, "published"),
        isNull(pages.deletedAt),
      ),
    )
    .limit(1);

  const page = pageResult[0];

  if (!page) {
    notFound();
  }

  // Sanitization on Read (Defense-in-depth)
  const safeHtml = sanitizeHtml(page.htmlCache || "");

  return (
    <>
      {page.cssCache && <style>{page.cssCache}</style>}
      <article
        id="cms-page-content"
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <ClientsSection />
    </>
  );
}
