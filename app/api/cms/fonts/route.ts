import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { isSafeUrl } from "@/lib/sanitize";
import {
  CustomFont,
  sanitizeFontFamily,
  buildGoogleFontUrl,
} from "@/lib/fonts";

async function isAuthorized(req?: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (sessionCookie) {
    const result = await resolveSession(sessionCookie);
    if (result.valid) return true;
  }
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const result = await resolveSession(token);
      if (result.valid) return true;
    }
  }
  return false;
}

interface ThemeData {
  faviconUrl?: string;
  customFonts?: CustomFont[];
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
 */
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid admin session required" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const rawFamily = typeof body.family === "string" ? body.family : "";
    const family = sanitizeFontFamily(rawFamily);
    const type = body.type as CustomFont["type"];
    let url = typeof body.url === "string" ? body.url.trim() : "";
    const format = body.format;
    const category = body.category;

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
      if (!url || (!url.startsWith("/uploads/") && !isSafeUrl(url))) {
        return NextResponse.json(
          { error: "A valid uploaded font file URL is required" },
          { status: 400 },
        );
      }
    }

    const newFont: CustomFont = {
      id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      family,
      type,
      url,
      format:
        format ||
        (url.endsWith(".woff2")
          ? "woff2"
          : url.endsWith(".woff")
            ? "woff"
            : url.endsWith(".ttf")
              ? "truetype"
              : url.endsWith(".otf")
                ? "opentype"
                : undefined),
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
