import { defaultCustomPages } from "@/data/cms";
import BlockRenderer from "@/components/cms/BlockRenderer";
import { notFound } from "next/navigation";

export default async function CustomDynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // In a real serverless app, this would fetch from the API/KV
  // For the prototype, we use the default data or a mock fetch
  const page = defaultCustomPages.find((p) => p.slug === slug);

  if (!page || page.status !== "published") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black">
      {page.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
