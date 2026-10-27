import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";
import ContactFormClient from "@/components/cms/ContactFormClient";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";
import { splitDynamicBlocks } from "@/lib/dynamic-blocks";
import { DEFAULT_CONTACT_PAGE_HTML } from "@/lib/contact-template";

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

  let page = pageResult[0];

  // If no contact page exists at all in the database, seed the initial default template
  if (!page) {
    try {
      const [inserted] = await db
        .insert(pages)
        .values({
          slug: "contact",
          title: "Contact",
          status: "published",
          htmlCache: DEFAULT_CONTACT_PAGE_HTML,
        })
        .returning();
      if (inserted) page = inserted;
    } catch (e) {
      console.error("Failed to insert contact page:", e);
    }
  }

  const safeHtml = page && page.htmlCache ? sanitizeHtml(page.htmlCache) : null;

  // If the page already includes a "Contact Form" block in its CMS design,
  // render it in place instead of appending a second copy.
  const hasInlineContactForm =
    safeHtml !== null &&
    splitDynamicBlocks(safeHtml).some(
      (segment) => segment.type === "block" && segment.block === "contact-form",
    );

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center py-10 sm:py-14 md:py-18 px-4 sm:px-6">
      {page?.cssCache && <style>{safeCssForStyleTag(page.cssCache)}</style>}
      {safeHtml ? (
        <div className="w-full max-w-5xl mx-auto">
          <div
            id="cms-page-content"
            className="w-full"
            suppressHydrationWarning>
            <CmsDynamicBlockPortal html={safeHtml} />
          </div>
          {hasInlineContactForm ? null : <ContactFormClient />}
        </div>
      ) : (
        <div className="w-full max-w-5xl mx-auto">
          <ContactFormClient />
        </div>
      )}
    </div>
  );
}
