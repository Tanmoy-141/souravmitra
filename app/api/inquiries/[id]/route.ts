import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

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
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Missing inquiry ID" },
      { status: 400 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { isRead, isArchived } = body;
  const updateData: Partial<typeof inquiries.$inferInsert> = {};
  if (typeof isRead === "boolean") updateData.isRead = isRead;
  if (typeof isArchived === "boolean") updateData.isArchived = isArchived;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, message: "No valid fields to update" },
      { status: 400 },
    );
  }

  try {
    const [updated] = await db
      .update(inquiries)
      .set(updateData)
      .where(eq(inquiries.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Inquiry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (err) {
    console.error("[api/inquiries/[id]] failed to update inquiry:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update inquiry" },
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
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Missing inquiry ID" },
      { status: 400 },
    );
  }

  try {
    const [deleted] = await db
      .delete(inquiries)
      .where(eq(inquiries.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Inquiry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Inquiry deleted" });
  } catch (err) {
    console.error("[api/inquiries/[id]] failed to delete inquiry:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete inquiry" },
      { status: 500 },
    );
  }
}
