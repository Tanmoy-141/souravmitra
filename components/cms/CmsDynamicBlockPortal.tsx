"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProjectCarousel from "@/components/ProjectCarousel";
import ContactFormClient from "@/components/cms/ContactFormClient";
import ProjectGridSection from "@/components/cms/ProjectGridSection";
import PortfolioCollection from "@/components/PortfolioCollection";
import ClientsSection from "@/components/ClientsSection";
import { parseTestimonialBlock } from "@/lib/dynamic-blocks";
import {
  ProjectShareBlock,
  ProjectCommentsBlock,
} from "./ProjectDetailInteractiveBlocks";
import Counter from "@/components/Counter";
import { initCountersInContainer } from "@/lib/counter-animation";

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

export function CmsDynamicBlockPortal({
  html,
  category,
  className,
}: CmsDynamicBlockPortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [targets, setTargets] = useState<PortalTarget[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Parse the immutable HTML string into an in-memory DOM document.
    // This source document is completely detached from the live DOM and
    // is never mutated by element.replaceChildren(), ensuring that
    // headings, quotes, and attributes are preserved across React 19
    // Strict Mode double-invocations and component re-renders.
    const parsedDoc =
      typeof window !== "undefined"
        ? new DOMParser().parseFromString(html, "text/html")
        : null;
    const parsedMarkers = parsedDoc
      ? Array.from(parsedDoc.querySelectorAll<HTMLElement>("[data-cms-block]"))
      : [];

    const markers =
      containerRef.current.querySelectorAll<HTMLElement>("[data-cms-block]");

    const newTargets: PortalTarget[] = [];

    Array.from(markers).forEach((element, index) => {
      const block = element.dataset.cmsBlock;
      if (!block) return;

      const sourceEl = parsedMarkers[index] || element;

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
        // Parse from the pristine source element (parsedDoc) or fallback to element
        const parsed = parseTestimonialBlock(sourceEl.outerHTML);
        const heading =
          sourceEl
            .querySelector("h1, h2, h3, h4")
            ?.textContent?.replace(/\u00a0/g, " ")
            .trim() ||
          element
            .querySelector("h1, h2, h3, h4")
            ?.textContent?.replace(/\u00a0/g, " ")
            .trim() ||
          parsed.heading ||
          undefined;

        // Fallback: also check explicit data-testimonial-quote attributes on sourceEl
        const explicitNodes = Array.from(
          sourceEl.querySelectorAll<HTMLElement>("[data-testimonial-quote]"),
        );
        const explicitItems = explicitNodes
          .map((node) => ({
            quote: (
              node.getAttribute("data-testimonial-quote") ||
              node.dataset.testimonialQuote ||
              ""
            )
              .replace(/^[“"']+|[”"']+$/g, "")
              .trim(),
            author:
              (
                node.getAttribute("data-testimonial-author") ||
                node.dataset.testimonialAuthor ||
                ""
              )
                .replace(/^[-—~:\s]+/, "")
                .trim() || "Editorial Client",
          }))
          .filter((item) => Boolean(item.quote));

        const items =
          parsed.items && parsed.items.length > 0
            ? parsed.items
            : explicitItems.length > 0
              ? explicitItems
              : undefined;

        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-testimonial-${index}`,
          node: <TestimonialsSection items={items} heading={heading} />,
        });
      } else if (block === "project-carousel") {
        const heading =
          sourceEl
            .querySelector("h1, h2, h3, h4")
            ?.textContent?.replace(/\u00a0/g, " ")
            .trim() ||
          element
            .querySelector("h1, h2, h3, h4")
            ?.textContent?.replace(/\u00a0/g, " ")
            .trim() ||
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
      } else if (block === "clients-section" || block === "client-logos") {
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-clients-${index}`,
          node: <ClientsSection />,
        });
      } else if (block === "project-share") {
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-project-share-${index}`,
          node: <ProjectShareBlock />,
        });
      } else if (block === "project-comments") {
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-project-comments-${index}`,
          node: <ProjectCommentsBlock />,
        });
      } else if (block === "counters" || block === "counter-section") {
        const hasCounterItems = element.querySelector(
          ".counter-number, .counter-item, [data-counter-target]",
        );
        if (!hasCounterItems) {
          element.replaceChildren();
          newTargets.push({
            element,
            key: `portal-counters-${index}`,
            node: (
              <div className="container mx-auto px-6 sm:px-10 max-w-6xl grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                <Counter target={150} label="Projects Completed" />
                <Counter target={50} label="Happy Clients" />
                <Counter target={10} label="Years Experience" />
              </div>
            ),
          });
        }
      }
    });

    setTargets(newTargets);

    // Initialize intersection-observer counter animations for all counters in container
    const cleanupCounters = initCountersInContainer(containerRef.current);
    return () => {
      cleanupCounters();
    };
  }, [html, category]);

  return (
    <>
      <style>{`
        [data-cms-block] {
          border: none !important;
        }
        .counter-item {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
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
