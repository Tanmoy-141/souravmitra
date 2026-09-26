import { and, eq, isNull } from "drizzle-orm";
import PortfolioCollection from "@/components/PortfolioCollection";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { splitDynamicBlocks } from "@/lib/dynamic-blocks";
import { safeCssForStyleTag, sanitizeHtml } from "@/lib/sanitize";

type PortfolioCategory = "book-covers" | "illustration" | "fine-art";

interface CmsPortfolioPageProps {
  slug: PortfolioCategory;
}

export default async function CmsPortfolioPage({
  slug,
}: CmsPortfolioPageProps) {
  const [page] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, slug),
        eq(pages.status, "published"),
        isNull(pages.deletedAt),
      ),
    )
    .limit(1);

  const html = page?.htmlCache?.trim() ? sanitizeHtml(page.htmlCache) : "";
  const hasProjectDisplay = splitDynamicBlocks(html).some(
    (segment) => segment.type === "block" && segment.block === "project-grid",
  );

  return (
    <main className="min-h-screen pb-24">
      {page?.cssCache ? (
        <style>{safeCssForStyleTag(page.cssCache)}</style>
      ) : null}
      {html ? (
        <div id="cms-page-content" className="w-full" suppressHydrationWarning>
          <CmsDynamicBlockPortal html={html} category={slug} />
        </div>
      ) : null}
      {!hasProjectDisplay ? (
        <PortfolioCollection category={slug} showIntro={!html} />
      ) : null}
    </main>
  );
}
