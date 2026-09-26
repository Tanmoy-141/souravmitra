import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";
import ContactFormClient from "@/components/cms/ContactFormClient";
import ProjectGridSection from "@/components/cms/ProjectGridSection";
import TestimonialsPortal from "@/components/cms/TestimonialsPortal";
import {
  renderDynamicSegments,
  splitDynamicBlocks,
} from "@/lib/dynamic-blocks";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const pageResult = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, "contact"),
        eq(pages.status, "published"),
        isNull(pages.deletedAt),
      ),
    )
    .limit(1);

  const page = pageResult[0];

  const safeHtml = page && page.htmlCache ? sanitizeHtml(page.htmlCache) : null;

  // If the friend has already dropped a "Contact Form" block somewhere in
  // the page while designing it, render it in place instead of forcing a
  // second copy at the bottom.
  const hasInlineContactForm =
    safeHtml !== null &&
    splitDynamicBlocks(safeHtml).some(
      (segment) => segment.type === "block" && segment.block === "contact-form",
    );

  return (
    <main className="min-h-screen pb-24">
      {page?.cssCache && <style>{safeCssForStyleTag(page.cssCache)}</style>}
      {safeHtml ? (
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div id="cms-page-content" className="w-full mb-12">
            {renderDynamicSegments(
              safeHtml,
              (block, key) =>
                block === "project-grid" ? (
                  <ProjectGridSection key={key} />
                ) : (
                  <ContactFormClient key={key} />
                ),
              (segmentHtml, key) => (
                <TestimonialsPortal key={key} html={segmentHtml} />
              ),
              { ignoreBlocks: ["testimonials-carousel"] },
            )}
          </div>
          {hasInlineContactForm ? null : <ContactFormClient />}
        </div>
      ) : (
        <ContactFormClient />
      )}
    </main>
  );
}
