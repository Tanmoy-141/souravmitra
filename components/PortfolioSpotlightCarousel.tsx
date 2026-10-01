"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import type { Project } from "@/db/schema";

export interface PortfolioCategoryItem {
  id: string;
  title: string;
  slug: string;
  href: string;
  projects: Project[];
  activeProjectIndex: number;
}

export interface CustomCategoryItem {
  id: string;
  title: string;
  subtitle?: string;
  slug?: string;
}

interface PortfolioSpotlightCarouselProps {
  heading?: string;
  initialCategory?: string;
  autoPlayInterval?: number;
  headingProps?: import("@/components/ProjectCarousel").HeadingStyleProps;
  cardStyles?: Record<string, React.CSSProperties>;
  customSubtitles?: Record<string, string>;
  customCategories?: CustomCategoryItem[];
  containerStyles?: React.CSSProperties;
}

const DEFAULT_SUBTITLES: Record<string, string> = {
  "book-covers": "Literary Fiction",
  "illustration": "Conceptual Piece",
  "fine-art": "Oil on Canvas",
  "dark-fantasy": "Myth & Legend",
};

const RELIABLE_CATEGORY_FALLBACKS: Record<string, string> = {
  "book-covers":
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
  "illustration":
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop",
  "fine-art":
    "https://nyj2ucc9ur7y9rzh.public.blob.vercel-storage.com/uploads/2f022a42_temptation-1790753130290-QOo7ARHtRNTMiuo2KLijGxzhG6hqfQ.jpeg",
  "dark-fantasy":
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
};

