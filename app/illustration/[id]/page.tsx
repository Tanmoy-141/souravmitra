import { notFound } from "next/navigation";
import ProjectDetailView from "@/components/ProjectDetailView";
import { getProjectById, getProjectBySlug } from "@/lib/projects";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { sanitizeHtml, safeCssForStyleTag } from "@/lib/sanitize";
import CmsDynamicBlockPortal from "@/components/cms/CmsDynamicBlockPortal";
import { renderProjectWithTemplate } from "@/lib/project-detail-template";

export const dynamic = "force-dynamic";

export default async function IllustrationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let project = await getProjectById(id);
  if (!project) {
    project = await getProjectBySlug(id);
  }

  if (
    !project ||
    project.category !== "illustration" ||
    project.status !== "published"
  ) {
    notFound();
  }

  // 1. Check for specific published project page in CMS
  const exactSlug = `illustration/${project.id}`;
  const slugByTitle = `illustration/${project.slug}`;

  const cmsPageResult = await db
    .select()
    .from(pages)
    .where(
      and(
        or(eq(pages.slug, exactSlug), eq(pages.slug, slugByTitle)),
        eq(pages.status, "published"),
        isNull(pages.deletedAt)
      )
    )
    .limit(1);

  const customPage = cmsPageResult[0];
  if (customPage?.htmlCache?.trim()) {
    const safeHtml = sanitizeHtml(customPage.htmlCache);
    return (
      <main className="min-h-screen pb-24">
        {customPage.cssCache && (
          <style>{safeCssForStyleTag(customPage.cssCache)}</style>
        )}
        <div id="cms-page-content" className="w-full" suppressHydrationWarning>
          <CmsDynamicBlockPortal html={safeHtml} projectId={project.id} />
        </div>
      </main>
    );
  }

  // 2. Check for category template in CMS
  const templateResult = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, "template/illustration"),
        eq(pages.status, "published"),
        isNull(pages.deletedAt)
      )
    )
    .limit(1);

  const templatePage = templateResult[0];
  if (templatePage?.htmlCache?.trim()) {
    const renderedHtml = renderProjectWithTemplate(
      templatePage.htmlCache,
      project
    );
    const safeHtml = sanitizeHtml(renderedHtml);
    return (
      <main className="min-h-screen pb-24">
        {templatePage.cssCache && (
          <style>{safeCssForStyleTag(templatePage.cssCache)}</style>
        )}
        <div id="cms-page-content" className="w-full" suppressHydrationWarning>
          <CmsDynamicBlockPortal html={safeHtml} projectId={project.id} />
        </div>
      </main>
    );
  }

  // 3. Fallback to default ProjectDetailView with artwork cover image support
  return (
    <ProjectDetailView
      id={project.id}
      title={project.title}
      type="illustration"
      genreOrMedium={project.medium ?? "Digital Painting"}
      year={Number(project.year ?? 2024)}
      coverImage={project.coverImage || undefined}
      description={project.description ?? ""}
      likes={project.likes}
      views={project.views}
      tags={(project.tags as string[]) ?? []}
      backUrl="/illustration"
    />
  );
}
