import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { getProjectById } from "@/lib/projects";
import { ProjectUpdateSchema } from "@/lib/schemas";
import { sanitizeHtml } from "@/lib/sanitize";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 },
    );
  }

  // Draft projects only visible to authenticated admin
  if (project.status !== "published" && !(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const existing = await getProjectById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 },
    );
  }

  try {
    const body = await req.json();
    const result = ProjectUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: "Invalid update input", errors: result.error.errors },
        { status: 400 },
      );
    }
    const data = result.data;

    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updates.title = sanitizeHtml(data.title);
    if (data.description !== undefined) updates.description = data.description ? sanitizeHtml(data.description) : null;
    if (data.medium !== undefined) updates.medium = data.medium || null;
    if (data.dimensions !== undefined) updates.dimensions = data.dimensions || null;
    if (data.publisher !== undefined) updates.publisher = data.publisher || null;
    if (data.year !== undefined) updates.year = data.year?.toString() || null;
    if (data.coverImage !== undefined) updates.coverImage = data.coverImage || "";
    if (data.images !== undefined) updates.images = data.images;
    if (data.details !== undefined) updates.details = data.details || null;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.isFeatured !== undefined) updates.isFeatured = Boolean(data.isFeatured);
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.status !== undefined) updates.status = data.status;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json({ success: true, project: updated });
  } catch (err) {
    console.error("[projects] update failed:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