// Curated fallbacks ensuring instant, flicker-free rendering before dynamic fetch resolves
const DEFAULT_PORTFOLIO_ITEMS: PortfolioCategoryItem[] = [
  {
    id: "book-covers",
    title: "Book Covers",
    slug: "book-covers",
    href: "/book-covers",
    activeProjectIndex: 0,
    projects: [
      {
        id: "literary-fiction-book-1",
        slug: "literary-fiction-book-1",
        title: "The Whispering Citadel",
        category: "book-covers",
        status: "published",
        description:
          "Created as the cover illustration for a dark fantasy bestseller. Features intricately sculpted gothic arches, eerie fog, and atmospheric rim lighting.",
        medium: "Digital Painting",
        dimensions: "18 x 24 inches",
        publisher: "Tor Books Publishing",
        year: "2024",
        coverImage:
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
        images: [],
        details: null,
        tags: ["Fantasy", "Cover Art"],
        isFeatured: true,
        likes: 0,
        views: 0,
        sortOrder: 0,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: "illustration",
    title: "Illustration",
    slug: "illustration",
    href: "/illustration",
    activeProjectIndex: 0,
    projects: [
      {
        id: "conceptual-illustration-1",
        slug: "conceptual-illustration-1",
        title: "Conceptual Narrative Illustration",
        category: "illustration",
        status: "published",
        description:
          "Atmospheric editorial and conceptual artwork exploring surreal environments, dramatic lighting, and symbolic storytelling.",
        medium: "Mixed Media & Digital",
        dimensions: "20 x 30 inches",
        publisher: "Orbit Books & Independent Editorial",
        year: "2024",
        coverImage:
          "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop",
        images: [],
        details: null,
        tags: ["Illustration", "Editorial"],
        isFeatured: true,
        likes: 0,
        views: 0,
        sortOrder: 0,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: "fine-art",
    title: "Fine Art",
    slug: "fine-art",
    href: "/fine-art",
    activeProjectIndex: 0,
    projects: [
      {
        id: "fine-art-piece-1",
        slug: "fine-art-piece-1",
        title: "TEMPTATION",
        category: "fine-art",
        status: "published",
        description:
          "An evocative fine art study examining emotional tension and classical chiaroscuro through rich textural layers and delicate lighting.",
        medium: "Oil on Canvas",
        dimensions: "24 x 36 inches",
        publisher: "Private Collector Exhibition",
        year: "2024",
        coverImage:
          "https://nyj2ucc9ur7y9rzh.public.blob.vercel-storage.com/uploads/2f022a42_temptation-1790753130290-QOo7ARHtRNTMiuo2KLijGxzhG6hqfQ.jpeg",
        images: [],
        details: null,
        tags: ["Fine Art", "Original"],
        isFeatured: true,
        likes: 0,
        views: 0,
        sortOrder: 0,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    id: "dark-fantasy",
    title: "Dark Fantasy",
    slug: "fine-art",
    href: "/fine-art",
    activeProjectIndex: 0,
    projects: [
      {
        id: "dark-fantasy-1",
        slug: "dark-fantasy-1",
        title: "Myth & Legend",
        category: "fine-art",
        status: "published",
        description:
          "Mythological and dark fantasy themed original artwork exploring ancient legends.",
        medium: "Oil & Mixed Media",
        dimensions: "28 x 40 inches",
        publisher: "Original Collection",
        year: "2024",
        coverImage:
          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
        images: [],
        details: null,
        tags: ["Dark Fantasy", "Myth"],
        isFeatured: true,
        likes: 0,
        views: 0,
        sortOrder: 0,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
];

export default function PortfolioSpotlightCarousel({
  heading = "Featured Projects Carousel",
  autoPlayInterval = 5000,
  headingProps,
  cardStyles,
  customSubtitles,
  customCategories,
  containerStyles,
}: PortfolioSpotlightCarouselProps) {
  const [categories, setCategories] = useState<PortfolioCategoryItem[]>(
    DEFAULT_PORTFOLIO_ITEMS,
  );
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Fetch dynamic projects and published portfolio pages from DB
  useEffect(() => {
    let isMounted = true;

    async function loadPortfolioData() {
      try {
        const projectsRes = await fetch("/api/projects").then((r) =>
          r.ok ? r.json() : null,
        );

        const rawProjects: Project[] =
          Array.isArray(projectsRes?.projects) ? projectsRes.projects : [];

        if (!isMounted) return;

        // The spotlight carousel is strictly a 4-card showcase matching Image 1
        // (Book Covers, Illustration, Fine Art, Dark Fantasy) or explicit customCategories.
        const basePortfolios: Array<{
          id: string;
          title: string;
          slug: string;
          defaultSub?: string;
        }> =
          customCategories && customCategories.length > 0
            ? customCategories.slice(0, 4).map((cc) => {
                const cleanSlug = (
                  cc.slug ||
                  cc.id ||
                  cc.title.toLowerCase().replace(/\s+/g, "-")
                ).replace(/^\/+|\/+$/g, "");
                return {
                  id: cc.id || cleanSlug,
                  title: cc.title,
                  slug: cleanSlug,
                  defaultSub: cc.subtitle || "Original Portfolio",
                };
              })
            : [
                {
                  id: "book-covers",
                  title: "Book Covers",
                  slug: "book-covers",
                  defaultSub: "Literary Fiction",
                },
                {
                  id: "illustration",
                  title: "Illustration",
                  slug: "illustration",
                  defaultSub: "Conceptual Piece",
                },
                {
                  id: "fine-art",
                  title: "Fine Art",
                  slug: "fine-art",
                  defaultSub: "Oil on Canvas",
                },
                {
                  id: "dark-fantasy",
                  title: "Dark Fantasy",
                  slug: "fine-art",
                  defaultSub: "Myth & Legend",
                },
              ];

        // Assemble categories with their corresponding projects
        const updatedCategories: PortfolioCategoryItem[] = basePortfolios.map(
          (portfolio) => {
            let matchedProjects = rawProjects.filter(
              (proj) =>
                proj.category === portfolio.id ||
                proj.category === portfolio.slug,
            );

            // Special mapping for Dark Fantasy if no direct category tag
            if (matchedProjects.length === 0 && portfolio.id === "dark-fantasy") {
              matchedProjects = rawProjects.filter(
                (proj) =>
                  proj.tags?.some((t) => /fantasy|myth|dark/i.test(t)) ||
                  /fantasy|myth|dark/i.test(proj.title || ""),
              );
              if (matchedProjects.length === 0) {
                matchedProjects = rawProjects.filter(
                  (proj) => proj.category === "fine-art" || proj.category === "book-covers",
                );
              }
            }

            matchedProjects.sort((a, b) => {
              if (a.isFeatured && !b.isFeatured) return -1;
              if (!a.isFeatured && b.isFeatured) return 1;
              return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            });

            const fallbackDefault = DEFAULT_PORTFOLIO_ITEMS.find(
              (d) => d.id === portfolio.id,
            );

            const finalProjects =
              matchedProjects.length > 0
                ? matchedProjects
                : fallbackDefault
                  ? fallbackDefault.projects
                  : rawProjects.slice(0, 3);

            return {
              id: portfolio.id,
              title: portfolio.title,
              slug: portfolio.slug,
              href: `/${portfolio.slug}`,
              projects: finalProjects,
              activeProjectIndex: 0,
            };
          },
        );

        if (updatedCategories.length > 0) {
          setCategories(updatedCategories);
        }
      } catch (err) {
        console.warn("[PortfolioSpotlightCarousel] Fetch fallback used:", err);
      }
    }

    loadPortfolioData();

    return () => {
      isMounted = false;
    };
  }, [customCategories]);

  // Next / Prev cycles the artwork images in each card
  const handleNext = useCallback(() => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        activeProjectIndex:
          (cat.activeProjectIndex + 1) % Math.max(1, cat.projects.length),
      })),
    );
  }, []);

  const handlePrev = useCallback(() => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        activeProjectIndex:
          (cat.activeProjectIndex - 1 + Math.max(1, cat.projects.length)) %
          Math.max(1, cat.projects.length),
      })),
    );
  }, []);

  // Continuous auto-play rotation across all portfolio cards
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    autoPlayTimerRef.current = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [autoPlayInterval, handleNext]);

  // Touch swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX - touchEndX;
    if (Math.abs(distance) > 45) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  const isCentered =
    headingProps?.textAlign === "center" ||
    headingProps?.style?.textAlign === "center" ||
    (headingProps?.marginLeft &&
      headingProps.marginLeft !== "0px" &&
      headingProps?.marginRight &&
      headingProps.marginRight !== "0px") ||
    headingProps?.marginLeft === "auto" ||
    headingProps?.style?.marginLeft === "auto";

  return (
    <div
      style={{
        ...(containerStyles?.width ? { width: containerStyles.width } : {}),
        ...(containerStyles?.maxWidth ? { maxWidth: containerStyles.maxWidth } : {}),
        ...(containerStyles?.height ? { height: containerStyles.height } : {}),
        ...(containerStyles?.minHeight ? { minHeight: containerStyles.minHeight } : {}),
        ...containerStyles,
      }}
      className={`w-full py-8 px-4 sm:px-6 lg:px-8 mx-auto select-none ${
        containerStyles?.maxWidth && containerStyles.maxWidth !== "none"
          ? ""
          : containerStyles?.width
            ? "max-w-none"
            : "max-w-7xl"
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      <div
        style={{
          ...(containerStyles?.height ? { minHeight: "100%", height: "100%" } : {}),
        }}
        className="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-6 sm:p-8 text-white relative shadow-2xl overflow-visible flex flex-col justify-between">
        {/* Header Bar */}
        <div
          className={`w-full pb-6 border-b border-[#1f1f1f] mb-6 flex items-center ${
            isCentered ? "justify-center text-center" : "justify-start text-left"
          }`}>
          <div
            className={`w-full ${
              isCentered
                ? "flex flex-col items-center justify-center text-center mx-auto"
                : "flex flex-col items-start"
            }`}>
            <h2
              id={headingProps?.id}
              className={`text-2xl sm:text-3xl font-bold tracking-tight text-white ${
                headingProps?.className || ""
              }`}
              style={{
                ...(headingProps?.fontFamily
                  ? { fontFamily: headingProps.fontFamily }
                  : {}),
                ...(headingProps?.fontWeight
                  ? { fontWeight: headingProps.fontWeight }
                  : {}),
                ...(headingProps?.fontSize
                  ? { fontSize: headingProps.fontSize }
                  : {}),
                ...(headingProps?.fontStyle
                  ? { fontStyle: headingProps.fontStyle }
                  : {}),
                ...(headingProps?.letterSpacing
                  ? { letterSpacing: headingProps.letterSpacing }
                  : {}),
                ...(headingProps?.textTransform
                  ? { textTransform: headingProps.textTransform }
                  : {}),
                ...(headingProps?.textAlign
                  ? { textAlign: headingProps.textAlign }
                  : {}),
                ...(headingProps?.color ? { color: headingProps.color } : {}),
                ...(headingProps?.position ? { position: headingProps.position } : {}),
                ...(headingProps?.top ? { top: headingProps.top } : {}),
                ...(headingProps?.bottom ? { bottom: headingProps.bottom } : {}),
                ...(headingProps?.left ? { left: headingProps.left } : {}),
                ...(headingProps?.right ? { right: headingProps.right } : {}),
                ...(headingProps?.transform ? { transform: headingProps.transform } : {}),
                ...(headingProps?.marginLeft &&
                headingProps.marginLeft !== "0px"
                  ? { marginLeft: headingProps.marginLeft }
                  : {}),
                ...(headingProps?.marginRight &&
                headingProps.marginRight !== "0px"
                  ? { marginRight: headingProps.marginRight }
                  : {}),
                ...(headingProps?.marginTop ? { marginTop: headingProps.marginTop } : {}),
                ...(headingProps?.marginBottom ? { marginBottom: headingProps.marginBottom } : {}),
                ...(headingProps?.paddingLeft ? { paddingLeft: headingProps.paddingLeft } : {}),
                ...(headingProps?.paddingRight ? { paddingRight: headingProps.paddingRight } : {}),
                ...(headingProps?.width ? { width: headingProps.width } : {}),
                ...(headingProps?.height
                  ? { height: headingProps.height }
                  : {}),
                ...(headingProps?.maxWidth
                  ? { maxWidth: headingProps.maxWidth }
                  : {}),
                ...headingProps?.style,
              }}>
              {heading}
            </h2>
          </div>
        </div>

        {/* 4 Cards Grid Layout with Side Navigation Arrows */}
        <div className="relative group/carousel">
          {/* Left Side Navigation Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous artwork"
            className="absolute -left-3 sm:-left-5 lg:-left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/85 hover:bg-[#C5A059] text-[#C5A059] hover:text-black border border-[#C5A059]/40 hover:border-[#C5A059] backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.85)] hover:shadow-[0_0_30px_rgba(197,160,89,0.55)] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 cursor-pointer">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right Side Navigation Arrow */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next artwork"
            className="absolute -right-3 sm:-right-5 lg:-right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/85 hover:bg-[#C5A059] text-[#C5A059] hover:text-black border border-[#C5A059]/40 hover:border-[#C5A059] backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.85)] hover:shadow-[0_0_30px_rgba(197,160,89,0.55)] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 cursor-pointer">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className={`grid gap-4 sm:gap-5 items-stretch ${
              categories.length === 1
                ? "grid-cols-1"
                : categories.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : categories.length === 3
                    ? "grid-cols-1 md:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}>
            {categories.map((cat, idx) => {
              const activeProj =
                cat.projects[cat.activeProjectIndex % Math.max(1, cat.projects.length)] ||
                cat.projects[0];
              const fallbackUrl =
                RELIABLE_CATEGORY_FALLBACKS[cat.id] ||
                RELIABLE_CATEGORY_FALLBACKS[cat.slug] ||
                DEFAULT_PORTFOLIO_ITEMS.find((d) => d.id === cat.id)?.projects[0]
                  ?.coverImage ||
                "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop";

              const rawBgImage =
                activeProj?.coverImage ||
                activeProj?.images?.[0] ||
                fallbackUrl;

              const bgImage =
                brokenImages[cat.id] || !rawBgImage ? fallbackUrl : rawBgImage;

              const subtitle =
                customSubtitles?.[cat.id] ||
                customSubtitles?.[cat.slug] ||
                DEFAULT_SUBTITLES[cat.id] ||
                activeProj?.medium ||
                "Original Artwork";

              const customCardStyle =
                cardStyles?.[cat.id] ||
                cardStyles?.[cat.slug] ||
                cardStyles?.[cat.title.toLowerCase()] ||
                cardStyles?.[cat.title.toLowerCase().replace(/\s+/g, "-")] ||
                cardStyles?.[`card-${idx}`];

              return (
                <Link
                  key={cat.id}
                  href={cat.href || `/${cat.slug}`}
                  style={{
                    ...(customCardStyle?.width
                      ? { width: customCardStyle.width, maxWidth: "none" }
                      : {}),
                    ...(customCardStyle?.height
                      ? {
                          height: customCardStyle.height,
                          minHeight: customCardStyle.height,
                        }
                      : {}),
                    ...(customCardStyle?.minHeight
                      ? { minHeight: customCardStyle.minHeight }
                      : {}),
                    ...(customCardStyle?.width && customCardStyle?.height
                      ? { aspectRatio: "auto" }
                      : {}),
                    ...customCardStyle,
                  }}
                  className="relative overflow-hidden rounded-xl border border-[#262626] hover:border-[#C5A059] bg-[#141414] aspect-3/4 min-h-105 sm:min-h-115 flex flex-col justify-between p-5 sm:p-6 transition-all duration-500 group shadow-lg hover:shadow-[0_10px_30px_rgba(197,160,89,0.22)] hover:-translate-y-1.5 cursor-pointer max-w-full">
                  {/* Artwork Background Image with Ken Burns animation */}
                  <div className="absolute inset-0 z-0 overflow-hidden bg-[#111]">
                    <Image
                      src={bgImage}
                      alt={cat.title}
                      fill
                      unoptimized
                      priority={idx < 2}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-center transition-all duration-700 ease-out group-hover:scale-108 group-hover:brightness-105"
                      onError={() => {
                        setBrokenImages((prev) => ({ ...prev, [cat.id]: true }));
                      }}
                    />
                    {/* Dark gradient lighting overlays to make text readable */}
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/45 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>

                  {/* Top Category Badge */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] bg-black/85 border border-[#C5A059]/50 rounded-sm backdrop-blur-md shadow-md">
                      {cat.title.toUpperCase()}
                    </span>
                    <span className="text-gray-400 group-hover:text-[#C5A059] group-hover:translate-x-1 transition-all text-xs font-light">
                      →
                    </span>
                  </div>

                  {/* Bottom Info: Title & View Artwork Link */}
                  <div className="relative z-10 flex flex-col gap-1.5 pt-4">
                    <h4 className="text-base sm:text-lg font-bold text-white tracking-wide group-hover:text-[#C5A059] transition-colors drop-shadow-md line-clamp-1">
                      {subtitle}
                    </h4>
                    <p className="text-xs font-semibold text-[#C5A059] flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Artwork →
                    </p>
                  </div>

                  {/* Bottom Accent Glow Line */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-[#C5A059] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
