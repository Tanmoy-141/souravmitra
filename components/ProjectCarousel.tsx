"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "@/db/schema";

export default function ProjectCarousel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/projects", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load featured projects");
        return response.json();
      })
      .then((data: { projects?: Project[] }) => {
        if (Array.isArray(data.projects)) {
          const featured = data.projects.filter(
            (project) => project.isFeatured,
          );
          setProjects((featured.length ? featured : data.projects).slice(0, 8));
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isPaused || projects.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % projects.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isPaused, projects.length]);

  if (projects.length === 0) return null;

  const project = projects[activeIndex];
  const move = (direction: -1 | 1) => {
    setActiveIndex(
      (index) => (index + direction + projects.length) % projects.length,
    );
  };
  const imageUrl = project.coverImage || project.images?.[0];

  return (
    <section
      aria-label="Featured projects"
      aria-roledescription="carousel"
      className="relative isolate h-120 overflow-hidden border-y border-white/10 bg-[#111] text-white md:h-150"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          !(nextTarget instanceof Node) ||
          !event.currentTarget.contains(nextTarget)
        ) {
          setIsPaused(false);
        }
      }}>
      <div
        key={project.id}
        role="group"
        aria-roledescription="slide"
        aria-label={`${activeIndex + 1} of ${projects.length}`}
        className="project-carousel-reveal absolute inset-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={project.title}
            fill
            priority={activeIndex === 0}
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,#5b5146_0%,#222_42%,#090909_100%)]" />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/45 to-black/10" />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-black/10" />

        <div className="relative z-10 flex h-full items-end px-6 pb-24 md:items-center md:px-16 md:pb-16 lg:px-24">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#e1bf78]">
              Featured Work · {project.category.replaceAll("-", " ")}
            </p>
            <h2 className="text-4xl font-serif leading-tight md:text-6xl">
              {project.title}
            </h2>
            {project.medium ? (
              <p className="mt-3 text-sm uppercase tracking-widest text-white/70">
                {project.medium}
              </p>
            ) : null}
            <Link
              href={`/${project.category}/${project.id}`}
              className="mt-7 inline-flex min-h-11 items-center border border-white/70 px-5 text-xs font-bold uppercase tracking-widest transition-colors hover:border-white hover:bg-white hover:text-black">
              View Project
            </Link>
          </div>
        </div>
      </div>

      {projects.length > 1 ? (
        <div className="absolute bottom-5 left-6 right-6 z-20 flex items-center justify-between md:bottom-8 md:left-16 md:right-16 lg:left-24 lg:right-24">
          <div
            className="flex items-center gap-2"
            aria-label="Choose featured project">
            {projects.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show slide ${index + 1}: ${item.title}`}
                aria-current={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-[width,background-color] ${
                  index === activeIndex
                    ? "w-8 bg-[#e1bf78]"
                    : "w-2.5 bg-white/55 hover:bg-white"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous project"
              onClick={() => move(-1)}
              className="min-h-11 min-w-11 border border-white/50 bg-black/30 text-lg hover:bg-white hover:text-black">
              <span aria-hidden="true">&#8592;</span>
            </button>
            <button
              type="button"
              aria-label="Next project"
              onClick={() => move(1)}
              className="min-h-11 min-w-11 border border-white/50 bg-black/30 text-lg hover:bg-white hover:text-black">
              <span aria-hidden="true">&#8594;</span>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
