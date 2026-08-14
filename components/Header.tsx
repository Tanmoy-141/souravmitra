"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomPage } from "@/data/cms";

export const Header = () => {
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch("/api/cms");
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
        Book Covers
      </Link>
      <Link
        href="/illustration"
        onClick={() => setIsMenuOpen(false)}
        className="hover:text-white transition-colors">
        Illustration
      </Link>
      <Link
        href="/fine-art"
        onClick={() => setIsMenuOpen(false)}
        className="hover:text-white transition-colors">
        Fine Art
      </Link>

      {/* Dynamic CMS Pages */}
      {customPages.map((page) => (
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
        About
      </Link>
    </>
  );

  return (
    <header className="relative bg-[#000000] border-b border-[#333333]">
      <div className="flex justify-between items-center py-6 px-6 md:px-10">
        <Link
          href="/"
          onClick={() => setIsMenuOpen(false)}
          className="flex items-center gap-3 text-xl md:text-2xl font-serif text-[#FFFFFF]">
          <div className="w-8 h-8 shrink-0 border border-gray-600 flex items-center justify-center text-[10px] text-gray-500">
            LOGO
          </div>
          Sourav Mitra
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-[#D4D4D4] text-sm uppercase tracking-widest font-medium">
          {navLinks}
          <Link
            href="/contact"
            className="text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-1">
            Contact
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
        <nav className="md:hidden flex flex-col gap-6 px-6 pb-8 pt-2 text-[#D4D4D4] text-sm uppercase tracking-widest font-medium border-t border-[#222222]">
          {navLinks}
          <Link
            href="/contact"
            onClick={() => setIsMenuOpen(false)}
            className="text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-2 text-center w-fit">
            Contact
          </Link>
        </nav>
      )}
    </header>
  );
};
