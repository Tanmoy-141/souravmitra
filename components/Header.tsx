"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomPage } from "@/data/cms";
import {
  DEFAULT_NAV_ITEMS,
  isExternalNavHref,
  isSafeNavHref,
  type NavItem,
} from "@/lib/navigation";

const CORE_PAGE_SLUGS = new Set([
  "/",
  "about",
  "contact",
  "book-covers",
  "illustration",
  "fine-art",
]);

export const Header = () => {
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [isCustomNav, setIsCustomNav] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [siteName, setSiteName] = useState("Sourav Mitra");
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    const loadHeaderData = async () => {
      try {
        const [settingsRes, pagesRes] = await Promise.all([
          fetch("/api/cms/settings", { cache: "no-store" }),
          fetch("/api/cms", { cache: "no-store" }),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (typeof data.siteName === "string" && data.siteName.trim()) {
            setSiteName(data.siteName);
          }
          if (typeof data.logoUrl === "string") {
            setLogoUrl(data.logoUrl.trim());
          }
          if (data.isCustomNav === true && Array.isArray(data.navItems)) {
            setIsCustomNav(true);
            setNavItems(data.navItems);
          } else {
            setIsCustomNav(false);
          }
        }

        if (pagesRes.ok) {
          const pageData = await pagesRes.json();
          if (Array.isArray(pageData.pages)) {
            setCustomPages(
              pageData.pages.filter((p: CustomPage) => p.status === "published"),
            );
          }
        }
      } catch {
        console.error("Failed to load header navigation");
      }
    };

    void loadHeaderData();
  }, []);

  const getPageTitle = (slug: string, fallback: string) =>
    customPages.find((page) => page.slug === slug)?.title || fallback;

  const customNavPages = customPages.filter(
    (page) =>
      !CORE_PAGE_SLUGS.has(page.slug) &&
      !page.slug.startsWith("template/") &&
      !page.slug.includes("/"),
  );

  // When no custom nav is configured in site_settings, mirror legacy auto-discovery.
  const resolvedItems: NavItem[] = isCustomNav
    ? navItems.filter((item) => item.visible && isSafeNavHref(item.href))
    : [
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

  const mobilePrimaryItems = resolvedItems.filter((item) => !item.isCta);
  const mobileCtaItems = resolvedItems.filter((item) => item.isCta);

  // Close the mobile menu whenever the viewport grows past the mobile
  // breakpoint, so it doesn't stay stuck open if someone resizes/rotates.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderNavLink = (item: NavItem, className: string) => {
    const external = item.openInNewTab || isExternalNavHref(item.href);
    if (external) {
      return (
        <a
          key={item.id}
          href={item.href}
          target={item.openInNewTab ? "_blank" : undefined}
          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
          onClick={() => setIsMenuOpen(false)}
          className={className}>
          {item.label}
        </a>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => setIsMenuOpen(false)}
        className={className}>
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#333333] bg-[#000000]">
      <div className="flex justify-between items-center py-6 px-6 md:px-10">
        <Link
          href="/"
          onClick={() => setIsMenuOpen(false)}
          className="flex items-center gap-3 text-xl md:text-2xl font-serif text-[#FFFFFF]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={siteName}
              className="h-8 max-w-30 object-contain shrink-0"
              onError={() => setLogoUrl("")}
            />
          ) : null}
          <span>{siteName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-[#D4D4D4] text-sm uppercase tracking-widest font-medium">
          {resolvedItems.map((item) =>
            renderNavLink(
              item,
              item.isCta
                ? "text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-1"
                : "hover:text-white transition-colors",
            ),
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          className="md:hidden p-2 text-white min-w-11 min-h-11 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#C5A059] rounded-md transition-colors">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}>
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav panel */}
      {isMenuOpen && (
        <nav className="absolute inset-x-0 top-full z-50 flex flex-col gap-4 border-t border-[#333333] bg-[#000000] px-6 pb-8 pt-5 text-sm font-medium uppercase tracking-widest text-[#D4D4D4] shadow-2xl md:hidden">
          {mobilePrimaryItems.length > 0 && (
            <div className="flex flex-col divide-y divide-[#1e1e1e]">
              {mobilePrimaryItems.map((item) =>
                renderNavLink(
                  item,
                  "py-3 hover:text-white transition-colors flex items-center min-h-11",
                ),
              )}
            </div>
          )}
          {mobileCtaItems.map((item) =>
            renderNavLink(
              item,
              "text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-3 text-center w-full min-h-11 flex items-center justify-center font-bold tracking-widest mt-2",
            ),
          )}
        </nav>
      )}
    </header>
  );
};
