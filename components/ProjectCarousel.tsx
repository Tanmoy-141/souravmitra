"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import type { Project } from "@/db/schema";
import { ProceduralPlaceholder } from "@/components/BehanceCard";

interface ProjectCarouselProps {
  heading?: string;
  category?: "all" | "book-covers" | "illustration" | "fine-art";
  limit?: number;
}

export default function ProjectCarousel({
  heading = "Featured Portfolio Projects",
  category: defaultCategory = "all",
  limit = 24,
}: ProjectCarouselProps = {}) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Fetch projects
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/projects", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load projects");
        return res.json();
      })
      .then((data: { projects?: Project[] }) => {
        if (Array.isArray(data.projects)) {
          // Sort featured first, then by sortOrder/year
          const sorted = [...data.projects].sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          });
          setAllProjects(sorted.slice(0, limit));
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("[ProjectCarousel] Fetch error:", err);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [limit]);

  // 2. Responsive visible tile count
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(1);
      } else if (width < 1024) {
        setVisibleCount(2);
      } else if (width < 1280) {
        setVisibleCount(3);
      } else {
        setVisibleCount(4);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  // 3. Filter projects by category tab
  const filteredProjects = allProjects.filter((p) => {
    if (selectedCategory === "all") return true;
    return p.category === selectedCategory;
  });

  // Calculate max possible slide index so tiles don't scroll into empty whitespace
  const maxIndex = Math.max(0, filteredProjects.length - visibleCount);
  const safeActiveIndex = Math.min(activeIndex, maxIndex);

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setActiveIndex(0);
  };

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  // 4. Smooth automatic animated sliding
  useEffect(() => {
    if (isPaused || filteredProjects.length <= visibleCount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    autoPlayTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3800);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPaused, filteredProjects.length, visibleCount, maxIndex]);

  // 5. Touch swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isSignificant = Math.abs(distance) > 40;

    if (isSignificant) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  if (loading) {
    return (
      <section className="py-20 px-6 max-w-7xl mx-auto text-center text-gray-500 text-xs uppercase tracking-widest">
        Loading animated project carousel...
      </section>
    );
  }

  if (filteredProjects.length === 0) {
    return null;
  }

  const categoryCounts = {
    all: allProjects.length,
    "book-covers": allProjects.filter((p) => p.category === "book-covers").length,
    illustration: allProjects.filter((p) => p.category === "illustration").length,
    "fine-art": allProjects.filter((p) => p.category === "fine-art").length,
  };

  return (
    <section
      aria-label="Featured Portfolio Projects Carousel"
      className="relative w-full py-16 px-4 sm:px-8 lg:px-12 bg-black text-white border-y border-[#222] overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsPaused(false);
        }
      }}>
      {/* Background atmospheric glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-[#222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.25em] flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                Featured Portfolio Works
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white tracking-tight leading-tight">
              {heading}
            </h2>
          </div>

          {/* Category Tabs & Navigation Arrow Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#111] border border-[#2a2a2a] rounded-full text-xs">
              {[
                { id: "all", label: "All Works" },
                { id: "book-covers", label: "Book Covers" },
                { id: "illustration", label: "Illustration" },
                { id: "fine-art", label: "Fine Art" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all duration-300 text-[11px] uppercase tracking-wider ${
                    selectedCategory === tab.id
                      ? "bg-[#C5A059] text-black shadow-md shadow-[#C5A059]/25"
                      : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                  }`}>
                  {tab.label}
                  {categoryCounts[tab.id as keyof typeof categoryCounts] > 0 && (
                    <span className="ml-1 opacity-70 text-[9px]">
                      ({categoryCounts[tab.id as keyof typeof categoryCounts]})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Prev / Next & Auto-Play Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous project slide"
                className="w-10 h-10 rounded-full border border-[#333] hover:border-[#C5A059] bg-[#121212] hover:bg-[#C5A059] hover:text-black text-white flex items-center justify-center transition-all duration-300 shadow-md">
                <span className="text-lg">←</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next project slide"
                className="w-10 h-10 rounded-full border border-[#333] hover:border-[#C5A059] bg-[#121212] hover:bg-[#C5A059] hover:text-black text-white flex items-center justify-center transition-all duration-300 shadow-md">
                <span className="text-lg">→</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                title={isPaused ? "Resume Auto-Play" : "Pause Auto-Play"}
                aria-label={isPaused ? "Resume Auto-Play" : "Pause Auto-Play"}
                className={`w-10 h-10 rounded-full border text-xs font-bold transition-all duration-300 flex items-center justify-center ${
                  isPaused
                    ? "border-[#C5A059] bg-[#C5A059]/20 text-[#C5A059]"
                    : "border-[#333] bg-[#121212] text-gray-400 hover:text-white hover:border-[#555]"
                }`}>
                {isPaused ? "▶" : "⏸"}
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Viewport Container */}
        <div
          ref={containerRef}
          className="relative overflow-hidden w-full cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}>
          {/* Animated Sliding Track */}
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{
              transform: `translateX(-${safeActiveIndex * (100 / visibleCount)}%)`,
            }}>
            {filteredProjects.map((project, idx) => {
              const imageUrl = project.coverImage || project.images?.[0];
              const categoryLabel = project.category.replace("-", " ");
              const placeholderType =
                project.category === "book-covers"
                  ? "book-cover"
                  : project.category;

              return (
                <div
                  key={project.id}
                  style={{
                    flex: `0 0 ${100 / visibleCount}%`,
                    maxWidth: `${100 / visibleCount}%`,
                  }}
                  className="px-2.5 sm:px-3">
                  <Link
                    href={`/${project.category}/${project.id}`}
                    className="group relative w-full aspect-3/4 rounded-xl overflow-hidden bg-[#0d0d0d] border border-[#242424] hover:border-[#C5A059] transition-all duration-500 shadow-xl hover:shadow-[0_15px_35px_rgba(197,160,89,0.3)] flex flex-col justify-between">
                    {/* Artwork Image or Procedural Visual Placeholder */}
                    {imageUrl ? (
                      <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#111]">
                        <Image
                          src={imageUrl}
                          alt={project.title}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 w-full h-full overflow-hidden">
                        <ProceduralPlaceholder
                          id={project.id}
                          type={placeholderType}
                          title={project.title}
                        />
                      </div>
                    )}

                    {/* Gradient overlays for contrast & luxury tone */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/35 to-black/20 pointer-events-none transition-opacity duration-300 group-hover:from-black/90 group-hover:via-black/20" />
                    <div className="absolute inset-0 bg-linear-to-b from-black/70 via-transparent to-transparent pointer-events-none" />

                    {/* Top Badges (Category & Year) */}
                    <div className="relative z-10 p-4 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md border border-[#C5A059]/40 text-[#C5A059] text-[9px] font-bold uppercase tracking-widest shadow-sm">
                        {categoryLabel}
                      </span>

                      {project.year && (
                        <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] font-mono border border-white/10">
                          {project.year}
                        </span>
                      )}
                    </div>

                    {/* Bottom Project Details & Animated CTA */}
                    <div className="relative z-10 p-5 space-y-2 transform transition-transform duration-300 group-hover:-translate-y-1">
                      {project.medium && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] line-clamp-1">
                          {project.medium}
                        </p>
                      )}

                      <h3 className="text-lg md:text-xl font-serif text-white font-bold leading-snug line-clamp-2 group-hover:text-[#C5A059] transition-colors">
                        {project.title}
                      </h3>

                      {project.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-16 transition-all duration-300">
                          {project.description}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-300 group-hover:text-white">
                        <span className="flex items-center gap-1.5 text-[#C5A059]">
                          <span>View Artwork</span>
                          <span className="transform transition-transform duration-300 group-hover:translate-x-1.5">
                            →
                          </span>
                        </span>

                        <span className="text-[11px] text-gray-400 font-normal">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Pagination & Progress Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1a1a1a]">
          {/* Animated Dots Navigation */}
          <div className="flex items-center gap-2">
            {Array.from({ length: maxIndex + 1 }).map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Jump to slide position ${dotIndex + 1}`}
                onClick={() => setActiveIndex(dotIndex)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  dotIndex === safeActiveIndex
                    ? "w-8 bg-[#C5A059]"
                    : "w-2 bg-white/20 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Position indicator & link to full portfolio */}
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span className="font-mono">
              Showing{" "}
              <strong className="text-white">
                {safeActiveIndex + 1}–
                {Math.min(safeActiveIndex + visibleCount, filteredProjects.length)}
              </strong>{" "}
              of <strong className="text-white">{filteredProjects.length}</strong>{" "}
              projects
            </span>

            <Link
              href="/book-covers"
              className="text-[#C5A059] hover:text-white font-semibold uppercase tracking-wider transition-colors flex items-center gap-1">
              <span>View Full Portfolios</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
