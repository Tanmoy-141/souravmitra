import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectLikes } from "@/db/schema";
import { getProjectByIdOrSlug } from "@/lib/projects";
import { getOrCreateVisitorId, setVisitorCookie } from "@/lib/visitor-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function extractQueryRow<T>(res: unknown): T | undefined {
  if (!res) return undefined;
  if (Array.isArray(res)) return res[0] as T;
  const withRows = res as { rows?: T[] };
  if (Array.isArray(withRows.rows)) return withRows.rows[0];
  return undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrSlug(id);

    // Only published projects are public
    if (!project || project.status !== "published") {
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

    // Only published projects can be liked
    if (!project || project.status !== "published") {
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

    // Optional action body: "like" | "unlike" | "toggle" (defaults to "toggle")
    let desiredAction: "like" | "unlike" | "toggle" = "toggle";
    try {
      const body = await req.json();
      if (body?.action === "like" || body?.action === "unlike" || body?.action === "toggle") {
        desiredAction = body.action;
      }
    } catch {
      // Empty or non-JSON body defaults to toggle
    }

    // Check current state for this visitor
    const [existing] = await db
      .select({ id: projectLikes.id })
      .from(projectLikes)
      .where(
        and(
          eq(projectLikes.projectId, project.id),
          eq(projectLikes.visitorId, visitorId),
        ),
      )
      .limit(1);

    const isCurrentlyLiked = Boolean(existing);
    const shouldUnlike =
      desiredAction === "unlike" ||
      (desiredAction === "toggle" && isCurrentlyLiked);

    let isLikedNow = false;
    let finalLikes = project.likes;

    if (shouldUnlike) {
      // Atomic CTE: deletes the row only if it exists, and decrements counter by the exact number of deleted rows (0 or 1).
      // Under concurrency, if another request already deleted the row, 0 rows are deleted and counter is decremented by 0.
      const rawRes = await db.execute(sql`
        WITH deleted AS (
          DELETE FROM project_likes
          WHERE project_id = ${project.id} AND visitor_id = ${visitorId}
          RETURNING id
        ),
        updated_project AS (
          UPDATE projects
          SET likes = GREATEST(0, projects.likes - (SELECT COUNT(*)::int FROM deleted))
          WHERE id = ${project.id}
          RETURNING likes
        )
        SELECT 
          (SELECT COUNT(*)::int FROM deleted) AS did_delete,
          (SELECT likes FROM updated_project) AS likes;
      `);

      const row = extractQueryRow<{ did_delete: number | string; likes: number | string }>(rawRes);
      isLikedNow = false;
      if (row?.likes !== undefined && row?.likes !== null) {
        finalLikes = Number(row.likes);
      } else {
        const [fresh] = await db.select({ likes: projects.likes }).from(projects).where(eq(projects.id, project.id));
        finalLikes = fresh?.likes ?? 0;
      }
    } else {
      // Atomic CTE: inserts the row only if it doesn't already exist (ON CONFLICT DO NOTHING),
      // and increments counter by the exact number of inserted rows (0 or 1).
      // Under concurrency, if another request already inserted the row, 0 rows are inserted and counter is incremented by 0.
      const rawRes = await db.execute(sql`
        WITH inserted AS (
          INSERT INTO project_likes (id, project_id, visitor_id, created_at)
          VALUES (gen_random_uuid(), ${project.id}, ${visitorId}, NOW())
          ON CONFLICT (project_id, visitor_id) DO NOTHING
          RETURNING id
        ),
        updated_project AS (
          UPDATE projects
          SET likes = projects.likes + (SELECT COUNT(*)::int FROM inserted)
          WHERE id = ${project.id}
          RETURNING likes
        )
        SELECT 
          (SELECT COUNT(*)::int FROM inserted) AS did_insert,
          (SELECT likes FROM updated_project) AS likes;
      `);

      const row = extractQueryRow<{ did_insert: number | string; likes: number | string }>(rawRes);
      isLikedNow = true;
      if (row?.likes !== undefined && row?.likes !== null) {
        finalLikes = Number(row.likes);
      } else {
        const [fresh] = await db.select({ likes: projects.likes }).from(projects).where(eq(projects.id, project.id));
        finalLikes = fresh?.likes ?? project.likes;
      }
    }

    const res = NextResponse.json({
      success: true,
      liked: isLikedNow,
      likes: finalLikes,
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
