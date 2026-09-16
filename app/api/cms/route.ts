import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
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

// GET: Fetch all pages or a single page by ?slug= or ?id=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");
    const authorized = await isAuthorized(req);
    const filterConditions = [isNull(pages.deletedAt)];
    if (!authorized) {
      filterConditions.push(eq(pages.status, "published"));
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
        .where(and(...filterConditions))
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
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
    }));

    if ((slug || id) && !resultPages.length) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(
      slug || id ? resultPages[0] : { pages: resultPages, data: resultPages },
    );
  } catch (err) {
    console.error("[CMS GET Error]:", err);
    return NextResponse.json({
      pages: [],
      data: [],
    });
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
          { error: "Invalid bulk pages input", details: result.error.errors },
          { status: 400 },
        );
      }

      const results = [];
      for (const page of result.data.pages) {
        const cleanSlug = sanitizeSlug(page.slug);

        const [upserted] = await db
          .insert(pages)
          .values({
            ...(page.id && { id: page.id }),
            slug: cleanSlug,
            title: page.title,
            status: page.status || "draft",
            gjsData: { blocks: page.blocks || [] },
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [pages.id],
            set: {
              slug: cleanSlug,
              title: page.title,
              status: page.status || "draft",
              gjsData: { blocks: page.blocks || [] },
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
        { error: "Invalid page input", details: result.error.errors },
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
    } catch (e) {
      return NextResponse.json({ error: "Invalid CSS" }, { status: 400 });
    }

    const newPage = await db
      .insert(pages)
      .values({
        slug: sanitizeSlug(slug),
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
            { error: "Invalid update input", details: result.error.errors },
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

    let sanitizedHtml;
    if (htmlCache !== undefined) {
      sanitizedHtml = htmlCache ? sanitizeHtml(htmlCache) : "";
    }

    let sanitizedCss;
    if (cssCache !== undefined) {
      try {
        sanitizedCss = cssCache ? sanitizeCss(cssCache) : "";
      } catch (e) {
        return NextResponse.json({ error: "Invalid CSS" }, { status: 400 });
      }
    }

    const updated = await db
      .update(pages)
      .set({
        ...(slug && { slug: sanitizeSlug(slug) }),
        ...(title && { title }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(gjsData !== undefined && { gjsData }),
        ...(sanitizedHtml !== undefined && { htmlCache: sanitizedHtml }),
        ...(sanitizedCss !== undefined && { cssCache: sanitizedCss }),
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
