import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAuthorized } from "@/lib/require-session";
import { isSafeUrl } from "@/lib/sanitize";
import {
  CustomFont,
  sanitizeFontFamily,
  buildGoogleFontUrl,
} from "@/lib/fonts";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

interface ThemeData {
  faviconUrl?: string;
  customFonts?: CustomFont[];
}

function sanitizeFilename(name: string): string {
  const clean = name
    .replace(/[/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 100);
  const prefix = crypto.randomUUID().slice(0, 8);
  return `${prefix}_${clean || "font"}`;
}

/**
 * GET /api/cms/fonts
 * Returns the list of all installed custom fonts.
 */
export async function GET() {
  try {
    const themeSetting = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "theme"))
      .limit(1);

    const themeData = (themeSetting[0]?.gjsData as ThemeData) || {};
    const fonts: CustomFont[] = Array.isArray(themeData.customFonts)
      ? themeData.customFonts
      : [];

    return NextResponse.json({ fonts });
  } catch (err) {
    console.error("[cms/fonts] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch custom fonts" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cms/fonts
 * Installs a new custom font (Google Font, Web Font URL, or uploaded font file).
 * Supports both multipart/form-data (direct file upload) and application/json.
 */
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid admin session required" },
      { status: 401 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let family = "";
    let type: CustomFont["type"] = "upload";
    let url = "";
    let format: CustomFont["format"];
    let category: CustomFont["category"] = "sans-serif";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const rawFamily = (formData.get("family") as string) || "";
      const rawFormat = (formData.get("format") as string) || "";
      const rawCategory =
        (formData.get("category") as CustomFont["category"]) || "sans-serif";

      if (!file || !(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          {
            error:
              "Please select a valid font file (.woff2, .woff, .ttf, .otf).",
          },
          { status: 400 },
        );
      }

      const MAX_FONT_SIZE = 15 * 1024 * 1024; // 15MB
      if (file.size > MAX_FONT_SIZE) {
        return NextResponse.json(
          { error: `Font file "${file.name}" exceeds 15MB limit.` },
          { status: 400 },
        );
      }

      const ext = path.extname(file.name).toLowerCase();
      const allowedExts = new Set([".woff2", ".woff", ".ttf", ".otf"]);
      if (!allowedExts.has(ext)) {
        return NextResponse.json(
          {
            error: `Unsupported font format "${ext}". Supported formats: .woff2, .woff, .ttf, .otf.`,
          },
          { status: 400 },
        );
      }

      const fallbackFamily = path
        .basename(file.name, ext)
        .replace(/[-_]/g, " ")
        .trim();
      family = sanitizeFontFamily(rawFamily || fallbackFamily);
      if (!family) {
        return NextResponse.json(
          { error: "A valid font family name is required." },
          { status: 400 },
        );
      }

      type = "upload";
      category = rawCategory;

      const normalizedMime =
        ext === ".woff2"
          ? "font/woff2"
          : ext === ".woff"
            ? "font/woff"
            : ext === ".ttf"
              ? "font/ttf"
              : "font/otf";

      const resolvedFmt: CustomFont["format"] =
        rawFormat === "otf"
          ? "opentype"
          : (rawFormat as CustomFont["format"]) ||
            (ext === ".woff2"
              ? "woff2"
              : ext === ".woff"
                ? "woff"
                : ext === ".ttf"
                  ? "truetype"
                  : "opentype");
      format = resolvedFmt;

      const safeName = sanitizeFilename(file.name);
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // 1. Try uploading to Vercel Blob
      let uploadedUrl = "";
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(safeName, fileBuffer, {
            access: "public",
            addRandomSuffix: true,
            contentType: normalizedMime,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          uploadedUrl = blob.url;
        } catch (blobErr) {
          console.warn(
            "[cms/fonts] Vercel blob put failed, falling back to local storage:",
            blobErr,
          );
        }
      }

      // 2. Fallback to local storage in public/uploads/
      if (!uploadedUrl) {
        try {
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          await fs.mkdir(uploadsDir, { recursive: true });
          const uniqueLocalName = `${path.basename(safeName, ext)}-${Date.now()}${ext}`;
          const filePath = path.join(uploadsDir, uniqueLocalName);
          await fs.writeFile(filePath, fileBuffer);
          uploadedUrl = `/uploads/${uniqueLocalName}`;
        } catch (fsErr) {
          console.warn(
            "[cms/fonts] local filesystem write failed, using data URI fallback:",
            fsErr,
          );
        }
      }

      // 3. Fallback to self-contained Base64 Data URI
      if (!uploadedUrl) {
        const base64 = fileBuffer.toString("base64");
        uploadedUrl = `data:${normalizedMime};base64,${base64}`;
      }

      url = uploadedUrl;
    } else {
      const body = await req.json();
      const rawFamily = typeof body.family === "string" ? body.family : "";
      family = sanitizeFontFamily(rawFamily);
      type = body.type as CustomFont["type"];
      url = typeof body.url === "string" ? body.url.trim() : "";
      format = body.format;
      category = body.category;

      if (!family) {
        return NextResponse.json(
          { error: "Font family name is required" },
          { status: 400 },
        );
      }

      if (type !== "google" && type !== "url" && type !== "upload") {
        return NextResponse.json(
          { error: "Invalid font type. Must be 'google', 'url', or 'upload'" },
          { status: 400 },
        );
      }

      if (type === "google") {
        if (!url) {
          url = buildGoogleFontUrl(family);
        } else if (!isSafeUrl(url)) {
          return NextResponse.json(
            { error: "Invalid Google Font stylesheet URL" },
            { status: 400 },
          );
        }
      } else if (type === "url") {
        if (!url || !isSafeUrl(url)) {
          return NextResponse.json(
            { error: "A valid stylesheet URL (https://...) is required" },
            { status: 400 },
          );
        }
      } else if (type === "upload") {
        const isAllowedUploadUrl =
          url.startsWith("/uploads/") ||
          url.startsWith("data:") ||
          isSafeUrl(url);

        if (!url || !isAllowedUploadUrl) {
          return NextResponse.json(
            { error: "A valid uploaded font file URL or data URI is required" },
            { status: 400 },
          );
        }
      }
    }

    const lowerUrl = url.toLowerCase();
    const resolvedFormat: CustomFont["format"] =
      (format === "otf" ? "opentype" : (format as CustomFont["format"])) ||
      (lowerUrl.includes(".woff2") || lowerUrl.includes("font/woff2")
        ? "woff2"
        : lowerUrl.includes(".woff") || lowerUrl.includes("font/woff")
          ? "woff"
          : lowerUrl.includes(".ttf") ||
              lowerUrl.includes("font/ttf") ||
              lowerUrl.includes("truetype")
            ? "truetype"
            : lowerUrl.includes(".otf") ||
                lowerUrl.includes("font/otf") ||
                lowerUrl.includes("opentype")
              ? "opentype"
              : undefined);

    const newFont: CustomFont = {
      id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      family,
      type,
      url,
      format: resolvedFormat,
      category: category || "sans-serif",
      createdAt: Date.now(),
    };

    // Load current theme data
    const existingTheme = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "theme"))
      .limit(1);

    const currentThemeData = (existingTheme[0]?.gjsData as ThemeData) || {};
    const existingFonts: CustomFont[] = Array.isArray(
      currentThemeData.customFonts,
    )
      ? currentThemeData.customFonts
      : [];

    // Filter out previous version of same font family if present (update)
    const filteredFonts = existingFonts.filter(
      (f) => f.family.toLowerCase() !== family.toLowerCase(),
    );
    const updatedFonts = [...filteredFonts, newFont];

    const updatedThemeData: ThemeData = {
      ...currentThemeData,
      customFonts: updatedFonts,
    };

    if (existingTheme.length > 0) {
      await db
        .update(siteSettings)
        .set({
          gjsData: updatedThemeData,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, "theme"));
    } else {
      await db.insert(siteSettings).values({
        key: "theme",
        gjsData: updatedThemeData,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      font: newFont,
      fonts: updatedFonts,
    });
  } catch (err) {
    console.error("[cms/fonts] POST error:", err);
    return NextResponse.json(
      { error: "Failed to save custom font" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cms/fonts
 * Uninstalls a custom font by its id.
 */
export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid admin session required" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json(
        { error: "Font id is required for deletion" },
        { status: 400 },
      );
    }

    const existingTheme = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "theme"))
      .limit(1);

    const currentThemeData = (existingTheme[0]?.gjsData as ThemeData) || {};
    const existingFonts: CustomFont[] = Array.isArray(
      currentThemeData.customFonts,
    )
      ? currentThemeData.customFonts
      : [];

    const updatedFonts = existingFonts.filter((f) => f.id !== id);

    const updatedThemeData: ThemeData = {
      ...currentThemeData,
      customFonts: updatedFonts,
    };

    if (existingTheme.length > 0) {
      await db
        .update(siteSettings)
        .set({
          gjsData: updatedThemeData,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, "theme"));
    }

    return NextResponse.json({
      success: true,
      fonts: updatedFonts,
    });
  } catch (err) {
    console.error("[cms/fonts] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete custom font" },
      { status: 500 },
    );
  }
}
