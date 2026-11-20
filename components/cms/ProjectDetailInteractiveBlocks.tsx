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

const SHARE_PLATFORMS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    hoverClass: "hover:bg-[#25D366]/15 hover:border-[#25D366]/60 hover:text-[#25D366]",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.476-.15-.677.15-.201.3-.778.978-.953 1.179-.175.2-.351.226-.652.075s-1.27-.468-2.42-1.493c-.894-.798-1.498-1.783-1.674-2.084-.175-.301-.019-.464.132-.614.135-.135.301-.351.452-.527.15-.175.201-.3.301-.502.1-.201.05-.376-.025-.527-.075-.15-.677-1.632-.928-2.234-.244-.587-.492-.507-.677-.516l-.578-.01c-.201 0-.527.075-.802.376s-1.053 1.029-1.053 2.509c0 1.48 1.078 2.91 1.229 3.111.15.201 2.121 3.238 5.139 4.542.718.31 1.278.495 1.716.634.722.229 1.378.197 1.897.12.578-.086 1.78-.728 2.031-1.431.251-.703.251-1.305.176-1.431-.076-.126-.276-.201-.577-.351zM12.004 21.75c-1.764 0-3.493-.464-5.021-1.344l-.36-.214-3.732.978.996-3.639-.235-.373A9.704 9.704 0 012.25 12.004C2.25 6.626 6.626 2.25 12.004 2.25c2.607 0 5.058 1.015 6.901 2.859A9.706 9.706 0 0121.758 12c0 5.378-4.376 9.75-9.754 9.75zm8.337-18.087A11.706 11.706 0 0012.004.25C5.524.25.25 5.524.25 12.004c0 2.072.54 4.095 1.564 5.877L0 24l6.305-1.654a11.734 11.734 0 005.699 1.464h.005c6.478 0 11.754-5.275 11.754-11.755 0-3.14-1.222-6.092-3.442-8.406z"/>
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    hoverClass: "hover:bg-[#1877F2]/15 hover:border-[#1877F2]/60 hover:text-[#1877F2]",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    hoverClass: "hover:bg-white/10 hover:border-white/50 hover:text-white",
    icon: (
      <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: "pinterest",
    label: "Pinterest",
    hoverClass: "hover:bg-[#E60023]/15 hover:border-[#E60023]/60 hover:text-[#E60023]",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hoverClass: "hover:bg-[#0A66C2]/15 hover:border-[#0A66C2]/60 hover:text-[#0A66C2]",
    icon: (
      <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    hoverClass: "hover:bg-[#E4405F]/15 hover:border-[#E4405F]/60 hover:text-[#E4405F]",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    id: "threads",
    label: "Threads",
    hoverClass: "hover:bg-white/10 hover:border-white/50 hover:text-white",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098c1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015c-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164c1.43 1.783 3.631 2.698 6.54 2.717c2.623-.02 4.358-.631 5.8-2.045c1.647-1.613 1.618-3.593 1.09-4.798c-.31-.71-.873-1.3-1.634-1.75c-.192 1.352-.622 2.446-1.284 3.272c-.886 1.102-2.14 1.704-3.73 1.79c-1.202.065-2.361-.218-3.259-.801c-1.063-.689-1.685-1.74-1.752-2.964c-.065-1.19.408-2.285 1.33-3.082c.88-.76 2.119-1.207 3.583-1.291a14 14 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757c-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.18c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388q.163.07.321.142c1.49.7 2.58 1.761 3.154 3.07c.797 1.82.871 4.79-1.548 7.158c-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69q-.362 0-.739.021c-1.836.103-2.98.946-2.916 2.143c.067 1.256 1.452 1.839 2.784 1.767c1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221"/>
      </svg>
    ),
  },
  {
    id: "email",
    label: "Email",
    hoverClass: "hover:bg-[#C5A059]/15 hover:border-[#C5A059]/60 hover:text-[#C5A059]",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

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
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(url, "_blank");
        break;
      case "instagram":
        await copyToClipboard(shareUrl);
        setCopiedPlatform("Instagram");
        window.open("https://www.instagram.com", "_blank");
        setTimeout(() => setCopiedPlatform(null), 3000);
        break;
      case "threads":
        await copyToClipboard(shareUrl);
        setCopiedPlatform("Threads");
        window.open("https://www.threads.net", "_blank");
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
            Share this project
          </p>
          <div className="grid grid-cols-4 gap-2.5 justify-items-center py-1">
            {SHARE_PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleShare(p.id)}
                title={`Share on ${p.label}`}
                aria-label={`Share on ${p.label}`}
                className={`w-11 h-11 rounded-full bg-[#161616] border border-[#262626] flex items-center justify-center text-gray-300 transition-all duration-200 cursor-pointer shadow-sm hover:scale-110 active:scale-95 ${p.hoverClass}`}>
                {p.icon}
              </button>
            ))}
          </div>

          {/* Copy link input bar */}
          <div className="mt-3.5 pt-3 border-t border-[#1f1f1f] flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? window.location.href : ""}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-[#141414] border border-[#262626] rounded-md px-3 py-1.5 text-xs text-gray-300 font-mono select-all focus:outline-none focus:border-[#C5A059]"
            />
            <button
              type="button"
              onClick={() => handleShare("copy")}
              className="shrink-0 px-3 py-1.5 rounded-md bg-[#C5A059] hover:bg-[#d6b068] text-black font-semibold text-xs transition-colors cursor-pointer">
              {copiedPlatform === "Link" ? "Copied!" : "Copy"}
            </button>
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
