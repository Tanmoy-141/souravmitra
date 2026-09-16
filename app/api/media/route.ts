import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { listMediaAssets, saveMediaAsset } from "@/lib/media";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

/** Sanitize filename: strip path separators, limit length, add random prefix */
function sanitizeFilename(name: string): string {
  // Remove path traversal characters and non-ASCII
  const clean = name
    .replace(/[/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 100);
  // Prefix with random string to avoid collisions and predictable names
  const prefix = crypto.randomUUID().slice(0, 8);
  return `${prefix}_${clean || "upload"}`;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (!sessionCookie) return null;
  const result = await resolveSession(sessionCookie);
  return result.valid && result.payload ? result.payload.userId : null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const assets = await listMediaAssets();
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, message: "File must be under 10MB" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.",
      },
      { status: 400 },
    );
  }

  try {
    // Create a new File with a sanitized name
    const safeName = sanitizeFilename(file.name);
    const safeFile = new File([file], safeName, { type: file.type });
    
    // random suffix avoids collisions between two uploads sharing a filename
    const blob = await put(safeFile.name, safeFile, {
      access: "public",
      addRandomSuffix: true,
    });

    // Save metadata to DB
    const [asset] = await saveMediaAsset({
      blobUrl: blob.url,
      pathname: blob.pathname,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedBy: userId,
    });

    return NextResponse.json({ success: true, asset });
  } catch (err) {
    console.error("[media] upload failed:", err);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
