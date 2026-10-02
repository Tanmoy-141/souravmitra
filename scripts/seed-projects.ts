// One-time migration: copies the existing hardcoded placeholder projects
// into the real `projects` table. Uses the same seeded PRNG as data/projects.ts
// so migrated likes/views/titles are identical to what's currently live.
//
// Run with: npm run db:seed-projects
// Safe to re-run — skips any (category + title) pair that already exists.

import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";
import { slugify } from "../lib/projects";

const bookGenres = [
  "Literary Fiction",
  "Thriller",
  "Horror",
  "Fantasy",
  "Historical",
  "Romance",
  "Poetry",
  "Children's",
  "Non-fiction",
];
const illustrationGenres = [
  "Editorial",
  "Publishing",
  "Conceptual",
  "Children's",
  "Character Design",
  "Personal",
];

interface SeedRow {
  category: "book-covers" | "illustration" | "fine-art";
  title: string;
  medium?: string;
  dimensions?: string;
  publisher?: string;
  year: string;
  description: string;
  tags: string[];
  likes: number;
  views: number;
}

function buildRows(): SeedRow[] {
  const rows: SeedRow[] = [];

  for (const genre of bookGenres) {
    for (let i = 0; i < 10; i++) {
      rows.push({
        category: "book-covers",
        title: `${genre} Book ${i + 1}`,
        publisher: "Publisher Name",
        year: String(2024 + (i % 2)),
        description: `Description for ${genre} book cover #${i + 1}.`,
        likes: 0,
        views: 0,
        tags: ["Typography", "Layout", genre, "Cover Art"],
      });
    }
  }

  for (const genre of illustrationGenres) {
    for (let i = 0; i < 5; i++) {
      rows.push({
        category: "illustration",
        title: `${genre} Illustration ${i + 1}`,
        year: String(2024 + (i % 2)),
        description: `Description for ${genre} illustration #${i + 1}.`,
        likes: 0,
        views: 0,
        tags: ["Digital Art", genre, "Concept", "Illustration"],
      });
    }
  }

  for (let i = 0; i < 15; i++) {
    rows.push({
      category: "fine-art",
      title: `Fine Art Piece ${i + 1}`,
      medium: i % 2 === 0 ? "Oil on Canvas" : "Acrylic on Paper",
      dimensions: '24" x 36"',
      year: String(2024 + (i % 2)),
      description: `Artist notes for piece #${i + 1}.`,
      likes: 0,
      views: 0,
      tags: ["Traditional Art", "Gallery", "Texture"],
    });
  }

  return rows;
}

async function main() {
  const rows = buildRows();
  let inserted = 0;
  let skipped = 0;

  for (const [index, row] of rows.entries()) {
    const [existing] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.title, row.title), eq(projects.category, row.category)),
      )
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    let slug = slugify(row.title);
    const [slugTaken] = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    await db.insert(projects).values({
      slug,
      title: row.title,
      category: row.category,
      description: row.description,
      medium: row.medium ?? null,
      dimensions: row.dimensions ?? null,
      publisher: row.publisher ?? null,
      year: row.year,
      coverImage: "", // no real image yet — public pages fall back to procedural placeholder
      images: [],
      tags: row.tags,
      likes: row.likes,
      views: row.views,
      status: "published",
      sortOrder: index,
    });
    inserted++;
  }

  console.log(`Done: ${inserted} inserted, ${skipped} already existed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
