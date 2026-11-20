"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ProceduralPlaceholder } from "./BehanceCard";
import { isSafeImageUrl } from "@/lib/sanitize";
import type { RelatedProjectCard } from "@/lib/project-detail-data";
import {
  extractAllModuleImages,
  isLightCanvasColor,
  parseBehancePresentation,
} from "@/lib/behance-modules";

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
  coverImage?: string;
  images?: string[];
  publisher?: string;
  dimensions?: string;
  availability?: string;
  notes?: string;
  backUrl: string;
  artistName?: string;
  artistAvatar?: string;
  relatedProjects?: RelatedProjectCard[];
}

interface CommentItem {
  id: string;
  author: string;
  content: string;
  initials: string;
  createdAt: string;
  timeAgo: string;
}

function AppreciateThumbsUpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
    </svg>
  );
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

export default function ProjectDetailView({
  id,
  title,
  type,
  genreOrMedium,
  year,
  description,
  coverImage,
  images = [],
  publisher,
  dimensions,
  availability,
  notes,
  tags = [],
  backUrl,
  likes: initialLikes = 0,
  views: initialViews = 0,
  artistName = "Sourav Mitra",
  artistAvatar = "",
  relatedProjects = [],
}: ProjectDetailProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Persistent interaction states
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [viewsCount, setViewsCount] = useState(initialViews);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [justAppreciated, setJustAppreciated] = useState(false);

  // Persistent Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

  const categoryLabel =
    type === "book-cover"
      ? "Book Cover Design"
      : type === "illustration"
        ? "Illustration"
        : "Fine Art";

  const categoryShort =
    type === "book-cover"
      ? "Book Covers"
      : type === "illustration"
        ? "Illustration"
        : "Fine Art";

  // Structured Behance presentation (modules, canvas background, content spacing)
  const presentation = useMemo(
    () =>
      parseBehancePresentation({
        title,
        coverImage,
        images,
        description,
        details: notes,
      }),
    [title, coverImage, images, description, notes],
  );

  // Deduplicated list of every image across single Image + Photo Grid modules for the Lightbox
  const galleryImages = useMemo(
    () => extractAllModuleImages(presentation.modules),
    [presentation.modules],
  );

  const isLightCanvas = isLightCanvasColor(presentation.backgroundColor);

  const openLightboxForUrl = (url: string) => {
    const idx = galleryImages.indexOf(url.trim());
    if (idx >= 0) setLightboxIndex(idx);
  };

  const safeAvatar =
    artistAvatar && isSafeImageUrl(artistAvatar) ? artistAvatar : "";

  const cleanTags = useMemo(
    () =>
      (Array.isArray(tags) ? tags : [])
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter(Boolean),
    [tags],
  );

  // Fetch views, like status, and comments
  useEffect(() => {
    let isMounted = true;

    fetch(`/api/projects/${id}/views`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && typeof data?.views === "number") {
          setViewsCount(data.views);
        }
      })
      .catch(() => {});

    Promise.all([
      fetch(`/api/projects/${id}/likes`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/projects/${id}/comments`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([likeData, commentsData]) => {
      if (!isMounted) return;
      if (likeData?.success) {
        setIsLiked(Boolean(likeData.liked));
        if (typeof likeData.likes === "number") {
          setLikesCount(likeData.likes);
        }
      }
      if (commentsData?.success && Array.isArray(commentsData.comments)) {
        setComments(commentsData.comments);
      }
      setLoadingComments(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Lightbox & share modal keyboard navigation
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevLightbox = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null || galleryImages.length === 0) return null;
      return (curr - 1 + galleryImages.length) % galleryImages.length;
    });
  }, [galleryImages.length]);
  const nextLightbox = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null || galleryImages.length === 0) return null;
      return (curr + 1) % galleryImages.length;
    });
  }, [galleryImages.length]);

  useEffect(() => {
    if (lightboxIndex === null && !showShareModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
        setShowShareModal(false);
      } else if (lightboxIndex !== null && e.key === "ArrowLeft") {
        prevLightbox();
      } else if (lightboxIndex !== null && e.key === "ArrowRight") {
        nextLightbox();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, showShareModal, prevLightbox, nextLightbox]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    if (nextLiked) {
      setJustAppreciated(true);
      setTimeout(() => setJustAppreciated(false), 600);
    }

    try {
      const res = await fetch(`/api/projects/${id}/likes`, { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        setIsLiked(Boolean(data.liked));
        if (typeof data.likes === "number") setLikesCount(data.likes);
      } else {
        setIsLiked(prevLiked);
        setLikesCount(prevCount);
      }
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (typeof window === "undefined") return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fallback below
      }
    }
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
    } catch {
      return false;
    }
  };

  const handleShareClick = async (platform: string) => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    const shareTitle = `Check out "${title}" by ${artistName}`;

    switch (platform) {
      case "whatsapp":
        window.open(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + " - " + shareUrl)}`,
          "_blank",
        );
        break;
      case "email":
        window.open(
          `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent("Explore this project from " + artistName + "'s portfolio:\n\n" + shareUrl)}`,
          "_blank",
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank",
        );
        break;
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
          "_blank",
        );
        break;
      case "pinterest":
        window.open(
          `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareTitle)}`,
          "_blank",
        );
        break;
      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          "_blank",
        );
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);
    setCommentSuccess(null);

    const displayName = authorName.trim() || "Visitor";

    try {
      const res = await fetch(`/api/projects/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: displayName,
          content: newComment.trim(),
          hp_website: honeypot,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success && data?.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
        setCommentSuccess("Your comment has been posted.");
        setTimeout(() => setCommentSuccess(null), 4000);
      } else {
        setCommentError(data?.message || "Failed to post comment.");
      }
    } catch {
      setCommentError("Network error. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const scrollToSection = (elementId: string) => {
    if (typeof document === "undefined") return;
    document
      .getElementById(elementId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const availabilityBadgeClass = availability
    ? availability.toLowerCase() === "available"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : availability.toLowerCase() === "sold"
        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
        : "bg-purple-500/15 text-purple-300 border-purple-500/30"
    : "";

  return (
    <div className="min-h-screen bg-[#000000] text-[#D4D4D4]">
      {/* =====================================================================
          1. BEHANCE PROJECT HEADER BAR
         ===================================================================== */}
      <div className="border-b border-[#191919] bg-[#050505]">
        <div className="max-w-360 mx-auto px-6 md:px-10 pt-5 pb-6">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center justify-between text-xs">
            <Link
              href={backUrl}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-[#C5A059] transition-colors group font-medium tracking-wide">
              <span className="transform group-hover:-translate-x-1 transition-transform duration-200">
                &larr;
              </span>
              <span>Back to {categoryShort}</span>
            </Link>
            <div className="flex items-center gap-4 text-gray-500 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <AppreciateThumbsUpIcon className="w-3.5 h-3.5 text-[#C5A059]" />
                {likesCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                {viewsCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Creator + Title + Top Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/about"
                className="shrink-0 w-12 h-12 rounded-full overflow-hidden border border-[#C5A059]/40 bg-[#141414] flex items-center justify-center hover:border-[#C5A059] transition-colors"
                title={`About ${artistName}`}>
                {safeAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeAvatar}
                    alt={artistName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-serif text-sm font-bold text-[#C5A059]">
                    SM
                  </span>
                )}
              </Link>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-[26px] font-serif font-bold text-white leading-tight truncate">
                  {title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gray-400">
                  <Link
                    href="/about"
                    className="text-white hover:text-[#C5A059] font-medium transition-colors">
                    {artistName}
                  </Link>
                  <span className="text-gray-600">&bull;</span>
                  <span className="text-[#C5A059] font-medium">
                    {categoryLabel}
                  </span>
                  <span className="text-gray-600">&bull;</span>
                  <span>{year}</span>
                  {availability && (
                    <>
                      <span className="text-gray-600">&bull;</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${availabilityBadgeClass}`}>
                        {availability}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions (Behance style) */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleLike}
                disabled={isLiking}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer border ${
                  isLiked
                    ? "bg-[#C5A059] border-[#C5A059] text-black shadow-lg shadow-[#C5A059]/25"
                    : "bg-[#121212] border-[#2e2e2e] text-white hover:border-[#C5A059] hover:text-[#C5A059]"
                }`}>
                <AppreciateThumbsUpIcon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    justAppreciated ? "scale-125 -rotate-12" : ""
                  }`}
                />
                <span>{isLiked ? "Appreciated" : "Appreciate"}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                    isLiked
                      ? "bg-black/20 text-black"
                      : "bg-white/10 text-gray-200"
                  }`}>
                  {likesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#121212] border border-[#2e2e2e] hover:border-[#C5A059] text-gray-300 hover:text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer">
                <svg
                  className="w-4 h-4 text-[#C5A059]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 10.742l4.57 2.286M15.418 9l-4.57 2.286M16 5a3 3 0 11-6 0 3 3 0 016 0zm-6 12a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Share</span>
              </button>

              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-[#C5A059]/60 text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-xs font-bold uppercase tracking-wider transition-all">
                Inquire
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. BEHANCE MAIN CANVAS + FLOATING RIGHT-SIDE ACTION RAIL
         ===================================================================== */}
      <div className="max-w-370 mx-auto px-4 md:px-10 pt-8 pb-6">
        <div className="flex items-start justify-center gap-8">
          {/* MAIN VERTICAL ARTWORK CANVAS (Behance 1400px gallery container) */}
          <div
            className="w-full max-w-325 border border-[#1a1a1a] rounded-xs overflow-hidden shadow-2xl"
            style={{ backgroundColor: presentation.backgroundColor }}>
            {presentation.modules.length > 0 ? (
              <div
                className="flex flex-col"
                style={{
                  gap: `${presentation.contentSpacing}px`,
                  paddingTop:
                    presentation.contentSpacing > 0
                      ? `${presentation.contentSpacing}px`
                      : undefined,
                  paddingBottom:
                    presentation.contentSpacing > 0
                      ? `${presentation.contentSpacing}px`
                      : undefined,
                }}>
                {presentation.modules.map((mod, modIdx) => {
                  if (mod.type === "image") {
                    const imgIdx = galleryImages.indexOf(mod.url.trim());
                    return (
                      <figure
                        key={mod.id}
                        className={`group relative w-full flex flex-col items-center justify-center overflow-hidden ${
                          mod.layout === "contained" ? "px-6 sm:px-14" : ""
                        }`}>
                        <button
                          type="button"
                          onClick={() => openLightboxForUrl(mod.url)}
                          className={`relative w-full flex items-center justify-center cursor-zoom-in focus:outline-none ${
                            mod.layout === "contained" ? "max-w-4xl mx-auto" : ""
                          }`}
                          aria-label={`Inspect ${title} image ${imgIdx + 1} in full screen`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mod.url}
                            alt={
                              mod.caption?.trim() ||
                              (galleryImages.length > 1
                                ? `${title} — Presentation ${imgIdx + 1}`
                                : title)
                            }
                            className="w-full h-auto max-h-[92vh] object-contain mx-auto block select-none transition-transform duration-500"
                            loading={modIdx === 0 ? "eager" : "lazy"}
                          />

                          {/* Subtle Behance-style hover inspect pill */}
                          <span className="pointer-events-none absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-lg">
                            <svg
                              className="w-3.5 h-3.5 text-[#C5A059]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                              />
                            </svg>
                            <span>
                              {galleryImages.length > 1 && imgIdx >= 0
                                ? `View Full Size (${imgIdx + 1}/${galleryImages.length})`
                                : "View Full Size"}
                            </span>
                          </span>
                        </button>

                        {mod.caption?.trim() && (
                          <figcaption
                            className={`w-full max-w-3xl text-center text-xs px-6 py-3 italic ${
                              isLightCanvas ? "text-neutral-600" : "text-gray-400"
                            }`}>
                            {mod.caption}
                          </figcaption>
                        )}
                      </figure>
                    );
                  }

                  if (mod.type === "grid") {
                    const gridColsClass =
                      mod.columns === 3
                        ? "grid-cols-1 sm:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2";
                    return (
                      <div
                        key={mod.id}
                        className={`w-full grid ${gridColsClass} px-4 sm:px-8`}
                        style={{ gap: `${mod.gap ?? 12}px` }}>
                        {mod.images.map((item, gIdx) => (
                          <figure
                            key={`${item.url}-${gIdx}`}
                            className="group relative overflow-hidden flex flex-col">
                            <button
                              type="button"
                              onClick={() => openLightboxForUrl(item.url)}
                              className="relative w-full overflow-hidden cursor-zoom-in focus:outline-none"
                              aria-label={`Inspect grid image ${gIdx + 1}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.url}
                                alt={item.caption?.trim() || `${title} — Grid ${gIdx + 1}`}
                                className="w-full h-full object-cover aspect-4/3 block transition-transform duration-500 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            </button>
                            {item.caption?.trim() && (
                              <figcaption
                                className={`text-[11px] mt-2 text-center italic ${
                                  isLightCanvas ? "text-neutral-600" : "text-gray-400"
                                }`}>
                                {item.caption}
                              </figcaption>
                            )}
                          </figure>
                        ))}
                      </div>
                    );
                  }

                  if (mod.type === "text") {
                    const alignClass =
                      mod.align === "left"
                        ? "text-left"
                        : mod.align === "right"
                          ? "text-right"
                          : "text-center";
                    const fontClass =
                      mod.fontStyle === "sans" ? "font-sans" : "font-serif";
                    return (
                      <div
                        key={mod.id}
                        className={`w-full px-8 sm:px-16 py-10 ${alignClass}`}>
                        <div className="max-w-3xl mx-auto">
                          {mod.heading?.trim() && (
                            <h2
                              className={`text-2xl sm:text-3xl font-bold mb-4 ${fontClass} ${
                                isLightCanvas ? "text-neutral-900" : "text-white"
                              }`}>
                              {mod.heading}
                            </h2>
                          )}
                          {mod.body?.trim() && (
                            <div
                              className={`space-y-4 text-sm sm:text-base leading-relaxed whitespace-pre-line font-light ${
                                isLightCanvas ? "text-neutral-700" : "text-gray-300"
                              }`}>
                              {mod.body}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (mod.type === "spacer") {
                    return (
                      <div
                        key={mod.id}
                        className="w-full flex items-center justify-center px-10"
                        style={{ height: `${mod.height}px` }}>
                        {mod.showDivider && (
                          <hr
                            className={`w-full max-w-2xl border-0 h-px ${
                              isLightCanvas ? "bg-neutral-300" : "bg-[#242424]"
                            }`}
                          />
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            ) : (
              <div className="w-full py-16 px-6 flex items-center justify-center bg-[#0a0a0a]">
                <div
                  className={
                    type === "book-cover"
                      ? "aspect-2/3 w-full max-w-md shadow-2xl rounded-xs overflow-hidden"
                      : "aspect-square w-full max-w-2xl shadow-2xl rounded-xs overflow-hidden"
                  }>
                  <ProceduralPlaceholder id={id} type={type} title={title} />
                </div>
              </div>
            )}
          </div>

          {/* FLOATING RIGHT-SIDE VERTICAL ACTION RAIL (Signature Behance UX) */}
          <aside
            aria-label="Project Quick Actions"
            className="hidden lg:flex flex-col items-center gap-6 sticky top-28 shrink-0 w-18 pt-2">
            {/* Creator Avatar */}
            <Link
              href="/about"
              className="group flex flex-col items-center gap-1.5"
              title={artistName}>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2a2a2a] group-hover:border-[#C5A059] transition-colors bg-[#141414] flex items-center justify-center shadow-lg">
                {safeAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeAvatar}
                    alt={artistName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-serif text-xs font-bold text-[#C5A059]">
                    SM
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-gray-400 group-hover:text-white transition-colors">
                Artist
              </span>
            </Link>

            {/* Appreciate Rail Button */}
            <button
              type="button"
              onClick={handleLike}
              disabled={isLiking}
              className="group flex flex-col items-center gap-1.5 cursor-pointer"
              title={isLiked ? "Appreciated" : "Appreciate Project"}>
              <span
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border shadow-lg ${
                  isLiked
                    ? "bg-[#C5A059] border-[#C5A059] text-black shadow-[#C5A059]/30 scale-105"
                    : "bg-[#121212] border-[#2c2c2c] text-white group-hover:border-[#C5A059] group-hover:text-[#C5A059]"
                }`}>
                <AppreciateThumbsUpIcon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    justAppreciated ? "scale-125 -rotate-12" : ""
                  }`}
                />
              </span>
              <span className="text-[10px] font-semibold text-gray-400 group-hover:text-white transition-colors">
                {likesCount}
              </span>
            </button>

            {/* Share Rail Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="group flex flex-col items-center gap-1.5 cursor-pointer"
              title="Share Project">
              <span className="w-12 h-12 rounded-full bg-[#121212] border border-[#2c2c2c] text-gray-200 group-hover:border-[#C5A059] group-hover:text-[#C5A059] flex items-center justify-center transition-colors shadow-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8.684 10.742l4.57 2.286M15.418 9l-4.57 2.286M16 5a3 3 0 11-6 0 3 3 0 016 0zm-6 12a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </span>
              <span className="text-[10px] font-semibold text-gray-400 group-hover:text-white transition-colors">
                Share
              </span>
            </button>

            {/* Comments Jump Button */}
            <button
              type="button"
              onClick={() => scrollToSection("project-comments")}
              className="group flex flex-col items-center gap-1.5 cursor-pointer"
              title="Jump to Comments">
              <span className="w-12 h-12 rounded-full bg-[#121212] border border-[#2c2c2c] text-gray-200 group-hover:border-[#C5A059] group-hover:text-[#C5A059] flex items-center justify-center transition-colors shadow-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </span>
              <span className="text-[10px] font-semibold text-gray-400 group-hover:text-white transition-colors">
                {comments.length}
              </span>
            </button>

            {/* Project Info Jump Button */}
            <button
              type="button"
              onClick={() => scrollToSection("project-info")}
              className="group flex flex-col items-center gap-1.5 cursor-pointer"
              title="Project Details">
              <span className="w-12 h-12 rounded-full bg-[#121212] border border-[#2c2c2c] text-gray-200 group-hover:border-[#C5A059] group-hover:text-[#C5A059] flex items-center justify-center transition-colors shadow-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <span className="text-[10px] font-semibold text-gray-400 group-hover:text-white transition-colors">
                Info
              </span>
            </button>

            {/* Commission / Inquire Button */}
            <Link
              href="/contact"
              className="group flex flex-col items-center gap-1.5"
              title="Commission / Inquire">
              <span className="w-12 h-12 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/50 text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black flex items-center justify-center transition-all shadow-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </span>
              <span className="text-[10px] font-semibold text-[#C5A059] group-hover:text-white transition-colors">
                Hire
              </span>
            </Link>
          </aside>
        </div>
      </div>

      {/* =====================================================================
          3. BEHANCE BOTTOM APPRECIATION BANNER
         ===================================================================== */}
      <section className="mt-8 border-y border-[#1b1b1b] bg-[#080808] py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className={`group w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border-2 shadow-2xl ${
              isLiked
                ? "bg-[#C5A059] border-[#C5A059] text-black shadow-[#C5A059]/30 scale-105"
                : "bg-[#111111] border-[#C5A059]/70 text-[#C5A059] hover:bg-[#C5A059] hover:text-black hover:scale-105"
            }`}
            aria-label={isLiked ? "Remove appreciation" : "Appreciate project"}>
            <AppreciateThumbsUpIcon
              className={`w-8 h-8 transition-transform duration-300 ${
                justAppreciated ? "scale-125 -rotate-12" : "group-hover:scale-110"
              }`}
            />
          </button>

          <p className="mt-4 text-xs uppercase tracking-[0.22em] font-bold text-[#C5A059]">
            {isLiked ? "Thank You for Appreciating" : "Appreciate This Work"}
          </p>

          <h2 className="mt-3 text-2xl sm:text-3xl font-serif font-bold text-white">
            {title}
          </h2>

          {/* Stats row */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <AppreciateThumbsUpIcon className="w-4 h-4 text-[#C5A059]" />
              <strong className="text-white">{likesCount.toLocaleString()}</strong>{" "}
              {likesCount === 1 ? "Appreciation" : "Appreciations"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              <strong className="text-white">{viewsCount.toLocaleString()}</strong>{" "}
              {viewsCount === 1 ? "View" : "Views"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <strong className="text-white">{comments.length}</strong>{" "}
              {comments.length === 1 ? "Comment" : "Comments"}
            </span>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Published {year} &bull; {genreOrMedium}
          </p>
        </div>
      </section>

      {/* =====================================================================
          4. BEHANCE TWO-COLUMN FOOTER: COMMENTS (LEFT) + PROJECT INFO (RIGHT)
         ===================================================================== */}
      <div className="max-w-360 mx-auto px-6 md:px-10 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT: COMMENTS & DISCUSSION */}
          <section
            id="project-comments"
            className="lg:col-span-8 bg-[#090909] border border-[#1b1b1b] rounded-lg p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-4 mb-6">
              <h3 className="text-lg font-serif font-bold text-white">
                Discussion &amp; Feedback
              </h3>
              <span className="text-xs font-mono text-[#C5A059] px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/25">
                {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
              </span>
            </div>

            {/* Comment Composer */}
            <form onSubmit={handleSubmitComment} className="mb-8 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-1/2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your Name (optional)"
                    maxLength={80}
                    className="w-full bg-[#121212] border border-[#262626] rounded-md px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A059] transition-colors"
                  />
                </div>
                {/* Honeypot */}
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

              <textarea
                rows={3}
                placeholder="What are your thoughts on this project?"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={2000}
                className="w-full bg-[#121212] border border-[#262626] rounded-md p-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A059] transition-colors resize-none"
              />

              {commentError && (
                <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-md">
                  {commentError}
                </div>
              )}

              {commentSuccess && (
                <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-md">
                  {commentSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-6 py-2.5 rounded-full bg-[#C5A059] text-black hover:bg-white font-bold text-xs tracking-wider uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  {submittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>

            {/* Comments Feed */}
            {loadingComments ? (
              <div className="py-10 text-center text-xs uppercase tracking-widest text-gray-500 font-mono">
                Loading discussion...
              </div>
            ) : comments.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 bg-[#0d0d0d] rounded-md border border-[#1a1a1a]">
                No comments yet. Be the first to leave feedback on this artwork.
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-4 border-b border-[#161616] pb-5 last:border-b-0 last:pb-0">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-[#C5A059] border border-[#2e2e2e] flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      {comment.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-white truncate">
                          {comment.author}
                        </span>
                        <span className="text-[11px] text-gray-500 shrink-0">
                          {comment.timeAgo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1.5 leading-relaxed wrap-break-word">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RIGHT: BEHANCE PROJECT INFO SIDEBAR */}
          <aside id="project-info" className="lg:col-span-4 flex flex-col gap-6">
            {/* Owner Card */}
            <div className="bg-[#090909] border border-[#1b1b1b] rounded-lg p-6">
              <p className="text-[10px] tracking-[0.22em] uppercase text-gray-500 font-bold mb-4">
                Owner
              </p>
              <div className="flex items-center gap-3.5 mb-5">
                <Link
                  href="/about"
                  className="shrink-0 w-13 h-13 rounded-full overflow-hidden border border-[#C5A059]/40 bg-[#141414] flex items-center justify-center">
                  {safeAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeAvatar}
                      alt={artistName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-sm font-bold text-[#C5A059]">
                      SM
                    </span>
                  )}
                </Link>
                <div>
                  <Link
                    href="/about"
                    className="text-base font-serif font-bold text-white hover:text-[#C5A059] transition-colors block">
                    {artistName}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Illustrator &bull; Book Cover Designer &bull; Fine Artist
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/contact"
                  className="w-full py-2.5 px-4 rounded-full bg-[#C5A059] text-black hover:bg-white font-bold text-xs uppercase tracking-wider text-center transition-colors">
                  Commission / Contact
                </Link>
                <Link
                  href="/about"
                  className="w-full py-2.5 px-4 rounded-full bg-[#121212] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#C5A059] font-semibold text-xs uppercase tracking-wider text-center transition-colors">
                  View Artist Profile
                </Link>
              </div>
            </div>

            {/* Project Info Card */}
            <div className="bg-[#090909] border border-[#1b1b1b] rounded-lg p-6">
              <p className="text-[10px] tracking-[0.22em] uppercase text-gray-500 font-bold mb-4">
                Project Information
              </p>
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#161616]">
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-white font-medium text-right">
                    {categoryLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#161616]">
                  <dt className="text-gray-500">Medium / Style</dt>
                  <dd className="text-white font-medium text-right">
                    {genreOrMedium}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#161616]">
                  <dt className="text-gray-500">Year</dt>
                  <dd className="text-white font-medium text-right">{year}</dd>
                </div>
                {publisher && (
                  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#161616]">
                    <dt className="text-gray-500">Publisher</dt>
                    <dd className="text-white font-medium text-right">
                      {publisher}
                    </dd>
                  </div>
                )}
                {dimensions && (
                  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#161616]">
                    <dt className="text-gray-500">Dimensions</dt>
                    <dd className="text-white font-medium text-right">
                      {dimensions}
                    </dd>
                  </div>
                )}
                {availability && (
                  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#161616]">
                    <dt className="text-gray-500">Status</dt>
                    <dd>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${availabilityBadgeClass}`}>
                        {availability}
                      </span>
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-1.5">
                  <dt className="text-gray-500">Engagement</dt>
                  <dd className="text-gray-300 font-mono text-[11px]">
                    {likesCount} likes &bull; {viewsCount} views
                  </dd>
                </div>
              </dl>
            </div>

            {/* Creative Fields / Tags Card */}
            {cleanTags.length > 0 && (
              <div className="bg-[#090909] border border-[#1b1b1b] rounded-lg p-6">
                <p className="text-[10px] tracking-[0.22em] uppercase text-gray-500 font-bold mb-4">
                  Creative Fields &amp; Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {cleanTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-[#131313] border border-[#262626] text-[11px] font-medium text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Copyright & Quick Copy Link */}
            <div className="bg-[#090909] border border-[#1b1b1b] rounded-lg p-5 flex items-center justify-between gap-3 text-[11px] text-gray-500">
              <span>
                &copy; {year} {artistName}. All Rights Reserved.
              </span>
              <button
                type="button"
                onClick={() => handleShareClick("copy")}
                className="text-[#C5A059] hover:text-white font-semibold uppercase tracking-wider shrink-0 cursor-pointer">
                {copiedPlatform === "Link" ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* =====================================================================
          5. "MORE FROM SOURAV MITRA" RELATED PROJECTS STRIP
         ===================================================================== */}
      {relatedProjects.length > 0 && (
        <section className="border-t border-[#191919] bg-[#050505] py-14 px-6 md:px-10">
          <div className="max-w-360 mx-auto">
            <div className="flex items-baseline justify-between mb-8">
              <div>
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#C5A059] font-bold block mb-1">
                  Portfolio
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  More from {artistName}
                </h3>
              </div>
              <Link
                href={backUrl}
                className="text-xs font-bold uppercase tracking-widest text-[#C5A059] hover:text-white transition-colors">
                View All {categoryShort} &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProjects.map((rel) => {
                const safeRelImg =
                  rel.coverImage && isSafeImageUrl(rel.coverImage)
                    ? rel.coverImage
                    : "";
                const relType =
                  rel.category === "book-covers"
                    ? "book-cover"
                    : rel.category === "illustration"
                      ? "illustration"
                      : "fine-art";
                return (
                  <Link
                    key={rel.id}
                    href={rel.href}
                    className="group block">
                    <div className="relative aspect-4/3 rounded-sm overflow-hidden bg-[#111111] border border-[#1f1f1f] group-hover:border-[#C5A059]/60 transition-colors">
                      {safeRelImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={safeRelImg}
                          alt={rel.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <ProceduralPlaceholder
                          id={rel.id}
                          type={relType}
                          title={rel.title}
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <span className="text-xs font-semibold text-white truncate">
                          {rel.title}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-white group-hover:text-[#C5A059] transition-colors truncate">
                        {rel.title}
                      </h4>
                      <div className="flex items-center gap-2.5 text-[11px] text-gray-500 font-mono shrink-0">
                        <span className="inline-flex items-center gap-1">
                          <AppreciateThumbsUpIcon className="w-3 h-3 text-gray-400" />
                          {rel.likes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                          </svg>
                          {rel.views}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          6. SHARE MODAL (Clean Behance Popover Overlay)
         ===================================================================== */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Share project">
          <div
            className="w-full max-w-md bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3.5 mb-5">
              <div>
                <h3 className="text-base font-serif font-bold text-white">
                  Share Project
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                  {title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-[#181818] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close share dialog">
                &times;
              </button>
            </div>

            {/* Social Share Icons Grid */}
            <div className="grid grid-cols-4 gap-3 sm:gap-4 justify-items-center py-2">
              {SHARE_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleShareClick(platform.id)}
                  title={`Share on ${platform.label}`}
                  aria-label={`Share on ${platform.label}`}
                  className={`w-12 h-12 rounded-full bg-[#161616] border border-[#262626] flex items-center justify-center text-gray-300 transition-all duration-200 cursor-pointer shadow-sm hover:scale-110 active:scale-95 ${platform.hoverClass}`}>
                  {platform.icon}
                </button>
              ))}
            </div>

            {/* Project Link Copy Section */}
            <div className="mt-5 pt-4 border-t border-[#1f1f1f]">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">
                Project Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? window.location.href : ""}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-[#141414] border border-[#262626] rounded-lg px-3.5 py-2 text-xs text-gray-300 font-mono select-all focus:outline-none focus:border-[#C5A059] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleShareClick("copy")}
                  aria-label="Copy project link"
                  title="Copy link"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C5A059] hover:bg-[#d6b068] text-black font-semibold text-xs transition-all cursor-pointer">
                  {copiedPlatform === "Link" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {copiedPlatform && (
              <div className="mt-4 text-center text-xs text-[#C5A059] font-medium bg-[#C5A059]/10 border border-[#C5A059]/25 py-2 px-3 rounded-lg">
                {copiedPlatform === "Link"
                  ? "Link copied to clipboard!"
                  : `Link copied! Opening ${copiedPlatform}...`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          7. FULL-SCREEN LIGHTBOX VIEWER
         ===================================================================== */}
      {lightboxIndex !== null && galleryImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} full-screen image viewer`}>
          {/* Top Bar */}
          <div
            className="absolute top-4 inset-x-6 flex items-center justify-between text-xs text-gray-300 z-10"
            onClick={(e) => e.stopPropagation()}>
            <span className="font-serif text-sm text-white truncate max-w-md">
              {title}
              {galleryImages.length > 1 && (
                <span className="ml-2 font-mono text-xs text-[#C5A059]">
                  {lightboxIndex + 1} / {galleryImages.length}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={closeLightbox}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close lightbox">
              &times;
            </button>
          </div>

          {/* Prev / Next Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightbox();
                }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:border-[#C5A059] text-white hover:text-[#C5A059] text-2xl flex items-center justify-center cursor-pointer z-10 transition-colors"
                aria-label="Previous image">
                &lsaquo;
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightbox();
                }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:border-[#C5A059] text-white hover:text-[#C5A059] text-2xl flex items-center justify-center cursor-pointer z-10 transition-colors"
                aria-label="Next image">
                &rsaquo;
              </button>
            </>
          )}

          {/* Full-Res Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={galleryImages[lightboxIndex]}
            alt={`${title} — Image ${lightboxIndex + 1}`}
            className="max-w-full max-h-[88vh] object-contain rounded-xs shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
