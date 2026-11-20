"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { Project, MediaAsset } from "@/db/schema";
import MediaLibrary from "./MediaLibrary";
import {
  BEHANCE_CANVAS_PRESETS,
  createModuleId,
  extractAllModuleImages,
  isLightCanvasColor,
  parseBehancePresentation,
  serializeBehancePresentation,
  type BehanceModule,
} from "@/lib/behance-modules";
import { isSafeImageUrl, safeUrlOrFallback, isSafeUrl } from "@/lib/sanitize";

type Category = "book-covers" | "illustration" | "fine-art";

const CATEGORY_LABELS: Record<Category, string> = {
  "book-covers": "Book Covers",
  illustration: "Illustration",
  "fine-art": "Fine Art",
};

const AVAILABILITY_OPTIONS = ["Available", "Sold", "Private Collection"] as const;

function getAvailabilityFromTags(tagsStr: string): string {
  const tags = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    tags.find((t) =>
      AVAILABILITY_OPTIONS.some(
        (opt) => opt.toLowerCase() === t.toLowerCase(),
      ),
    ) ?? ""
  );
}

function setAvailabilityInTags(tagsStr: string, option: string): string {
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
  if (!option) return otherTags.join(", ");
  return [...otherTags, option].join(", ");
}

type MediaPickerTarget =
  | null
  | { kind: "cover" }
  | { kind: "new-image"; insertAt?: number }
  | { kind: "replace-image"; moduleId: string }
  | { kind: "add-grid-image"; moduleId: string };

interface BehanceProjectBuilderProps {
  project: Project | null; // null = creating a brand-new project
  defaultCategory?: Category;
  onClose: () => void;
  onSaved: (saved: Project) => void;
}

