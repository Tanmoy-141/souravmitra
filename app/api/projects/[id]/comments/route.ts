import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { projectComments } from "@/db/schema";
import { getProjectByIdOrSlug } from "@/lib/projects";
import {
  getOrCreateVisitorId,
  setVisitorCookie,
  hashClientIp,
} from "@/lib/visitor-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ProjectCommentSchema } from "@/lib/schemas";
import { sanitizeHtml } from "@/lib/sanitize";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTimeAgo(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sanitizeCommentText(text: string): string {
  // Strip dangerous html and scripts, enforce plain text safety
  const purified = sanitizeHtml(text)
    .replace(/<[^>]*>?/gm, "") // Strip any remaining tags
    .trim();
  return purified;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrSlug(id);

    if (!project || project.status !== "published") {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    const comments = await db
      .select({
        id: projectComments.id,
        author: projectComments.author,
        content: projectComments.content,
        createdAt: projectComments.createdAt,
      })
      .from(projectComments)
      .where(
        and(
          eq(projectComments.projectId, project.id),
          eq(projectComments.status, "published"),
        ),
      )
      .orderBy(desc(projectComments.createdAt));

    const formatted = comments.map((c) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      initials: getInitials(c.author),
      createdAt: c.createdAt.toISOString(),
      timeAgo: formatTimeAgo(c.createdAt),
    }));

    return NextResponse.json({
      success: true,
      count: formatted.length,
      comments: formatted,
    });
  } catch (error) {
    console.error("Failed to load project comments:", error);
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

    if (!project || project.status !== "published") {
      return NextResponse.json(
        { success: false, message: "Project not found or not published" },
        { status: 404 },
      );
    }

    // Rate limiting: max 5 comments per 5 minutes per IP
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(`comment:${clientIp}`, {
      limit: 5,
      windowMs: 5 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Comment rate limit reached. Please wait a few minutes before posting again.",
        },
        { status: 429 },
      );
    }

    const rawBody = await req.json();
    const result = ProjectCommentSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { author, content, hp_website } = result.data;

    // Honeypot spam trap
    if (hp_website && hp_website.length > 0) {
      // Silently discard spam submission
      return NextResponse.json({
        success: true,
        message: "Comment submitted successfully.",
      });
    }

    const cleanAuthor = sanitizeCommentText(author);
    const cleanContent = sanitizeCommentText(content);

    if (!cleanAuthor || !cleanContent) {
      return NextResponse.json(
        { success: false, message: "Comment and author name cannot be empty." },
        { status: 400 },
      );
    }

    const { visitorId } = getOrCreateVisitorId(req);
    const ipHash = hashClientIp(clientIp);

    const [inserted] = await db
      .insert(projectComments)
      .values({
        projectId: project.id,
        visitorId,
        author: cleanAuthor,
        content: cleanContent,
        status: "published",
        ipHash,
      })
      .returning({
        id: projectComments.id,
        author: projectComments.author,
        content: projectComments.content,
        createdAt: projectComments.createdAt,
      });

    const responseComment = {
      id: inserted.id,
      author: inserted.author,
      content: inserted.content,
      initials: getInitials(inserted.author),
      createdAt: inserted.createdAt.toISOString(),
      timeAgo: formatTimeAgo(inserted.createdAt),
    };

    const res = NextResponse.json(
      {
        success: true,
        comment: responseComment,
      },
      { status: 201 },
    );
    setVisitorCookie(res, visitorId);
    return res;
  } catch (error) {
    console.error("Failed to post comment:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
