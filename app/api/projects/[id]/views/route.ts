import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getProjectByIdOrSlug } from "@/lib/projects";
import {
  getOrCreateVisitorId,
  setVisitorCookie,
  hashClientIp,
  isAdminRequest,
} from "@/lib/visitor-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Deduplication window: 30 minutes per visitor/IP per project
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

function extractQueryRow<T>(res: unknown): T | undefined {
  if (!res) return undefined;
  if (Array.isArray(res)) return res[0] as T;
  const withRows = res as { rows?: T[] };
  if (Array.isArray(withRows.rows)) return withRows.rows[0];
  return undefined;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrSlug(id);

    // Only published projects can record views
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

    // Rate limiting: max 60 view recordings per minute per IP
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(`view:${clientIp}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }

    const { visitorId } = getOrCreateVisitorId(req);
    const ipHash = hashClientIp(clientIp);
    const cooldownDate = new Date(Date.now() - VIEW_COOLDOWN_MS);

    // Atomic CTE: conditionally inserts a new view row ONLY if no view exists within the cooldown window,
    // and increments the projects.views counter by the exact number of inserted rows (0 or 1).
    // Under simultaneous concurrent requests, the WHERE NOT EXISTS check is evaluated atomically by PostgreSQL.
    // Even if two requests arrive concurrently, the aggregate counter will ONLY increment if a row was actually inserted.
    const rawRes = await db.execute(sql`
      WITH new_view AS (
        INSERT INTO project_views (id, project_id, visitor_id, ip_hash, viewed_at)
        SELECT gen_random_uuid(), ${project.id}, ${visitorId}, ${ipHash}, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM project_views
          WHERE project_id = ${project.id}
            AND (visitor_id = ${visitorId} OR (ip_hash IS NOT NULL AND ip_hash = ${ipHash}))
            AND viewed_at > ${cooldownDate}
        )
        RETURNING id
      ),
      updated_project AS (
        UPDATE projects
        SET views = projects.views + (SELECT COUNT(*)::int FROM new_view)
        WHERE id = ${project.id}
        RETURNING views
      )
      SELECT 
        (SELECT COUNT(*)::int FROM new_view) AS did_record,
        (SELECT views FROM updated_project) AS views;
    `);

    const row = extractQueryRow<{ did_record: number | string; views: number | string }>(rawRes);
    const didRecord = Number(row?.did_record ?? 0) === 1;

    let finalViews = project.views;
    if (row?.views !== undefined && row?.views !== null) {
      finalViews = Number(row.views);
    } else {
      const [fresh] = await db.select({ views: projects.views }).from(projects).where(eq(projects.id, project.id));
      finalViews = fresh?.views ?? project.views;
    }

    const res = NextResponse.json({
      success: true,
      counted: didRecord,
      reason: didRecord ? undefined : "cooldown",
      views: finalViews,
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
