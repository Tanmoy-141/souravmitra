import { and, eq, isNull } from "drizzle-orm";
import ContactFormClient from "@/components/cms/ContactFormClient";
import PortfolioCollection from "@/components/PortfolioCollection";
import TestimonialsPortal from "@/components/cms/TestimonialsPortal";
import { db } from "@/db";
import { pages } from "@/db/schema";
import {
  renderDynamicSegments,
  splitDynamicBlocks,
} from "@/lib/dynamic-blocks";
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
        <div id="cms-page-content" className="w-full">
          {renderDynamicSegments(
            html,
            (block, key) =>
              block === "project-grid" ? (
                <PortfolioCollection key={key} category={slug} />
              ) : (
                <ContactFormClient key={key} />
              ),
            (segmentHtml, key) => (
              <TestimonialsPortal key={key} html={segmentHtml} />
            ),
            { ignoreBlocks: ["testimonials-carousel"] },
          )}
        </div>
      ) : null}
      {!hasProjectDisplay ? (
        <PortfolioCollection category={slug} showIntro={!html} />
      ) : null}
    </main>
  );
}
