import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAuthorized } from "@/lib/require-session";
import { isSafeUrl, sanitizeColor } from "@/lib/sanitize";
import { sanitizeFontFamily } from "@/lib/fonts";
import {
  DEFAULT_NAV_ITEMS,
  NavItemsArraySchema,
  normalizeStoredNavItems,
} from "@/lib/navigation";

const SOCIAL_LINK_KEYS = [
  "facebook",
  "instagram",
  "threads",
  "behance",
  "pinterest",
  "linkedin",
  "x",
] as const;

// GET /api/cms/settings - Fetch global site branding, navigation, and footer settings.
export async function GET() {
  try {
    const allSettings = await db.select().from(siteSettings);
    const byKey = new Map(allSettings.map((row) => [row.key, row]));

    const themeSetting = byKey.get("theme");
    const headerSetting = byKey.get("header");
    const footerSetting = byKey.get("footer");
    const navSetting = byKey.get("nav");

    const themeData =
      (themeSetting?.gjsData as {
        faviconUrl?: string;
        customFonts?: unknown[];
      }) || {};
    const headerData =
      (headerSetting?.gjsData as {
        siteName?: string;
        logoUrl?: string;
        siteFont?: string;
        siteColor?: string;
      }) || {};
    const footerData =
      (footerSetting?.gjsData as {
        heading?: string;
        text?: string;
        socialLinks?: Record<string, string>;
      }) || {};
    const navData =
      (navSetting?.gjsData as {
        items?: unknown;
      }) || {};

    const storedNavItems = normalizeStoredNavItems(navData.items);

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
      customFonts: themeData.customFonts || [],
      logoUrl: headerData.logoUrl || "",
      siteName: headerData.siteName || "Sourav Mitra",
      siteFont: headerData.siteFont || "serif",
      siteColor: headerData.siteColor || "#FFFFFF",
      footerHeading: footerData.heading || "FOLLOW ME ON",
      footerText: footerData.text || "All rights reserved.",
      socialLinks,
      navItems: storedNavItems ?? DEFAULT_NAV_ITEMS,
      isCustomNav: storedNavItems !== null,
    });
  } catch (error) {
    console.error("[Settings GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

// PUT /api/cms/settings - Update global site branding, navigation, and footer settings.
export async function PUT(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Valid signed admin session required" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    // Validate navigation payload upfront if provided
    let validatedNavItems: ReturnType<typeof normalizeStoredNavItems> = null;
    if (body.navItems !== undefined) {
      const parsedNav = NavItemsArraySchema.safeParse(body.navItems);
      if (!parsedNav.success) {
        return NextResponse.json(
          {
            error:
              parsedNav.error.issues[0]?.message ||
              "Invalid navigation link configuration",
          },
          { status: 400 },
        );
      }
      validatedNavItems = parsedNav.data;
    }

    const hasNavUpdate = body.navItems !== undefined || body.resetNav === true;
    const hasThemeUpdate =
      body.faviconUrl !== undefined || body.customFonts !== undefined;
    const hasHeaderUpdate =
      body.siteName !== undefined ||
      body.logoUrl !== undefined ||
      body.siteFont !== undefined ||
      body.siteColor !== undefined;
    const hasFooterUpdate =
      body.footerHeading !== undefined ||
      body.footerText !== undefined ||
      body.socialLinks !== undefined;

    const allSettings = await db.select().from(siteSettings);
    const byKey = new Map(allSettings.map((row) => [row.key, row]));

    const currentThemeData =
      (byKey.get("theme")?.gjsData as {
        faviconUrl?: string;
        customFonts?: unknown[];
      }) || {};
    const currentHeaderData =
      (byKey.get("header")?.gjsData as {
        siteName?: string;
        logoUrl?: string;
        siteFont?: string;
        siteColor?: string;
      }) || {};
    const currentFooterData =
      (byKey.get("footer")?.gjsData as {
        heading?: string;
        text?: string;
        socialLinks?: Record<string, string>;
      }) || {};

    const updatedAt = new Date();
    const batchOperations: Array<Parameters<typeof db.batch>[0][number]> = [];

    if (hasThemeUpdate) {
      const themeData = {
        faviconUrl:
          typeof body.faviconUrl === "string" &&
          (body.faviconUrl.trim() === "" || isSafeUrl(body.faviconUrl.trim()))
            ? body.faviconUrl.trim() || "/favicon.svg"
            : currentThemeData.faviconUrl || "/favicon.svg",
        customFonts: Array.isArray(body.customFonts)
          ? body.customFonts
          : currentThemeData.customFonts || [],
      };
      batchOperations.push(
        db
          .insert(siteSettings)
          .values({ key: "theme", gjsData: themeData, updatedAt })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { gjsData: themeData, updatedAt },
          }),
      );
    }

    if (hasHeaderUpdate) {
      const headerData = {
        siteName:
          typeof body.siteName === "string"
            ? body.siteName.trim().slice(0, 100) || "Sourav Mitra"
            : currentHeaderData.siteName || "Sourav Mitra",
        logoUrl:
          typeof body.logoUrl === "string" &&
          (body.logoUrl.trim() === "" || isSafeUrl(body.logoUrl.trim()))
            ? body.logoUrl.trim()
            : currentHeaderData.logoUrl || "",
        siteFont:
          typeof body.siteFont === "string" && body.siteFont.trim()
            ? sanitizeFontFamily(body.siteFont)
            : currentHeaderData.siteFont || "serif",
        siteColor:
          body.siteColor !== undefined
            ? sanitizeColor(body.siteColor, "#FFFFFF")
            : currentHeaderData.siteColor || "#FFFFFF",
      };
      batchOperations.push(
        db
          .insert(siteSettings)
          .values({ key: "header", gjsData: headerData, updatedAt })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { gjsData: headerData, updatedAt },
          }),
      );
    }

    if (hasFooterUpdate) {
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
      batchOperations.push(
        db
          .insert(siteSettings)
          .values({ key: "footer", gjsData: footerData, updatedAt })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { gjsData: footerData, updatedAt },
          }),
      );
    }

    if (hasNavUpdate) {
      if (body.resetNav === true) {
        batchOperations.push(
          db.delete(siteSettings).where(eq(siteSettings.key, "nav")),
        );
      } else if (validatedNavItems !== null) {
        const navPayload = { items: validatedNavItems };
        batchOperations.push(
          db
            .insert(siteSettings)
            .values({ key: "nav", gjsData: navPayload, updatedAt })
            .onConflictDoUpdate({
              target: siteSettings.key,
              set: { gjsData: navPayload, updatedAt },
            }),
        );
      }
    }

    if (batchOperations.length > 0) {
      await db.batch(
        batchOperations as [
          (typeof batchOperations)[0],
          ...(typeof batchOperations)[0][],
        ],
      );
    }

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/about");
      revalidatePath("/contact");
    } catch {
      // Ignored outside Next.js request scope (e.g. CLI integration tests)
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings PUT Error]:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
