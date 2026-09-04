import { notFound } from "next/navigation";
import ProjectDetailView from "@/components/ProjectDetailView";
import { getProjectById } from "@/lib/projects";

export default async function FineArtDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project || project.category !== "fine-art" || project.status !== "published") {
    notFound();
  }

  return (
    <ProjectDetailView
      id={project.id}
      title={project.title}
      type="fine-art"
      genreOrMedium={project.medium ?? "Mixed Media"}
      year={Number(project.year ?? 2024)}
      description={project.description ?? ""}
      likes={project.likes}
      views={project.views}
      tags={(project.tags as string[]) ?? []}
      dimensions={project.dimensions ?? undefined}
      notes={project.details ?? undefined}
      backUrl="/fine-art"
    />
  );
}
