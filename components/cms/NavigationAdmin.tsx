"use client";

import { useEffect, useState, useRef } from "react";
import type { CustomPage } from "@/data/cms";
import {
  DEFAULT_NAV_ITEMS,
  isSafeNavHref,
  type NavItem,
} from "@/lib/navigation";
import { sanitizeFontFamily } from "@/lib/fonts";
import { sanitizeColor, isSafeImageUrl } from "@/lib/sanitize";

interface NavigationAdminProps {
  pages: CustomPage[];
  siteName: string;
  logoUrl?: string;
  siteFont?: string;
  siteColor?: string;
  faviconUrl?: string;
  onSiteNameChange?: (name: string) => void;
  onSiteFontChange?: (font: string) => void;
  onSiteColorChange?: (color: string) => void;
  onFaviconUrlChange?: (favicon: string) => void;
}

const COLOR_PRESETS = [
  { label: "Pure White", value: "#FFFFFF" },
  { label: "Gallery Gold", value: "#C5A059" },
  { label: "Champagne Cream", value: "#F5EBE6" },
  { label: "Muted Silver", value: "#D4D4D4" },
  { label: "Warm Sand", value: "#E2D4B7" },
  { label: "Rose Gold", value: "#E8B4B8" },
];

const FONT_PRESETS = [
  {
    group: "Standard",
    fonts: [{ label: "Default Serif (Georgia / Classic)", value: "serif" }],
  },
  {
    group: "Signature & Display",
    fonts: [
      { label: "Stingray (Artist Signature)", value: "Stingray" },
      { label: "Gotham Regular (Clean Modern)", value: "Gotham Regular" },
      { label: "Great Vibes (Fluid Cursive Signature)", value: "Great Vibes" },
      { label: "Dancing Script (Lively Script)", value: "Dancing Script" },
      { label: "Alex Brush (Flowing Signature)", value: "Alex Brush" },
      { label: "Parisienne (French Boutique Cursive)", value: "Parisienne" },
    ],
  },
  {
    group: "Editorial & Literary Serif",
    fonts: [
      { label: "Cinzel (Classical Roman)", value: "Cinzel" },
      { label: "Playfair Display (Luxury Editorial)", value: "Playfair Display" },
      { label: "Bodoni Moda (Vogue Editorial)", value: "Bodoni Moda" },
      { label: "Cormorant Garamond (Literary Calligraphic)", value: "Cormorant Garamond" },
      { label: "Marcellus (Roman Monumental)", value: "Marcellus" },
      { label: "Lora (Contemporary Editorial)", value: "Lora" },
      { label: "EB Garamond (Renaissance Classical)", value: "EB Garamond" },
      { label: "Italiana (Italian Elegance)", value: "Italiana" },
    ],
  },
  {
    group: "Modern Sans-Serif",
    fonts: [
      { label: "Syne (Avant-Garde Gallery)", value: "Syne" },
      { label: "Poppins (Clean Geometric)", value: "Poppins" },
      { label: "Outfit (Minimalist Sans)", value: "Outfit" },
    ],
  },
];

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
  siteFont = "serif",
  siteColor = "#FFFFFF",
  faviconUrl = "/favicon.svg",
  onSiteNameChange,
  onSiteFontChange,
  onSiteColorChange,
  onFaviconUrlChange,
}: NavigationAdminProps) {
  const [items, setItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [userTitle, setUserTitle] = useState<string | null>(null);
  const title = userTitle ?? siteName;
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [userFont, setUserFont] = useState<string | null>(null);
  const font = userFont ?? siteFont;
  const [isCustomFont, setIsCustomFont] = useState(false);
  const [customFontInput, setCustomFontInput] = useState("");
  const [installedFonts, setInstalledFonts] = useState<string[]>([]);

  const [userColor, setUserColor] = useState<string | null>(null);
  const color = userColor ?? siteColor;

  const [userFavicon, setUserFavicon] = useState<string | null>(null);
  const currentFavicon = userFavicon ?? faviconUrl;
  const [uploadingNavFavicon, setUploadingNavFavicon] = useState(false);
  const navFaviconInputRef = useRef<HTMLInputElement>(null);

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
        const [settingsRes, fontsRes] = await Promise.all([
          fetch("/api/cms/settings", { cache: "no-store" }),
          fetch("/api/cms/fonts", { cache: "no-store" }),
        ]);

        if (!ignore && settingsRes.ok) {
          const data = await settingsRes.json();
          if (Array.isArray(data.navItems) && data.navItems.length > 0) {
            setItems(data.navItems);
          }
          setIsCustomNav(Boolean(data.isCustomNav));
          if (typeof data.siteName === "string" && data.siteName.trim()) {
            onSiteNameChange?.(data.siteName.trim());
          }
          if (typeof data.siteFont === "string" && data.siteFont.trim()) {
            onSiteFontChange?.(data.siteFont.trim());
          }
          if (typeof data.siteColor === "string" && data.siteColor.trim()) {
            onSiteColorChange?.(data.siteColor.trim());
          }
          if (typeof data.faviconUrl === "string" && data.faviconUrl.trim()) {
            onFaviconUrlChange?.(data.faviconUrl.trim());
          }
        }

        if (!ignore && fontsRes.ok) {
          const fontsData = await fontsRes.json();
          if (Array.isArray(fontsData.fonts)) {
            setInstalledFonts(
              fontsData.fonts
                .map((f: { family?: string }) => f.family?.trim())
                .filter(Boolean),
            );
          }
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
  }, [
    onSiteNameChange,
    onSiteFontChange,
    onSiteColorChange,
    onFaviconUrlChange,
  ]);

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

  const handleNavFaviconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Favicon file size must be under 5MB.");
      return;
    }

    setUploadingNavFavicon(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUserFavicon(dataUrl);

      let finalFaviconUrl = dataUrl;
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const uploadedUrl = data.asset?.blobUrl || data.data?.[0]?.src;
        if (data.success && uploadedUrl) {
          finalFaviconUrl = uploadedUrl;
          setUserFavicon(uploadedUrl);
        }
      } catch (err) {
        console.warn("Media API upload fallback, using data URL:", err);
      }

      // Auto-save immediately to database
      try {
        const saveRes = await fetch("/api/cms/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ faviconUrl: finalFaviconUrl }),
        });
        if (saveRes.ok) {
          onFaviconUrlChange?.(finalFaviconUrl);
          setStatusMessage({
            type: "success",
            text: "Favicon updated and saved to site!",
          });
        } else {
          setStatusMessage({
            type: "error",
            text: "Failed to save favicon setting.",
          });
        }
      } catch {
        setStatusMessage({
          type: "error",
          text: "Network error saving favicon.",
        });
      } finally {
        setUploadingNavFavicon(false);
        setTimeout(() => setStatusMessage(null), 4000);
        if (navFaviconInputRef.current) {
          navFaviconInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setUploadingNavFavicon(false);
      alert("Failed to read the selected file.");
    };

    reader.readAsDataURL(file);
  };

  const handleNavFaviconReset = async () => {
    setUploadingNavFavicon(true);
    setUserFavicon("/favicon.svg");
    try {
      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: "/favicon.svg" }),
      });
      if (res.ok) {
        onFaviconUrlChange?.("/favicon.svg");
        setStatusMessage({
          type: "success",
          text: "Favicon reset to default (/favicon.svg) and saved!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: "Failed to reset favicon.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error resetting favicon.",
      });
    } finally {
      setUploadingNavFavicon(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
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

      const cleanedSiteName = title.trim() || "Sourav Mitra";
      const cleanedSiteFont = font.trim() || "serif";
      const cleanedSiteColor = color.trim() || "#FFFFFF";
      const cleanedFaviconUrl = currentFavicon.trim() || "/favicon.svg";

      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navItems: cleaned,
          siteName: cleanedSiteName,
          siteFont: cleanedSiteFont,
          siteColor: cleanedSiteColor,
          faviconUrl: cleanedFaviconUrl,
        }),
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
      setUserTitle(null);
      setUserFont(null);
      setUserColor(null);
      setUserFavicon(null);
      onSiteNameChange?.(cleanedSiteName);
      onSiteFontChange?.(cleanedSiteFont);
      onSiteColorChange?.(cleanedSiteColor);
      onFaviconUrlChange?.(cleanedFaviconUrl);
      setStatusMessage({
        type: "success",
        text: "Navigation, branding, and favicon saved and published to the site!",
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

      {/* Site Title & Header Branding Editor */}
      <div className="bg-[#0b0b0b] border border-[#262626] p-5 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {/* Title input */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <label
                htmlFor="site-title-input"
                className="text-[10px] uppercase text-[#C5A059] font-bold tracking-widest">
                Site Title (Header Brand Name)
              </label>
              <span className="text-[10px] text-gray-500 font-normal">
                &bull; Beside logo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="site-title-input"
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setUserTitle(val);
                  onSiteNameChange?.(val);
                }}
                placeholder="Sourav Mitra"
                maxLength={100}
                style={{
                  fontFamily: font && font !== "serif" ? `'${font}', serif` : "serif",
                  color: color || "#FFFFFF",
                }}
                className="w-full px-3.5 py-2.5 bg-black border border-[#333] hover:border-[#555] focus:border-[#C5A059] text-lg focus:outline-none transition-colors"
              />
              {title !== "Sourav Mitra" && (
                <button
                  type="button"
                  onClick={() => {
                    setUserTitle("Sourav Mitra");
                    onSiteNameChange?.("Sourav Mitra");
                  }}
                  className="px-3 py-2.5 border border-[#333] hover:border-[#C5A059] text-gray-400 hover:text-white text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap cursor-pointer transition-colors"
                  title="Reset to default brand name">
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Font Family Selector */}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="site-font-select"
                  className="text-[10px] uppercase text-[#C5A059] font-bold tracking-widest">
                  Header Brand Typography
                </label>
                <span className="text-[10px] text-gray-500 font-normal">
                  &bull; Font Family
                </span>
              </div>
              {font !== "serif" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomFont(false);
                    setUserFont("serif");
                    onSiteFontChange?.("serif");
                  }}
                  className="text-[10px] text-gray-500 hover:text-[#C5A059] uppercase tracking-wider transition-colors cursor-pointer"
                  title="Reset font to default serif">
                  Reset Font
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                id="site-font-select"
                value={
                  isCustomFont
                    ? "__custom__"
                    : FONT_PRESETS.some((g) => g.fonts.some((f) => f.value === font))
                      ? font
                      : installedFonts.includes(font)
                        ? font
                        : "__custom__"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    setIsCustomFont(true);
                    setCustomFontInput(font !== "serif" ? font : "");
                  } else {
                    setIsCustomFont(false);
                    setUserFont(val);
                    onSiteFontChange?.(val);
                  }
                }}
                className="w-full px-3 py-2.5 bg-black border border-[#333] hover:border-[#555] focus:border-[#C5A059] text-white text-xs uppercase tracking-wider font-semibold focus:outline-none transition-colors cursor-pointer">
                {FONT_PRESETS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.fonts.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                ))}

                {installedFonts.length > 0 && (
                  <optgroup label="Installed Custom Fonts">
                    {installedFonts.map((fam) => (
                      <option key={fam} value={fam}>
                        {fam} (Custom)
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="Other / Manual">
                  <option value="__custom__">Custom / Other Google Font...</option>
                </optgroup>
              </select>
            </div>

            {isCustomFont && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={customFontInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomFontInput(val);
                    const clean = sanitizeFontFamily(val);
                    if (clean) {
                      setUserFont(clean);
                      onSiteFontChange?.(clean);
                    }
                  }}
                  placeholder="Type any Google Font name (e.g. Cinzel Decorative)"
                  className="w-full px-3 py-1.5 bg-black border border-[#444] text-white text-xs font-mono focus:border-[#C5A059] focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Title Color Selector */}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="site-color-input"
                  className="text-[10px] uppercase text-[#C5A059] font-bold tracking-widest">
                  Title Color
                </label>
                <span className="text-[10px] text-gray-500 font-normal">
                  &bull; Brand Color
                </span>
              </div>
              {color.toUpperCase() !== "#FFFFFF" && (
                <button
                  type="button"
                  onClick={() => {
                    setUserColor("#FFFFFF");
                    onSiteColorChange?.("#FFFFFF");
                  }}
                  className="text-[10px] text-gray-500 hover:text-[#C5A059] uppercase tracking-wider transition-colors cursor-pointer"
                  title="Reset color to pure white">
                  Reset Color
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {/* Native color picker square */}
                <div
                  className="relative w-9 h-9 shrink-0 border border-[#333] hover:border-[#C5A059] rounded overflow-hidden cursor-pointer"
                  style={{ backgroundColor: color }}>
                  <input
                    id="site-color-input"
                    type="color"
                    value={
                      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)
                        ? color.length === 4
                          ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
                          : color
                        : "#FFFFFF"
                    }
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setUserColor(val);
                      onSiteColorChange?.(val);
                    }}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    title="Choose custom color from color picker"
                  />
                </div>

                {/* Hex code input */}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserColor(val);
                    const clean = sanitizeColor(val, "");
                    if (clean) {
                      onSiteColorChange?.(clean);
                    }
                  }}
                  placeholder="#FFFFFF"
                  maxLength={9}
                  className="w-28 px-3 py-2 bg-black border border-[#333] hover:border-[#555] focus:border-[#C5A059] text-white text-xs font-mono uppercase focus:outline-none transition-colors"
                />
              </div>

              {/* Preset swatches */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setUserColor(preset.value);
                      onSiteColorChange?.(preset.value);
                    }}
                    style={{ backgroundColor: preset.value }}
                    className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                      color.toUpperCase() === preset.value.toUpperCase()
                        ? "border-[#C5A059] ring-2 ring-[#C5A059]/60 scale-110"
                        : "border-[#444] hover:scale-110"
                    }`}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Active Preview Pill */}
          <div className="text-left xl:text-right pl-0 xl:pl-6 border-t xl:border-t-0 xl:border-l border-[#222] pt-3 xl:pt-0 shrink-0">
            <span className="text-gray-500 block font-mono text-[9px] uppercase tracking-wider mb-1">
              Active Header Typography
            </span>
            <span
              style={{
                fontFamily: font && font !== "serif" ? `'${font}', serif` : "serif",
                color: color || "#FFFFFF",
              }}
              className="text-lg font-medium block truncate max-w-xs">
              {title.trim() || "Sourav Mitra"}
            </span>
            <div className="flex items-center xl:justify-end gap-2 mt-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-gray-700 shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-gray-400 font-mono truncate">
                {font === "serif" ? "Default Serif" : font} &bull; {color}
              </span>
            </div>
          </div>
        </div>

        {/* Favicon Quick Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#1f1f1f] pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#141414] border border-[#333] flex items-center justify-center overflow-hidden p-1 shrink-0 shadow-inner">
              {currentFavicon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentFavicon}
                  alt="Site Favicon"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[8px] text-gray-600">None</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-[#C5A059] font-bold tracking-widest">
                  Site Favicon
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {currentFavicon.startsWith("http") ||
                  currentFavicon.startsWith("data:")
                    ? "Custom Active"
                    : "Default (/favicon.svg)"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Displayed in browser tabs, bookmarks, and mobile home screen shortcuts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={navFaviconInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.svg,.ico,image/png,image/jpeg,image/jpg,image/webp,image/x-icon,image/svg+xml"
              className="hidden"
              onChange={handleNavFaviconUpload}
            />
            <button
              type="button"
              disabled={uploadingNavFavicon}
              onClick={() => navFaviconInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#333] hover:border-[#C5A059] text-white text-[10px] uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 cursor-pointer">
              {uploadingNavFavicon ? "Uploading..." : "📁 Change Favicon"}
            </button>
            {currentFavicon !== "/favicon.svg" && (
              <button
                type="button"
                disabled={uploadingNavFavicon}
                onClick={handleNavFaviconReset}
                className="px-3 py-1.5 border border-[#333] hover:border-red-700 text-gray-400 hover:text-red-300 text-[10px] uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                title="Reset favicon to default SVG">
                Reset Favicon
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-gray-500 border-t border-[#1a1a1a] pt-3">
          Changes reflect immediately in the live header preview below and save when you click &ldquo;Save Navigation&rdquo;.
        </p>
      </div>

      {/* Live Header Preview */}
      <div className="border border-[#262626] bg-[#070707] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">
          <span>Live Desktop Header Preview ({previewItems.length} visible)</span>
          <span className="text-gray-400 normal-case tracking-normal font-normal">
            Preview only &bull; Scroll down to edit or delete links &darr;
          </span>
        </div>
        <div className="bg-black border border-[#333333] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div
            onClick={() => titleInputRef.current?.focus()}
            className="flex items-center gap-3 cursor-pointer group"
            title="Click to edit site title">
            {logoUrl && isSafeImageUrl(logoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={title || siteName}
                width={44}
                height={44}
                style={{
                  borderRadius: "9999px",
                  objectFit: "cover",
                }}
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#C5A059]/40 shadow-sm"
              />
            ) : null}
            <span
              style={{
                fontFamily: font && font !== "serif" ? `'${font}', serif` : "serif",
                color: color || "#FFFFFF",
              }}
              className="text-lg transition-colors flex items-center gap-1.5">
              {title || "Sourav Mitra"}
              <span className="text-gray-500 group-hover:text-[#C5A059] text-xs">✎</span>
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
