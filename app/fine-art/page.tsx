"use client";
import { useState, useEffect } from "react";
import PortfolioControls from "@/components/PortfolioControls";
import BehanceCard from "@/components/BehanceCard";
import type { Project } from "@/db/schema";

const availabilityFilters = ["Available", "Sold", "Private Collection"];

export default function FineArtPage() {
  const [artworks, setArtworks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    fetch("/api/projects?category=fine-art")
      .then((r) => r.json())
      .then((d) => setArtworks(Array.isArray(d.projects) ? d.projects : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = artworks
    .filter((a) => filter === "All" || (a.details ?? "").includes(filter))
    .sort((a, b) =>
      sort === "newest"
        ? Number(b.year ?? 0) - Number(a.year ?? 0)
        : Number(a.year ?? 0) - Number(b.year ?? 0),
    );

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
        <h1 className="text-4xl md:text-5xl font-serif text-white font-black leading-tight">Fine Art Gallery</h1>
        <p className="text-sm text-gray-400 mt-4 leading-relaxed">
          A curatorial collection of physical oils, acrylics, and mixed media works. Click on any piece to view it
          mounted in our virtual exhibition room under gallery lighting.
        </p>
      </div>

      {artworks.length === 0 ? (
        <div className="text-center text-gray-600 text-sm uppercase tracking-widest py-24">
          No fine art published yet.
        </div>
      ) : (
        <>
          <PortfolioControls
            filterOptions={availabilityFilters}
            currentFilter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((a) => (
              <BehanceCard
                key={a.id}
                id={a.id}
                title={a.title}
                type="fine-art"
                genreOrMedium={a.medium ?? "Mixed Media"}
                year={Number(a.year ?? 2024)}
                likes={a.likes}
                views={a.views}
                detailUrl={`/fine-art/${a.id}`}
                imageUrl={a.coverImage || undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
