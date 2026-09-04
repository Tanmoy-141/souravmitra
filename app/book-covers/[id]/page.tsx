import { notFound } from "next/navigation";
import ProjectDetailView from "@/components/ProjectDetailView";
import { getProjectById } from "@/lib/projects";

export default async function BookCoverDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project || project.category !== "book-covers" || project.status !== "published") {
    notFound();
  }

  return (
    <ProjectDetailView
      id={project.id}
      title={project.title}
      type="book-cover"
      genreOrMedium={project.medium ?? "Book Cover"}
      year={Number(project.year ?? 2024)}
      description={project.description ?? ""}
      likes={project.likes}
      views={project.views}
      tags={(project.tags as string[]) ?? []}
      publisher={project.publisher ?? undefined}
      backUrl="/book-covers"
    />
  );
}
