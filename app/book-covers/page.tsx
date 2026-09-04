"use client";
import { useState, useEffect, useMemo } from "react";
import PortfolioControls from "@/components/PortfolioControls";
import BehanceCard from "@/components/BehanceCard";
import type { Project } from "@/db/schema";

export default function BookCoversPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    fetch("/api/projects?category=book-covers")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const genres = useMemo(
    () => Array.from(new Set(projects.map((p) => p.medium ?? p.tags?.[2] ?? "Other"))).sort(),
    [projects],
  );

  const filteredGenres = filter === "All" ? genres : [filter];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 uppercase tracking-widest text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto text-[#D4D4D4]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">Portfolio</span>
        <h1 className="text-4xl md:text-5xl font-serif text-white font-black leading-tight">Book Cover Design</h1>
        <p className="text-sm text-gray-400 mt-4 leading-relaxed">
          A collection of bespoke literary jackets and book cover layouts. Click on any project to explore the 3D
          presentation mockup, sketches, and process.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center text-gray-600 text-sm uppercase tracking-widest py-24">
          No book covers published yet.
        </div>
      ) : (
        <>
          <PortfolioControls
            filterOptions={genres}
            currentFilter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
            wrap={true}
          />

          {filteredGenres.map((genre) => {
            const genreProjects = projects
              .filter((p) => (p.medium ?? p.tags?.[2] ?? "Other") === genre)
              .sort((a, b) =>
                sort === "newest"
                  ? Number(b.year ?? 0) - Number(a.year ?? 0)
                  : Number(a.year ?? 0) - Number(b.year ?? 0),
              );
            if (!genreProjects.length) return null;
            return (
              <section key={genre} className="mb-20">
                <div className="flex items-baseline justify-between mb-8 border-b border-[#222222] pb-4">
                  <h2 className="text-2xl font-serif text-white font-bold">{genre}</h2>
                  <span className="text-xs text-gray-500 font-semibold">{genreProjects.length} Projects</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {genreProjects.map((p) => (
                    <BehanceCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      type="book-cover"
                      genreOrMedium={p.medium ?? genre}
                      year={Number(p.year ?? 2024)}
                      likes={p.likes}
                      views={p.views}
                      detailUrl={`/book-covers/${p.id}`}
                      imageUrl={p.coverImage || undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
