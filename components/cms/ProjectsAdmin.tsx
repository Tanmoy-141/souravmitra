"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import MediaLibrary from "./MediaLibrary";
import type { Project } from "@/db/schema";

type Category = "book-covers" | "illustration" | "fine-art";
type MediaAsset = { id: string; name: string; url: string; type: "image" | "video" };

const CATEGORY_LABELS: Record<Category, string> = {
  "book-covers": "Book Covers",
  illustration: "Illustration",
  "fine-art": "Fine Art",
};

const EMPTY_FORM = {
  title: "",
  category: "book-covers" as Category,
  status: "draft" as "draft" | "published",
  medium: "",
  dimensions: "",
  publisher: "",
  year: String(new Date().getFullYear()),
  description: "",
  details: "",
  tags: "",
  coverImage: "",
  isFeatured: false,
};

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
    // fetchProjects is reused after every CRUD action below (not just on
    // mount), so it has to stay a named function rather than an inline
    // .then() chain — this is the standard "load data on mount" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      category: p.category as Category,
      status: p.status as "draft" | "published",
      medium: p.medium ?? "",
      dimensions: p.dimensions ?? "",
      publisher: p.publisher ?? "",
      year: p.year ?? String(new Date().getFullYear()),
      description: p.description ?? "",
      details: p.details ?? "",
      tags: ((p.tags as string[]) ?? []).join(", "),
      coverImage: p.coverImage ?? "",
      isFeatured: p.isFeatured,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showMsg("Title is required", "error"); return; }
    setSaving(true);

    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(
        editingId ? `/api/projects/${editingId}` : "/api/projects",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        showMsg(data.message || "Save failed", "error");
        return;
      }
      showMsg(editingId ? "Project updated!" : "Project created!");
      setShowForm(false);
      fetchProjects();
    } catch {
      showMsg("Connection error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      showMsg("Project deleted");
      fetchProjects();
    } catch {
      showMsg("Delete failed", "error");
    }
  };

  const handleToggleFeatured = async (p: Project) => {
    try {
      await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !p.isFeatured }),
      });
      fetchProjects();
    } catch {
      showMsg("Failed to update", "error");
    }
  };

  const handleToggleStatus = async (p: Project) => {
    try {
      await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: p.status === "published" ? "draft" : "published" }),
      });
      fetchProjects();
    } catch {
      showMsg("Failed to update", "error");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const filtered = visibleProjects;
    const a = filtered[index];
    const b = filtered[index - 1];
    await Promise.all([
      fetch(`/api/projects/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/projects/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);
    fetchProjects();
  };

  const handleMoveDown = async (index: number) => {
    const filtered = visibleProjects;
    if (index >= filtered.length - 1) return;
    const a = filtered[index];
    const b = filtered[index + 1];
    await Promise.all([
      fetch(`/api/projects/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/projects/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);
    fetchProjects();
  };

  const visibleProjects = categoryFilter === "all"
    ? projects
    : projects.filter((p) => p.category === categoryFilter);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(["all", "book-covers", "illustration", "fine-art"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 text-xs uppercase tracking-widest font-bold border transition-colors ${
                categoryFilter === c
                  ? "bg-[#C5A059] text-black border-[#C5A059]"
                  : "text-gray-500 border-[#333] hover:text-white"
              }`}>
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-[#C5A059] text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors">
          + New Project
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div className={`mb-4 px-4 py-2 text-xs font-bold uppercase tracking-widest ${
          message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="text-center text-gray-500 text-xs uppercase tracking-widest py-12">Loading...</div>
      ) : visibleProjects.length === 0 ? (
        <div className="text-center text-gray-600 text-xs uppercase tracking-widest py-12">
          No projects yet — click + New Project to add one.
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {visibleProjects.map((p, index) => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] hover:border-[#333] transition-colors">
              {/* Cover thumbnail */}
              <div className="w-14 h-14 shrink-0 bg-[#111] relative overflow-hidden">
                {p.coverImage ? (
                  <Image src={p.coverImage} alt={p.title} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] uppercase">
                    No img
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">{p.title}</span>
                  {p.isFeatured && (
                    <span className="text-[9px] bg-[#C5A059] text-black px-1.5 py-0.5 font-bold uppercase">
                      Featured
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                    p.status === "published" ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-gray-600 text-[11px] mt-0.5">
                  {CATEGORY_LABELS[p.category as Category]} · {p.year ?? "—"} · {p.likes} likes · {p.views} views
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20"
                  title="Move up">
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === visibleProjects.length - 1}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20"
                  title="Move down">
                  ↓
                </button>
                <button
                  onClick={() => handleToggleFeatured(p)}
                  className={`text-[10px] px-2 py-1 border transition-colors ${
                    p.isFeatured
                      ? "border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10"
                      : "border-[#333] text-gray-600 hover:text-white"
                  }`}>
                  {p.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  onClick={() => handleToggleStatus(p)}
                  className="text-[10px] px-2 py-1 border border-[#333] text-gray-600 hover:text-white transition-colors">
                  {p.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="text-[10px] px-2 py-1 border border-[#333] text-gray-500 hover:text-white transition-colors">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  className="text-[10px] px-2 py-1 border border-[#333] text-red-800 hover:text-red-500 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto p-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#111] border border-[#333] p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                {editingId ? "Edit Project" : "New Project"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Title + category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                    className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none">
                    <option value="book-covers">Book Covers</option>
                    <option value="illustration">Illustration</option>
                    <option value="fine-art">Fine Art</option>
                  </select>
                </div>
              </div>

              {/* Year + status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Year</label>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}
                    className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Medium + dimensions (category-dependent) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">
                    {form.category === "book-covers" ? "Genre" : "Medium"}
                  </label>
                  <input
                    type="text"
                    value={form.medium}
                    onChange={(e) => setForm({ ...form, medium: e.target.value })}
                    placeholder={form.category === "book-covers" ? "e.g. Literary Fiction" : "e.g. Oil on Canvas"}
                    className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                {form.category === "book-covers" ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Publisher</label>
                    <input
                      type="text"
                      value={form.publisher}
                      onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                      className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-gray-500 font-bold">Dimensions</label>
                    <input
                      type="text"
                      value={form.dimensions}
                      onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                      placeholder='e.g. 24" x 36"'
                      className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none resize-none"
                />
              </div>

              {/* Tags + featured */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="Typography, Layout, Cover Art"
                    className="bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="w-4 h-4 accent-[#C5A059]"
                  />
                  <label htmlFor="isFeatured" className="text-sm text-gray-400">
                    Feature this project
                  </label>
                </div>
              </div>

              {/* Cover image */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Cover Image</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      placeholder="Paste URL or pick from media library"
                      className="w-full bg-black border border-[#333] text-white p-2 text-sm focus:border-[#C5A059] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMediaLibrary(true)}
                    className="px-3 py-2 bg-[#222] border border-[#333] text-gray-400 hover:text-white text-xs uppercase tracking-widest whitespace-nowrap">
                    Pick Image
                  </button>
                </div>
                {form.coverImage && (
                  <div className="relative w-24 h-24 bg-[#0d0d0d] overflow-hidden">
                    <Image src={form.coverImage} alt="Cover preview" fill className="object-cover" sizes="96px" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : editingId ? "Update Project" : "Create Project"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-[#333] text-gray-500 hover:text-white text-xs uppercase tracking-widest">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media library modal */}
      {showMediaLibrary && (
        <MediaLibrary
          onSelect={(asset: MediaAsset) => {
            setForm({ ...form, coverImage: asset.url });
            setShowMediaLibrary(false);
          }}
          onClose={() => setShowMediaLibrary(false)}
        />
      )}
    </div>
  );
}
