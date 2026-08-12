"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BehanceCardProps {
  id: string;
  title: string;
  type: "book-cover" | "illustration" | "fine-art";
  genreOrMedium: string;
  year: number;
  likes: number;
  views: number;
  detailUrl: string;
}

// Simple hash function to generate consistent pseudo-random numbers from an ID
const getHash = (str: string, index: number) => {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash + index);
};

// Procedural Placeholder Generator
export const ProceduralPlaceholder = ({
  id,
  type,
  title,
}: {
  id: string;
  type: string;
  title: string;
}) => {
  const h1 = getHash(id, 101);
  const h2 = getHash(id, 202);
  const h3 = getHash(id, 303);

  // Gradient styles
  const bookCoverGradients = [
    "from-[#2c1b18] to-[#0f0a09]", // Warm terracotta / mahogany
    "from-[#12221a] to-[#060c09]", // Deep forest spruce
    "from-[#0f1f2c] to-[#050b0f]", // Prussian blue / navy
    "from-[#1c1c1c] to-[#080808]", // Minimalist absolute charcoal
    "from-[#241a2f] to-[#0c0811]", // Royal aubergine / violet
    "from-[#2e2615] to-[#120f08]", // Ancient brass / gold-brown
    "from-[#341b24] to-[#12090c]", // Velvet burgundy
  ];

  const illustrationGradients = [
    "from-[#3b0764] via-[#1d0047] to-[#03001e]", // Cosmic neon violet
    "from-[#064e3b] via-[#022c22] to-[#01140f]", // Emerald lagoon
    "from-[#7c2d12] via-[#431407] to-[#1a0500]", // Sunset lava
    "from-[#1e3a8a] via-[#0f172a] to-[#020617]", // High-tech cobalt
    "from-[#0f172a] via-[#1e293b] to-[#0f172a]", // Modern grid dark slate
  ];

  const fineArtGradients = [
    "from-[#ea580c] via-[#ca8a04] to-[#1e3a8a]", // Expressive color field
    "from-[#d946ef] via-[#86198f] to-[#3b0764]", // Abstract pink & purple fields
    "from-[#115e59] via-[#155e75] to-[#0f172a]", // Ocean depths impressionist
    "from-[#9a3412] via-[#7c2d12] to-[#3c150c]", // Siennas and umbers landscape
    "from-[#cbd5e1] via-[#94a3b8] to-[#475569]", // Minimalist grey fog
  ];

  const getGradient = () => {
    if (type === "book-cover") {
      return bookCoverGradients[h1 % bookCoverGradients.length];
    }

    if (type === "illustration") {
      return illustrationGradients[h1 % illustrationGradients.length];
    }

    return fineArtGradients[h1 % fineArtGradients.length];
  };

  // SVGs of geometric/abstract elements
  const renderSVGElement = () => {
    const shapeType = h2 % 5;

    const color = ["#C5A059", "#E5C185", "#A58039", "#FFFFFF", "#64748B"][
      h3 % 5
    ];

    if (type === "book-cover") {
      return (
        <svg
          className="w-2/3 h-2/3 opacity-30 absolute top-[15%] left-[16.5%] transition-transform duration-700 group-hover:scale-110 pointer-events-none"
          viewBox="0 0 100 100">
          {shapeType === 0 && (
            <path
              d="M50 15 L85 75 L15 75 Z"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}

          {shapeType === 1 && (
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {shapeType === 2 && (
            <rect
              x="20"
              y="20"
              width="60"
              height="60"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              transform="rotate(45 50 50)"
            />
          )}

          {shapeType === 3 && (
            <g stroke={color} strokeWidth="1">
              <line x1="50" y1="10" x2="50" y2="90" />
              <line x1="10" y1="50" x2="90" y2="50" />

              <circle
                cx="50"
                cy="50"
                r="25"
                fill="none"
                stroke={color}
                strokeWidth="1.5"
              />
            </g>
          )}

          {shapeType === 4 && (
            <path
              d="M20,50 Q35,20 50,50 T80,50"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      );
    }

    if (type === "illustration") {
      return (
        <svg
          className="w-3/4 h-3/4 opacity-40 absolute top-[12.5%] left-[12.5%] transition-transform duration-700 group-hover:rotate-12 pointer-events-none"
          viewBox="0 0 120 120">
          {shapeType === 0 && (
            <g>
              <circle cx="60" cy="60" r="40" fill="url(#ill-grad-1)" />

              <circle
                cx="80"
                cy="40"
                r="25"
                fill="url(#ill-grad-2)"
                style={{ mixBlendMode: "screen" }}
              />

              <defs>
                <linearGradient id="ill-grad-1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />

                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="ill-grad-2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />

                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
            </g>
          )}

          {shapeType === 1 && (
            <g fill="none" stroke={color} strokeWidth="1" opacity="0.6">
              <path d="M10,10 L110,110 M10,110 L110,10" />

              <circle cx="60" cy="60" r="45" strokeWidth="2" />

              <circle cx="60" cy="60" r="30" strokeDasharray="4 4" />

              <polygon points="60,20 95,80 25,80" strokeWidth="1.5" />
            </g>
          )}

          {shapeType === 2 && (
            <path
              d="M20 60 C 20 20, 100 20, 100 60 C 100 100, 20 100, 20 60 Z"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="10 5 2 5"
            />
          )}

          {shapeType === 3 && (
            <g stroke={color} strokeWidth="1.5" fill="none">
              <rect x="25" y="25" width="70" height="70" rx="10" />

              <rect x="35" y="35" width="50" height="50" rx="5" />

              <circle cx="60" cy="60" r="10" fill={color} opacity="0.3" />
            </g>
          )}

          {shapeType === 4 && (
            <g stroke="#C5A059" strokeWidth="1" fill="none">
              <path d="M20,60 Q40,30 60,60 T100,60" />

              <path d="M20,70 Q40,40 60,70 T100,70" opacity="0.5" />

              <path d="M20,50 Q40,20 60,50 T100,50" opacity="0.5" />
            </g>
          )}
        </svg>
      );
    }

    // Fine Art painting style in digital frame
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#f7f5f0] shadow-inner">
        <div
          className={`w-full h-full bg-linear-to-br ${getGradient()} relative shadow-lg overflow-hidden flex items-center justify-center`}>
          {/* Mock Canvas texture overlay */}
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#000_1px,transparent_1px)] bg-size-[8px_8px] pointer-events-none" />

          {/* Abstract paint stroke SVGs */}
          <svg
            className="w-11/12 h-11/12 opacity-40 absolute pointer-events-none"
            viewBox="0 0 100 100">
            <path
              d="M10,20 Q40,5 70,50 T90,80"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.4"
            />

            <path
              d="M20,80 Q50,60 60,10 T80,40"
              fill="none"
              stroke={h2 % 2 === 0 ? "#C5A059" : "#FFFFFF"}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
          </svg>

          {/* Subtle sign in the bottom right corner */}
          <span className="absolute bottom-2 right-2 text-[8px] font-serif text-white/40 italic">
            Mitra
          </span>
        </div>
      </div>
    );
  };

  // Specific Book Cover layouts
  if (type === "book-cover") {
    const isClassic = h3 % 2 === 0;

    return (
      <div
        className={`w-full h-full bg-linear-to-b ${getGradient()} relative flex flex-col justify-between p-6 overflow-hidden select-none`}>
        {/* Subtle linen texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[12px_12px] pointer-events-none" />

        {/* Border frame */}
        <div className="absolute inset-3 border border-white/10 pointer-events-none" />

        {/* Header */}
        <div className="text-center z-10">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#C5A059]/80 font-semibold font-sans">
            S. Mitra Portfolio
          </p>
        </div>

        {/* Artwork Element */}
        {renderSVGElement()}

        {/* Book Title & Info */}
        <div className="text-center z-10 flex flex-col gap-2 mb-2">
          {isClassic ? (
            <>
              <h4 className="text-xl font-serif text-white leading-tight font-medium drop-shadow-md px-2">
                {title}
              </h4>

              <p className="text-[10px] text-gray-400 font-sans italic tracking-wide">
                A Novel of Mystery
              </p>
            </>
          ) : (
            <>
              <h4 className="text-2xl font-sans font-black tracking-tighter text-white leading-none uppercase drop-shadow-md">
                {title}
              </h4>

              <p className="text-[8px] uppercase tracking-[0.25em] text-[#C5A059] font-semibold mt-1">
                First Edition
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Illustration
  if (type === "illustration") {
    return (
      <div
        className={`w-full h-full bg-linear-to-br ${getGradient()} relative flex items-center justify-center overflow-hidden select-none`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none" />

        {renderSVGElement()}

        <span className="absolute bottom-3 left-4 text-[9px] uppercase tracking-widest text-white/30 font-mono">
          ILLUSTRATION // {id.toUpperCase()}
        </span>
      </div>
    );
  }

  // Fine Art
  return (
    <div className="w-full h-full bg-[#111111] border border-[#222] p-2 relative flex items-center justify-center overflow-hidden select-none">
      {renderSVGElement()}
    </div>
  );
};

export default function BehanceCard({
  id,
  title,
  type,
  genreOrMedium,
  year,
  likes: initialLikes,
  views,
  detailUrl,
}: BehanceCardProps) {
  /*
   * IMPORTANT:
   *
   * The initial state MUST be identical on the server and client.
   * Therefore, localStorage is NOT accessed inside useState.
   */
  const [isLiked, setIsLiked] = useState(false);

  /*
   * localStorage is a browser-only API.
   * We read it only after the component has hydrated.
   *
   * The ESLint suppression is intentional here because this effect
   * synchronizes React state with an external browser system.
   */
  useEffect(() => {
    const savedLiked = localStorage.getItem(`liked-${id}`);

    if (savedLiked === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLiked(true);
    }
  }, [id]);

  /*
   * The displayed like count is derived from:
   *
   * initialLikes = server-provided/base count
   * isLiked      = current browser's local appreciation
   */
  const likes = initialLikes + (isLiked ? 1 : 0);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newLikedState = !isLiked;

    setIsLiked(newLikedState);

    localStorage.setItem(`liked-${id}`, String(newLikedState));
  };

  const getAspectStyle = () => {
    if (type === "book-cover") {
      return "aspect-[2/3]";
    }

    return "aspect-square";
  };

  return (
    <div className="group flex flex-col gap-3">
      {/* Visual Container */}
      <Link
        href={detailUrl}
        className="relative block overflow-hidden rounded-md bg-[#0d0d0d] shadow-lg transition-shadow duration-300 hover:shadow-2xl hover:shadow-black/60">
        <div
          className={`w-full ${getAspectStyle()} transition-transform duration-500 ease-out group-hover:scale-[1.03]`}>
          <ProceduralPlaceholder id={id} type={type} title={title} />
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex flex-col justify-between p-5">
          {/* Top of overlay: Appreciate quick-button */}
          <div className="flex justify-end">
            <button
              onClick={handleLike}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-115 ${
                isLiked
                  ? "bg-rose-600 text-white shadow-rose-600/40 shadow-lg"
                  : "bg-black/60 text-white/80 hover:text-white hover:bg-black/80"
              }`}
              title={isLiked ? "Appreciated" : "Appreciate project"}>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>

          {/* Bottom of overlay: titles & genres */}
          <div className="transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 ease-out">
            <span className="text-[10px] tracking-widest uppercase text-[#C5A059] font-bold block mb-1">
              {type === "book-cover"
                ? "Book Design"
                : type === "illustration"
                  ? "Illustration"
                  : "Fine Art"}
            </span>

            <h3 className="text-lg font-serif text-white font-bold leading-tight line-clamp-2">
              {title}
            </h3>

            <p className="text-xs text-gray-300 font-sans mt-1">
              {genreOrMedium} • {year}
            </p>
          </div>
        </div>
      </Link>

      {/* Behance-Style Details Bar */}
      <div className="flex justify-between items-center px-1 py-0.5">
        <Link href={detailUrl} className="flex flex-col flex-1 min-w-0 pr-4">
          <span className="text-sm font-semibold text-white truncate hover:text-[#C5A059] transition-colors">
            {title}
          </span>

          <span className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
            {genreOrMedium}
          </span>
        </Link>

        {/* Stats */}
        <div className="flex items-center gap-3.5 text-gray-400 shrink-0">
          {/* Live Likes Count */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 group/btn hover:text-white ${
              isLiked ? "text-rose-500 font-semibold" : ""
            }`}>
            <svg
              className="w-3.5 h-3.5 fill-current transition-transform duration-200 group-hover/btn:scale-120"
              viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>

            <span>{likes}</span>
          </button>

          {/* Views Count */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>

            <span>
              {views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
