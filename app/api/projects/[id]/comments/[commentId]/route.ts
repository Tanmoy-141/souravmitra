import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projectComments } from "@/db/schema";
import { getProjectByIdOrSlug } from "@/lib/projects";
import { getOrCreateVisitorId, isAdminRequest } from "@/lib/visitor-session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id, commentId } = await params;
    const project = await getProjectByIdOrSlug(id);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    const [comment] = await db
      .select()
      .from(projectComments)
      .where(
        and(
          eq(projectComments.id, commentId),
          eq(projectComments.projectId, project.id),
        ),
      )
      .limit(1);

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment not found" },
        { status: 404 },
      );
    }

    const isAdmin = await isAdminRequest(req);
    const { visitorId } = getOrCreateVisitorId(req);

    // Only the authoring visitor or an authenticated admin can delete a comment
    if (!isAdmin && comment.visitorId !== visitorId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to delete this comment" },
        { status: 403 },
      );
    }

    await db.delete(projectComments).where(eq(projectComments.id, commentId));

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const isAdmin = await isAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin privileges required." },
        { status: 403 },
      );
    }

    const { id, commentId } = await params;
    const project = await getProjectByIdOrSlug(id);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { status } = body;

    const allowedStatuses = ["published", "pending", "hidden", "spam"] as const;
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status. Allowed: published, pending, hidden, spam",
        },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(projectComments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectComments.id, commentId),
          eq(projectComments.projectId, project.id),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Comment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Comment status updated to ${status}`,
      comment: updated,
    });
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
