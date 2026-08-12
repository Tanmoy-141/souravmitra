import { projects } from '@/data/projects';
import { notFound } from 'next/navigation';
import ProjectDetailView from '@/components/ProjectDetailView';

export default async function IllustrationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ill = projects.find((p) => p.id === id);

  if (!ill) {
    notFound();
  }

  return (
    <ProjectDetailView
      id={ill.id}
      title={ill.title}
      type="illustration"
      genreOrMedium={ill.genre}
      year={ill.year}
      description={ill.description}
      likes={ill.likes}
      views={ill.views}
      tags={ill.tags}
      backUrl="/illustration"
    />
  );
}
