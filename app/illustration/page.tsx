"use client";
import { useState } from "react";
import { projects, illustrationGenres } from "@/data/projects";
import PortfolioControls from "@/components/PortfolioControls";
import BehanceCard from "@/components/BehanceCard";

export default function IllustrationPage() {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");

  const filteredGenres = filter === "All" ? illustrationGenres : [filter];

  return (
    <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto text-[#D4D4D4]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">Portfolio</span>
        <h1 className="text-4xl md:text-5xl font-serif text-white font-black leading-tight">
          Illustration Portfolio
        </h1>
        <p className="text-sm text-gray-400 mt-4 leading-relaxed">
          A showcase of digital editorial artwork, character design, and visual concepts. Click on any piece to see detail crop zooms, blueprint layouts, and feedback.
        </p>
      </div>

      <PortfolioControls
        filterOptions={illustrationGenres}
        currentFilter={filter}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />

      {filteredGenres.map((genre) => {
        const genreProjects = projects.filter(
          (p) => p.type === "illustration" && p.genre === genre,
        );

        // Apply sorting
        genreProjects.sort((a, b) =>
          sort === "newest" ? b.year - a.year : a.year - b.year,
        );

        if (genreProjects.length === 0) return null;

        return (
          <section key={genre} className="mb-20">
            <div className="flex items-baseline justify-between mb-8 border-b border-[#222222] pb-4">
              <h2 className="text-2xl font-serif text-white font-bold">
                {genre}
              </h2>
              <span className="text-xs text-gray-500 font-semibold">{genreProjects.length} Artworks</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {genreProjects.map((ill) => (
                <BehanceCard
                  key={ill.id}
                  id={ill.id}
                  title={ill.title}
                  type="illustration"
                  genreOrMedium={ill.genre}
                  year={ill.year}
                  likes={ill.likes}
                  views={ill.views}
                  detailUrl={`/illustration/${ill.id}`}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
