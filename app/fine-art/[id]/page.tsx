import { artworks } from '@/data/projects';
import { notFound } from 'next/navigation';
import ProjectDetailView from '@/components/ProjectDetailView';

export default async function FineArtDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const art = artworks.find((a) => a.id === id);

  if (!art) {
    notFound();
  }

  return (
    <ProjectDetailView
      id={art.id}
      title={art.title}
      type="fine-art"
      genreOrMedium={art.medium}
      year={art.year}
      description={art.notes}
      likes={art.likes}
      views={art.views}
      tags={art.tags}
      dimensions={art.dimensions}
      availability={art.availability}
      notes={art.notes}
      backUrl="/fine-art"
    />
  );
}