export default function BehanceProjectBuilder({
  project,
  defaultCategory = "book-covers",
  onClose,
  onSaved,
}: BehanceProjectBuilderProps) {
  const initialPresentation = useMemo(
    () =>
      project
        ? parseBehancePresentation({
            title: project.title,
            coverImage: project.coverImage,
            images: (project.images as string[]) ?? [],
            description: project.description,
            details: project.details,
          })
        : {
            version: 1 as const,
            backgroundColor: "#070707",
            contentSpacing: 0,
            modules: [] as BehanceModule[],
          },
    [project],
  );

  // Metadata state (Behance Settings)
  const [projectId, setProjectId] = useState<string | null>(project?.id ?? null);
  const [title, setTitle] = useState(project?.title ?? "");
  const [category, setCategory] = useState<Category>(
    (project?.category as Category) ?? defaultCategory,
  );
  const [status, setStatus] = useState<"draft" | "published">(
    (project?.status as "draft" | "published") ?? "draft",
  );
  const [medium, setMedium] = useState(project?.medium ?? "");
  const [dimensions, setDimensions] = useState(project?.dimensions ?? "");
  const [publisher, setPublisher] = useState(project?.publisher ?? "");
  const [year, setYear] = useState(
    project?.year ?? String(new Date().getFullYear()),
  );
  const [description, setDescription] = useState(project?.description ?? "");
  const [tags, setTags] = useState(
    ((project?.tags as string[]) ?? []).join(", "),
  );
  const [coverImage, setCoverImage] = useState(project?.coverImage ?? "");
  const [isFeatured, setIsFeatured] = useState(project?.isFeatured ?? false);

  // Behance Canvas state
  const [backgroundColor, setBackgroundColor] = useState(
    initialPresentation.backgroundColor,
  );
  const [contentSpacing, setContentSpacing] = useState(
    initialPresentation.contentSpacing,
  );
  const [modules, setModules] = useState<BehanceModule[]>(
    initialPresentation.modules,
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Right Rail UI state
  const [railTab, setRailTab] = useState<"build" | "styles" | "settings">("build");
  const [mediaTarget, setMediaTarget] = useState<MediaPickerTarget>(null);
  const [savingMode, setSavingMode] = useState<null | "draft" | "published">(null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isLightCanvas = isLightCanvasColor(backgroundColor);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  // Module mutations
  const insertModule = (mod: BehanceModule, atIndex?: number) => {
    setModules((prev) => {
      const next = [...prev];
      if (typeof atIndex === "number" && atIndex >= 0 && atIndex <= next.length) {
        next.splice(atIndex, 0, mod);
      } else {
        next.push(mod);
      }
      return next;
    });
    setSelectedModuleId(mod.id);
    markDirty();
  };

  const addTextModule = (insertAt?: number) => {
    insertModule(
      {
        id: createModuleId("txt"),
        type: "text",
        heading: "",
        body: "",
        align: "center",
        fontStyle: "serif",
      },
      insertAt,
    );
  };

  const addGridModule = (columns: 2 | 3 = 2, insertAt?: number) => {
    const mod: BehanceModule = {
      id: createModuleId("grid"),
      type: "grid",
      columns,
      images: [],
      gap: 12,
    };
    insertModule(mod, insertAt);
    setMediaTarget({ kind: "add-grid-image", moduleId: mod.id });
  };

  const addSpacerModule = (insertAt?: number) => {
    insertModule(
      {
        id: createModuleId("spc"),
        type: "spacer",
        height: 48,
        showDivider: true,
      },
      insertAt,
    );
  };

  const updateModule = (
    moduleId: string,
    updater: (m: BehanceModule) => BehanceModule,
  ) => {
    setModules((prev) => prev.map((m) => (m.id === moduleId ? updater(m) : m)));
    markDirty();
  };

  const moveModule = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= modules.length) return;
    setModules((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  };

  const duplicateModule = (index: number) => {
    const source = modules[index];
    if (!source) return;
    const clone: BehanceModule =
      source.type === "grid"
        ? {
            ...source,
            id: createModuleId("grid"),
            images: source.images.map((i) => ({ ...i })),
          }
        : { ...source, id: createModuleId(source.type) };
    insertModule(clone, index + 1);
  };

  const deleteModule = (moduleId: string) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    if (selectedModuleId === moduleId) setSelectedModuleId(null);
    markDirty();
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    const url = asset.blobUrl;
    if (!mediaTarget) return;

    if (mediaTarget.kind === "cover") {
      setCoverImage(url);
      markDirty();
    } else if (mediaTarget.kind === "new-image") {
      insertModule(
        {
          id: createModuleId("img"),
          type: "image",
          url,
          caption: "",
          layout: "full",
        },
        mediaTarget.insertAt,
      );
      if (!coverImage.trim()) {
        setCoverImage(url);
      }
    } else if (mediaTarget.kind === "replace-image") {
      updateModule(mediaTarget.moduleId, (m) =>
        m.type === "image" ? { ...m, url } : m,
      );
    } else if (mediaTarget.kind === "add-grid-image") {
      updateModule(mediaTarget.moduleId, (m) =>
        m.type === "grid"
          ? { ...m, images: [...m.images, { url, caption: "" }] }
          : m,
      );
      if (!coverImage.trim()) {
        setCoverImage(url);
      }
    }

    setMediaTarget(null);
  };

  const handleSave = async (targetStatus: "draft" | "published") => {
    if (!title.trim()) {
      setRailTab("settings");
      showToast("Please enter a Project Title before saving.", "error");
      return;
    }

    setSavingMode(targetStatus);
    const flatImages = extractAllModuleImages(modules);
    const effectiveCover = coverImage.trim() || flatImages[0] || "";
    const serializedDetails = serializeBehancePresentation({
      version: 1,
      backgroundColor,
      contentSpacing,
      modules,
    });

    const payload = {
      title: title.trim(),
      category,
      status: targetStatus,
      medium: medium.trim(),
      dimensions: dimensions.trim(),
      publisher: publisher.trim(),
      year: year.trim() || String(new Date().getFullYear()),
      description: description.trim(),
      details: serializedDetails,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      coverImage: effectiveCover,
      images: flatImages,
      isFeatured,
    };

    try {
      const res = await fetch(
        projectId ? `/api/projects/${projectId}` : "/api/projects",
        {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.project) {
        showToast(data?.message || "Failed to save project", "error");
        return;
      }

      const saved = data.project as Project;
      setProjectId(saved.id);
      setStatus(saved.status as "draft" | "published");
      if (!coverImage.trim() && effectiveCover) {
        setCoverImage(effectiveCover);
      }
      setDirty(false);
      onSaved(saved);
      showToast(
        targetStatus === "published"
          ? "Project published live!"
          : "Draft saved!",
      );
    } catch {
      showToast("Network error while saving project.", "error");
    } finally {
      setSavingMode(null);
    }
  };

  const safeCategory: Category =
    category === "illustration" || category === "fine-art"
      ? category
      : "book-covers";

  const rawLiveUrl = projectId
    ? `/${encodeURIComponent(safeCategory)}/${encodeURIComponent(projectId)}`
    : null;

  const liveUrl =
    rawLiveUrl && isSafeUrl(rawLiveUrl) ? safeUrlOrFallback(rawLiveUrl, "") : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#000000] text-[#D4D4D4]">
      {/* =====================================================================
          TOP BEHANCE STUDIO HEADER BAR
         ===================================================================== */}
      <header className="h-15 shrink-0 border-b border-[#222222] bg-[#080808] px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-full bg-[#141414] border border-[#2a2a2a] hover:border-[#C5A059] text-xs font-semibold text-gray-300 hover:text-white transition-colors shrink-0 cursor-pointer">
            &larr; Projects
          </button>

          <div className="h-5 w-px bg-[#242424] shrink-0 hidden sm:block" />

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Untitled Project..."
            className="bg-transparent text-white font-serif text-base sm:text-lg font-bold focus:outline-none border-b border-transparent focus:border-[#C5A059] px-1 py-0.5 min-w-0 flex-1 max-w-md placeholder-gray-600"
          />

          <span
            className={`hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
              status === "published"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-800 text-gray-400 border border-neutral-700"
            }`}>
            {status}
          </span>

          {dirty && (
            <span className="hidden lg:inline-block text-[10px] font-mono uppercase tracking-wider text-[#C5A059] shrink-0">
              &bull; Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {Boolean(liveUrl) && status === "published" && (
            <a
              href={safeUrlOrFallback(liveUrl, "#")}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#141414] border border-[#2c2c2c] hover:border-[#C5A059] text-xs font-semibold text-gray-300 hover:text-white transition-colors">
              <span>View Live</span>
              <span aria-hidden="true">&#8599;</span>
            </a>
          )}

          <button
            type="button"
            disabled={savingMode !== null}
            onClick={() => handleSave("draft")}
            className="px-4 py-2 rounded-full bg-[#141414] border border-[#333333] hover:border-white text-xs font-bold uppercase tracking-wider text-gray-200 hover:text-white transition-colors disabled:opacity-40 cursor-pointer">
            {savingMode === "draft" ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={savingMode !== null}
            onClick={() => handleSave("published")}
            className="px-5 py-2 rounded-full bg-[#C5A059] hover:bg-white text-black text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer shadow-lg shadow-[#C5A059]/20">
            {savingMode === "published" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`px-6 py-2 text-center text-xs font-bold uppercase tracking-widest border-b ${
            toast.type === "success"
              ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
              : "bg-rose-950/80 text-rose-300 border-rose-800/60"
          }`}>
          {toast.text}
        </div>
      )}

      {/* =====================================================================
          MAIN WORKSPACE: BEHANCE LIVE CANVAS (LEFT) + TOOL RAIL (RIGHT)
         ===================================================================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LIVE VERTICAL BEHANCE CANVAS */}
        <main className="flex-1 overflow-y-auto bg-[#030303] px-4 sm:px-10 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Simulated Behance Project Header Strip */}
            <div className="mb-6 flex items-center justify-between text-xs text-gray-500 px-1">
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-widest font-bold text-[#C5A059]">
                  {CATEGORY_LABELS[category]}
                </span>
                <span>&bull;</span>
                <span>{modules.length} {modules.length === 1 ? "Module" : "Modules"}</span>
                <span>&bull;</span>
                <span>Spacing: {contentSpacing}px</span>
              </div>
              <span className="text-[11px] text-gray-500 hidden sm:inline">
                Click any module to edit inline or reorder
              </span>
            </div>

            {/* Canvas Container */}
            <div
              className="w-full min-h-[68vh] border border-[#222222] rounded-xs shadow-2xl overflow-hidden transition-colors duration-200"
              style={{ backgroundColor }}>
              {modules.length === 0 ? (
                /* BEHANCE EMPTY CANVAS LAUNCHPAD */
                <div className="py-24 px-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] tracking-[0.28em] uppercase text-[#C5A059] font-bold mb-3">
                    Project Presentation Builder
                  </span>
                  <h2
                    className={`text-2xl sm:text-3xl font-serif font-bold mb-3 ${
                      isLightCanvas ? "text-neutral-900" : "text-white"
                    }`}>
                    Start building your project
                  </h2>
                  <p
                    className={`text-xs sm:text-sm max-w-md mb-10 ${
                      isLightCanvas ? "text-neutral-600" : "text-gray-400"
                    }`}>
                    Stack full-bleed artwork images, side-by-side photo grids,
                    and editorial story blocks.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
                    <button
                      type="button"
                      onClick={() => setMediaTarget({ kind: "new-image" })}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-[#111111] border border-[#2a2a2a] hover:border-[#C5A059] text-white hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-2xl" aria-hidden="true">🖼</span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Image
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addGridModule(2)}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-[#111111] border border-[#2a2a2a] hover:border-[#C5A059] text-white hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-2xl" aria-hidden="true">⊞</span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Photo Grid
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addTextModule()}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-[#111111] border border-[#2a2a2a] hover:border-[#C5A059] text-white hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-2xl font-serif font-bold" aria-hidden="true">
                        Aa
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Text
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addSpacerModule()}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-[#111111] border border-[#2a2a2a] hover:border-[#C5A059] text-white hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-2xl" aria-hidden="true">&mdash;</span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Spacer
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col"
                  style={{
                    gap: `${contentSpacing}px`,
                    paddingTop: contentSpacing > 0 ? `${contentSpacing}px` : undefined,
                    paddingBottom: contentSpacing > 0 ? `${contentSpacing}px` : undefined,
                  }}>
                  {modules.map((mod, idx) => {
                    const isSelected = selectedModuleId === mod.id;
                    return (
                      <div key={mod.id} className="relative">
                        {/* MODULE WRAPPER */}
                        <div
                          onClick={() => setSelectedModuleId(mod.id)}
                          className={`group relative transition-all ${
                            isSelected
                              ? "ring-2 ring-[#C5A059] ring-inset"
                              : "hover:ring-1 hover:ring-[#C5A059]/60 hover:ring-inset"
                          }`}>
                          {/* Floating Behance Module Toolbar */}
                          <div
                            className={`absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/90 backdrop-blur-md border border-[#333] shadow-xl transition-opacity ${
                              isSelected
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveModule(idx, -1);
                              }}
                              disabled={idx === 0}
                              className="px-1.5 py-0.5 text-xs text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Up">
                              &uarr;
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveModule(idx, 1);
                              }}
                              disabled={idx === modules.length - 1}
                              className="px-1.5 py-0.5 text-xs text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Down">
                              &darr;
                            </button>

                            <span className="w-px h-3.5 bg-[#333] mx-0.5" />

                            {mod.type === "image" && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateModule(mod.id, (m) =>
                                      m.type === "image"
                                        ? {
                                            ...m,
                                            layout:
                                              m.layout === "contained"
                                                ? "full"
                                                : "contained",
                                          }
                                        : m,
                                    );
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C5A059] hover:text-white cursor-pointer">
                                  {mod.layout === "contained"
                                    ? "Contained"
                                    : "Full Bleed"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMediaTarget({
                                      kind: "replace-image",
                                      moduleId: mod.id,
                                    });
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-white cursor-pointer">
                                  Replace
                                </button>
                              </>
                            )}

                            {mod.type === "grid" && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateModule(mod.id, (m) =>
                                      m.type === "grid"
                                        ? {
                                            ...m,
                                            columns: m.columns === 2 ? 3 : 2,
                                          }
                                        : m,
                                    );
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C5A059] hover:text-white cursor-pointer">
                                  {mod.columns} Cols
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMediaTarget({
                                      kind: "add-grid-image",
                                      moduleId: mod.id,
                                    });
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-white cursor-pointer">
                                  + Photo
                                </button>
                              </>
                            )}

                            {mod.type === "text" && (
                              <>
                                {(["left", "center", "right"] as const).map(
                                  (a) => (
                                    <button
                                      key={a}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateModule(mod.id, (m) =>
                                          m.type === "text"
                                            ? { ...m, align: a }
                                            : m,
                                        );
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase cursor-pointer ${
                                        mod.align === a
                                          ? "text-[#C5A059]"
                                          : "text-gray-400 hover:text-white"
                                      }`}>
                                      {a[0]}
                                    </button>
                                  ),
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateModule(mod.id, (m) =>
                                      m.type === "text"
                                        ? {
                                            ...m,
                                            fontStyle:
                                              m.fontStyle === "sans"
                                                ? "serif"
                                                : "sans",
                                          }
                                        : m,
                                    );
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-300 hover:text-white cursor-pointer">
                                  {mod.fontStyle === "sans" ? "Sans" : "Serif"}
                                </button>
                              </>
                            )}

                            {mod.type === "spacer" && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const sizes = [24, 48, 80, 120];
                                    const nextH =
                                      sizes[
                                        (sizes.indexOf(mod.height) + 1) %
                                          sizes.length
                                      ] ?? 48;
                                    updateModule(mod.id, (m) =>
                                      m.type === "spacer"
                                        ? { ...m, height: nextH }
                                        : m,
                                    );
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase text-[#C5A059] cursor-pointer">
                                  {mod.height}px
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateModule(mod.id, (m) =>
                                      m.type === "spacer"
                                        ? {
                                            ...m,
                                            showDivider: !m.showDivider,
                                          }
                                        : m,
                                    );
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300 hover:text-white cursor-pointer">
                                  {mod.showDivider ? "Line: On" : "Line: Off"}
                                </button>
                              </>
                            )}

                            <span className="w-px h-3.5 bg-[#333] mx-0.5" />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateModule(idx);
                              }}
                              className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-white cursor-pointer"
                              title="Duplicate">
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteModule(mod.id);
                              }}
                              className="px-1.5 py-0.5 text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
                              title="Delete module">
                              Delete
                            </button>
                          </div>

                          {/* MODULE CONTENT RENDERER */}
                          {mod.type === "image" && (
                            <div
                              className={`flex flex-col items-center ${
                                mod.layout === "contained" ? "px-6 sm:px-14" : ""
                              }`}>
                              {isSafeImageUrl(mod.url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={mod.url}
                                  alt={mod.caption || title}
                                  className={`w-full h-auto max-h-[75vh] object-contain block ${
                                    mod.layout === "contained"
                                      ? "max-w-3xl mx-auto"
                                      : ""
                                  }`}
                                />
                              ) : (
                                <div className="py-12 text-xs text-rose-400">
                                  Invalid image URL
                                </div>
                              )}
                              <input
                                type="text"
                                value={mod.caption ?? ""}
                                onChange={(e) =>
                                  updateModule(mod.id, (m) =>
                                    m.type === "image"
                                      ? { ...m, caption: e.target.value }
                                      : m,
                                  )
                                }
                                placeholder="Add optional caption..."
                                className={`w-full max-w-2xl text-center text-xs bg-transparent py-2.5 px-4 focus:outline-none italic ${
                                  isLightCanvas
                                    ? "text-neutral-600 placeholder-neutral-400"
                                    : "text-gray-400 placeholder-gray-600"
                                }`}
                              />
                            </div>
                          )}

                          {mod.type === "grid" && (
                            <div className="p-4 sm:p-6">
                              <div
                                className={`grid gap-3 ${
                                  mod.columns === 3
                                    ? "grid-cols-1 sm:grid-cols-3"
                                    : "grid-cols-1 sm:grid-cols-2"
                                }`}>
                                {mod.images.map((item, gIdx) => (
                                  <div
                                    key={`${item.url}-${gIdx}`}
                                    className="relative group/tile bg-[#111] border border-[#222] overflow-hidden">
                                    <div className="relative aspect-4/3">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={item.url}
                                        alt={item.caption || `Grid ${gIdx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/tile:opacity-100 transition-opacity">
                                        {gIdx > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateModule(mod.id, (m) => {
                                                if (m.type !== "grid") return m;
                                                const imgs = [...m.images];
                                                [imgs[gIdx - 1], imgs[gIdx]] = [
                                                  imgs[gIdx],
                                                  imgs[gIdx - 1],
                                                ];
                                                return { ...m, images: imgs };
                                              });
                                            }}
                                            className="w-6 h-6 rounded-full bg-black/80 text-white text-xs cursor-pointer">
                                            &larr;
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateModule(mod.id, (m) =>
                                              m.type === "grid"
                                                ? {
                                                    ...m,
                                                    images: m.images.filter(
                                                      (_, i) => i !== gIdx,
                                                    ),
                                                  }
                                                : m,
                                            );
                                          }}
                                          className="w-6 h-6 rounded-full bg-black/80 text-rose-400 hover:text-rose-300 text-xs cursor-pointer">
                                          &times;
                                        </button>
                                      </div>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.caption ?? ""}
                                      onChange={(e) =>
                                        updateModule(mod.id, (m) =>
                                          m.type === "grid"
                                            ? {
                                                ...m,
                                                images: m.images.map((im, i) =>
                                                  i === gIdx
                                                    ? {
                                                        ...im,
                                                        caption: e.target.value,
                                                      }
                                                    : im,
                                                ),
                                              }
                                            : m,
                                        )
                                      }
                                      placeholder="Caption..."
                                      className="w-full bg-black/60 text-gray-300 placeholder-gray-600 text-[11px] px-2.5 py-1.5 focus:outline-none"
                                    />
                                  </div>
                                ))}

                                {/* Add Photo Slot */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMediaTarget({
                                      kind: "add-grid-image",
                                      moduleId: mod.id,
                                    });
                                  }}
                                  className="aspect-4/3 flex flex-col items-center justify-center gap-2 border border-dashed border-[#333] hover:border-[#C5A059] bg-black/20 text-gray-400 hover:text-[#C5A059] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
                                  <span className="text-xl">+</span>
                                  <span>Add Photo</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {mod.type === "text" && (
                            <div
                              className={`px-8 sm:px-14 py-8 ${
                                mod.align === "left"
                                  ? "text-left"
                                  : mod.align === "right"
                                    ? "text-right"
                                    : "text-center"
                              }`}>
                              <div className="max-w-3xl mx-auto flex flex-col gap-3">
                                <input
                                  type="text"
                                  value={mod.heading ?? ""}
                                  onChange={(e) =>
                                    updateModule(mod.id, (m) =>
                                      m.type === "text"
                                        ? { ...m, heading: e.target.value }
                                        : m,
                                    )
                                  }
                                  placeholder="Section Heading (optional)..."
                                  className={`w-full bg-transparent text-2xl font-bold focus:outline-none ${
                                    mod.fontStyle === "sans"
                                      ? "font-sans"
                                      : "font-serif"
                                  } ${
                                    mod.align === "left"
                                      ? "text-left"
                                      : mod.align === "right"
                                        ? "text-right"
                                        : "text-center"
                                  } ${
                                    isLightCanvas
                                      ? "text-neutral-900 placeholder-neutral-400"
                                      : "text-white placeholder-gray-600"
                                  }`}
                                />
                                <textarea
                                  rows={3}
                                  value={mod.body}
                                  onChange={(e) =>
                                    updateModule(mod.id, (m) =>
                                      m.type === "text"
                                        ? { ...m, body: e.target.value }
                                        : m,
                                    )
                                  }
                                  placeholder="Write your project story, concept notes, or process insight..."
                                  className={`w-full bg-transparent text-sm sm:text-base leading-relaxed focus:outline-none resize-y ${
                                    mod.align === "left"
                                      ? "text-left"
                                      : mod.align === "right"
                                        ? "text-right"
                                        : "text-center"
                                  } ${
                                    isLightCanvas
                                      ? "text-neutral-700 placeholder-neutral-400"
                                      : "text-gray-300 placeholder-gray-600"
                                  }`}
                                />
                              </div>
                            </div>
                          )}

                          {mod.type === "spacer" && (
                            <div
                              className="w-full flex items-center justify-center px-10"
                              style={{ height: `${mod.height}px` }}>
                              {mod.showDivider ? (
                                <hr
                                  className={`w-full max-w-2xl border-0 h-px ${
                                    isLightCanvas
                                      ? "bg-neutral-300"
                                      : "bg-[#2a2a2a]"
                                  }`}
                                />
                              ) : (
                                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">
                                  Spacer ({mod.height}px)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* BETWEEN-MODULE BEHANCE INSERT BAR */}
                        <div className="group/ins relative h-5 -my-2.5 z-10 flex items-center justify-center">
                          <div className="opacity-0 group-hover/ins:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] border border-[#C5A059]/60 shadow-xl">
                            <span className="text-[10px] uppercase tracking-wider text-[#C5A059] font-bold mr-1">
                              + Insert:
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setMediaTarget({
                                  kind: "new-image",
                                  insertAt: idx + 1,
                                })
                              }
                              className="text-[10px] font-semibold text-gray-200 hover:text-[#C5A059] px-1.5 cursor-pointer">
                              Image
                            </button>
                            <button
                              type="button"
                              onClick={() => addGridModule(2, idx + 1)}
                              className="text-[10px] font-semibold text-gray-200 hover:text-[#C5A059] px-1.5 cursor-pointer">
                              Photo Grid
                            </button>
                            <button
                              type="button"
                              onClick={() => addTextModule(idx + 1)}
                              className="text-[10px] font-semibold text-gray-200 hover:text-[#C5A059] px-1.5 cursor-pointer">
                              Text
                            </button>
                            <button
                              type="button"
                              onClick={() => addSpacerModule(idx + 1)}
                              className="text-[10px] font-semibold text-gray-200 hover:text-[#C5A059] px-1.5 cursor-pointer">
                              Spacer
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ===================================================================
            RIGHT BEHANCE TOOL & SETTINGS RAIL
           =================================================================== */}
        <aside className="w-80 xl:w-96 shrink-0 border-l border-[#222222] bg-[#0a0a0a] flex flex-col">
          {/* Rail Tabs */}
          <div className="grid grid-cols-3 border-b border-[#222222] text-[11px] font-bold uppercase tracking-wider">
            {(
              [
                { id: "build", label: "Add Content" },
                { id: "styles", label: "Styles" },
                { id: "settings", label: "Project Details" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRailTab(tab.id)}
                className={`py-3.5 transition-colors cursor-pointer border-b-2 ${
                  railTab === tab.id
                    ? "text-[#C5A059] border-[#C5A059] bg-[#111111]"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rail Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {railTab === "build" && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3">
                    Add Content Modules
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMediaTarget({ kind: "new-image" })}
                      className="flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-[#121212] border border-[#262626] hover:border-[#C5A059] text-gray-200 hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-xl" aria-hidden="true">🖼</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Image
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addGridModule(2)}
                      className="flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-[#121212] border border-[#262626] hover:border-[#C5A059] text-gray-200 hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-xl" aria-hidden="true">⊞</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Photo Grid
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addTextModule()}
                      className="flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-[#121212] border border-[#262626] hover:border-[#C5A059] text-gray-200 hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-xl font-serif font-bold" aria-hidden="true">
                        Aa
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Text Block
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addSpacerModule()}
                      className="flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-lg bg-[#121212] border border-[#262626] hover:border-[#C5A059] text-gray-200 hover:text-[#C5A059] transition-all cursor-pointer">
                      <span className="text-xl" aria-hidden="true">&mdash;</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Spacer
                      </span>
                    </button>
                  </div>
                </div>

                {/* Modules Outline */}
                <div className="border-t border-[#1e1e1e] pt-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3">
                    Presentation Stack ({modules.length})
                  </p>
                  {modules.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">
                      No modules yet. Click a tile above to start building.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {modules.map((m, idx) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedModuleId(m.id)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            selectedModuleId === m.id
                              ? "bg-[#1a160c] border-[#C5A059] text-white"
                              : "bg-[#111] border-[#222] text-gray-400 hover:text-white"
                          }`}>
                          <span className="truncate">
                            <span className="font-mono text-[10px] text-[#C5A059] mr-2">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            {m.type === "image"
                              ? m.caption?.trim() || "Image Module"
                              : m.type === "grid"
                                ? `Photo Grid (${m.columns}-col, ${m.images.length} photos)`
                                : m.type === "text"
                                  ? m.heading?.trim() || "Editorial Text"
                                  : `Spacer (${m.height}px)`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteModule(m.id);
                            }}
                            className="text-gray-500 hover:text-rose-400 px-1 cursor-pointer"
                            title="Delete">
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {railTab === "styles" && (
              <div className="flex flex-col gap-6">
                {/* Canvas Background Presets */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3">
                    Canvas Background
                  </p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {BEHANCE_CANVAS_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => {
                          setBackgroundColor(preset.color);
                          markDirty();
                        }}
                        title={preset.label}
                        className={`h-10 rounded-md border-2 transition-transform cursor-pointer ${
                          backgroundColor.toLowerCase() ===
                          preset.color.toLowerCase()
                            ? "border-[#C5A059] scale-105"
                            : "border-[#333] hover:border-gray-500"
                        }`}
                        style={{ backgroundColor: preset.color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(backgroundColor)
                          ? backgroundColor
                          : "#070707"
                      }
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        markDirty();
                      }}
                      className="w-10 h-9 bg-transparent border border-[#333] rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        markDirty();
                      }}
                      className="flex-1 bg-black border border-[#333] text-white px-3 py-2 text-xs font-mono focus:border-[#C5A059] focus:outline-none rounded"
                    />
                  </div>
                </div>

                {/* Content Spacing Slider (Signature Behance Control) */}
                <div className="border-t border-[#1e1e1e] pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="behance-content-spacing"
                      className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">
                      Content Spacing
                    </label>
                    <span className="text-xs font-mono text-[#C5A059]">
                      {contentSpacing}px
                    </span>
                  </div>
                  <input
                    id="behance-content-spacing"
                    type="range"
                    min={0}
                    max={80}
                    step={4}
                    value={contentSpacing}
                    onChange={(e) => {
                      setContentSpacing(Number(e.target.value));
                      markDirty();
                    }}
                    className="w-full accent-[#C5A059] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>Seamless (0px)</span>
                    <span>Airy (80px)</span>
                  </div>
                </div>
              </div>
            )}

            {railTab === "settings" && (
              <div className="flex flex-col gap-4">
                {/* Project Cover Thumbnail */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold block mb-2">
                    Project Cover Image
                  </label>
                  <div className="relative w-full aspect-4/3 rounded-md overflow-hidden bg-[#121212] border border-[#2a2a2a] mb-2">
                    {coverImage && isSafeImageUrl(coverImage) ? (
                      <Image
                        src={coverImage}
                        alt="Project cover preview"
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="320px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 uppercase tracking-widest">
                        No Cover Selected
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => {
                        setCoverImage(e.target.value);
                        markDirty();
                      }}
                      placeholder="Cover URL..."
                      className="flex-1 bg-black border border-[#333] text-white px-2.5 py-1.5 text-xs focus:border-[#C5A059] focus:outline-none rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaTarget({ kind: "cover" })}
                      className="px-3 py-1.5 bg-[#1a1a1a] border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shrink-0">
                      Pick Cover
                    </button>
                  </div>
                </div>

                {/* Category & Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value as Category);
                        markDirty();
                      }}
                      className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded">
                      <option value="book-covers">Book Covers</option>
                      <option value="illustration">Illustration</option>
                      <option value="fine-art">Fine Art</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => {
                        setYear(e.target.value);
                        markDirty();
                      }}
                      className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded"
                    />
                  </div>
                </div>

                {/* Medium */}
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                    Medium / Style
                  </label>
                  <input
                    type="text"
                    value={medium}
                    onChange={(e) => {
                      setMedium(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. Literary Fiction, Oil on Canvas"
                    className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded"
                  />
                </div>

                {/* Publisher & Dimensions */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => {
                        setPublisher(e.target.value);
                        markDirty();
                      }}
                      placeholder="Optional"
                      className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      value={dimensions}
                      onChange={(e) => {
                        setDimensions(e.target.value);
                        markDirty();
                      }}
                      placeholder='e.g. 24" x 36"'
                      className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded"
                    />
                  </div>
                </div>

                {/* Availability Status Pills */}
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1.5">
                    Availability Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABILITY_OPTIONS.map((opt) => {
                      const active =
                        getAvailabilityFromTags(tags).toLowerCase() ===
                        opt.toLowerCase();
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setTags(setAvailabilityInTags(tags, active ? "" : opt));
                            markDirty();
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                            active
                              ? "bg-[#C5A059] text-black border-[#C5A059]"
                              : "bg-[#121212] text-gray-400 border-[#2e2e2e] hover:text-white"
                          }`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                    Creative Fields &amp; Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => {
                      setTags(e.target.value);
                      markDirty();
                    }}
                    placeholder="Editorial, Book Cover, Watercolor"
                    className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded"
                  />
                </div>

                {/* Short Summary */}
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">
                    Short Summary (SEO / Overview)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                    placeholder="Brief overview of this project..."
                    className="w-full bg-black border border-[#333] text-white p-2 text-xs focus:border-[#C5A059] focus:outline-none rounded resize-none"
                  />
                </div>

                {/* Featured toggle */}
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => {
                      setIsFeatured(e.target.checked);
                      markDirty();
                    }}
                    className="w-4 h-4 accent-[#C5A059]"
                  />
                  <span className="text-xs text-gray-300 font-medium">
                    Feature this project in spotlight
                  </span>
                </label>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Media Library Picker Modal */}
      {mediaTarget && (
        <MediaLibrary
          onSelect={handleMediaSelect}
          onClose={() => setMediaTarget(null)}
        />
      )}
    </div>
  );
}
