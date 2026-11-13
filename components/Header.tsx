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

export interface HeaderProps {
  initialSiteName?: string;
  initialLogoUrl?: string;
  initialNavItems?: NavItem[];
  initialIsCustomNav?: boolean;
}

export const Header = ({
  initialSiteName = "Sourav Mitra",
  initialLogoUrl = "",
  initialNavItems,
  initialIsCustomNav = false,
}: HeaderProps = {}) => {
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [clientNavItems, setClientNavItems] = useState<NavItem[] | null>(null);
  const [clientIsCustomNav, setClientIsCustomNav] = useState<boolean | null>(
    null,
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clientSiteName, setClientSiteName] = useState<string | null>(null);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);

  const siteName = clientSiteName ?? initialSiteName;
  const logoUrl = clientLogoUrl ?? initialLogoUrl;
  const navItems = clientNavItems ?? initialNavItems ?? DEFAULT_NAV_ITEMS;
  const isCustomNav = clientIsCustomNav ?? initialIsCustomNav;

  // Fallback client loader only when server props were not supplied
  useEffect(() => {
    if (initialNavItems !== undefined) {
      return;
    }

    const loadHeaderData = async () => {
      try {
        const [settingsRes, pagesRes] = await Promise.all([
          fetch("/api/cms/settings", { cache: "no-store" }),
          fetch("/api/cms", { cache: "no-store" }),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (typeof data.siteName === "string" && data.siteName.trim()) {
            setClientSiteName(data.siteName);
          }
          if (typeof data.logoUrl === "string") {
            setClientLogoUrl(data.logoUrl.trim());
          }
          if (data.isCustomNav === true && Array.isArray(data.navItems)) {
            setClientIsCustomNav(true);
            setClientNavItems(data.navItems);
          } else {
            setClientIsCustomNav(false);
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
  }, [initialNavItems]);

  const getPageTitle = (slug: string, fallback: string) =>
    customPages.find((page) => page.slug === slug)?.title || fallback;

  const customNavPages = customPages.filter(
    (page) =>
      !CORE_PAGE_SLUGS.has(page.slug) &&
      !page.slug.startsWith("template/") &&
      !page.slug.includes("/"),
  );

  // When initialNavItems are supplied from server or customNav is active, use navItems directly.
  const resolvedItems: NavItem[] = isCustomNav || initialNavItems !== undefined
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
          className="flex items-center gap-3 text-xl md:text-2xl font-serif text-[#FFFFFF] tracking-tight hover:opacity-90 transition-opacity">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={siteName}
              className="h-8 md:h-9 max-w-40 object-contain shrink-0"
              onError={() => setClientLogoUrl("")}
            />
          ) : null}
          <span className={logoUrl ? "hidden sm:inline" : ""}>{siteName}</span>
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
