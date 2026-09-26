import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, desc, isNull, isNotNull, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import type { Block } from "@/data/cms";
import { sanitizeHtml, sanitizeCss, sanitizeSlug } from "@/lib/sanitize";
import { CmsPageSchema, CmsBulkPageSchema } from "@/lib/schemas";

/**
 * Validates the cryptographic session token against tampering, forgery,
 * expiration, AND revocation (a password reset since the token was issued).
 */
async function isAuthorized(req?: NextRequest): Promise<boolean> {
  // 1. Check HTTP Cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;

  if (sessionCookie) {
    const result = await resolveSession(sessionCookie);
    if (result.valid) {
      return true;
    }
  }

  // 2. Check Authorization Header (Bearer token)
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const result = await resolveSession(token);
      if (result.valid) {
        return true;
      }
    }
  }

  return false;
}

function sanitizePageSlug(slug: string): string {
  return slug.trim() === "/" ? "/" : sanitizeSlug(slug);
}

// GET: Fetch all pages or a single page by ?slug= or ?id= or ?trash=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");
    const trash = searchParams.get("trash") === "true";
    const authorized = await isAuthorized(req);
    const filterConditions = [];
    if (!authorized) {
      filterConditions.push(
        eq(pages.status, "published"),
        isNull(pages.deletedAt),
      );
    } else {
      if (trash) {
        filterConditions.push(isNotNull(pages.deletedAt));
      } else {
        filterConditions.push(isNull(pages.deletedAt));
      }
    }

    let dbPages = [];

    if (slug) {
      dbPages = await db
        .select()
        .from(pages)
        .where(and(eq(pages.slug, slug), ...filterConditions))
        .limit(1);
    } else if (id) {
      dbPages = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, id), ...filterConditions))
        .limit(1);
    } else {
      dbPages = await db
        .select()
        .from(pages)
        .where(
          filterConditions.length > 0 ? and(...filterConditions) : undefined,
        )
        .orderBy(desc(pages.updatedAt))
        .limit(100);
    }

    // Map database records to CustomPage format (blocks inside gjsData)
    const resultPages = (dbPages || []).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      blocks: (p.gjsData as { blocks?: Block[] })?.blocks || [],
      gjsData: p.gjsData,
      htmlCache: p.htmlCache,
      cssCache: p.cssCache,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      publishedAt: p.publishedAt,
      deletedAt: p.deletedAt,
    }));

    if ((slug || id) && !resultPages.length) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(
      slug || id ? resultPages[0] : { pages: resultPages, data: resultPages },
    );
  } catch (err) {
    console.error("[CMS GET Error]:", err);
    return NextResponse.json(
      { error: "Failed to load pages", pages: [], data: [] },
      { status: 500 },
    );
  }
}

// POST: Create a new page or save custom pages
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid signed admin session required" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    // Handle bulk pages payload from Admin Dashboard (Upsert)
    if (body.pages && Array.isArray(body.pages)) {
      const result = CmsBulkPageSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid bulk pages input", details: result.error.issues },
          { status: 400 },
        );
      }

      const pagesToSave = result.data.pages.map((page) => ({
        ...page,
        ...(page.htmlCache !== undefined && {
          htmlCache: page.htmlCache ? sanitizeHtml(page.htmlCache) : "",
        }),
        ...(page.cssCache !== undefined && {
          cssCache: page.cssCache ? sanitizeCss(page.cssCache) : "",
        }),
      }));

      const results = [];
      for (const page of pagesToSave) {
        const cleanSlug = sanitizePageSlug(page.slug);

        const [upserted] = await db
          .insert(pages)
          .values({
            ...(page.id && { id: page.id }),
            slug: cleanSlug,
            title: page.title,
            status: page.status || "draft",
            gjsData: page.gjsData ?? { blocks: page.blocks || [] },
            ...(page.htmlCache !== undefined && { htmlCache: page.htmlCache }),
            ...(page.cssCache !== undefined && { cssCache: page.cssCache }),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [pages.id],
            set: {
              slug: cleanSlug,
              title: page.title,
              status: page.status || "draft",
              gjsData: page.gjsData ?? { blocks: page.blocks || [] },
              ...(page.htmlCache !== undefined && {
                htmlCache: page.htmlCache,
              }),
              ...(page.cssCache !== undefined && { cssCache: page.cssCache }),
              updatedAt: new Date(),
            },
          })
          .returning();
        results.push(upserted);
      }

      return NextResponse.json({
        success: true,
        message: "Pages published successfully",
        count: results.length,
      });
    }

    // Single page create
    const result = CmsPageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid page input", details: result.error.issues },
        { status: 400 },
      );
    }

    const {
      slug,
      title,
      seoTitle,
      seoDescription,
      gjsData,
      htmlCache,
      cssCache,
      status,
    } = result.data;

    const sanitizedHtml = htmlCache ? sanitizeHtml(htmlCache) : "";
    let sanitizedCss = "";
    try {
      sanitizedCss = cssCache ? sanitizeCss(cssCache) : "";
    } catch {
      return NextResponse.json({ error: "Invalid CSS" }, { status: 400 });
    }

    const newPage = await db
      .insert(pages)
      .values({
        slug: sanitizePageSlug(slug),
        title,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        gjsData: gjsData || null,
        htmlCache: sanitizedHtml,
        cssCache: sanitizedCss,
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
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid signed admin session required" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 },
      );
    }

    // Validate the update body (omitting ID for schema check)
    const result = CmsPageSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid update input", details: result.error.issues },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const {
      slug,
      title,
      seoTitle,
      seoDescription,
      gjsData,
      htmlCache,
      cssCache,
      status,
    } = result.data;

    let sanitizedHtml;
    if (htmlCache !== undefined) {
      sanitizedHtml = htmlCache ? sanitizeHtml(htmlCache) : "";
    }

    let sanitizedCss;
    if (cssCache !== undefined) {
      try {
        sanitizedCss = cssCache ? sanitizeCss(cssCache) : "";
      } catch {
        return NextResponse.json({ error: "Invalid CSS" }, { status: 400 });
      }
    }

    let newPublishedAt = existing.publishedAt;
    if (status === "published" && existing.status !== "published") {
      newPublishedAt = new Date();
    }

    const updated = await db
      .update(pages)
      .set({
        ...(slug && { slug: sanitizePageSlug(slug) }),
        ...(title && { title }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(gjsData !== undefined && { gjsData }),
        ...(sanitizedHtml !== undefined && { htmlCache: sanitizedHtml }),
        ...(sanitizedCss !== undefined && { cssCache: sanitizedCss }),
        ...(status !== undefined && { status }),
        publishedAt: newPublishedAt,
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

// PATCH: Explicit lifecycle actions (publish, unpublish, recover)
export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid signed admin session required" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Page ID and action are required" },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const updateValues: Partial<typeof pages.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (action === "publish") {
      updateValues.status = "published";
      if (!existing.publishedAt || existing.status !== "published") {
        updateValues.publishedAt = new Date();
      }
    } else if (action === "unpublish") {
      updateValues.status = "draft";
    } else if (action === "recover") {
      updateValues.deletedAt = null;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const [updated] = await db
      .update(pages)
      .set(updateValues)
      .where(eq(pages.id, id))
      .returning();

    return NextResponse.json({ success: true, page: updated });
  } catch (err) {
    console.error("[CMS PATCH Error]:", err);
    return NextResponse.json(
      { error: "Failed to execute lifecycle action" },
      { status: 500 },
    );
  }
}

// DELETE: Soft delete a page
export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid signed admin session required" },
      { status: 401 },
    );
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
