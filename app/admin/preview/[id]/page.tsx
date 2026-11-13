import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages, projects } from "@/db/schema";
import { getSessionPayload } from "@/lib/require-session";
import { sanitizeHtml, safeCssForStyleTag, sanitizeSlugInput } from "@/lib/sanitize";
import { splitDynamicBlocks } from "@/lib/dynamic-blocks";
import type { Block } from "@/data/cms";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";
import BlockRenderer from "@/components/cms/BlockRenderer";
import ContactFormClient from "@/components/cms/ContactFormClient";
import PortfolioCollection from "@/components/PortfolioCollection";
import DraftPreviewBanner from "@/components/cms/DraftPreviewBanner";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PORTFOLIO_CATEGORIES = new Set([
  "book-covers",
  "illustration",
  "fine-art",
]);

function getPreviewLivePath(slug: string): string {
  const sanitized = sanitizeSlugInput(slug);
  const clean = sanitized.replace(/^\/+|\/+$/g, "");
  if (!clean || clean === "/") return "/";
  if (
    ["about", "contact", "book-covers", "illustration", "fine-art"].includes(
      clean,
    )
  ) {
    return `/${clean}`;
  }
  if (
    clean.startsWith("book-covers/") ||
    clean.startsWith("illustration/") ||
    clean.startsWith("fine-art/")
  ) {
    return `/${clean}`;
  }
  return `/p/${clean}`;
}

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const session = await getSessionPayload();
  if (!session) {
    return {
      title: "Preview",
      robots: { index: false, follow: false },
    };
  }

  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return {
      title: "Preview Not Found",
      robots: { index: false, follow: false },
    };
  }

  const [page] = await db
    .select({ title: pages.title, seoTitle: pages.seoTitle })
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);

  return {
    title: page
      ? `Preview: ${page.seoTitle || page.title}`
      : "Preview Not Found",
    robots: { index: false, follow: false },
  };
}

export default async function AdminDraftPreviewPage({
  params,
}: PreviewPageProps) {
  const session = await getSessionPayload();
  if (!session) {
    redirect("/admin");
  }

  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);

  if (!page) {
    notFound();
  }

  const cleanSlug = page.slug.replace(/^\/+|\/+$/g, "");
  const livePath = getPreviewLivePath(page.slug);
  const safeHtml = sanitizeHtml(page.htmlCache || "");
  const blocks = (page.gjsData as { blocks?: Block[] } | null)?.blocks || [];

  const banner = (
    <DraftPreviewBanner
      pageId={page.id}
      title={page.title}
      livePath={livePath}
      initialStatus={page.status}
      isTrashed={page.deletedAt !== null}
    />
  );

  // 1. Contact page layout fidelity
  if (cleanSlug === "contact") {
    const hasInlineContactForm =
      safeHtml !== "" &&
      splitDynamicBlocks(safeHtml).some(
        (segment) =>
          segment.type === "block" && segment.block === "contact-form",
      );

    return (
      <>
        {banner}
        <div className="min-h-[75vh] flex flex-col justify-center items-center py-10 sm:py-14 md:py-18 px-4 sm:px-6">
          {page.cssCache ? (
            <style>{safeCssForStyleTag(page.cssCache)}</style>
          ) : null}
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
      </>
    );
  }

  // 2. Portfolio category archive page fidelity
  if (PORTFOLIO_CATEGORIES.has(cleanSlug)) {
    const category = cleanSlug as "book-covers" | "illustration" | "fine-art";
    const hasProjectDisplay = splitDynamicBlocks(safeHtml).some(
      (segment) => segment.type === "block" && segment.block === "project-grid",
    );

    return (
      <>
        {banner}
        <main className="min-h-screen pb-24">
          {page.cssCache ? (
            <style>{safeCssForStyleTag(page.cssCache)}</style>
          ) : null}
          {safeHtml ? (
            <div
              id="cms-page-content"
              className="w-full"
              suppressHydrationWarning>
              <CmsDynamicBlockPortal html={safeHtml} category={category} />
            </div>
          ) : null}
          {!hasProjectDisplay ? (
            <PortfolioCollection category={category} showIntro={!safeHtml} />
          ) : null}
        </main>
      </>
    );
  }

  // 3. Project inside page (<category>/<id-or-slug>)
  let matchedProjectId: string | undefined;
  const slugParts = cleanSlug.split("/");
  if (slugParts.length === 2 && PORTFOLIO_CATEGORIES.has(slugParts[0])) {
    const target = slugParts[1];
    const [proj] = UUID_REGEX.test(target)
      ? await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, target))
          .limit(1)
      : await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.slug, target))
          .limit(1);
    matchedProjectId = proj?.id;
  }

  // 4. Standard Home, About, Project Inside, or Custom /p/[slug] page
  const isCustomSlug =
    cleanSlug !== "" &&
    cleanSlug !== "about" &&
    !matchedProjectId &&
    !cleanSlug.startsWith("template/");

  return (
    <>
      {banner}
      <main className="min-h-screen pb-24">
        {page.cssCache ? (
          <style>{safeCssForStyleTag(page.cssCache)}</style>
        ) : null}

        {blocks.length > 0 && !safeHtml.trim() ? (
          <div className="flex flex-col">
            {blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        ) : isCustomSlug ? (
          <div className="max-w-5xl mx-auto py-16 px-4">
            <header className="mb-8 border-b pb-4">
              <h1 className="text-4xl font-bold tracking-tight">
                {page.title}
              </h1>
            </header>
            <div
              id="cms-page-content"
              suppressHydrationWarning
              className="prose dark:prose-invert max-w-none">
              <CmsDynamicBlockPortal html={safeHtml} />
            </div>
          </div>
        ) : (
          <div
            id="cms-page-content"
            className="w-full"
            suppressHydrationWarning>
            <CmsDynamicBlockPortal
              html={safeHtml}
              projectId={matchedProjectId}
            />
          </div>
        )}
      </main>
    </>
  );
}
