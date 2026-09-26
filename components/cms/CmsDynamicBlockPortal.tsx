"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProjectCarousel from "@/components/ProjectCarousel";
import ContactFormClient from "@/components/cms/ContactFormClient";
import ProjectGridSection from "@/components/cms/ProjectGridSection";
import PortfolioCollection from "@/components/PortfolioCollection";
import { parseTestimonialBlock } from "@/lib/dynamic-blocks";
import type { testimonials } from "@/data/content";

type TestimonialItem = (typeof testimonials)[number];
type PortfolioCategory = "book-covers" | "illustration" | "fine-art";

interface PortalTarget {
  element: HTMLElement;
  key: string;
  node: ReactNode;
}

interface CmsDynamicBlockPortalProps {
  html: string;
  category?: PortfolioCategory;
  className?: string;
}

function parseExplicitTestimonials(
  element: HTMLElement,
): TestimonialItem[] | undefined {
  const explicitQuotes = Array.from(
    element.querySelectorAll<HTMLElement>("[data-testimonial-quote]"),
  )
    .map((quoteNode) => ({
      quote:
        quoteNode.dataset.testimonialQuote?.trim() ||
        quoteNode.innerText.trim(),
      author:
        quoteNode.dataset.testimonialAuthor?.trim() ||
        quoteNode.parentElement
          ?.querySelector<HTMLElement>("[data-testimonial-author]")
          ?.innerText.trim() ||
        "",
    }))
    .filter((item) => item.quote && item.author);

  return explicitQuotes.length > 0 ? explicitQuotes : undefined;
}

export function CmsDynamicBlockPortal({
  html,
  category,
  className,
}: CmsDynamicBlockPortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [targets, setTargets] = useState<PortalTarget[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const markers =
      containerRef.current.querySelectorAll<HTMLElement>("[data-cms-block]");

    const newTargets: PortalTarget[] = [];

    Array.from(markers).forEach((element, index) => {
      const block = element.dataset.cmsBlock;
      if (!block) return;

      // Reset placeholder styling so real component renders seamlessly
      element.classList.remove(
        "border",
        "border-dashed",
        "border-[#444]",
        "border-[#C5A059]",
        "border-[#222]",
        "min-h-72",
        "p-12",
        "p-8",
        "my-8",
        "my-12",
        "bg-[#0a0a0a]",
        "bg-[#080808]",
        "bg-black",
      );
      element.style.border = "none";
      element.style.padding = "0";
      element.style.minHeight = "0";
      element.style.background = "transparent";

      // If parent section was just an outer wrapper for this block, prevent double-padding
      if (
        element.parentElement &&
        element.parentElement.tagName.toLowerCase() === "section" &&
        element.parentElement.children.length === 1
      ) {
        element.parentElement.style.padding = "0";
        element.parentElement.style.maxWidth = "100%";
      }

      if (block === "testimonials-carousel") {
        const explicit = parseExplicitTestimonials(element);
        const parsed = parseTestimonialBlock(element.outerHTML);
        const heading =
          element.querySelector("h1, h2, h3, h4")?.textContent?.trim() ||
          parsed.heading ||
          undefined;
        const items = explicit || parsed.items;

        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-testimonial-${index}`,
          node: <TestimonialsSection items={items} heading={heading} />,
        });
      } else if (block === "project-carousel") {
        const heading =
          element.querySelector("h1, h2, h3, h4")?.textContent?.trim() ||
          undefined;
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-carousel-${index}`,
          node: <ProjectCarousel heading={heading} />,
        });
      } else if (block === "contact-form") {
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-contact-${index}`,
          node: <ContactFormClient />,
        });
      } else if (block === "project-grid") {
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-grid-${index}`,
          node: category ? (
            <PortfolioCollection category={category} />
          ) : (
            <ProjectGridSection />
          ),
        });
      }
    });

    setTargets(newTargets);
  }, [html, category]);

  return (
    <>
      <style>{`
        [data-cms-block] {
          border: none !important;
        }
      `}</style>
      <div
        ref={containerRef}
        suppressHydrationWarning
        className={className || "w-full"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {targets.map((t) => createPortal(t.node, t.element, t.key))}
    </>
  );
}

export default CmsDynamicBlockPortal;
