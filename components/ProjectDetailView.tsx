"use client";

import { useState } from "react";
import Link from "next/link";
import { ProceduralPlaceholder } from "./BehanceCard";

interface ProjectDetailProps {
  id: string;
  title: string;
  type: "book-cover" | "illustration" | "fine-art";
  genreOrMedium: string;
  year: number;
  description: string;
  likes: number;
  views: number;
  tags: string[];
  publisher?: string;
  dimensions?: string;
  availability?: string;
  notes?: string;
  backUrl: string;
}

interface Comment {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
}

export default function ProjectDetailView({
  id,
  title,
  type,
  genreOrMedium,
  year,
  publisher,
  dimensions,
  availability,
  backUrl,
}: ProjectDetailProps) {
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      author: "Elena Rostova",
      initials: "ER",
      text:
        type === "book-cover"
          ? "The layout on this cover is absolutely pristine. The typography has a great literary presence!"
          : type === "illustration"
            ? "Love the composition and the depth of colors here! Inspiring vector artwork."
            : "Incredible texture and depth. The color-field composition evokes so much emotion.",
      time: "2 hours ago",
    },
    {
      id: "c2",
      author: "Marcus Vance",
      initials: "MV",
      text:
        type === "book-cover"
          ? "Great use of negative space. The golden ratios really stand out on this cover."
          : type === "illustration"
            ? "Fantastic flow and contrast. The line weight is super clean."
            : "Is this oil or mixed media? The subtle organic strokes feel incredibly tactile.",
      time: "Yesterday",
    },
  ]);
  const [newComment, setNewComment] = useState("");

  const copyToClipboard = async (text: string) => {
    if (typeof window === "undefined") return false;

    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("Modern clipboard copy failed, trying fallback...", err);
      }
    }

    // Fallback: execCommand('copy') for older browsers or insecure contexts
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Clipboard fallback failed:", err);
      return false;
    }
  };

  const handleShareClick = async (platform: string) => {
    if (typeof window === "undefined") return;

    const shareUrl = window.location.href;
    const shareTitle = `Check out "${title}" by Sourav Mitra`;

    let url = "";
    switch (platform) {
      case "whatsapp":
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + " - " + shareUrl)}`;
        window.open(url, "_blank");
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent("I found this amazing project on Sourav Mitra's Portfolio:\n\n" + shareUrl)}`;
        window.open(url, "_blank");
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(url, "_blank");
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        window.open(url, "_blank");
        break;
      case "pinterest":
        url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareTitle)}`;
        window.open(url, "_blank");
        break;
      case "instagram":
        await copyToClipboard(shareUrl);
        setCopiedPlatform("Instagram");
        window.open("https://www.instagram.com", "_blank");
        setTimeout(() => setCopiedPlatform(null), 3000);
        break;
      case "behance":
        await copyToClipboard(shareUrl);
        setCopiedPlatform("Behance");
        window.open("https://www.behance.net", "_blank");
        setTimeout(() => setCopiedPlatform(null), 3000);
        break;
      case "copy":
        await copyToClipboard(shareUrl);
        setCopiedPlatform("Link");
        setTimeout(() => setCopiedPlatform(null), 3000);
        break;
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const freshComment: Comment = {
      id: Date.now().toString(),
      author: "You (Visitor)",
      initials: "YO",
      text: newComment.trim(),
      time: "Just now",
    };

    setComments([freshComment, ...comments]);
    setNewComment("");
  };

  // 3D Book Mockup Component (Renders front, spine, and perspective shadows)
  const render3DBookMockup = () => {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0d0d0d] rounded-xl border border-[#222] overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none" />
        <span className="text-[10px] tracking-widest uppercase text-[#C5A059] mb-12 font-bold font-sans">
          Procedural 3D Presentation Mockup
        </span>

        {/* Book Container with CSS Perspective */}
        <div
          className="relative cursor-pointer transition-transform duration-500 hover:rotate-y-12 select-none"
          style={{ perspective: "1200px" }}>
          <div
            className="relative w-64 h-96 transition-transform duration-700 ease-out flex"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(-24deg) rotateX(10deg) rotateZ(-2deg)",
            }}>
            {/* Front Cover */}
            <div
              className="absolute inset-0 w-full h-full bg-[#111] rounded-r-md overflow-hidden shadow-2xl z-20"
              style={{
                transform: "translateZ(14px)",
                backfaceVisibility: "hidden",
              }}>
              <ProceduralPlaceholder id={id} type="book-cover" title={title} />
            </div>

            {/* Book Spine */}
            <div
              className="absolute top-0 bottom-0 w-7 bg-linear-to-r from-[#111111] via-[#222222] to-[#080808] z-10 origin-left border-y border-white/5"
              style={{
                transform: "rotateY(-90deg) translateZ(0px)",
                left: "0px",
              }}>
              <div className="w-full h-full flex flex-col justify-between items-center py-6 select-none border-r border-white/10">
                <p className="text-[7px] text-[#C5A059]/60 uppercase tracking-[0.2em] origin-center -rotate-90 whitespace-nowrap">
                  Sourav Mitra Portfolio
                </p>
                <p className="text-[7px] text-white/50 uppercase font-serif origin-center -rotate-90 whitespace-nowrap font-medium tracking-widest max-w-35 truncate">
                  {title}
                </p>
                <p className="text-[6px] text-white/30 font-sans origin-center -rotate-90">
                  {year}
                </p>
              </div>
            </div>

            {/* Book Pages (Right Edge thickness) */}
            <div
              className="absolute top-0 bottom-0 w-7 bg-[#e5e5e0] z-0"
              style={{
                transform: "rotateY(90deg) translateZ(236px)",
                left: "0px",
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
              }}
            />

            {/* Back Cover */}
            <div
              className="absolute inset-0 w-full h-full bg-[#0a0a0a] rounded-r-md z-0 shadow-2xl"
              style={{
                transform: "translateZ(-14px) rotateY(180deg)",
                boxShadow: "-10px 10px 40px rgba(0,0,0,0.8)",
              }}
            />
          </div>

          {/* Book Shadow */}
          <div
            className="absolute -bottom-4 -left-12 w-96 h-12 bg-black/60 blur-xl rounded-full mix-blend-multiply origin-center -rotate-12 transform scale-y-50 z-0 pointer-events-none"
            style={{ transform: "translateY(10px) rotateX(80deg)" }}
          />
        </div>
      </div>
    );
  };

  // Gallery Framed Painting presentation
  const renderFramedExhibition = () => {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-[#eae7df] rounded-xl border border-gray-300 relative shadow-inner overflow-hidden">
        {/* Soft gallery spotlight overlay */}
        <div className="absolute inset-0 bg-linear-to-tr from-black/4 via-transparent to-white/40 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-white/60 to-transparent blur-3xl pointer-events-none" />

        <span className="text-[10px] tracking-widest uppercase text-gray-500 mb-12 font-bold font-sans z-10">
          Exhibition Wall View (Gallery Lighting)
        </span>

        {/* Gallery Painting Frame */}
        <div className="relative group/frame z-10 select-none">
          {/* Wall shadow cast by frame */}
          <div className="absolute -inset-4 bg-black/15 blur-xl group-hover/frame:bg-black/25 transition-colors duration-500 pointer-events-none rounded-lg" />

          {/* Wooden Frame */}
          <div className="relative p-5 bg-linear-to-b from-[#2e1d11] via-[#1d1109] to-[#0d0703] border-[6px] border-[#3e291b] shadow-2xl rounded-sm flex items-center justify-center">
            {/* Golden Inner Fillet Frame */}
            <div className="absolute inset-1.5 border border-[#C5A059]/40 pointer-events-none" />

            {/* White Matting (Passpartout) */}
            <div className="p-10 bg-[#faf8f5] shadow-inner border border-gray-200 flex items-center justify-center">
              {/* Painting Artwork */}
              <div className="w-72 h-72 shadow-md relative overflow-hidden bg-linear-to-br border border-black/10">
                <ProceduralPlaceholder id={id} type="fine-art" title={title} />
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Artwork Info Card (Placard) */}
        <div className="mt-14 p-4 bg-white/90 border border-gray-200 shadow-sm rounded-sm w-48 text-left z-10 self-center text-gray-800">
          <h5 className="font-serif text-xs font-bold leading-tight">
            {title}
          </h5>
          <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wider">
            {genreOrMedium}
          </p>
          <p className="text-[9px] text-gray-500 mt-0.5">{dimensions}</p>
          <p className="text-[8px] text-gray-400 mt-2">Sourav Mitra • {year}</p>
        </div>
      </div>
    );
  };

  // Detailed Cropped view study
  const renderDetailStudy = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Concept Sketch (blueprint style) */}
        <div className="flex flex-col items-center justify-center p-10 bg-[#0c121c] rounded-xl border border-blue-950/40 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-size-[16px_16px] pointer-events-none" />
          <span className="text-[10px] tracking-widest uppercase text-blue-400 mb-6 font-bold font-mono">
            Blueprint & Grid Study
          </span>
          <div className="w-56 h-56 relative opacity-50 flex items-center justify-center">
            {/* Procedural sketch vector lines */}
            <svg
              className="w-full h-full stroke-blue-400 fill-none opacity-80"
              viewBox="0 0 100 100">
              <rect
                x="5"
                y="5"
                width="90"
                height="90"
                strokeDasharray="3 3"
                strokeWidth="0.5"
              />
              <line x1="50" y1="0" x2="50" y2="100" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="40" strokeWidth="1" />
              <polygon points="50,15 85,75 15,75" strokeWidth="0.75" />
              <circle
                cx="50"
                cy="50"
                r="15"
                strokeDasharray="2 2"
                strokeWidth="0.5"
              />
              <path
                d="M10,10 L90,90 M10,90 L90,10"
                strokeDasharray="5 5"
                strokeWidth="0.5"
              />
            </svg>
          </div>
          <p className="text-[11px] text-blue-300 font-mono mt-6 italic">
            Geometric proportions & layout grid
          </p>
        </div>

        {/* Right: Macro Texture Study */}
        <div className="flex flex-col items-center justify-center p-10 bg-[#141414] rounded-xl border border-[#252525] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[12px_12px] pointer-events-none" />
          <span className="text-[10px] tracking-widest uppercase text-amber-500 mb-6 font-bold font-sans">
            Detail Crop & Macro Texture
          </span>

          <div className="w-56 h-56 rounded-full overflow-hidden shadow-2xl relative border-4 border-[#C5A059]/20 flex items-center justify-center">
            <div className="absolute inset-0 scale-150 transform">
              {/* Highly zoomed visual crop */}
              <ProceduralPlaceholder id={id} type={type} title="" />
            </div>
            {/* Magnifying lens effect reflection */}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          </div>

          <p className="text-[11px] text-gray-400 font-sans mt-6 italic">
            Macro magnification showing surface tactile grains
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto text-[#D4D4D4]">
      {/* Back to list */}
      <Link
        href={backUrl}
        className="inline-flex items-center gap-2 mb-10 text-[#C5A059] hover:text-white font-medium text-sm transition-colors group">
        <span className="transform group-hover:-translate-x-1 transition-transform duration-200">
          &larr;
        </span>
        Back to Portfolio
      </Link>

      <div className="flex flex-col gap-12 items-center">
        {/* MAIN COLUMN: Case Study Visual Blocks Flow */}
        <div className="w-full max-w-4xl flex flex-col gap-12">
          {/* Header Block */}
          <div className="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl flex flex-col gap-6">
            <div>
              <span className="text-[10px] tracking-widest uppercase text-[#C5A059] font-bold block mb-1">
                {type === "book-cover"
                  ? "Book Cover Design"
                  : type === "illustration"
                    ? "Illustration"
                    : "Fine Art"}
              </span>
              <h1 className="text-4xl font-serif font-black text-white leading-tight">
                {title}
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                By <span className="text-white font-medium">Sourav Mitra</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="relative w-full">
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                className="w-full py-3 rounded-lg bg-black text-gray-300 border border-[#2a2a2a] hover:text-white hover:bg-[#111] hover:border-[#3a3a3a] font-bold tracking-wider text-xs uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4 text-[#C5A059]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 10.742l4.57 2.286M15.418 9l-4.57 2.286M16 5a3 3 0 11-6 0 3 3 0 016 0zm-6 12a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {showShareDropdown ? "Close Share Menu" : "Share Project"}
              </button>

              {/* Share Options Dropdown */}
              {showShareDropdown && (
                <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-[#0d0d0d] rounded-lg border border-[#2a2a2a] shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] tracking-widest uppercase text-gray-500 font-bold mb-3 text-center">
                    Share this project via
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleShareClick("whatsapp")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-green-500 transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.012 2c-5.506 0-9.987 4.479-9.987 9.987 0 1.763.46 3.42 1.262 4.876L2 22l5.304-1.391c1.4.76 2.99 1.191 4.708 1.191 5.507 0 9.987-4.479 9.987-9.987A9.99 9.99 0 0012.012 2zm5.82 14.128c-.24.675-1.2 1.233-1.65 1.293-.41.055-.94.1-2.73-.645-2.29-.953-3.763-3.284-3.878-3.44-.115-.152-.94-1.25-.94-2.385 0-1.134.59-1.693.8-1.912.21-.219.462-.273.616-.273.154 0 .308.004.442.01.144.006.337-.056.529.41.198.48.675 1.644.733 1.763.058.12.096.259.015.419-.08.16-.12.259-.24.399-.12.14-.25.313-.356.42-.116.11-.237.23-.102.463.135.23.601.99 1.292 1.604.89.792 1.64 1.037 1.872 1.152.23.115.365.096.5-.059.134-.154.577-.674.731-.903.154-.23.308-.192.52-.115.21.077 1.346.634 1.577.749.23.115.385.173.442.272.058.1.058.577-.182 1.252z"/>
                      </svg>
                      WhatsApp
                    </button>

                    <button
                      onClick={() => handleShareClick("email")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-rose-400 transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Email
                    </button>

                    <button
                      onClick={() => handleShareClick("facebook")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-blue-500 transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                      </svg>
                      Facebook
                    </button>

                    <button
                      onClick={() => handleShareClick("instagram")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-pink-500 transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                      Instagram
                    </button>

                    <button
                      onClick={() => handleShareClick("twitter")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter (X)
                    </button>

                    <button
                      onClick={() => handleShareClick("behance")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-blue-400 transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.2 5.03c1.32-.08 2.37.17 3.14.73.74.55 1.13 1.45 1.13 2.65 0 1.05-.3 1.83-.88 2.35-.45.42-1.02.68-1.74.8v.08c.95.1 1.7.43 2.25 1.02.58.62.88 1.48.88 2.6 0 1.42-.44 2.45-1.3 3.12-.87.68-2.17.92-3.83.92H1.5V5.03H8.2zm-.9 5.37c.75 0 1.28-.1 1.58-.3a.98.98 0 00.42-.85c0-.44-.15-.75-.43-.9-.33-.2-.93-.27-1.78-.27H4.37v2.32H7.3zm.35 6.03c.87 0 1.45-.1 1.76-.32.32-.23.5-.58.5-.98 0-.44-.15-.76-.46-.94-.3-.18-.94-.27-1.92-.27H4.37v2.51H7.65zm14.85-4.5h-7.65c.08 1.25.43 2.15 1.08 2.68.6.5 1.43.75 2.45.75 1.63 0 2.7-.6 3.12-1.8h2.6c-.4 1.5-1.33 2.65-2.82 3.42-1.46.73-3.23 1.1-5.32 1.1-2.95 0-5.18-.87-6.68-2.6-1.52-1.74-2.28-4.1-2.28-7.1 0-3.04.75-5.46 2.28-7.23C14 .94 16.2.03 19.12.03c2.73 0 4.8.84 6.2 2.5 1.4 1.67 2.1 4.02 2.1 7.03v1.37zm-2.45-1.96c-.05-1.04-.37-1.83-.93-2.34-.58-.52-1.35-.78-2.33-.78-1.03 0-1.8.28-2.37.82-.55.55-.83 1.32-.9 2.3h6.53zm-6.2-7.16h5.83v1.48h-5.83V2.8z"/>
                      </svg>
                      Behance
                    </button>

                    <button
                      onClick={() => handleShareClick("pinterest")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-red-500 transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.24 2C6.61 2 2 6.61 2 12.24c0 4.3 2.66 7.97 6.45 9.5-.09-.8-.17-2.03.04-2.9l1.72-7.3s-.44-.88-.44-2.18c0-2.04 1.18-3.57 2.66-3.57 1.25 0 1.86.94 1.86 2.07 0 1.26-.8 3.14-1.22 4.88-.35 1.46.73 2.66 2.17 2.66 2.6 0 4.6-2.74 4.6-6.7 0-3.5-2.52-5.95-6.1-5.95-4.16 0-6.6 3.12-6.6 6.35 0 1.26.48 2.6 1.08 3.34.12.14.14.27.1.43l-.42 1.72c-.07.27-.22.33-.5.2-.19-.08-3.02-1.4-3.02-5.63 0-4.58 3.33-8.8 9.6-8.8 5.04 0 8.96 3.6 8.96 8.4 0 5-3.16 9-7.57 9-1.48 0-2.87-.77-3.35-1.68l-.9 3.46c-.33 1.25-1.2 2.82-1.8 3.77 1 .3 2.05.47 3.15.47 5.63 0 10.24-4.6 10.24-10.24C22.5 6.6 17.88 2 12.24 2z"/>
                      </svg>
                      Pinterest
                    </button>

                    <button
                      onClick={() => handleShareClick("copy")}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-[#C5A059] transition-colors text-xs font-semibold cursor-pointer justify-start"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy Link
                    </button>
                  </div>

                  {copiedPlatform && (
                    <div className="mt-3 text-center text-[11px] text-[#C5A059] font-medium bg-[#C5A059]/10 py-1.5 px-3 rounded-md animate-pulse">
                      {copiedPlatform === "Link"
                        ? "Link copied to clipboard!"
                        : `Link copied! Opening ${copiedPlatform}...`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              {publisher && <span>{publisher}</span>}
              <span>{year}</span>
              <span>{genreOrMedium}</span>
              {dimensions && <span>{dimensions}</span>}
              {availability && (
                <span
                  className={
                    availability === "Available"
                      ? "text-green-400"
                      : "text-rose-400"
                  }>
                  {availability}
                </span>
              )}
            </div>
          </div>

          {/* Visual Block 1: Main Work Full Presentation */}
          <div className="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-4 md:p-8 flex flex-col gap-6 shadow-2xl">
            <span className="text-[10px] tracking-widest uppercase text-gray-500 font-bold font-sans">
              Visual Block 01 // Final Presentation
            </span>
            <div className="w-full bg-[#111111] rounded-lg overflow-hidden border border-[#222]">
              <div
                className={
                  type === "book-cover"
                    ? "aspect-2/3 max-w-md mx-auto my-6 shadow-2xl"
                    : "aspect-square max-w-2xl mx-auto my-6 shadow-2xl"
                }>
                <ProceduralPlaceholder id={id} type={type} title={title} />
              </div>
            </div>
          </div>

          {/* Visual Block 2: Interactive presentation mockups */}
          {type === "book-cover" && render3DBookMockup()}
          {type === "fine-art" && renderFramedExhibition()}

          {/* Visual Block 3: Process details / Sketch studies */}
          {renderDetailStudy()}

          {/* Creative Process Description Block */}
          <div className="bg-[#0c0c0c] rounded-xl border border-[#1d1d1d] p-8 flex flex-col gap-4 shadow-xl">
            <h3 className="text-xl font-serif text-white font-bold border-b border-[#222] pb-3 mb-2">
              The Creative Process & Insight
            </h3>
            <p className="text-sm leading-relaxed text-gray-300">
              This project is built around the harmonious combination of visual
              weight and structural balance. Every visual element has been
              carefully structured using geometric guides and organic focal
              points to create a compelling, immediate narrative.
            </p>
            <p className="text-sm leading-relaxed text-gray-300">
              For this composition, the primary focus was to craft a piece that
              behaves dynamically under varying presentation media. From
              high-resolution digital screens to physical textured prints and
              cover jackets, the design maintains its high contrast and crisp
              legibility.
            </p>
          </div>

          {/* Interactive Comments Feed Section */}
          <div className="bg-[#0c0c0c] rounded-xl border border-[#1a1a1a] p-8 shadow-xl">
            <h3 className="text-xl font-serif text-white font-bold border-b border-[#222] pb-4 mb-6 flex items-center justify-between">
              <span>Project Feedback</span>
              <span className="text-xs font-sans text-[#C5A059] font-medium px-2.5 py-1 bg-[#C5A059]/10 rounded-full">
                {comments.length} Comments
              </span>
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleSubmitComment} className="mb-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#C5A059] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg">
                  V
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <textarea
                    rows={3}
                    placeholder="Type a professional feedback..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-5 py-2 rounded-md bg-[#C5A059] text-white hover:bg-[#a88849] font-medium text-xs tracking-wider uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="flex flex-col gap-6">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-4 border-b border-[#161616] pb-5 last:border-b-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-[#222222] text-gray-300 border border-[#333] flex items-center justify-center font-semibold text-xs shrink-0 select-none">
                    {comment.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {comment.author}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {comment.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
