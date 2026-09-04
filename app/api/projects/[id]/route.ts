import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { getProjectById } from "@/lib/projects";

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
    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.medium !== undefined) updates.medium = body.medium?.trim() || null;
    if (body.dimensions !== undefined) updates.dimensions = body.dimensions?.trim() || null;
    if (body.publisher !== undefined) updates.publisher = body.publisher?.trim() || null;
    if (body.year !== undefined) updates.year = body.year?.toString() || null;
    if (body.coverImage !== undefined) updates.coverImage = body.coverImage?.trim() || "";
    if (body.images !== undefined && Array.isArray(body.images)) updates.images = body.images;
    if (body.details !== undefined) updates.details = body.details?.trim() || null;
    if (body.tags !== undefined && Array.isArray(body.tags)) updates.tags = body.tags;
    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
    if (body.status !== undefined && ["draft", "published"].includes(body.status)) {
      updates.status = body.status;
    }

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
