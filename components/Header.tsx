"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomPage } from "@/data/cms";

export const Header = () => {
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);

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

  return (
    <header className="flex justify-between items-center py-6 px-10 bg-[#000000] border-b border-[#333333]">
      <Link
        href="/"
        className="flex items-center gap-3 text-2xl font-serif text-[#FFFFFF]">
        <div className="w-8 h-8 border border-gray-600 flex items-center justify-center text-[10px] text-gray-500">
          LOGO
        </div>
        Sourav Mitra
      </Link>
      <nav className="flex gap-8 text-[#D4D4D4] text-sm uppercase tracking-widest font-medium">
        <Link
          href="/book-covers"
          className="hover:text-white transition-colors">
          Book Covers
        </Link>
        <Link
          href="/illustration"
          className="hover:text-white transition-colors">
          Illustration
        </Link>
        <Link href="/fine-art" className="hover:text-white transition-colors">
          Fine Art
        </Link>

        {/* Dynamic CMS Pages */}
        {customPages.map((page) => (
          <Link
            key={page.slug}
            href={`/p/${page.slug}`}
            className="hover:text-white transition-colors">
            {page.title}
          </Link>
        ))}

        <Link href="/about" className="hover:text-white transition-colors">
          About
        </Link>
        <Link
          href="/contact"
          className="text-[#C5A059] hover:text-white transition-colors border border-[#C5A059] px-4 py-1">
          Contact
        </Link>
      </nav>
    </header>
  );
};
