import { notFound } from "next/navigation";
import ProjectDetailView from "@/components/ProjectDetailView";
import { getProjectById, getProjectBySlug } from "@/lib/projects";
import {
  extractAvailabilityTag,
  getProjectDetailExtras,
} from "@/lib/project-detail-data";

export const dynamic = "force-dynamic";

export default async function BookCoverDetail({
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
    project.category !== "book-covers" ||
    project.status !== "published"
  ) {
    notFound();
  }

  const extras = await getProjectDetailExtras(project.id, "book-covers");

  return (
    <ProjectDetailView
      id={project.id}
      title={project.title}
      type="book-cover"
      genreOrMedium={project.medium ?? "Book Cover"}
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
      backUrl="/book-covers"
      artistName={extras.artistName}
      artistAvatar={extras.artistAvatar}
      relatedProjects={extras.relatedProjects}
    />
  );
}
