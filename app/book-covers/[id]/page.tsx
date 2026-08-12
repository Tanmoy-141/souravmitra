import { projects } from "@/data/projects";
import { notFound } from "next/navigation";
import ProjectDetailView from "@/components/ProjectDetailView";

export default async function BookCoverDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cover = projects.find((p) => p.id === id);

  if (!cover) {
    notFound();
  }

  return (
    <ProjectDetailView
      id={cover.id}
      title={cover.title}
      type="book-cover"
      genreOrMedium={cover.genre}
      year={cover.year}
      description={cover.description}
      likes={cover.likes}
      views={cover.views}
      tags={cover.tags}
      publisher={cover.publisher}
      backUrl="/book-covers"
    />
  );
}
