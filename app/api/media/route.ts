import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { resolveSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { listMediaAssets, saveMediaAsset } from "@/lib/media";

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (!sessionCookie) return false;
  const result = await resolveSession(sessionCookie);
  return result.valid;
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const assets = await listMediaAssets();
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
  }

  try {
    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    });

    // Save metadata to DB
    const [asset] = await saveMediaAsset({
      blobUrl: blob.url,
      pathname: blob.pathname,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    return NextResponse.json({ success: true, asset });
  } catch (err) {
    console.error("[media] upload failed:", err);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}
