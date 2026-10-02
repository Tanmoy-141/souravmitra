import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectViews } from "@/db/schema";
import { getProjectByIdOrSlug } from "@/lib/projects";
import {
  getOrCreateVisitorId,
  setVisitorCookie,
  hashClientIp,
  isAdminRequest,
} from "@/lib/visitor-session";
import { getClientIp } from "@/lib/rate-limit";

// Deduplication window: 30 minutes per visitor/IP per project
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrSlug(id);

    if (!project || project.status !== "published") {
      return NextResponse.json(
        { success: false, message: "Project not found or not published" },
        { status: 404 },
      );
    }

    // Do not count admin or editor visits toward public visitor metrics
    if (await isAdminRequest(req)) {
      return NextResponse.json({
        success: true,
        counted: false,
        reason: "admin",
        views: project.views,
      });
    }

    const { visitorId } = getOrCreateVisitorId(req);
    const ip = getClientIp(req);
    const ipHash = hashClientIp(ip);

    const cooldownDate = new Date(Date.now() - VIEW_COOLDOWN_MS);

    // Check if the visitor or IP recently viewed this project
    const recentViews = await db
      .select({ id: projectViews.id })
      .from(projectViews)
      .where(
        and(
          eq(projectViews.projectId, project.id),
          or(
            eq(projectViews.visitorId, visitorId),
            eq(projectViews.ipHash, ipHash),
          ),
          gt(projectViews.viewedAt, cooldownDate),
        ),
      )
      .limit(1);

    if (recentViews.length > 0) {
      const res = NextResponse.json({
        success: true,
        counted: false,
        reason: "cooldown",
        views: project.views,
      });
      setVisitorCookie(res, visitorId);
      return res;
    }

    // Record the verified visitor view event
    await db.insert(projectViews).values({
      projectId: project.id,
      visitorId,
      ipHash,
    });

    // Atomically increment the aggregate counter to prevent race conditions
    const [updated] = await db
      .update(projects)
      .set({ views: sql`${projects.views} + 1` })
      .where(eq(projects.id, project.id))
      .returning({ views: projects.views });

    const currentViews = updated?.views ?? project.views + 1;

    const res = NextResponse.json({
      success: true,
      counted: true,
      views: currentViews,
    });
    setVisitorCookie(res, visitorId);
    return res;
  } catch (error) {
    console.error("Failed to record project view:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
