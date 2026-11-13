"use client";

import { useEffect, useState } from "react";
import type { CustomPage } from "@/data/cms";
import {
  DEFAULT_NAV_ITEMS,
  isSafeNavHref,
  type NavItem,
} from "@/lib/navigation";

interface NavigationAdminProps {
  pages: CustomPage[];
  siteName: string;
  logoUrl?: string;
}

const CORE_SLUGS = new Set([
  "",
  "/",
  "about",
  "contact",
  "book-covers",
  "illustration",
  "fine-art",
]);

function pageToHref(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  if (!clean) return "/";
  if (CORE_SLUGS.has(clean)) return `/${clean}`;
  return `/p/${clean}`;
}

export default function NavigationAdmin({
  pages,
  siteName,
  logoUrl = "",
}: NavigationAdminProps) {
  const [items, setItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [isCustomNav, setIsCustomNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/cms/settings", { cache: "no-store" });
        const data = await res.json();
        if (!ignore && res.ok) {
          if (Array.isArray(data.navItems) && data.navItems.length > 0) {
            setItems(data.navItems);
          }
          setIsCustomNav(Boolean(data.isCustomNav));
        }
      } catch {
        if (!ignore) {
          setStatusMessage({
            type: "error",
            text: "Failed to load current navigation settings.",
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const updateItem = (id: string, patch: Partial<NavItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addCustomLink = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `nav-${crypto.randomUUID().slice(0, 8)}`,
        label: "New Link",
        href: "/",
        visible: true,
        isCta: false,
        openInNewTab: false,
      },
    ]);
  };

  const addPageLink = (page: CustomPage) => {
    const href = pageToHref(page.slug);
    if (items.some((item) => item.href === href)) return;

    if (page.status === "draft") {
      const proceed = window.confirm(
        `"${page.title}" is currently an unpublished DRAFT.\n\nVisitors clicking this navigation link will receive a 404 until you publish this page in the Pages tab.\n\nDo you still want to add it to the navigation menu?`,
      );
      if (!proceed) return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: `nav-${crypto.randomUUID().slice(0, 8)}`,
        label: page.title || "Page",
        href,
        visible: true,
        isCta: false,
        openInNewTab: false,
      },
    ]);
  };

  const handleSave = async () => {
    for (const item of items) {
      if (!item.label.trim()) {
        setStatusMessage({
          type: "error",
          text: "Every navigation item needs a label.",
        });
        return;
      }
      if (!isSafeNavHref(item.href)) {
        setStatusMessage({
          type: "error",
          text: `Invalid URL "${item.href}" on "${item.label}". Use /path, #anchor, https://, or mailto:.`,
        });
        return;
      }
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      const cleaned = items.map((item) => ({
        id: item.id,
        label: item.label.trim(),
        href: item.href.trim(),
        visible: item.visible,
        isCta: Boolean(item.isCta),
        openInNewTab: Boolean(item.openInNewTab),
      }));

      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navItems: cleaned }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to save navigation.",
        });
        return;
      }

      setItems(cleaned);
      setIsCustomNav(true);
      setStatusMessage({
        type: "success",
        text: "Navigation saved and published to the site header!",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error while saving navigation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (
      !confirm(
        "Reset navigation to automatic default? Custom ordering and hidden flags will be cleared, and published /p/ pages will auto-appear before About.",
      )
    ) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetNav: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to reset navigation.",
        });
        return;
      }
      setItems(DEFAULT_NAV_ITEMS);
      setIsCustomNav(false);
      setStatusMessage({
        type: "success",
        text: "Navigation reset to automatic default.",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error while resetting navigation.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Pages eligible for quick-adding to top navigation
  const linkablePages = pages.filter((p) => {
    const clean = p.slug.replace(/^\/+|\/+$/g, "");
    if (!clean) return false;
    if (clean.startsWith("template/")) return false;
    if (clean.includes("/")) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-gray-500 text-xs uppercase tracking-widest">
        Loading Navigation Settings...
      </div>
    );
  }

  const previewItems = items.filter((item) => item.visible);

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <span className="text-[10px] text-[#C5A059] uppercase tracking-widest font-bold block mb-1">
            Global Site Header
          </span>
          <h2 className="text-2xl font-serif text-white font-bold">
            Navigation Menu Manager
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isCustomNav
              ? "Custom navigation is active. Only visible links in this list appear in the site header."
              : "Using automatic default menu. Save changes here to switch to your custom navigation order and labels."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isCustomNav && (
            <button
              type="button"
              disabled={saving}
              onClick={handleResetDefault}
              className="px-4 py-2 border border-[#333] hover:border-red-700 text-gray-300 hover:text-red-300 text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50 cursor-pointer">
              Reset Default
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2 bg-[#C5A059] hover:bg-white text-black text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50 cursor-pointer">
            {saving ? "Saving..." : "Save Navigation"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`px-4 py-3 text-xs font-medium border ${
            statusMessage.type === "error"
              ? "bg-red-950/60 border-red-800 text-red-300"
              : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
          }`}>
          {statusMessage.text}
        </div>
      )}

      {/* Live Header Preview */}
      <div className="border border-[#262626] bg-[#070707] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">
          <span>Live Desktop Header Preview ({previewItems.length} visible)</span>
          <span className="text-gray-400 normal-case tracking-normal font-normal">
            Preview only &bull; Scroll down to edit or delete links &darr;
          </span>
        </div>
        <div className="bg-black border border-[#333333] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={siteName}
                className="h-7 max-w-[120px] object-contain shrink-0"
              />
            ) : null}
            <span
              className={`text-lg font-serif text-white ${
                logoUrl ? "hidden sm:inline" : ""
              }`}>
              {siteName}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-[#D4D4D4] text-xs uppercase tracking-widest font-medium">
            {previewItems.length === 0 ? (
              <span className="text-gray-600 italic normal-case tracking-normal">
                No visible links
              </span>
            ) : (
              previewItems.map((item) => (
                <span
                  key={item.id}
                  className={
                    item.isCta
                      ? "text-[#C5A059] border border-[#C5A059] px-3 py-1"
                      : "text-[#D4D4D4]"
                  }>
                  {item.label || "(Untitled)"}
                </span>
              ))
            )}
          </nav>
        </div>
      </div>

      {/* Menu Items List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Menu Links ({items.length})
          </h3>
          <button
            type="button"
            onClick={addCustomLink}
            className="px-3.5 py-1.5 border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer">
            + Add Custom Link
          </button>
        </div>

        {items.length === 0 ? (
          <div className="border border-dashed border-[#333] p-10 text-center text-gray-500 text-xs uppercase tracking-widest">
            No navigation items configured. Click &ldquo;+ Add Custom Link&rdquo; or pick a page below.
          </div>
        ) : (
          items.map((item, idx) => {
            const hrefValid = isSafeNavHref(item.href);
            const matchedDraftPage = pages.find(
              (p) => pageToHref(p.slug) === item.href && p.status === "draft",
            );
            return (
              <div
                key={item.id}
                className={`border p-4 bg-[#0a0a0a] flex flex-col lg:flex-row lg:items-center gap-4 transition-colors ${
                  !hrefValid
                    ? "border-red-900/70"
                    : matchedDraftPage
                      ? "border-amber-900/60"
                      : item.visible
                        ? "border-[#2a2a2a]"
                        : "border-[#1c1c1c] opacity-65"
                }`}>
                {/* Reorder controls */}
                <div className="flex lg:flex-col items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, -1)}
                    className="w-7 h-7 border border-[#333] hover:border-[#C5A059] text-gray-400 hover:text-white disabled:opacity-30 text-[10px] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    title="Move up">
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => moveItem(idx, 1)}
                    className="w-7 h-7 border border-[#333] hover:border-[#C5A059] text-gray-400 hover:text-white disabled:opacity-30 text-[10px] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    title="Move down">
                    ▼
                  </button>
                </div>

                {/* Label & URL fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={item.label}
                      onChange={(e) =>
                        updateItem(item.id, { label: e.target.value })
                      }
                      placeholder="e.g. Book Covers"
                      className="w-full bg-black border border-[#333] focus:border-[#C5A059] px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        URL / Path
                      </label>
                      {matchedDraftPage && (
                        <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                          ⚠️ Draft Page (404 for visitors)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={500}
                      value={item.href}
                      onChange={(e) =>
                        updateItem(item.id, { href: e.target.value })
                      }
                      placeholder="/book-covers or https://..."
                      className={`w-full bg-black border px-3 py-1.5 text-xs font-mono text-white outline-none ${
                        !hrefValid
                          ? "border-red-700 focus:border-red-500"
                          : matchedDraftPage
                            ? "border-amber-800 focus:border-amber-500"
                            : "border-[#333] focus:border-[#C5A059]"
                      }`}
                    />
                  </div>
                </div>

                {/* Toggles & Delete */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, { visible: !item.visible })
                    }
                    className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold border transition-colors cursor-pointer ${
                      item.visible
                        ? "border-emerald-800 bg-emerald-950/50 text-emerald-300"
                        : "border-[#333] bg-[#141414] text-gray-500"
                    }`}>
                    {item.visible ? "Visible" : "Hidden"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { isCta: !item.isCta })}
                    className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold border transition-colors cursor-pointer ${
                      item.isCta
                        ? "border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059]"
                        : "border-[#333] bg-[#141414] text-gray-400 hover:text-white"
                    }`}
                    title="Render with gold border CTA button styling">
                    CTA Style
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, { openInNewTab: !item.openInNewTab })
                    }
                    className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold border transition-colors cursor-pointer ${
                      item.openInNewTab
                        ? "border-sky-800 bg-sky-950/50 text-sky-300"
                        : "border-[#333] bg-[#141414] text-gray-400 hover:text-white"
                    }`}
                    title="Open link in a new browser tab">
                    New Tab
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold border border-red-950/70 hover:border-red-600 bg-red-950/20 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                    title="Delete this link from navigation">
                    <span>🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick-add from existing CMS pages */}
      {linkablePages.length > 0 && (
        <div className="border-t border-[#222] pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Quick-Add Existing Pages
            </h3>
            <span className="text-[10px] text-gray-500">
              Pages marked <span className="text-amber-400 font-semibold">Draft</span> prompt a warning since they are not public yet.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {linkablePages.map((page) => {
              const href = pageToHref(page.slug);
              const alreadyAdded = items.some((item) => item.href === href);
              const isDraft = page.status === "draft";
              return (
                <button
                  key={page.id ?? page.slug}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => addPageLink(page)}
                  title={
                    isDraft
                      ? `"${page.title}" is currently an unpublished Draft (click to add with warning)`
                      : `Add "${page.title}" to navigation`
                  }
                  className={`px-3 py-1.5 text-xs border rounded transition-colors inline-flex items-center gap-1.5 ${
                    alreadyAdded
                      ? "border-[#222] bg-[#0b0b0b] text-gray-600 cursor-not-allowed"
                      : isDraft
                        ? "border-amber-900/60 bg-[#161208] text-amber-200 hover:border-amber-500 cursor-pointer"
                        : "border-[#333] bg-[#111] hover:border-[#C5A059] text-gray-200 hover:text-[#C5A059] cursor-pointer"
                  }`}>
                  <span>{alreadyAdded ? "✓" : "+"}</span>
                  <span>{page.title}</span>
                  {isDraft && (
                    <span className="px-1.5 py-0.2 bg-amber-950/80 border border-amber-700/60 text-amber-300 rounded text-[9px] uppercase font-bold tracking-wider">
                      Draft
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-gray-500">
                    ({href})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
