import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { isAuthorized } from "@/lib/require-session";
import { eq, desc, and, or, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // unread, read, archived, all
  const search = searchParams.get("search") || "";

  try {
    const conditions = [];

    if (filter === "unread") {
      conditions.push(eq(inquiries.isRead, false));
      conditions.push(eq(inquiries.isArchived, false));
    } else if (filter === "read") {
      conditions.push(eq(inquiries.isRead, true));
      conditions.push(eq(inquiries.isArchived, false));
    } else if (filter === "archived") {
      conditions.push(eq(inquiries.isArchived, true));
    } else {
      // "all" active (non-archived) or all including archived? Usually "all" shows active, or all. Let's show non-archived by default for "all", or allow filtering. Let's make "all" mean non-archived, or let user view archived via filter=archived.
      conditions.push(eq(inquiries.isArchived, false));
    }

    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(inquiries.name, searchTerm),
          ilike(inquiries.email, searchTerm),
          ilike(inquiries.company, searchTerm),
          ilike(inquiries.message, searchTerm),
        ),
      );
    }

    const results = await db
      .select()
      .from(inquiries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inquiries.createdAt));

    return NextResponse.json({ success: true, inquiries: results });
  } catch (err) {
    console.error("[api/inquiries] failed to fetch inquiries:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch inquiries" },
      { status: 500 },
    );
  }
}
