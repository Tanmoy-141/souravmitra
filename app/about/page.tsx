import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";

export const dynamic = "force-dynamic";

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
    <main className="min-h-screen pb-24">
      {page.cssCache && <style>{safeCssForStyleTag(page.cssCache)}</style>}
      <div id="cms-page-content" className="w-full" suppressHydrationWarning>
        <CmsDynamicBlockPortal html={safeHtml} />
      </div>
    </main>
  );
}
