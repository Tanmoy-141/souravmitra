import { notFound } from "next/navigation";
import ProjectDetailView from "@/components/ProjectDetailView";
import { getProjectById, getProjectBySlug } from "@/lib/projects";
import {
  extractAvailabilityTag,
  getProjectDetailExtras,
} from "@/lib/project-detail-data";

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

  const extras = await getProjectDetailExtras(project.id, "illustration");

  return (
    <ProjectDetailView
      id={project.id}
      title={project.title}
      type="illustration"
      genreOrMedium={project.medium ?? "Digital Painting"}
      year={Number(project.year ?? 2024)}
      coverImage={project.coverImage || undefined}
      images={(project.images as string[]) ?? []}
      description={project.description ?? ""}
      notes={project.details ?? undefined}
      likes={project.likes}
      views={project.views}
      tags={(project.tags as string[]) ?? []}
      publisher={project.publisher ?? undefined}
      dimensions={project.dimensions ?? undefined}
      availability={extractAvailabilityTag(project.tags)}
      backUrl="/illustration"
      artistName={extras.artistName}
      artistAvatar={extras.artistAvatar}
      relatedProjects={extras.relatedProjects}
    />
  );
}
