import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectLikes } from "@/db/schema";
import { getProjectByIdOrSlug } from "@/lib/projects";
import { getOrCreateVisitorId, setVisitorCookie } from "@/lib/visitor-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrSlug(id);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    const { visitorId } = getOrCreateVisitorId(req);

    const existingLike = await db
      .select({ id: projectLikes.id })
      .from(projectLikes)
      .where(
        and(
          eq(projectLikes.projectId, project.id),
          eq(projectLikes.visitorId, visitorId),
        ),
      )
      .limit(1);

    const isLiked = existingLike.length > 0;

    const res = NextResponse.json({
      success: true,
      liked: isLiked,
      likes: project.likes,
    });
    setVisitorCookie(res, visitorId);
    return res;
  } catch (error) {
    console.error("Failed to fetch project like status:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrSlug(id);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    // Rate limiting: max 30 like operations per minute per IP
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(`like:${clientIp}`, {
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }

    const { visitorId } = getOrCreateVisitorId(req);

    // Check if current visitor has already liked this project
    const existing = await db
      .select({ id: projectLikes.id })
      .from(projectLikes)
      .where(
        and(
          eq(projectLikes.projectId, project.id),
          eq(projectLikes.visitorId, visitorId),
        ),
      )
      .limit(1);

    let isLikedNow = false;
    let updatedLikes = project.likes;

    if (existing.length > 0) {
      // Unlike: Remove the like record and decrement aggregate counter
      await db
        .delete(projectLikes)
        .where(
          and(
            eq(projectLikes.projectId, project.id),
            eq(projectLikes.visitorId, visitorId),
          ),
        );

      const [updated] = await db
        .update(projects)
        .set({
          likes: sql`GREATEST(0, ${projects.likes} - 1)`,
        })
        .where(eq(projects.id, project.id))
        .returning({ likes: projects.likes });

      updatedLikes = updated?.likes ?? Math.max(0, project.likes - 1);
      isLikedNow = false;
    } else {
      // Like: Insert record and increment aggregate counter
      await db
        .insert(projectLikes)
        .values({
          projectId: project.id,
          visitorId,
        })
        .onConflictDoNothing();

      const [updated] = await db
        .update(projects)
        .set({
          likes: sql`${projects.likes} + 1`,
        })
        .where(eq(projects.id, project.id))
        .returning({ likes: projects.likes });

      updatedLikes = updated?.likes ?? project.likes + 1;
      isLikedNow = true;
    }

    const res = NextResponse.json({
      success: true,
      liked: isLikedNow,
      likes: updatedLikes,
    });
    setVisitorCookie(res, visitorId);
    return res;
  } catch (error) {
    console.error("Failed to toggle project like:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
