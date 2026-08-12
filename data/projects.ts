export interface Project {
  id: string;
  title: string;
  type: 'book-cover' | 'illustration';
  genre: string;
  publisher?: string;
  year: number;
  description: string;
  image_url: string;
  likes: number;
  views: number;
  tags: string[];
}

export interface Artwork {
  id: string;
  title: string;
  medium: string;
  dimensions: string;
  year: number;
  notes: string;
  availability: 'Available' | 'Sold' | 'Private Collection';
  image_url: string;
  likes: number;
  views: number;
  tags: string[];
}

// Deterministic, seeded pseudo-random number in [0, 1). This module is
// imported by client components (e.g. app/book-covers/page.tsx), so it's
// evaluated once during SSR and again during client hydration — plain
// Math.random() would produce different like/view counts each time and
// trigger a hydration mismatch. Seeding on the id string keeps the output
// stable across both passes while still varying per item.
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  // mulberry32-style mix for a better distribution than the raw hash.
  let t = (hash += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function seededRange(seed: string, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min)) + min;
}

const genres = [
  'Literary Fiction', 'Thriller', 'Horror', 'Fantasy', 'Historical', 'Romance', 'Poetry', 'Children\'s', 'Non-fiction'
];

export const illustrationGenres = [
  'Editorial', 'Publishing', 'Conceptual', 'Children\'s', 'Character Design', 'Personal'
];

export const PROJECTS_PER_GENRE = 10;
export const ILLUSTRATIONS_PER_GENRE = 5;

export const projects: Project[] = [
  ...genres.flatMap((genre, gIndex) =>
    Array.from({ length: PROJECTS_PER_GENRE }, (_, i) => {
      const id = `bc-${gIndex}-${i}`;
      return {
        id,
        title: `${genre} Book ${i + 1}`,
        type: 'book-cover' as const,
        genre: genre,
        publisher: 'Publisher Name',
        year: 2024 + (i % 2),
        description: `Description for ${genre} book cover #${i + 1}.`,
        image_url: 'placeholder',
        likes: seededRange(`${id}-likes`, 50, 550),
        views: seededRange(`${id}-views`, 500, 2500),
        tags: ['Typography', 'Layout', genre, 'Cover Art'],
      };
    })
  ),
  ...illustrationGenres.flatMap((genre, gIndex) =>
    Array.from({ length: ILLUSTRATIONS_PER_GENRE }, (_, i) => {
      const id = `ill-${gIndex}-${i}`;
      return {
        id,
        title: `${genre} Illustration ${i + 1}`,
        type: 'illustration' as const,
        genre: genre,
        year: 2024 + (i % 2),
        description: `Description for ${genre} illustration #${i + 1}.`,
        image_url: 'placeholder',
        likes: seededRange(`${id}-likes`, 30, 430),
        views: seededRange(`${id}-views`, 300, 1800),
        tags: ['Digital Art', genre, 'Concept', 'Illustration'],
      };
    })
  ),
];

export const ARTWORKS_COUNT = 15;

export const artworks: Artwork[] = Array.from({ length: ARTWORKS_COUNT }, (_, i) => ({
  id: `art-${i}`,
  title: `Fine Art Piece ${i + 1}`,
  medium: i % 2 === 0 ? 'Oil on Canvas' : 'Acrylic on Paper',
  dimensions: '24" x 36"',
  year: 2024 + (i % 2),
  notes: `Artist notes for piece #${i + 1}.`,
  availability: i % 3 === 0 ? 'Sold' : 'Available',
  image_url: 'placeholder',
  likes: seededRange(`art-${i}-likes`, 20, 320),
  views: seededRange(`art-${i}-views`, 200, 1200),
  tags: ['Traditional Art', 'Gallery', 'Texture'],
}));
