import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { listProjects, slugify, type ProjectCategory } from "@/lib/projects";

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

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { title, category } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, message: "A valid category is required" },
        { status: 400 },
      );
    }
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 },
      );
    }

    const baseSlug = slugify(title);
    let slug = baseSlug;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [project] = await db
          .insert(projects)
          .values({
            slug,
            title: title.trim(),
            category,
            status: body.status === "draft" ? "draft" : "published",
            description: body.description?.trim() || null,
            medium: body.medium?.trim() || null,
            dimensions: body.dimensions?.trim() || null,
            publisher: body.publisher?.trim() || null,
            year: body.year?.toString() || null,
            coverImage: body.coverImage?.trim() || "",
            images: Array.isArray(body.images) ? body.images : [],
            details: body.details?.trim() || null,
            tags: Array.isArray(body.tags) ? body.tags : [],
            isFeatured: Boolean(body.isFeatured),
            sortOrder: body.sortOrder ?? 0,
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
