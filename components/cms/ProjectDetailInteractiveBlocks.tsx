"use client";

import { useState, useEffect, useId } from "react";

interface CommentItem {
  id: string;
  author: string;
  content: string;
  initials: string;
  createdAt: string;
  timeAgo: string;
}

function resolveProjectIdFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  // Match patterns like /fine-art/[id], /book-covers/[id], /illustration/[id], /projects/[id]
  const match = path.match(
    /\/(?:fine-art|book-covers|illustration|projects)\/([^/?#]+)/i,
  );
  return match ? match[1] : null;
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

export function ProjectLikeBlock({ projectId }: { projectId?: string }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const targetId = projectId || resolveProjectIdFromPath();
    if (!targetId) {
      return;
    }

    let isMounted = true;
    fetch(`/api/projects/${targetId}/likes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.success) {
          setLiked(Boolean(data.liked));
          setLikesCount(data.likes ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleToggleLike = async () => {
    const targetId = projectId || resolveProjectIdFromPath();
    if (!targetId || toggling) return;
    setToggling(true);

    const prevLiked = liked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      const res = await fetch(`/api/projects/${targetId}/likes`, {
        method: "POST",
      });
      const data = await res.json();
      if (data?.success) {
        setLiked(Boolean(data.liked));
        setLikesCount(data.likes ?? nextCount);
      } else {
        setLiked(prevLiked);
        setLikesCount(prevCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleToggleLike}
        disabled={loading}
        className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-lg font-bold tracking-wider text-xs uppercase transition-all duration-300 cursor-pointer border ${
          liked
            ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30"
            : "bg-[#111] border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] hover:bg-[#1a1a1a]"
        }`}>
        <svg
          className={`w-4 h-4 fill-current transition-transform duration-200 ${
            liked ? "scale-110" : ""
          }`}
          viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span>{liked ? "Appreciated" : "Appreciate Project"}</span>
        <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-black/40 text-white font-mono">
          {likesCount}
        </span>
      </button>
    </div>
  );
}

export function ProjectCommentsBlock({ projectId }: { projectId?: string }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authorInputId = useId();
  const commentTextId = useId();

  useEffect(() => {
    const targetId = projectId || resolveProjectIdFromPath();
    if (!targetId) {
      return;
    }

    let isMounted = true;
    fetch(`/api/projects/${targetId}/comments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data.comments)) {
          setComments(data.comments);
        }
      })
      .catch((err) => {
        console.error("Failed to load comments:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = projectId || resolveProjectIdFromPath();
    if (!targetId) {
      setErrorMsg("Cannot post comments: Project ID could not be identified.");
      return;
    }

    if (!commentText.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const displayName = authorName.trim() || "Visitor";

    try {
      const res = await fetch(`/api/projects/${targetId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: displayName,
          content: commentText.trim(),
          hp_website: honeypot,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success && data?.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setCommentText("");
        setSuccessMsg("Your comment has been posted.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(
          data?.message || "Failed to submit comment. Please try again.",
        );
      }
    } catch {
      setErrorMsg("A network error occurred. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#1e1e1e] p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#222] pb-4 mb-6">
        <h3 className="text-xl font-serif text-white font-bold">
          Visitor Comments &amp; Appreciation
        </h3>
        <span className="text-xs font-mono text-[#C5A059] px-2.5 py-1 bg-[#C5A059]/10 rounded-full border border-[#C5A059]/20">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-1/3">
            <label htmlFor={authorInputId} className="sr-only">
              Your Name
            </label>
            <input
              id={authorInputId}
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your Name (optional)"
              maxLength={80}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C5A059] transition-colors"
            />
          </div>
          {/* Honeypot field - invisible to real visitors */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="hp_website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label htmlFor={commentTextId} className="sr-only">
            Comment
          </label>
          <textarea
            id={commentTextId}
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts on this artwork..."
            maxLength={2000}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-base sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C5A059] transition-colors resize-none"
          />
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-lg">
            {successMsg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !commentText.trim()}
            className="px-6 py-2.5 min-h-10 bg-[#C5A059] hover:bg-white text-black font-bold uppercase tracking-wider text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md">
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500 font-mono">
          Loading discussion...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 bg-[#0d0d0d] rounded-lg border border-[#1a1a1a]">
          No comments yet. Be the first to share your thoughts on this work.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-[#111] rounded-lg border border-[#1e1e1e] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#222] text-[#C5A059] border border-[#333] flex items-center justify-center font-bold text-xs select-none">
                    {c.initials}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {c.author}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">{c.timeAgo}</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed pl-9">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
