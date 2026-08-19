import { notFound } from "next/navigation";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { Metadata } from "next";

interface DynamicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
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

  return (
    <main className="min-h-screen py-16 px-4 max-w-5xl mx-auto">
      {page.cssCache && (
        <style dangerouslySetInnerHTML={{ __html: page.cssCache }} />
      )}
      <header className="mb-8 border-b pb-4">
        <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
      </header>
      <article
        id="cms-page-content"
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: page.htmlCache || "" }}
      />
    </main>
  );
}
