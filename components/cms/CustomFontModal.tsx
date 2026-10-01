"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CustomFont,
  RECOMMENDED_GOOGLE_FONTS,
  buildGoogleFontUrl,
  sanitizeFontFamily,
} from "@/lib/fonts";

interface CustomFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFontInstalled: (font: CustomFont, applyImmediately: boolean) => void;
  onFontDeleted: (fontId: string) => void;
  onApplyFontToSelected: (font: CustomFont) => void;
  installedFonts: CustomFont[];
  hasSelectedElement: boolean;
}

export default function CustomFontModal({
  isOpen,
  onClose,
  onFontInstalled,
  onFontDeleted,
  onApplyFontToSelected,
  installedFonts,
  hasSelectedElement,
}: CustomFontModalProps) {
  const [activeTab, setActiveTab] = useState<
    "google" | "url" | "upload" | "manage"
  >("google");

  // Tab 1: Google Font state
  const [googleFontName, setGoogleFontName] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // Tab 2: URL state
  const [urlFamily, setUrlFamily] = useState("");
  const [urlStylesheet, setUrlStylesheet] = useState("");
  const [urlLoadedHref, setUrlLoadedHref] = useState("");
  const urlPreviewLoaded = Boolean(
    urlLoadedHref &&
      urlStylesheet.trim() === urlLoadedHref &&
      urlFamily.trim(),
  );
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  // Tab 3: Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFamily, setUploadFamily] = useState("");
  const [uploadFormat, setUploadFormat] = useState<string>("woff2");
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string>("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Common preview text
  const [previewText, setPreviewText] = useState(
    "Sourav Mitra — Fine Art & Book Cover Designer 1234567890",
  );
  const [previewFontSize, setPreviewFontSize] = useState(24);
  const [applyImmediately, setApplyImmediately] = useState(hasSelectedElement);

  // Manage tab state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync applyImmediately when selection prop changes
  const [prevHasSelected, setPrevHasSelected] = useState(hasSelectedElement);
  if (hasSelectedElement !== prevHasSelected) {
    setPrevHasSelected(hasSelectedElement);
    if (hasSelectedElement) {
      setApplyImmediately(true);
    }
  }

  // Dynamically load Google Font into document head for live modal preview
  useEffect(() => {
    if (!googleFontName.trim()) {
      return;
    }
    const clean = sanitizeFontFamily(googleFontName);
    if (!clean) return;

    queueMicrotask(() => {
      setGoogleError("");
      setGoogleLoading(true);
    });

    const testUrl = buildGoogleFontUrl(clean);
    const linkId = `preview-google-font-${clean.replace(/\s+/g, "-")}`;
    let link = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = testUrl;
      link.onload = () => {
        setGoogleLoading(false);
      };
      link.onerror = () => {
        setGoogleLoading(false);
        setGoogleError(
          `Could not find "${clean}" on Google Fonts. Check spelling.`,
        );
      };
      document.head.appendChild(link);
    } else {
      queueMicrotask(() => {
        setGoogleLoading(false);
      });
    }
  }, [googleFontName]);

  // Dynamically load Custom URL into document head for live preview
  useEffect(() => {
    if (!urlStylesheet.trim() || !urlFamily.trim()) {
      return;
    }

    queueMicrotask(() => {
      setUrlError("");
      setUrlLoading(true);
    });

    const linkId = `preview-url-font-${sanitizeFontFamily(urlFamily).replace(/\s+/g, "-")}`;
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = urlStylesheet.trim();
      link.onload = () => {
        setUrlLoadedHref(urlStylesheet.trim());
        setUrlLoading(false);
      };
      link.onerror = () => {
        setUrlLoadedHref("");
        setUrlLoading(false);
        setUrlError(
          "Failed to load stylesheet URL. Ensure URL is valid and allows CORS.",
        );
      };
      document.head.appendChild(link);
    } else {
      link.href = urlStylesheet.trim();
      queueMicrotask(() => {
        setUrlLoadedHref(urlStylesheet.trim());
        setUrlLoading(false);
      });
    }
  }, [urlFamily, urlStylesheet]);

  if (!isOpen) return null;

  // Handlers
  const handleInstallGoogleFont = async (familyName?: string) => {
    const targetFamily = familyName || googleFontName;
    const clean = sanitizeFontFamily(targetFamily);
    if (!clean) {
      setGoogleError("Please specify a font family name.");
      return;
    }

    setGoogleLoading(true);
    setGoogleError("");

    try {
      const url = buildGoogleFontUrl(clean);
      const res = await fetch("/api/cms/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: clean,
          type: "google",
          url,
          category: "display",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to install Google font.");
      }

      setStatusMsg(`Font "${clean}" successfully installed!`);
      onFontInstalled(data.font, applyImmediately);
      setGoogleFontName("");
      setTimeout(() => setStatusMsg(""), 3500);
      setActiveTab("manage");
    } catch (err: unknown) {
      setGoogleError((err as Error).message || "Installation failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstallUrlFont = async () => {
    const cleanFamily = sanitizeFontFamily(urlFamily);
    const cleanUrl = urlStylesheet.trim();

    if (!cleanFamily) {
      setUrlError("Please enter the font family name.");
      return;
    }
    if (!cleanUrl || !cleanUrl.startsWith("http")) {
      setUrlError(
        "Please enter a valid CSS stylesheet URL starting with http:// or https://",
      );
      return;
    }

    setUrlLoading(true);
    setUrlError("");

    try {
      const res = await fetch("/api/cms/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: cleanFamily,
          type: "url",
          url: cleanUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to install web font.");
      }

      setStatusMsg(`Font "${cleanFamily}" successfully installed!`);
      onFontInstalled(data.font, applyImmediately);
      setUrlFamily("");
      setUrlStylesheet("");
      setTimeout(() => setStatusMsg(""), 3500);
      setActiveTab("manage");
    } catch (err: unknown) {
      setUrlError((err as Error).message || "Installation failed.");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["woff2", "woff", "ttf", "otf"].includes(ext || "")) {
      setUploadError(
        "Only .woff2, .woff, .ttf, and .otf font files are supported.",
      );
      return;
    }

    setUploadFile(file);
    setUploadError("");

    // Infer family name from filename (e.g., "CinzelDecorative-Bold.woff2" -> "Cinzel Decorative")
    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .trim();
    if (!uploadFamily) {
      setUploadFamily(baseName);
    }

    const fmt =
      ext === "woff2"
        ? "woff2"
        : ext === "woff"
          ? "woff"
          : ext === "ttf"
            ? "truetype"
            : "opentype";
    setUploadFormat(fmt);

    // Create temporary object URL for immediate live specimen preview
    const tempUrl = URL.createObjectURL(file);
    setUploadedBlobUrl(tempUrl);

    // Inject temporary @font-face for preview
    const styleId = "temp-uploaded-font-preview";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @font-face {
        font-family: '${sanitizeFontFamily(baseName)}';
        src: url('${tempUrl}') format('${fmt}');
        font-display: swap;
      }
    `;
  };

  const handleUploadAndInstallFont = async () => {
    if (!uploadFile) {
      setUploadError("Please select a font file (.woff2, .woff, .ttf, .otf).");
      return;
    }
    const cleanFamily = sanitizeFontFamily(uploadFamily);
    if (!cleanFamily) {
      setUploadError("Please specify a font family name.");
      return;
    }

    setUploadLoading(true);
    setUploadError("");

    try {
      // 1. Upload font file to /api/media
      const formData = new FormData();
      formData.append("file", uploadFile);

      const mediaRes = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      const mediaData = await mediaRes.json();
      if (!mediaRes.ok || !mediaData.assets || mediaData.assets.length === 0) {
        throw new Error(mediaData.message || "Failed to upload font file.");
      }

      const uploadedAsset = mediaData.assets[0];
      const fontUrl = uploadedAsset.blobUrl;

      // 2. Register font in /api/cms/fonts
      const fontRes = await fetch("/api/cms/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: cleanFamily,
          type: "upload",
          url: fontUrl,
          format: uploadFormat,
        }),
      });

      const fontData = await fontRes.json();
      if (!fontRes.ok || !fontData.success) {
        throw new Error(fontData.error || "Failed to register custom font.");
      }

      setStatusMsg(`Uploaded font "${cleanFamily}" installed successfully!`);
      onFontInstalled(fontData.font, applyImmediately);

      // Clean up
      setUploadFile(null);
      setUploadFamily("");
      setUploadedBlobUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setStatusMsg(""), 3500);
      setActiveTab("manage");
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteFont = async (id: string, family: string) => {
    if (
      !confirm(
        `Are you sure you want to uninstall font "${family}"? Elements using this font will fall back to default typography.`,
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/cms/fonts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to uninstall font.");
      }

      onFontDeleted(id);
      setStatusMsg(`Font "${family}" uninstalled.`);
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to uninstall font.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="font-modal-title"
      className="fixed inset-0 z-999999 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#141414]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔤</span>
            <div>
              <h2
                id="font-modal-title"
                className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                Custom Font Studio
                <span className="text-[10px] text-[#C5A059] border border-[#C5A059]/40 bg-[#C5A059]/10 px-2 py-0.5 rounded font-normal lowercase tracking-normal">
                  live typography installer
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Install Google Fonts, custom CSS web font URLs, or upload font
                files (.woff2, .woff, .ttf, .otf)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#252525] transition-colors text-lg font-bold">
            ✕
          </button>
        </div>

        {/* Status Toast Message */}
        {statusMsg && (
          <div className="bg-[#C5A059]/15 border-b border-[#C5A059]/30 text-[#C5A059] px-6 py-2 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <span>✓</span>
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#222] bg-[#111] text-xs font-semibold uppercase tracking-wider shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("google")}
            className={`py-3 px-5 transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "google"
                ? "border-[#C5A059] text-[#C5A059] bg-[#181818]"
                : "border-transparent text-gray-400 hover:text-white hover:bg-[#151515]"
            }`}>
            <span>🔍</span>
            <span>Google Fonts (By Name &amp; Quick Pick)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`py-3 px-5 transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "url"
                ? "border-[#C5A059] text-[#C5A059] bg-[#181818]"
                : "border-transparent text-gray-400 hover:text-white hover:bg-[#151515]"
            }`}>
            <span>🌐</span>
            <span>Web Font Stylesheet URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-5 transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "upload"
                ? "border-[#C5A059] text-[#C5A059] bg-[#181818]"
                : "border-transparent text-gray-400 hover:text-white hover:bg-[#151515]"
            }`}>
            <span>📁</span>
            <span>Upload Font File (.woff2 / .ttf)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`py-3 px-5 transition-all border-b-2 flex items-center gap-2 ml-auto whitespace-nowrap ${
              activeTab === "manage"
                ? "border-[#C5A059] text-[#C5A059] bg-[#181818]"
                : "border-transparent text-gray-400 hover:text-white hover:bg-[#151515]"
            }`}>
            <span>✨</span>
            <span>Installed Fonts ({installedFonts.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GOOGLE FONTS */}
          {activeTab === "google" && (
            <div className="space-y-6">
              <div className="bg-[#151515] p-5 rounded-lg border border-[#252525] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label
                    htmlFor="google-font-input"
                    className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                    Type Any Google Font Name:
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Supports all 1,600+ Google Fonts (e.g. <em>Aboreto</em>,{" "}
                    <em>Cormorant Unicase</em>, <em>Megrim</em>)
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    id="google-font-input"
                    type="text"
                    value={googleFontName}
                    onChange={(e) => setGoogleFontName(e.target.value)}
                    placeholder="e.g. Aboreto, Syne, Cormorant Unicase, Megrim..."
                    className="flex-1 bg-[#090909] border border-[#333] focus:border-[#C5A059] text-white px-3.5 py-2.5 rounded text-sm outline-none transition-colors"
                  />
                  <button
                    type="button"
                    disabled={!googleFontName.trim() || googleLoading}
                    onClick={() => handleInstallGoogleFont()}
                    className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#dfb96e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold uppercase tracking-wider text-xs rounded transition-all shadow-md shadow-[#C5A059]/20 flex items-center gap-1.5 whitespace-nowrap">
                    {googleLoading ? "Loading..." : "Install Font"}
                  </button>
                </div>

                {googleError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded">
                    ⚠ {googleError}
                  </p>
                )}

                {/* Immediate Apply Checkbox */}
                {hasSelectedElement && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 pt-1">
                    <input
                      type="checkbox"
                      checked={applyImmediately}
                      onChange={(e) => setApplyImmediately(e.target.checked)}
                      className="accent-[#C5A059] rounded"
                    />
                    <span>
                      Apply immediately to currently selected element on canvas
                    </span>
                  </label>
                )}
              </div>

              {/* Live Specimen Preview */}
              {googleFontName.trim() && (
                <div className="bg-[#121212] p-5 rounded-lg border border-[#2a2a2a] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#222] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059]">
                      Live Specimen Preview: {googleFontName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Size:</span>
                      <input
                        type="range"
                        min="14"
                        max="48"
                        value={previewFontSize}
                        onChange={(e) =>
                          setPreviewFontSize(Number(e.target.value))
                        }
                        className="w-24 accent-[#C5A059]"
                      />
                      <span className="text-[11px] text-gray-300 w-8">
                        {previewFontSize}px
                      </span>
                    </div>
                  </div>

                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      setPreviewText(e.currentTarget.textContent || "")
                    }
                    style={{
                      fontFamily: `'${sanitizeFontFamily(googleFontName)}', sans-serif`,
                      fontSize: `${previewFontSize}px`,
                      lineHeight: "1.4",
                    }}
                    className="p-4 bg-[#0a0a0a] rounded border border-[#202020] text-gray-100 min-h-22.5 outline-none focus:border-[#C5A059]/60 transition-colors">
                    {previewText}
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    Tip: Click inside the preview box to test your own custom
                    headline or book title!
                  </p>
                </div>
              )}

              {/* Quick-Pick Curated Fonts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider text-gray-300 font-bold flex items-center gap-1.5">
                    <span>✨</span>
                    <span>
                      Curated Artist &amp; Editorial Quick-Picks (1-Click
                      Install)
                    </span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Hand-picked for fine art, fantasy novels &amp; book covers
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {RECOMMENDED_GOOGLE_FONTS.map((font) => {
                    const isInstalled = installedFonts.some(
                      (f) => f.family.toLowerCase() === font.name.toLowerCase(),
                    );
                    return (
                      <div
                        key={font.name}
                        className="bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#C5A059]/60 p-3.5 rounded transition-all flex flex-col justify-between group">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-sm">
                              {font.name}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider bg-[#222] text-[#C5A059] px-1.5 py-0.5 rounded font-mono">
                              {font.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">
                            {font.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-[#202020]">
                          <button
                            type="button"
                            onClick={() => {
                              setGoogleFontName(font.name);
                            }}
                            className="flex-1 py-1.5 px-2 bg-[#202020] hover:bg-[#2b2b2b] text-gray-300 text-[11px] rounded transition-colors text-center">
                            Preview
                          </button>
                          <button
                            type="button"
                            disabled={isInstalled}
                            onClick={() => handleInstallGoogleFont(font.name)}
                            className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded transition-colors uppercase tracking-wider ${
                              isInstalled
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 cursor-default"
                                : "bg-[#C5A059] hover:bg-white text-black"
                            }`}>
                            {isInstalled ? "Installed ✓" : "+ Install"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEB FONT STYLESHEET URL */}
          {activeTab === "url" && (
            <div className="space-y-6">
              <div className="bg-[#151515] p-5 rounded-lg border border-[#252525] space-y-4">
                <div className="border-b border-[#252525] pb-3">
                  <h3 className="text-xs uppercase tracking-wider text-gray-200 font-bold">
                    Install Font via External CSS Stylesheet URL
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports Adobe Typekit, Fontshare, Google Fonts URLs, Bunny
                    Fonts, or any CDN stylesheet.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="url-family-input"
                      className="block text-xs uppercase tracking-wider text-gray-300 font-bold mb-1.5">
                      Font Family Name:
                    </label>
                    <input
                      id="url-family-input"
                      type="text"
                      value={urlFamily}
                      onChange={(e) => setUrlFamily(e.target.value)}
                      placeholder="e.g. Cabinet Grotesk, Clash Display, Ogg"
                      className="w-full bg-[#090909] border border-[#333] focus:border-[#C5A059] text-white px-3.5 py-2.5 rounded text-sm outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="url-stylesheet-input"
                      className="block text-xs uppercase tracking-wider text-gray-300 font-bold mb-1.5">
                      CSS Stylesheet URL:
                    </label>
                    <input
                      id="url-stylesheet-input"
                      type="url"
                      value={urlStylesheet}
                      onChange={(e) => setUrlStylesheet(e.target.value)}
                      placeholder="e.g. https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500,400&display=swap"
                      className="w-full bg-[#090909] border border-[#333] focus:border-[#C5A059] text-white px-3.5 py-2.5 rounded outline-none transition-colors font-mono text-xs"
                    />
                  </div>
                </div>

                {urlError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded">
                    ⚠ {urlError}
                  </p>
                )}

                {hasSelectedElement && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 pt-1">
                    <input
                      type="checkbox"
                      checked={applyImmediately}
                      onChange={(e) => setApplyImmediately(e.target.checked)}
                      className="accent-[#C5A059] rounded"
                    />
                    <span>
                      Apply immediately to currently selected element on canvas
                    </span>
                  </label>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={
                      !urlFamily.trim() || !urlStylesheet.trim() || urlLoading
                    }
                    onClick={handleInstallUrlFont}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#C5A059] hover:bg-[#dfb96e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold uppercase tracking-wider text-xs rounded transition-all shadow-md shadow-[#C5A059]/20">
                    {urlLoading
                      ? "Installing..."
                      : "Install & Add to Typography"}
                  </button>
                </div>
              </div>

              {/* Preview */}
              {urlFamily.trim() && (
                <div className="bg-[#121212] p-5 rounded-lg border border-[#2a2a2a] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#222] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059]">
                      Live Preview: {urlFamily}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {urlPreviewLoaded ? "✓ Stylesheet loaded" : "Loading..."}
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: `'${sanitizeFontFamily(urlFamily)}', sans-serif`,
                      fontSize: `${previewFontSize}px`,
                      lineHeight: "1.4",
                    }}
                    className="p-4 bg-[#0a0a0a] rounded border border-[#202020] text-gray-100 min-h-22.5 outline-none">
                    {previewText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPLOAD FONT FILE */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              <div className="bg-[#151515] p-5 rounded-lg border border-[#252525] space-y-4">
                <div className="border-b border-[#252525] pb-3">
                  <h3 className="text-xs uppercase tracking-wider text-gray-200 font-bold">
                    Upload Custom Font File (.woff2, .woff, .ttf, .otf)
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload your own proprietary or purchased font files. We
                    automatically store the file and generate the @font-face
                    definition.
                  </p>
                </div>

                {/* Dropzone / File Picker */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#333] hover:border-[#C5A059] rounded-lg p-8 text-center cursor-pointer bg-[#0a0a0a] hover:bg-[#121212] transition-all group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                    📤
                  </div>
                  <p className="text-sm text-gray-200 font-semibold mb-1">
                    {uploadFile
                      ? uploadFile.name
                      : "Click to select font file or drag & drop"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Supported formats: .woff2 (recommended for web), .woff,
                    .ttf, .otf (Max 10MB)
                  </p>
                </div>

                {uploadFile && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label
                        htmlFor="upload-family-input"
                        className="block text-xs uppercase tracking-wider text-gray-300 font-bold mb-1.5">
                        Font Family Name:
                      </label>
                      <input
                        id="upload-family-input"
                        type="text"
                        value={uploadFamily}
                        onChange={(e) => setUploadFamily(e.target.value)}
                        placeholder="e.g. MyBrandSerif"
                        className="w-full bg-[#090909] border border-[#333] focus:border-[#C5A059] text-white px-3.5 py-2.5 rounded text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded">
                    ⚠ {uploadError}
                  </p>
                )}

                {hasSelectedElement && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 pt-1">
                    <input
                      type="checkbox"
                      checked={applyImmediately}
                      onChange={(e) => setApplyImmediately(e.target.checked)}
                      className="accent-[#C5A059] rounded"
                    />
                    <span>
                      Apply immediately to currently selected element on canvas
                    </span>
                  </label>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={
                      !uploadFile || !uploadFamily.trim() || uploadLoading
                    }
                    onClick={handleUploadAndInstallFont}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#C5A059] hover:bg-[#dfb96e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold uppercase tracking-wider text-xs rounded transition-all shadow-md shadow-[#C5A059]/20">
                    {uploadLoading
                      ? "Uploading & Installing..."
                      : "Save & Install Font"}
                  </button>
                </div>
              </div>

              {/* Upload Preview */}
              {uploadedBlobUrl && uploadFamily.trim() && (
                <div className="bg-[#121212] p-5 rounded-lg border border-[#2a2a2a] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#222] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059]">
                      Uploaded File Specimen Preview: {uploadFamily}
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: `'${sanitizeFontFamily(uploadFamily)}', sans-serif`,
                      fontSize: `${previewFontSize}px`,
                      lineHeight: "1.4",
                    }}
                    className="p-4 bg-[#0a0a0a] rounded border border-[#202020] text-gray-100 min-h-22.5 outline-none">
                    {previewText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INSTALLED FONTS MANAGER */}
          {activeTab === "manage" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#222] pb-3">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-gray-200 font-bold">
                    Active Installed Custom Fonts ({installedFonts.length})
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    These fonts are automatically available in the Typography
                    dropdown and loaded on all published pages.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("google")}
                  className="px-3 py-1.5 bg-[#C5A059] text-black text-xs font-bold uppercase tracking-wider rounded hover:bg-white transition-colors">
                  + Add More Fonts
                </button>
              </div>

              {installedFonts.length === 0 ? (
                <div className="text-center py-12 border border-[#252525] rounded-lg bg-[#121212] space-y-3">
                  <div className="text-4xl">🔤</div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    No Custom Fonts Installed Yet
                  </h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    You can install any Google Font by name, add a custom web
                    font stylesheet URL, or upload your own font files (.woff2,
                    .ttf).
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("google")}
                    className="mt-2 px-4 py-2 bg-[#C5A059] hover:bg-[#dfb96e] text-black text-xs font-bold uppercase tracking-wider rounded transition-colors">
                    Browse Google Fonts
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {installedFonts.map((font) => (
                    <div
                      key={font.id}
                      className="bg-[#141414] border border-[#262626] rounded-lg p-4 space-y-3 hover:border-[#383838] transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202020] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {font.family}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#222] text-[#C5A059] border border-[#333]">
                            {font.type === "google"
                              ? "Google Font"
                              : font.type === "url"
                                ? "Web Stylesheet"
                                : `Uploaded (${font.format || "font"})`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasSelectedElement && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyFontToSelected(font);
                                setStatusMsg(
                                  `Applied "${font.family}" to selected element!`,
                                );
                                setTimeout(() => setStatusMsg(""), 3000);
                              }}
                              className="px-3 py-1 bg-[#252525] hover:bg-[#C5A059] hover:text-black text-gray-200 text-xs font-semibold rounded transition-colors flex items-center gap-1">
                              <span>🎯</span>
                              <span>Apply to Selection</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={deletingId === font.id}
                            onClick={() =>
                              handleDeleteFont(font.id, font.family)
                            }
                            className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 hover:text-red-200 text-xs font-semibold rounded transition-colors">
                            {deletingId === font.id
                              ? "Removing..."
                              : "Uninstall"}
                          </button>
                        </div>
                      </div>

                      {/* Font Specimen Text */}
                      <div
                        style={{
                          fontFamily: `'${font.family}', sans-serif`,
                          fontSize: "18px",
                          lineHeight: "1.4",
                        }}
                        className="text-gray-200 p-2.5 bg-[#090909] rounded border border-[#1c1c1c]">
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
                        0123456789
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#222] bg-[#141414] flex items-center justify-between text-xs text-gray-400">
          <span>
            Installed fonts automatically synchronize across draft previews
            &amp; published pages.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252525] hover:bg-[#333] text-white rounded font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
