import { db } from "@/db";
import { pages, siteSettings } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  DEFAULT_NAV_ITEMS,
  normalizeStoredNavItems,
  type NavItem,
} from "./navigation";
import { isSafeUrl } from "./sanitize";

export interface HeaderData {
  siteName: string;
  logoUrl: string;
  navItems: NavItem[];
  isCustomNav: boolean;
}

const CORE_PAGE_SLUGS = new Set([
  "/",
  "about",
  "contact",
  "book-covers",
  "illustration",
  "fine-art",
]);

/**
 * Server-only loader for site header branding and navigation.
 * Fetches settings directly from the database during server rendering,
 * eliminating client-side layout shift and avoiding heavy API roundtrips.
 */
export async function getHeaderData(): Promise<HeaderData> {
  try {
    const settings = await db.select().from(siteSettings);
    const byKey = new Map(settings.map((s) => [s.key, s]));

    const headerData =
      (byKey.get("header")?.gjsData as {
        siteName?: string;
        logoUrl?: string;
      }) || {};
    const navSetting = byKey.get("nav");
    const navData =
      (navSetting?.gjsData as {
        items?: unknown;
      }) || {};

    const storedNavItems = normalizeStoredNavItems(navData.items);
    const siteName =
      typeof headerData.siteName === "string" && headerData.siteName.trim()
        ? headerData.siteName.trim()
        : "Sourav Mitra";
    const rawLogoUrl =
      typeof headerData.logoUrl === "string" ? headerData.logoUrl.trim() : "";
    const logoUrl = rawLogoUrl && isSafeUrl(rawLogoUrl) ? rawLogoUrl : "";

    // If custom navigation has been configured in site_settings, return it directly.
    if (storedNavItems !== null) {
      return {
        siteName,
        logoUrl,
        navItems: storedNavItems,
        isCustomNav: true,
      };
    }

    // Default legacy auto-discovery: fetch published page titles and slugs only (lightweight query).
    const publishedPages = await db
      .select({ slug: pages.slug, title: pages.title })
      .from(pages)
      .where(and(eq(pages.status, "published"), isNull(pages.deletedAt)));

    const getPageTitle = (slug: string, fallback: string) =>
      publishedPages.find((p) => p.slug === slug)?.title || fallback;

    const customNavPages = publishedPages.filter(
      (p) =>
        !CORE_PAGE_SLUGS.has(p.slug) &&
        !p.slug.startsWith("template/") &&
        !p.slug.includes("/"),
    );

    const defaultItems: NavItem[] = [
      {
        id: "nav-book-covers",
        label: getPageTitle("book-covers", "Book Covers"),
        href: "/book-covers",
        visible: true,
      },
      {
        id: "nav-illustration",
        label: getPageTitle("illustration", "Illustration"),
        href: "/illustration",
        visible: true,
      },
      {
        id: "nav-fine-art",
        label: getPageTitle("fine-art", "Fine Art"),
        href: "/fine-art",
        visible: true,
      },
      ...customNavPages.map((page) => ({
        id: `custom-${page.slug}`,
        label: page.title,
        href: `/p/${page.slug}`,
        visible: true,
      })),
      {
        id: "nav-about",
        label: getPageTitle("about", "About"),
        href: "/about",
        visible: true,
      },
      {
        id: "nav-contact",
        label: getPageTitle("contact", "Contact"),
        href: "/contact",
        visible: true,
        isCta: true,
      },
    ];

    return {
      siteName,
      logoUrl,
      navItems: defaultItems,
      isCustomNav: false,
    };
  } catch (error) {
    console.error("Failed to load server header data:", error);
    return {
      siteName: "Sourav Mitra",
      logoUrl: "",
      navItems: DEFAULT_NAV_ITEMS,
      isCustomNav: false,
    };
  }
}
