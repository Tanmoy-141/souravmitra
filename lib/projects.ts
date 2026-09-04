import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { projects, type Project } from "@/db/schema";

export type ProjectCategory = "book-covers" | "illustration" | "fine-art";

interface ListProjectsOptions {
  category?: ProjectCategory;
  status?: "draft" | "published";
}

export async function listProjects({
  category,
  status,
}: ListProjectsOptions = {}): Promise<Project[]> {
  const conditions = [];
  if (category) conditions.push(eq(projects.category, category));
  if (status) conditions.push(eq(projects.status, status));

  return db
    .select()
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      desc(projects.isFeatured),
      asc(projects.sortOrder),
      desc(projects.createdAt),
    );
}

export async function getProjectById(id: string): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ?? null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return project ?? null;
}

// Readable slug from a title — lowercase, non-alphanumerics to hyphens.
// Uniqueness is enforced by the DB unique index; callers should append a
// short random suffix on a collision (Postgres error code 23505) rather
// than looping guesses here.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
