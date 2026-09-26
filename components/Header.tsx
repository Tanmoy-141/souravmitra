"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomPage } from "@/data/cms";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [siteName, setSiteName] = useState("Sourav Mitra");
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch("/api/cms", { cache: "no-store" });
        const data = await res.json();
        if (data.pages) {
          setCustomPages(
            data.pages.filter((p: CustomPage) => p.status === "published"),
          );
        }
      } catch {
        console.error("Failed to load dynamic pages");
      }
    };
    fetchPages();
  }, []);

  useEffect(() => {
    fetch("/api/cms/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.siteName === "string" && data.siteName.trim()) {
          setSiteName(data.siteName);
        }
        if (typeof data.logoUrl === "string") {
          setLogoUrl(data.logoUrl.trim());
        }
      })
      .catch(() => {});
  }, []);

  const getPageTitle = (slug: string, fallback: string) =>
    customPages.find((page) => page.slug === slug)?.title || fallback;

  const customNavPages = customPages.filter(
    (page) => !CORE_PAGE_SLUGS.has(page.slug),
  );

  // Close the mobile menu whenever the viewport grows past the mobile
  // breakpoint, so it doesn't stay stuck open if someone resizes/rotates.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = (
    <>
      <Link
        href="/book-covers"
        onClick={() => setIsMenuOpen(false)}
        className="hover:text-white transition-colors">
        {getPageTitle("book-covers", "Book Covers")}
      </Link>
      <Link
        href="/illustration"
        onClick={() => setIsMenuOpen(false)}
        className="hover:text-white transition-colors">
        {getPageTitle("illustration", "Illustration")}
      </Link>
      <Link
        href="/fine-art"
        onClick={() => setIsMenuOpen(false)}
        className="hover:text-white transition-colors">
        {getPageTitle("fine-art", "Fine Art")}
      </Link>

      {/* Dynamic CMS Pages */}
      {customNavPages.map((page) => (
        <Link
          key={page.slug}
          href={`/p/${page.slug}`}
          onClick={() => setIsMenuOpen(false)}
          className="hover:text-white transition-colors">
          {page.title}
        </Link>
      ))}

      <Link
        href="/about"
        onClick={() => setIsMenuOpen(false)}
        className="hover:text-white transition-colors">
        {getPageTitle("about", "About")}
      </Link>
    </>
  );

  return (
    <header className="relative z-50 border-b border-[#333333] bg-[#000000]">
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
          {navLinks}
          <Link
            href="/contact"
            className="text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-1">
            {getPageTitle("contact", "Contact")}
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          className="md:hidden p-2 text-white">
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
        <nav className="absolute inset-x-0 top-full z-50 flex flex-col gap-6 border-t border-[#333333] bg-[#000000] px-6 pb-8 pt-5 text-sm font-medium uppercase tracking-widest text-[#D4D4D4] shadow-2xl md:hidden">
          {navLinks}
          <Link
            href="/contact"
            onClick={() => setIsMenuOpen(false)}
            className="text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-2 text-center w-fit">
            {getPageTitle("contact", "Contact")}
          </Link>
        </nav>
      )}
    </header>
  );
};
