export type BlockType =
  | "hero"
  | "text-content"
  | "gallery"
  | "testimonials"
  | "cta";

export interface Block {
  id: string;
  type: BlockType;
  content: {
    title?: string;
    subtitle?: string;
    body?: string;
    images?: string[]; // array of MediaAsset URLs or IDs
    buttonText?: string;
    buttonLink?: string;
    align?: "left" | "center" | "right";
    background?: string;
  };
}

export interface CustomPage {
  id?: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  blocks: Block[];
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

// Gorgeous default assets to pre-populate the Media Library
export const defaultMediaAssets: MediaAsset[] = [
  {
    id: "m1",
    name: "Charcoal Portrait",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800",
    type: "image",
  },
  {
    id: "m2",
    name: "Oil Painting Landscape",
    url: "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?q=80&w=800",
    type: "image",
  },
  {
    id: "m3",
    name: "Book Cover Concept 1",
    url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800",
    type: "image",
  },
  {
    id: "m4",
    name: "Dark Woods Illustration",
    url: "https://images.unsplash.com/photo-1518818419601-72c8673f5852?q=80&w=800",
    type: "image",
  },
  {
    id: "m5",
    name: "Whimsical Starry Sky",
    url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800",
    type: "image",
  },
  {
    id: "m6",
    name: "Minimalist Abstract Line",
    url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=800",
    type: "image",
  },
];

// Empty by default, Sourav will create his own pages in the Admin dashboard
export const defaultCustomPages: CustomPage[] = [];
