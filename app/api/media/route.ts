import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { listMediaAssets, saveMediaAsset, deleteMediaAsset } from "@/lib/media";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp",
  ".gif",
  ".ico",
  ".mp4",
  ".webm",
  ".woff2",
  ".woff",
  ".ttf",
  ".otf",
]);

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/svg+xml",
  "image/svg",
  "text/xml",
  "application/xml",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "video/mp4",
  "video/webm",
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-woff",
  "application/x-font-ttf",
  "application/x-font-truetype",
  "application/x-font-opentype",
]);

/** Normalizes the MIME type based on file extension and provided type */
function getNormalizedMimeType(filename: string, rawMime: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".woff2") return "font/woff2";
  if (ext === ".woff") return "font/woff";
  if (ext === ".ttf") return "font/ttf";
  if (ext === ".otf") return "font/otf";
  return rawMime || "application/octet-stream";
}

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

async function getAuthenticatedUserId(
  req?: NextRequest,
): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (sessionCookie) {
    const result = await resolveSession(sessionCookie);
    if (result.valid && result.payload) return result.payload.userId;
  }
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const result = await resolveSession(token);
      if (result.valid && result.payload) return result.payload.userId;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
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
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const formData = await req.formData();

  // Collect all file objects regardless of input name ('file', 'file[]', 'files', 'files[]', etc.)
  const files: File[] = [];
  for (const [, value] of formData.entries()) {
    if (
      typeof value === "object" &&
      value !== null &&
      "arrayBuffer" in value &&
      "name" in value &&
      (value as File).size > 0
    ) {
      files.push(value as File);
    }
  }

  if (files.length === 0) {
    return NextResponse.json(
      { success: false, message: "No file provided" },
      { status: 400 },
    );
  }

  const savedAssets: Array<{
    id: string;
    blobUrl: string;
    name: string;
    type: string;
    size: number;
  }> = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `File "${file.name}" must be under 10MB` },
        { status: 400 },
      );
    }

    const fileExt = path.extname(file.name).toLowerCase();
    const isExtensionAllowed = ALLOWED_EXTENSIONS.has(fileExt);
    const isMimeAllowed = Boolean(
      file.type && ALLOWED_TYPES.has(file.type.toLowerCase()),
    );

    if (!isExtensionAllowed && !isMimeAllowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Unsupported file type for "${file.name}". Supported formats: Images (JPG, PNG, SVG, WebP, GIF), Videos (MP4, WebM), and Fonts (WOFF2, WOFF, TTF, OTF).`,
        },
        { status: 400 },
      );
    }

    const normalizedMimeType = getNormalizedMimeType(file.name, file.type);

    try {
      // Create a new File with a sanitized name and normalized MIME type
      const safeName = sanitizeFilename(file.name);
      const safeFile = new File([file], safeName, { type: normalizedMimeType });

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
          blobUrl = `data:${normalizedMimeType};base64,${base64}`;
          pathname = safeName;
        }
      }

      // Save metadata to DB
      const [asset] = await saveMediaAsset({
        blobUrl,
        pathname,
        name: safeName,
        type: normalizedMimeType,
        size: file.size,
        uploadedBy: userId,
      });

      if (asset) {
        savedAssets.push(asset);
      }
    } catch (err) {
      console.error("[media] upload failed for file:", file.name, err);
      return NextResponse.json(
        { success: false, message: `Upload failed for ${file.name}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    asset: savedAssets[0],
    data: savedAssets.map((a) => ({
      src: a.blobUrl,
      name: a.name,
      type: a.type,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    let src = "";
    let id = "";

    try {
      const body = await req.json();
      src = body.src || "";
      id = body.id || "";
    } catch {
      const url = new URL(req.url);
      src = url.searchParams.get("src") || "";
      id = url.searchParams.get("id") || "";
    }

    if (!src && !id) {
      return NextResponse.json(
        { success: false, message: "Asset src or id required" },
        { status: 400 },
      );
    }

    // If local file, attempt to remove from disk
    if (src.startsWith("/uploads/")) {
      try {
        const localPath = path.join(process.cwd(), "public", src);
        await fs.unlink(localPath);
      } catch (err) {
        console.warn("[media] Local file delete notice:", err);
      }
    } else if (
      src.includes("public.blob.vercel-storage.com") &&
      process.env.BLOB_READ_WRITE_TOKEN
    ) {
      try {
        const { del } = await import("@vercel/blob");
        await del(src);
      } catch (err) {
        console.warn("[media] Vercel blob delete notice:", err);
      }
    }

    // Delete record from DB
    const deleted = await deleteMediaAsset(id || src);

    return NextResponse.json({
      success: true,
      message: "Asset deleted successfully",
      deleted,
    });
  } catch (err) {
    console.error("[media] Delete asset failed:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete asset" },
      { status: 500 },
    );
  }
}
