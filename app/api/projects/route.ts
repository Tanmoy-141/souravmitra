import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { listProjects, slugify, type ProjectCategory } from "@/lib/projects";
import { sanitizeHtml } from "@/lib/sanitize";

const VALID_CATEGORIES: ProjectCategory[] = [
  "book-covers",
  "illustration",
  "fine-art",
];

async function isAuthorized(req?: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (sessionCookie) {
    const result = await resolveSession(sessionCookie);
    if (result.valid) return true;
  }
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const result = await resolveSession(authHeader.substring(7).trim());
      if (result.valid) return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam && VALID_CATEGORIES.includes(categoryParam as ProjectCategory)
      ? (categoryParam as ProjectCategory)
      : undefined;

  // Public callers only see published. ?all=true requires auth and returns
  // drafts too — used by the admin dashboard.
  const wantsAll = searchParams.get("all") === "true";
  let status: "published" | undefined = "published";
  if (wantsAll) {
    if (!(await isAuthorized(req))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    status = undefined;
  }

  const results = await listProjects({ category, status });
  return NextResponse.json({ projects: results });
}

import { ProjectCreateSchema } from "@/lib/schemas";

// ... (previous imports and isAuthorized)

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const result = ProjectCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: "Invalid project input", errors: result.error.errors },
        { status: 400 },
      );
    }
    const data = result.data;

    const title = sanitizeHtml(data.title);
    const description = data.description ? sanitizeHtml(data.description) : null;

    const baseSlug = slugify(data.title);
    let slug = baseSlug;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [project] = await db
          .insert(projects)
          .values({
            slug,
            title: title.trim(),
            category: data.category,
            status: data.status === "draft" ? "draft" : "published",
            description: description?.trim() || null,
            medium: data.medium?.trim() || null,
            dimensions: data.dimensions?.trim() || null,
            publisher: data.publisher?.trim() || null,
            year: data.year?.toString() || null,
            coverImage: data.coverImage?.trim() || "",
            images: data.images || [],
            details: data.details?.trim() || null,
            tags: data.tags || [],
            isFeatured: Boolean(data.isFeatured),
            sortOrder: data.sortOrder ?? 0,
          })
          .returning();

        return NextResponse.json({ success: true, project });
      } catch (err: unknown) {
        const pgError = err as { code?: string };
        if (pgError?.code === "23505") {
          // Unique slug collision — append random suffix and retry
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json(
      { success: false, message: "Could not generate a unique slug" },
      { status: 500 },
    );
  } catch (err) {
    console.error("[projects] create failed:", err);
    return NextResponse.json(
      { success: false, message: "Failed to create project" },
      { status: 500 },
    );
  }
}
