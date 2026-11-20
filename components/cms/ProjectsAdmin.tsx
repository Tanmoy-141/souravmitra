"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import MediaLibrary from "./MediaLibrary";
import BehanceProjectBuilder from "./BehanceProjectBuilder";
import { parseBehancePresentation } from "@/lib/behance-modules";
import { safeUrlOrFallback } from "@/lib/sanitize";
import type { Project, MediaAsset } from "@/db/schema";

type Category = "book-covers" | "illustration" | "fine-art";

const CATEGORY_LABELS: Record<Category, string> = {
  "book-covers": "Book Covers",
  illustration: "Illustration",
  "fine-art": "Fine Art",
};

export const AVAILABILITY_OPTIONS = [
  "Available",
  "Sold",
  "Private Collection",
] as const;

export type AvailabilityOption = (typeof AVAILABILITY_OPTIONS)[number];

function getAvailabilityFromTags(tagsStr: string): string {
  const parts = tagsStr.split(",").map((t) => t.trim().toLowerCase());
  for (const opt of AVAILABILITY_OPTIONS) {
    if (parts.includes(opt.toLowerCase())) {
      return opt;
    }
  }
  return "";
}

function updateAvailabilityInTags(tagsStr: string, option: string): string {
  const current = getAvailabilityFromTags(tagsStr);
  const otherTags = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length > 0 &&
        !AVAILABILITY_OPTIONS.some(
          (opt) => opt.toLowerCase() === t.toLowerCase(),
        ),
    );

  if (current.toLowerCase() === option.toLowerCase()) {
    // Deselect if already active
    return otherTags.join(", ");
  }

  // Set new option
  return option ? [...otherTags, option].join(", ") : otherTags.join(", ");
}

