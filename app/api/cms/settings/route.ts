import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { resolveSession } from "@/lib/auth";
import { isSafeUrl } from "@/lib/sanitize";

const SOCIAL_LINK_KEYS = [
  "facebook",
  "instagram",
  "behance",
  "pinterest",
  "linkedin",
  "x",
] as const;

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (sessionCookie) {
    const result = await resolveSession(sessionCookie);
    return result.valid;
  }
  return false;
}

// GET /api/cms/settings - Fetch global site branding and footer settings.
export async function GET() {
  try {
    const [themeSetting, headerSetting, footerSetting] = await Promise.all([
      db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "theme"))
        .limit(1),
      db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "header"))
        .limit(1),
      db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "footer"))
        .limit(1),
    ]);

    const themeData =
      (themeSetting[0]?.gjsData as { faviconUrl?: string }) || {};
    const headerData =
      (headerSetting[0]?.gjsData as {
        siteName?: string;
        logoUrl?: string;
      }) || {};
    const footerData =
      (footerSetting[0]?.gjsData as {
        heading?: string;
        text?: string;
        socialLinks?: Record<string, string>;
      }) || {};
    const storedSocialLinks = footerData.socialLinks || {};
    const socialLinks = Object.fromEntries(
      SOCIAL_LINK_KEYS.map((key) => {
        const value = storedSocialLinks[key];
        return [
          key,
          typeof value === "string" && isSafeUrl(value) ? value : "",
        ];
      }),
    );

    return NextResponse.json({
      faviconUrl: themeData.faviconUrl || "/favicon.svg",
      logoUrl: headerData.logoUrl || "",
      siteName: headerData.siteName || "Sourav Mitra",
      footerHeading: footerData.heading || "FOLLOW ME ON",
      footerText: footerData.text || "All rights reserved.",
      socialLinks,
    });
  } catch (error) {
    console.error("[Settings GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

// PUT /api/cms/settings - Update global site branding and footer settings.
export async function PUT(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json(
      { error: "Unauthorized: Valid signed admin session required" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const [currentTheme, currentHeader, currentFooter] = await Promise.all([
      db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "theme"))
        .limit(1),
      db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "header"))
        .limit(1),
      db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "footer"))
        .limit(1),
    ]);

    const currentThemeData =
      (currentTheme[0]?.gjsData as { faviconUrl?: string }) || {};
    const currentHeaderData =
      (currentHeader[0]?.gjsData as {
        siteName?: string;
        logoUrl?: string;
      }) || {};
    const currentFooterData =
      (currentFooter[0]?.gjsData as {
        heading?: string;
        text?: string;
        socialLinks?: Record<string, string>;
      }) || {};

    const themeData = {
      faviconUrl:
        typeof body.faviconUrl === "string"
          ? body.faviconUrl.trim() || "/favicon.svg"
          : currentThemeData.faviconUrl || "/favicon.svg",
    };
    const headerData = {
      siteName:
        typeof body.siteName === "string"
          ? body.siteName.trim().slice(0, 100) || "Sourav Mitra"
          : currentHeaderData.siteName || "Sourav Mitra",
      logoUrl:
        typeof body.logoUrl === "string"
          ? body.logoUrl.trim()
          : currentHeaderData.logoUrl || "",
    };
    const inputSocialLinks =
      typeof body.socialLinks === "object" && body.socialLinks !== null
        ? (body.socialLinks as Record<string, unknown>)
        : currentFooterData.socialLinks || {};
    const socialLinks = Object.fromEntries(
      SOCIAL_LINK_KEYS.map((key) => {
        const value = inputSocialLinks[key];
        return [
          key,
          typeof value === "string" && isSafeUrl(value.trim())
            ? value.trim()
            : "",
        ];
      }),
    );
    const footerData = {
      heading:
        typeof body.footerHeading === "string"
          ? body.footerHeading.trim().slice(0, 100) || "FOLLOW ME ON"
          : currentFooterData.heading || "FOLLOW ME ON",
      text:
        typeof body.footerText === "string"
          ? body.footerText.trim().slice(0, 200)
          : currentFooterData.text || "All rights reserved.",
      socialLinks,
    };

    const updatedAt = new Date();
    await Promise.all([
      db
        .insert(siteSettings)
        .values({ key: "theme", gjsData: themeData, updatedAt })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { gjsData: themeData, updatedAt },
        }),
      db
        .insert(siteSettings)
        .values({ key: "header", gjsData: headerData, updatedAt })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { gjsData: headerData, updatedAt },
        }),
      db
        .insert(siteSettings)
        .values({ key: "footer", gjsData: footerData, updatedAt })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { gjsData: footerData, updatedAt },
        }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings PUT Error]:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
