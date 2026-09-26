import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { listMediaAssets, saveMediaAsset } from "@/lib/media";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
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
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const assets = await listMediaAssets();
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { success: false, message: "No file provided" },
      { status: 400 },
    );
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
        message:
          "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.",
      },
      { status: 400 },
    );
  }

  try {
    // Create a new File with a sanitized name
    const safeName = sanitizeFilename(file.name);
    const safeFile = new File([file], safeName, { type: file.type });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    const uniqueLocalName = `${base}-${Date.now()}${ext}`;

    let blobUrl: string;
    let pathname: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(safeFile.name, safeFile, {
          access: "public",
          addRandomSuffix: true,
        });
        blobUrl = blob.url;
        pathname = blob.pathname;
      } catch (blobErr) {
        console.warn(
          "[media] Vercel blob put failed, falling back to local storage:",
          blobErr,
        );
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, uniqueLocalName);
        await fs.writeFile(filePath, fileBuffer);
        blobUrl = `/uploads/${uniqueLocalName}`;
        pathname = `/uploads/${uniqueLocalName}`;
      }
    } else {
      // Local storage fallback when BLOB_READ_WRITE_TOKEN is not configured
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, uniqueLocalName);
        await fs.writeFile(filePath, fileBuffer);
        blobUrl = `/uploads/${uniqueLocalName}`;
        pathname = `/uploads/${uniqueLocalName}`;
      } catch (fsErr) {
        console.warn(
          "[media] filesystem write failed, using data URL fallback:",
          fsErr,
        );
        const base64 = fileBuffer.toString("base64");
        blobUrl = `data:${file.type};base64,${base64}`;
        pathname = safeName;
      }
    }

    // Save metadata to DB
    const [asset] = await saveMediaAsset({
      blobUrl,
      pathname,
      name: safeName,
      type: file.type,
      size: file.size,
      uploadedBy: userId,
    });

    return NextResponse.json({
      success: true,
      asset,
      data: [
        {
          src: blobUrl,
          name: safeName,
          type: file.type,
        },
      ],
    });
  } catch (err) {
    console.error("[media] upload failed:", err);
    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 },
    );
  }
}
