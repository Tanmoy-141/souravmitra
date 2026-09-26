"use client";

import { useEffect, useMemo, useState } from "react";
import BehanceCard from "@/components/BehanceCard";
import PortfolioControls from "@/components/PortfolioControls";
import type { Project } from "@/db/schema";

type PortfolioCategory = "book-covers" | "illustration" | "fine-art";

interface PortfolioCollectionProps {
  category: PortfolioCategory;
  showIntro?: boolean;
}

const INTRO: Record<PortfolioCategory, { title: string; description: string }> =
  {
    "book-covers": {
      title: "Book Cover Design",
      description:
        "A collection of bespoke literary jackets and book cover layouts. Click on any project to explore the 3D presentation mockup, sketches, and process.",
    },
    illustration: {
      title: "Illustration Portfolio",
      description:
        "A showcase of digital editorial artwork, character design, and visual concepts. Click on any piece to see detail crop zooms, blueprint layouts, and feedback.",
    },
    "fine-art": {
      title: "Fine Art Gallery",
      description:
        "A curatorial collection of physical oils, acrylics, and mixed media works. Click on any piece to view it mounted in our virtual exhibition room under gallery lighting.",
    },
  };

function getSortValue(project: Project, sort: string) {
  const year = Number(project.year ?? 0);
  return sort === "newest" ? -year : year;
}

export default function PortfolioCollection({
  category,
  showIntro = false,
}: PortfolioCollectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    fetch(`/api/projects?category=${category}`)
      .then((response) => response.json())
      .then((data) =>
        setProjects(Array.isArray(data.projects) ? data.projects : []),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const genres = useMemo(() => {
    if (category === "fine-art") return [];
    const tagIndex = category === "book-covers" ? 2 : 1;
    return Array.from(
      new Set(
        projects.map(
          (project) => project.medium ?? project.tags?.[tagIndex] ?? "Other",
        ),
      ),
    ).sort();
  }, [category, projects]);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) => getSortValue(a, sort) - getSortValue(b, sort),
      ),
    [projects, sort],
  );

  const filteredFineArt = sortedProjects.filter(
    (project) =>
      category !== "fine-art" ||
      filter === "All" ||
      (project.details ?? "").includes(filter),
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm uppercase tracking-widest text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <section className="px-6 py-12 text-[#D4D4D4] md:px-10">
      {showIntro ? (
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-[#C5A059]">
            Portfolio
          </span>
          <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
            {INTRO[category].title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            {INTRO[category].description}
          </p>
        </div>
      ) : null}

      {projects.length === 0 ? (
        <div className="py-24 text-center text-sm uppercase tracking-widest text-gray-600">
          No{" "}
          {category === "fine-art"
            ? "fine art"
            : category === "book-covers"
              ? "book covers"
              : "illustrations"}{" "}
          published yet.
        </div>
      ) : category === "fine-art" ? (
        <>
          <PortfolioControls
            filterOptions={["Available", "Sold", "Private Collection"]}
            currentFilter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredFineArt.map((project) => (
              <BehanceCard
                key={project.id}
                id={project.id}
                title={project.title}
                type="fine-art"
                genreOrMedium={project.medium ?? "Mixed Media"}
                year={Number(project.year ?? 2024)}
                likes={project.likes}
                views={project.views}
                detailUrl={`/fine-art/${project.id}`}
                imageUrl={project.coverImage || undefined}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <PortfolioControls
            filterOptions={genres}
            currentFilter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
            wrap={category === "book-covers"}
          />
          {(filter === "All" ? genres : [filter]).map((genre) => {
            const genreProjects = sortedProjects.filter(
              (project) =>
                (project.medium ??
                  project.tags?.[category === "book-covers" ? 2 : 1] ??
                  "Other") === genre,
            );
            if (!genreProjects.length) return null;

            return (
              <section key={genre} className="mb-20">
                <div className="mb-8 flex items-baseline justify-between border-b border-[#222222] pb-4">
                  <h2 className="text-2xl font-bold text-white">{genre}</h2>
                  <span className="text-xs font-semibold text-gray-500">
                    {genreProjects.length}{" "}
                    {category === "book-covers" ? "Projects" : "Artworks"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {genreProjects.map((project) => (
                    <BehanceCard
                      key={project.id}
                      id={project.id}
                      title={project.title}
                      type={
                        category === "book-covers"
                          ? "book-cover"
                          : "illustration"
                      }
                      genreOrMedium={project.medium ?? genre}
                      year={Number(project.year ?? 2024)}
                      likes={project.likes}
                      views={project.views}
                      detailUrl={`/${category}/${project.id}`}
                      imageUrl={project.coverImage || undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}