const EMPTY_DETAILS_FORM = {
  title: "",
  category: "book-covers" as Category,
  status: "published" as "draft" | "published",
  medium: "",
  dimensions: "",
  publisher: "",
  year: String(new Date().getFullYear()),
  description: "",
  details: "",
  tags: "",
  coverImage: "",
  images: [] as string[],
  isFeatured: false,
};

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dual Workflow targets:
  // 1. Details Modal target (quick metadata & info edit)
  const [detailsModalTarget, setDetailsModalTarget] = useState<null | "new" | Project>(null);
  const [detailsForm, setDetailsForm] = useState({ ...EMPTY_DETAILS_FORM });
  const [savingDetails, setSavingDetails] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<null | "cover" | "gallery">(null);

  // 2. Visual Canvas Builder target (multi-module vertical Behance canvas)
  const [builderTarget, setBuilderTarget] = useState<null | "new" | Project>(null);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects?all=true");
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      showMsg("Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const visibleProjects = categoryFilter === "all"
    ? projects
    : projects.filter((p) => p.category === categoryFilter);

  const patchProject = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        showMsg("Delete failed", "error");
        return;
      }
      showMsg("Project deleted");
      fetchProjects();
    } catch {
      showMsg("Delete failed", "error");
    }
  };

  const handleToggleFeatured = async (p: Project) => {
    try {
      const ok = await patchProject(p.id, { isFeatured: !p.isFeatured });
      if (!ok) {
        showMsg("Failed to update", "error");
        return;
      }
      fetchProjects();
    } catch {
      showMsg("Failed to update", "error");
    }
  };

  const handleToggleStatus = async (p: Project) => {
    try {
      const ok = await patchProject(p.id, {
        status: p.status === "published" ? "draft" : "published",
      });
      if (!ok) {
        showMsg("Failed to update", "error");
        return;
      }
      fetchProjects();
    } catch {
      showMsg("Failed to update", "error");
    }
  };

  const handleMove = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= visibleProjects.length) return;

    const reordered = [...visibleProjects];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const changes = reordered
      .map((proj, position) => ({ proj, position }))
      .filter(({ proj, position }) => proj.sortOrder !== position);
    if (changes.length === 0) return;

    try {
      const results = await Promise.all(
        changes.map(({ proj, position }) =>
          patchProject(proj.id, { sortOrder: position }),
        ),
      );
      if (results.some((ok) => !ok)) {
        showMsg("Could not change the order. Please try again.", "error");
      }
    } catch {
      showMsg("Network error while changing the order", "error");
    }
    fetchProjects();
  };

  const handleQuickSetAvailability = async (p: Project, option: string) => {
    const currentTags = (p.tags as string[]) ?? [];
    const otherTags = currentTags.filter(
      (t) =>
        !AVAILABILITY_OPTIONS.some(
          (opt) => opt.toLowerCase() === t.trim().toLowerCase(),
        ),
    );
    const newTags = option ? [...otherTags, option] : otherTags;

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === p.id ? { ...proj, tags: newTags } : proj,
      ),
    );

    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showMsg("Failed to update availability tag", "error");
        fetchProjects();
        return;
      }
      showMsg(
        option
          ? `Tagged "${p.title}" as ${option}`
          : `Cleared tag for "${p.title}"`,
      );
    } catch {
      showMsg("Network error updating tag", "error");
      fetchProjects();
    }
  };

  // Open Details Modal with prefilled project info
  const openDetailsModal = (target: "new" | Project) => {
    if (target === "new") {
      setDetailsForm({
        ...EMPTY_DETAILS_FORM,
        category: categoryFilter === "all" ? "book-covers" : categoryFilter,
      });
    } else {
      setDetailsForm({
        title: target.title ?? "",
        category: (target.category as Category) ?? "book-covers",
        status: (target.status as "draft" | "published") ?? "published",
        medium: target.medium ?? "",
        dimensions: target.dimensions ?? "",
        publisher: target.publisher ?? "",
        year: target.year ?? String(new Date().getFullYear()),
        description: target.description ?? "",
        details: target.details ?? "",
        tags: ((target.tags as string[]) ?? []).join(", "),
        coverImage: target.coverImage ?? "",
        images: Array.isArray(target.images) ? (target.images as string[]) : [],
        isFeatured: target.isFeatured ?? false,
      });
    }
    setDetailsModalTarget(target);
  };

  // Save Project Details from the clean modal
  const handleSaveDetails = async (andOpenBuilder: boolean = false) => {
    if (!detailsForm.title.trim()) {
      showMsg("Project title is required", "error");
      return;
    }

    setSavingDetails(true);

    const parsedTags = detailsForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const effectiveCover = detailsForm.coverImage.trim() || detailsForm.images[0] || "";

    const payload = {
      title: detailsForm.title.trim(),
      category: detailsForm.category,
      status: detailsForm.status,
      medium: detailsForm.medium.trim() || null,
      dimensions: detailsForm.dimensions.trim() || null,
      publisher: detailsForm.publisher.trim() || null,
      year: detailsForm.year.trim() || String(new Date().getFullYear()),
      description: detailsForm.description.trim() || null,
      details: detailsForm.details.trim() || null,
      tags: parsedTags,
      coverImage: effectiveCover,
      images: detailsForm.images,
      isFeatured: detailsForm.isFeatured,
    };

    try {
      const isNew = detailsModalTarget === "new" || !detailsModalTarget?.id;
      const url = isNew ? "/api/projects" : `/api/projects/${detailsModalTarget.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.project) {
        showMsg(data.message || "Failed to save project details", "error");
        return;
      }

      const savedProject = data.project as Project;
      showMsg(isNew ? "Project created successfully!" : "Project details updated!");
      setDetailsModalTarget(null);
      await fetchProjects();

      if (andOpenBuilder) {
        setBuilderTarget(savedProject);
      }
    } catch {
      showMsg("Network error saving project details", "error");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setDetailsForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSetGalleryImageAsCover = (url: string) => {
    setDetailsForm((prev) => ({ ...prev, coverImage: url }));
    showMsg("Set as cover image");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(["all", "book-covers", "illustration", "fine-art"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold border transition-colors cursor-pointer ${
                categoryFilter === c
                  ? "bg-[#C5A059] text-black border-[#C5A059]"
                  : "text-gray-400 border-[#2e2e2e] hover:text-white hover:border-[#555]"
              }`}>
              {c === "all" ? `All (${projects.length})` : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Grid / List Toggle */}
          <div className="inline-flex rounded-full border border-[#2a2a2a] bg-[#0a0a0a] p-0.5 text-[11px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#1e1e1e] text-[#C5A059]"
                  : "text-gray-500 hover:text-white"
              }`}>
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#1e1e1e] text-[#C5A059]"
                  : "text-gray-500 hover:text-white"
              }`}>
              List
            </button>
          </div>

          {/* Quick Edit Details Launcher */}
          <button
            type="button"
            onClick={() => openDetailsModal("new")}
            className="px-4 py-2 rounded-full bg-[#C5A059] text-black text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors cursor-pointer shadow-lg shadow-[#C5A059]/20 flex items-center gap-1.5">
            <span>+ Edit Details</span>
          </button>

          {/* Visual Canvas Builder Launcher */}
          <button
            type="button"
            onClick={() => setBuilderTarget("new")}
            className="px-4 py-2 rounded-full bg-[#141414] border border-[#C5A059]/60 text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            title="Open visual canvas builder to arrange images, grids, and editorial text">
            <span>+ Canvas Builder</span>
          </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`mb-4 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md ${
          message.type === "success" ? "bg-green-900/30 text-green-400 border border-green-800/40" : "bg-red-900/30 text-red-400 border border-red-800/40"
        }`}>
          {message.text}
        </div>
      )}

      {/* Project list / grid */}
      {loading ? (
        <div className="text-center text-gray-500 text-xs uppercase tracking-widest py-12">Loading projects...</div>
      ) : visibleProjects.length === 0 ? (
        <div className="text-center text-gray-600 text-xs uppercase tracking-widest py-12">
          No projects found in this category &mdash; click &ldquo;+ Edit Details&rdquo; to add one.
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-8">
          {visibleProjects.map((p, index) => {
            const pres = parseBehancePresentation({
              title: p.title,
              coverImage: p.coverImage,
              images: (p.images as string[]) ?? [],
              description: p.description,
              details: p.details,
            });
            const avail = ((p.tags as string[]) ?? []).find((t) =>
              AVAILABILITY_OPTIONS.some(
                (opt) => opt.toLowerCase() === t.trim().toLowerCase(),
              ),
            );
            return (
              <div
                key={p.id}
                className="group bg-[#0a0a0a] border border-[#222] hover:border-[#C5A059]/60 rounded-lg overflow-hidden flex flex-col transition-all">
                {/* Cover preview */}
                <button
                  type="button"
                  onClick={() => openDetailsModal(p)}
                  className="relative aspect-4/3 w-full bg-[#111] overflow-hidden cursor-pointer text-left focus:outline-none">
                  {p.coverImage ? (
                    <Image
                      src={p.coverImage}
                      alt={p.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs uppercase tracking-widest">
                      No Cover Image
                    </div>
                  )}

                  {/* Top-left Status / Featured Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
                        p.status === "published"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                          : "bg-black/80 text-gray-300 border border-white/15"
                      }`}>
                      {p.status}
                    </span>
                    {p.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#C5A059] text-black">
                        Featured
                      </span>
                    )}
                    {avail && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/80 text-sky-300 border border-sky-500/40 backdrop-blur-md">
                        {avail}
                      </span>
                    )}
                  </div>

                  {/* Top-right Section Count */}
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-mono text-gray-200">
                    {pres.modules.length} {pres.modules.length === 1 ? "section" : "sections"}
                  </span>

                  {/* Hover Edit Overlay */}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-[#C5A059] text-black text-xs font-bold uppercase tracking-wider shadow-xl">
                      Edit Details
                    </span>
                  </div>
                </button>

                {/* Card Details & Dual Actions */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white text-sm font-serif font-bold truncate">
                        {p.title}
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {CATEGORY_LABELS[p.category as Category]} &bull; {p.year ?? "—"} &bull; {p.likes} likes &bull; {p.views} views
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move up">
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === visibleProjects.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move down">
                        &darr;
                      </button>
                    </div>
                  </div>

                  {p.category === "fine-art" && (
                    <select
                      value={avail ?? ""}
                      onChange={(e) => handleQuickSetAvailability(p, e.target.value)}
                      className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 bg-black border border-[#2a2a2a] rounded text-gray-300 focus:border-[#C5A059] focus:outline-none cursor-pointer">
                      <option value="">No Availability Tag</option>
                      <option value="Available">Available</option>
                      <option value="Sold">Sold</option>
                      <option value="Private Collection">Private Collection</option>
                    </select>
                  )}

                  <div className="mt-auto pt-3 border-t border-[#181818] flex flex-wrap items-center gap-1.5">
                    {/* Primary Button: Edit Details */}
                    <button
                      type="button"
                      onClick={() => openDetailsModal(p)}
                      className="px-3 py-1.5 rounded bg-[#C5A059] text-black hover:bg-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      title="Edit metadata, description, medium, year, publisher, dimensions, tags & images">
                      Edit Details
                    </button>

                    {/* Secondary Button: Canvas Builder */}
                    <button
                      type="button"
                      onClick={() => setBuilderTarget(p)}
                      className="px-2.5 py-1.5 rounded border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                      title="Open full visual presentation canvas">
                      Canvas
                    </button>

                    {/* Status Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className="px-2 py-1.5 rounded border border-[#2e2e2e] text-gray-400 hover:text-white text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                      {p.status === "published" ? "Unpublish" : "Publish"}
                    </button>

                    {/* Featured Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(p)}
                      className={`px-2 py-1.5 rounded border text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        p.isFeatured
                          ? "border-[#C5A059] text-[#C5A059]"
                          : "border-[#2e2e2e] text-gray-500 hover:text-white"
                      }`}>
                      {p.isFeatured ? "Unfeature" : "Feature"}
                    </button>

                    {/* Live View Link */}
                    <a
                      href={safeUrlOrFallback(
                        `/${encodeURIComponent(p.category)}/${encodeURIComponent(p.id)}`,
                        "#",
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1.5 rounded border border-[#2e2e2e] text-gray-400 hover:text-[#C5A059] text-[10px] font-semibold uppercase tracking-wider transition-colors">
                      View &#8599;
                    </a>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.title)}
                      className="ml-auto px-2 py-1.5 rounded border border-[#2e2e2e] text-rose-500/80 hover:text-rose-400 text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-2 overflow-y-auto">
          {visibleProjects.map((p, index) => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] hover:border-[#333] transition-colors rounded-lg">
              {/* Cover thumbnail */}
              <button
                type="button"
                onClick={() => openDetailsModal(p)}
                className="w-14 h-14 shrink-0 bg-[#111] relative overflow-hidden rounded cursor-pointer group/thumb">
                {p.coverImage ? (
                  <Image src={p.coverImage} alt={p.title} fill unoptimized className="object-cover group-hover/thumb:scale-105 transition-transform" sizes="56px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] uppercase">
                    No img
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">{p.title}</span>
                  {p.isFeatured && (
                    <span className="text-[9px] bg-[#C5A059] text-black px-1.5 py-0.5 font-bold uppercase rounded-sm">
                      Featured
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase rounded-sm ${
                    p.status === "published" ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"
                  }`}>
                    {p.status}
                  </span>
                  {(() => {
                    const avail = ((p.tags as string[]) ?? []).find((t) =>
                      AVAILABILITY_OPTIONS.some(
                        (opt) => opt.toLowerCase() === t.trim().toLowerCase(),
                      ),
                    );
                    if (!avail) return null;
                    const isAvailable = avail.toLowerCase() === "available";
                    const isSold = avail.toLowerCase() === "sold";
                    return (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider border rounded-sm ${
                          isAvailable
                            ? "border-sky-500/50 bg-sky-950/40 text-sky-400"
                            : isSold
                              ? "border-rose-500/50 bg-rose-950/40 text-rose-400"
                              : "border-purple-500/50 bg-purple-950/40 text-purple-300"
                        }`}>
                        {avail}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-gray-500 text-[11px] mt-0.5">
                  {CATEGORY_LABELS[p.category as Category]} &bull; {p.year ?? "—"} &bull; {p.medium || "No medium specified"} &bull; {p.likes} likes &bull; {p.views} views
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20 cursor-pointer"
                  title="Move up">
                  &uarr;
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === visibleProjects.length - 1}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20 cursor-pointer"
                  title="Move down">
                  &darr;
                </button>

                {/* Edit Details */}
                <button
                  type="button"
                  onClick={() => openDetailsModal(p)}
                  className="text-[10px] px-2.5 py-1 bg-[#C5A059] text-black hover:bg-white font-bold uppercase tracking-wider transition-colors cursor-pointer rounded">
                  Edit Details
                </button>

                {/* Canvas Builder */}
                <button
                  type="button"
                  onClick={() => setBuilderTarget(p)}
                  className="text-[10px] px-2.5 py-1 border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-black font-semibold uppercase tracking-wider transition-colors cursor-pointer rounded"
                  title="Open presentation canvas">
                  Canvas
                </button>

                <button
                  onClick={() => handleToggleFeatured(p)}
                  className={`text-[10px] px-2 py-1 border transition-colors rounded ${
                    p.isFeatured
                      ? "border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10"
                      : "border-[#333] text-gray-500 hover:text-white"
                  }`}>
                  {p.isFeatured ? "Unfeature" : "Feature"}
                </button>

                <button
                  onClick={() => handleToggleStatus(p)}
                  className="text-[10px] px-2 py-1 border border-[#333] text-gray-400 hover:text-white transition-colors rounded">
                  {p.status === "published" ? "Unpublish" : "Publish"}
                </button>

                {p.category === "fine-art" && (
                  <select
                    value={
                      ((p.tags as string[]) ?? []).find((t) =>
                        AVAILABILITY_OPTIONS.some(
                          (opt) =>
                            opt.toLowerCase() === t.trim().toLowerCase(),
                        ),
                      ) ?? ""
                    }
                    onChange={(e) =>
                      handleQuickSetAvailability(p, e.target.value)
                    }
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-black border border-[#333] text-gray-300 hover:border-[#555] focus:border-[#C5A059] focus:outline-none cursor-pointer rounded"
                    title="Change availability status tag">
                    <option value="">No Status Tag</option>
                    <option value="Available">Available</option>
                    <option value="Sold">Sold</option>
                    <option value="Private Collection">Private Collection</option>
                  </select>
                )}

                <a
                  href={safeUrlOrFallback(
                    `/${encodeURIComponent(p.category)}/${encodeURIComponent(p.id)}`,
                    "#",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2 py-1 border border-[#333] text-gray-400 hover:text-white transition-colors rounded"
                  title="View live page">
                  &#8599;
                </a>

                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  className="text-[10px] px-2 py-1 border border-[#333] text-rose-500/80 hover:text-rose-400 transition-colors rounded">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =====================================================================
          EDIT PROJECT DETAILS MODAL (Dedicated, fast, and easy metadata editor)
         ===================================================================== */}
      {detailsModalTarget !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setDetailsModalTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit project details">
          <div
            className="w-full max-w-3xl max-h-[92vh] bg-[#0c0c0c] border border-[#262626] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1f1f1f] px-6 py-4 shrink-0 bg-[#0e0e0e]">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center font-bold text-sm">
                  &Xi;
                </span>
                <div>
                  <h2 className="text-base font-serif font-bold text-white">
                    {detailsModalTarget === "new" ? "Add New Project" : "Edit Project Details"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {detailsForm.title || "Untitled Project"} &bull; {CATEGORY_LABELS[detailsForm.category]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Shortcut to switch directly to Canvas Builder */}
                <button
                  type="button"
                  onClick={() => handleSaveDetails(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181818] border border-[#C5A059]/40 hover:border-[#C5A059] text-[#C5A059] text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Save details and open visual layout canvas">
                  <span>Open Canvas Builder</span>
                  <span>&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsModalTarget(null)}
                  className="w-8 h-8 rounded-full bg-[#181818] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer text-lg"
                  aria-label="Close dialog">
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Scrollable Form Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDetails(false);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Core Information */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-3">
                  1. Core Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-8">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Project Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={detailsForm.title}
                      onChange={(e) =>
                        setDetailsForm({ ...detailsForm, title: e.target.value })
                      }
                      placeholder="e.g. The Wind-Up Bird Chronicle"
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Category
                    </label>
                    <select
                      value={detailsForm.category}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          category: e.target.value as Category,
                        })
                      }
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none cursor-pointer">
                      <option value="book-covers">Book Covers</option>
                      <option value="illustration">Illustration</option>
                      <option value="fine-art">Fine Art</option>
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Publication Status
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDetailsForm({ ...detailsForm, status: "published" })
                        }
                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-colors cursor-pointer ${
                          detailsForm.status === "published"
                            ? "bg-emerald-950/70 border-emerald-500/70 text-emerald-300"
                            : "bg-[#141414] border-[#2a2a2a] text-gray-400 hover:text-white"
                        }`}>
                        Published Live
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailsForm({ ...detailsForm, status: "draft" })
                        }
                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-colors cursor-pointer ${
                          detailsForm.status === "draft"
                            ? "bg-amber-950/70 border-amber-500/70 text-amber-300"
                            : "bg-[#141414] border-[#2a2a2a] text-gray-400 hover:text-white"
                        }`}>
                        Draft Mode
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Year Created / Published
                    </label>
                    <input
                      type="text"
                      value={detailsForm.year}
                      onChange={(e) =>
                        setDetailsForm({ ...detailsForm, year: e.target.value })
                      }
                      placeholder="e.g. 2025"
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Artwork & Publishing Specifications */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-3">
                  2. Artwork &amp; Publishing Specifications
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Medium / Style
                    </label>
                    <input
                      type="text"
                      value={detailsForm.medium}
                      onChange={(e) =>
                        setDetailsForm({ ...detailsForm, medium: e.target.value })
                      }
                      placeholder="e.g. Literary Fiction, Oil on Canvas"
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      value={detailsForm.dimensions}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          dimensions: e.target.value,
                        })
                      }
                      placeholder='e.g. 24" x 36" (60 x 90 cm)'
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Publisher / Client
                    </label>
                    <input
                      type="text"
                      value={detailsForm.publisher}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          publisher: e.target.value,
                        })
                      }
                      placeholder="e.g. Penguin Random House"
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Availability Pills (Especially Fine Art) */}
                <div className="mt-3.5">
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">
                    Artwork Availability Tag
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTIONS.map((opt) => {
                      const active =
                        getAvailabilityFromTags(detailsForm.tags).toLowerCase() ===
                        opt.toLowerCase();
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setDetailsForm({
                              ...detailsForm,
                              tags: updateAvailabilityInTags(detailsForm.tags, opt),
                            })
                          }
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                            active
                              ? "bg-[#C5A059] text-black border-[#C5A059]"
                              : "bg-[#141414] text-gray-400 border-[#2a2a2a] hover:text-white hover:border-[#444]"
                          }`}>
                          {opt}
                        </button>
                      );
                    })}
                    {getAvailabilityFromTags(detailsForm.tags) && (
                      <button
                        type="button"
                        onClick={() =>
                          setDetailsForm({
                            ...detailsForm,
                            tags: updateAvailabilityInTags(
                              detailsForm.tags,
                              getAvailabilityFromTags(detailsForm.tags),
                            ),
                          })
                        }
                        className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-rose-400 underline cursor-pointer">
                        Clear Tag
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Story, Description & Editorial Statement */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-3">
                  3. Project Story &amp; Artist Statement
                </p>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1">
                    Editorial Notes / Concept Story
                  </label>
                  <textarea
                    rows={4}
                    value={detailsForm.description}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the inspiration, artistic direction, brushwork technique, or story behind this project..."
                    className="w-full bg-[#141414] border border-[#2a2a2a] text-white p-3 text-xs rounded focus:border-[#C5A059] focus:outline-none leading-relaxed"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    This text is featured on the project presentation page and indexed for search.
                  </p>
                </div>
              </div>

              {/* Section 4: Tags & Spotlight */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-3">
                  4. Tags &amp; Spotlight Feature
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Creative Fields &amp; Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={detailsForm.tags}
                      onChange={(e) =>
                        setDetailsForm({ ...detailsForm, tags: e.target.value })
                      }
                      placeholder="e.g. Typography, Cover Art, Charcoal, Editorial"
                      className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                    />
                    {detailsForm.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {detailsForm.tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a1a] text-gray-300 border border-[#2c2c2c]">
                              #{tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={detailsForm.isFeatured}
                      onChange={(e) =>
                        setDetailsForm({
                          ...detailsForm,
                          isFeatured: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#C5A059]"
                    />
                    <span className="text-xs text-gray-300 font-medium">
                      Feature this project in portfolio spotlight
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 5: Cover Image & Gallery Artwork */}
              <div className="border-t border-[#1a1a1a] pt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-3">
                  5. Project Cover &amp; Gallery Images
                </p>

                {/* Cover Image */}
                <div className="mb-5">
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">
                    Cover Image
                  </label>
                  <div className="flex gap-3 items-start">
                    <div className="relative w-28 h-20 rounded bg-[#161616] border border-[#2c2c2c] overflow-hidden shrink-0">
                      {detailsForm.coverImage ? (
                        <Image
                          src={detailsForm.coverImage}
                          alt="Cover preview"
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="112px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600 uppercase">
                          No Cover
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={detailsForm.coverImage}
                          onChange={(e) =>
                            setDetailsForm({
                              ...detailsForm,
                              coverImage: e.target.value,
                            })
                          }
                          placeholder="Paste image URL..."
                          className="flex-1 bg-[#141414] border border-[#2a2a2a] text-white px-3 py-1.5 text-xs rounded focus:border-[#C5A059] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setMediaPickerMode("cover")}
                          className="px-3 py-1.5 rounded bg-[#1c1c1c] border border-[#C5A059]/50 hover:bg-[#C5A059] hover:text-black text-[#C5A059] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0">
                          Pick Cover
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        This is the primary thumbnail shown on the homepage and project cards.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Gallery Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] text-gray-400 font-medium">
                      Gallery Images ({detailsForm.images.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => setMediaPickerMode("gallery")}
                      className="px-3 py-1 rounded-full bg-[#181818] border border-[#333] hover:border-[#C5A059] text-gray-300 hover:text-[#C5A059] text-[11px] font-semibold transition-colors cursor-pointer">
                      + Add Gallery Image
                    </button>
                  </div>

                  {detailsForm.images.length === 0 ? (
                    <div className="p-4 rounded border border-dashed border-[#242424] text-center text-xs text-gray-600">
                      No additional gallery images. Click &ldquo;+ Add Gallery Image&rdquo; to attach more artwork photos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {detailsForm.images.map((imgUrl, gIdx) => (
                        <div
                          key={`${imgUrl}-${gIdx}`}
                          className="group/gal relative aspect-square rounded bg-[#141414] border border-[#282828] overflow-hidden">
                          <Image
                            src={imgUrl}
                            alt={`Gallery image ${gIdx + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="120px"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/gal:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                            <button
                              type="button"
                              onClick={() => handleSetGalleryImageAsCover(imgUrl)}
                              className="px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-[#C5A059] font-bold uppercase tracking-wider hover:bg-[#C5A059] hover:text-black transition-colors cursor-pointer"
                              title="Set as project cover">
                              Set Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(gIdx)}
                              className="px-1.5 py-0.5 rounded bg-rose-950/80 text-[9px] text-rose-300 font-bold uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                              title="Remove image">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-[#1f1f1f] px-6 py-4 bg-[#0e0e0e] shrink-0 gap-3">
              <button
                type="button"
                onClick={() => setDetailsModalTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#2e2e2e] text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => handleSaveDetails(true)}
                  className="px-4 py-2 rounded-lg bg-[#181818] border border-[#C5A059]/50 hover:border-[#C5A059] text-[#C5A059] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer">
                  Save &amp; Open Canvas
                </button>

                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => handleSaveDetails(false)}
                  className="px-5 py-2 rounded-lg bg-[#C5A059] hover:bg-white text-black text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer shadow-lg shadow-[#C5A059]/20">
                  {savingDetails ? "Saving..." : "Save Details"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Picker Modal for Cover or Gallery Images */}
      {mediaPickerMode !== null && (
        <MediaLibrary
          onSelect={(asset: MediaAsset) => {
            if (mediaPickerMode === "cover") {
              setDetailsForm((prev) => ({ ...prev, coverImage: asset.blobUrl }));
            } else if (mediaPickerMode === "gallery") {
              setDetailsForm((prev) => ({
                ...prev,
                images: [...prev.images, asset.blobUrl],
                coverImage: prev.coverImage || asset.blobUrl,
              }));
            }
            setMediaPickerMode(null);
          }}
          onClose={() => setMediaPickerMode(null)}
        />
      )}

      {/* Full-Screen Visual Canvas Builder (Behance-style presentation builder) */}
      {builderTarget !== null && (
        <BehanceProjectBuilder
          project={builderTarget === "new" ? null : builderTarget}
          defaultCategory={
            categoryFilter === "all" ? "book-covers" : categoryFilter
          }
          onClose={() => setBuilderTarget(null)}
          onSaved={() => {
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
