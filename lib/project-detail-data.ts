import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { projects, type Project } from "@/db/schema";
import { getHeaderData } from "@/lib/navigation-server";
import type { ProjectCategory } from "@/lib/projects";

export interface RelatedProjectCard {
  id: string;
  title: string;
  category: ProjectCategory;
  coverImage: string;
  medium: string;
  year: string;
  likes: number;
  views: number;
  href: string;
}

export interface ProjectDetailExtras {
  artistName: string;
  artistAvatar: string;
  relatedProjects: RelatedProjectCard[];
}

export function extractAvailabilityTag(tags: unknown): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  return (tags as string[]).find((t) => {
    if (typeof t !== "string") return false;
    const lower = t.trim().toLowerCase();
    return (
      lower === "available" ||
      lower === "sold" ||
      lower === "private collection"
    );
  });
}

function toRelatedCard(p: Project): RelatedProjectCard {
  const image =
    p.coverImage?.trim() ||
    (Array.isArray(p.images) && p.images[0] ? p.images[0] : "");
  return {
    id: p.id,
    title: p.title,
    category: p.category as ProjectCategory,
    coverImage: image,
    medium: p.medium ?? "",
    year: p.year ?? "2024",
    likes: p.likes ?? 0,
    views: p.views ?? 0,
    href: `/${p.category}/${p.id}`,
  };
}

/**
 * Loads artist header info and up to 4 related published projects
 * (same category first, falling back to other categories) for the
 * Behance-style "More from Sourav Mitra" strip.
 */
export async function getProjectDetailExtras(
  currentProjectId: string,
  category: ProjectCategory,
): Promise<ProjectDetailExtras> {
  const [headerData, sameCategoryRows] = await Promise.all([
    getHeaderData().catch(() => ({
      siteName: "Sourav Mitra",
      logoUrl: "",
      navItems: [],
      isCustomNav: false,
      siteFont: "Stingray",
      siteColor: "#FFFFFF",
    })),
    db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.category, category),
          eq(projects.status, "published"),
          ne(projects.id, currentProjectId),
        ),
      )
      .orderBy(desc(projects.isFeatured), desc(projects.likes), desc(projects.createdAt))
      .limit(4)
      .catch(() => [] as Project[]),
  ]);

  let related = sameCategoryRows;

  if (related.length < 4) {
    const needed = 4 - related.length;
    const otherRows = await db
      .select()
      .from(projects)
      .where(
        and(
          ne(projects.category, category),
          eq(projects.status, "published"),
          ne(projects.id, currentProjectId),
        ),
      )
      .orderBy(desc(projects.isFeatured), desc(projects.likes), desc(projects.createdAt))
      .limit(needed)
      .catch(() => [] as Project[]);

    related = [...related, ...otherRows];
  }

  return {
    artistName: headerData.siteName || "Sourav Mitra",
    artistAvatar: headerData.logoUrl || "",
    relatedProjects: related.slice(0, 4).map(toRelatedCard),
  };
}
