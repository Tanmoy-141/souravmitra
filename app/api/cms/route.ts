import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { cookies } from "next/headers";

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "authenticated";
}

// GET: Fetch all pages or a single page by ?slug= or ?id=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");

    if (slug) {
      const page = await db
        .select()
        .from(pages)
        .where(and(eq(pages.slug, slug), isNull(pages.deletedAt)))
        .limit(1);

      if (!page.length) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      return NextResponse.json(page[0]);
    }

    if (id) {
      const page = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
        .limit(1);

      if (!page.length) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      return NextResponse.json(page[0]);
    }

    const allPages = await db
      .select()
      .from(pages)
      .where(isNull(pages.deletedAt))
      .orderBy(desc(pages.updatedAt));

    return NextResponse.json(allPages);
  } catch {
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 },
    );
  }
}

// POST: Create a new page
export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      slug,
      title,
      seoTitle,
      seoDescription,
      gjsData,
      htmlCache,
      cssCache,
      status,
    } = body;

    if (!slug || !title) {
      return NextResponse.json(
        { error: "Slug and title are required" },
        { status: 400 },
      );
    }

    const newPage = await db
      .insert(pages)
      .values({
        slug: slug.trim().toLowerCase(),
        title,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        gjsData: gjsData || null,
        htmlCache: htmlCache || "",
        cssCache: cssCache || "",
        status: status || "draft",
        publishedAt: status === "published" ? new Date() : null,
      })
      .returning();

    return NextResponse.json(newPage[0], { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 },
    );
  }
}

// PUT: Update an existing page
export async function PUT(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      slug,
      title,
      seoTitle,
      seoDescription,
      gjsData,
      htmlCache,
      cssCache,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 },
      );
    }

    const updated = await db
      .update(pages)
      .set({
        ...(slug && { slug: slug.trim().toLowerCase() }),
        ...(title && { title }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(gjsData !== undefined && { gjsData }),
        ...(htmlCache !== undefined && { htmlCache }),
        ...(cssCache !== undefined && { cssCache }),
        ...(status && {
          status,
          publishedAt: status === "published" ? new Date() : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 },
    );
  }
}

// DELETE: Soft delete a page
export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 },
      );
    }

    const deleted = await db
      .update(pages)
      .set({ deletedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 },
    );
  }
}
