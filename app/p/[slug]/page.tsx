import { notFound } from "next/navigation";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import BlockRenderer from "@/components/cms/BlockRenderer";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";
import { Block } from "@/data/cms";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";

interface DynamicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "about") {
    return { title: "Page Not Found" };
  }
  const pageResult = await db
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

  const page = pageResult[0];
  if (!page) {
    return { title: "Page Not Found" };
  }

  return {
    title: page.seoTitle || `${page.title} | Sourav Portfolio`,
    description: page.seoDescription || undefined,
  };
}

export default async function DynamicCustomPage({ params }: DynamicPageProps) {
  const { slug } = await params;

  if (slug === "about") {
    notFound();
  }

  const pageResult = await db
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

  const page = pageResult[0];

  if (!page) {
    notFound();
  }

  // Extract blocks from gjsData
  const blocks = (page.gjsData as { blocks?: Block[] })?.blocks || [];

  // Sanitization on Read (Defense-in-depth)
  const safeHtml = sanitizeHtml(page.htmlCache || "");

  return (
    <main className="min-h-screen pb-24">
      {page.cssCache && <style>{safeCssForStyleTag(page.cssCache)}</style>}

      {/* If blocks exist, render them using the dynamic renderer */}
      {blocks.length > 0 ? (
        <div className="flex flex-col">
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto py-16 px-4">
          <header className="mb-8 border-b pb-4">
            <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
          </header>
          <div
            id="cms-page-content"
            suppressHydrationWarning
            className="prose dark:prose-invert max-w-none">
            <CmsDynamicBlockPortal html={safeHtml} />
          </div>
        </div>
      )}
    </main>
  );
}
