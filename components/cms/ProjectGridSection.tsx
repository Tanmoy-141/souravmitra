"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/db/schema";

/**
 * Real replacement for the GrapesJS "Project Grid" block placeholder.
 * Rendered by CmsDynamicBlockPortal wherever the `data-cms-block="project-grid"`
 * marker appears in a page's published HTML.
 */
export default function ProjectGridSection() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.projects && Array.isArray(data.projects)) {
          setItems(data.projects);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects for ProjectGridSection:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="py-16 px-8 text-center text-gray-500 text-xs uppercase tracking-widest">
        Loading projects...
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="py-16 px-8 text-center text-gray-500 text-xs uppercase tracking-widest">
        No published projects yet.
      </section>
    );
  }

  return (
    <section className="py-16 px-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {items.map((project) => {
          const imageUrl = project.coverImage || project.images?.[0];
          return (
            <Link
              key={project.id}
              href={`/${project.category}/${project.id}`}
              className="group block">
              <div className="relative aspect-4/5 bg-gray-900 border border-[#333333] overflow-hidden">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={project.title}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 uppercase tracking-widest">
                    No image
                  </div>
                )}
              </div>

              <h3 className="mt-3 text-white font-serif text-lg">
                {project.title}
              </h3>

              {project.medium ? (
                <p className="text-xs text-gray-500 uppercase tracking-widest">
                  {project.medium}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
