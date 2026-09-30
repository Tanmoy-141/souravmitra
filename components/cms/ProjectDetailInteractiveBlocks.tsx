"use client";

import { useState } from "react";

interface Comment {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
}

export function ProjectShareBlock() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    if (typeof window === "undefined") return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fallback
      }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  const handleShare = async (platform: string) => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    const shareTitle = "Check out this portfolio project by Sourav Mitra";

    let url = "";
    switch (platform) {
      case "whatsapp":
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + " - " + shareUrl)}`;
        window.open(url, "_blank");
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`;
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

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full py-3 rounded-lg bg-black text-gray-300 border border-[#2a2a2a] hover:text-white hover:bg-[#111] hover:border-[#3a3a3a] font-bold tracking-wider text-xs uppercase transition-colors cursor-pointer flex items-center justify-center gap-2">
        <svg
          className="w-4 h-4 text-[#C5A059]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 10.742l4.57 2.286M15.418 9l-4.57 2.286M16 5a3 3 0 11-6 0 3 3 0 016 0zm-6 12a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {showDropdown ? "Close Share Menu" : "Share Project"}
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-[#0d0d0d] rounded-lg border border-[#2a2a2a] shadow-2xl z-30">
          <p className="text-[10px] tracking-widest uppercase text-gray-500 font-bold mb-3 text-center">
            Share this project via
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "whatsapp", label: "WhatsApp" },
              { id: "email", label: "Email" },
              { id: "facebook", label: "Facebook" },
              { id: "instagram", label: "Instagram" },
              { id: "twitter", label: "Twitter (X)" },
              { id: "behance", label: "Behance" },
              { id: "pinterest", label: "Pinterest" },
              { id: "copy", label: "Copy Link" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleShare(p.id)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-[#1a1a1a] text-gray-400 hover:text-[#C5A059] transition-colors text-xs font-semibold cursor-pointer justify-start">
                {p.label}
              </button>
            ))}
          </div>
          {copiedPlatform && (
            <div className="mt-3 text-center text-[11px] text-[#C5A059] font-medium bg-[#C5A059]/10 py-1.5 px-3 rounded-md">
              {copiedPlatform === "Link"
                ? "Link copied to clipboard!"
                : `Link copied! Opening ${copiedPlatform}...`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectCommentsBlock() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      author: "Elena Rostova",
      initials: "ER",
      text: "The compositional rhythm and lighting in this piece are exceptional. Evokes a deeply contemplative atmosphere.",
      time: "2 hours ago",
    },
    {
      id: "c2",
      author: "Marcus Vance",
      initials: "MV",
      text: "Masterful balance between texture and narrative tension. A signature work.",
      time: "Yesterday",
    },
  ]);
  const [newText, setNewText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    setComments([
      {
        id: Date.now().toString(),
        author: "You (Visitor)",
        initials: "YO",
        text: newText.trim(),
        time: "Just now",
      },
      ...comments,
    ]);
    setNewText("");
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#1e1e1e] p-6 sm:p-8 shadow-xl">
      <h3 className="text-xl font-serif text-white font-bold border-b border-[#222] pb-3 mb-6">
        Visitor Comments &amp; Appreciation
      </h3>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          rows={3}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Share your thoughts on this artwork..."
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#C5A059] transition-colors resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!newText.trim()}
            className="px-5 py-2 bg-[#C5A059] hover:bg-white text-black font-bold uppercase tracking-wider text-xs rounded transition-colors disabled:opacity-40">
            Post Comment
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="flex flex-col gap-4">
        {comments.map((c) => (
          <div
            key={c.id}
            className="p-4 bg-[#111] rounded-lg border border-[#1e1e1e] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#C5A059]">{c.author}</span>
              <span className="text-[10px] text-gray-500">{c.time}</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
