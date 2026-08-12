"use client";

import { useState, useEffect } from "react";
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
  likes: initialLikes,
  views,
  publisher,
  dimensions,
  availability,
  backUrl,
}: ProjectDetailProps) {
  // Server always renders "not liked". We only know the real liked state
  // once we're in the browser and can read localStorage — doing that read
  // here (post-mount) instead of during render keeps SSR output and the
  // first client render identical, avoiding a hydration mismatch.
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedLiked = localStorage.getItem(`liked-${id}`) === "true";
    if (savedLiked) {
      // Syncing with localStorage after mount is the point of this effect;
      // mirrors the same pattern already used in components/BehanceCard.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLiked(true);
      setLikes(initialLikes + 1);
    }
    // Only run on mount / when navigating to a different project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleLike = () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    const newCount = newLikedState ? likes + 1 : likes - 1;
    setLikes(newCount);

    if (typeof window !== "undefined") {
      localStorage.setItem(`liked-${id}`, String(newLikedState));
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

            {/* Engagement Stats Strip */}
            <div className="grid grid-cols-2 gap-4 border-y border-[#1e1e1e] py-4">
              <div className="text-center">
                <span className="text-xs text-gray-500 block uppercase tracking-wider">
                  Appreciations
                </span>
                <span className="text-xl font-sans font-bold text-white mt-1 block">
                  {likes}
                </span>
              </div>
              <div className="text-center border-l border-[#1e1e1e]">
                <span className="text-xs text-gray-500 block uppercase tracking-wider">
                  Views
                </span>
                <span className="text-xl font-sans font-bold text-white mt-1 block">
                  {views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleLike}
                className={`flex-1 py-3 rounded-lg font-bold tracking-wider text-xs uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                  isLiked
                    ? "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/30"
                    : "bg-[#C5A059] text-white hover:bg-[#a88849] hover:scale-[1.01]"
                }`}>
                {isLiked ? "Appreciated!" : "Appreciate Project"}
              </button>

              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-lg bg-black text-gray-300 border border-[#2a2a2a] hover:text-white hover:bg-[#111] hover:border-[#3a3a3a] font-bold tracking-wider text-xs uppercase transition-colors cursor-pointer flex items-center justify-center gap-2">
                {copied ? "Link Copied!" : "Share Project"}
              </button>
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
