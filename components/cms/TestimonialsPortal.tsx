"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import TestimonialsSection from "@/components/TestimonialsSection";
import type { testimonials } from "@/data/content";

type TestimonialItem = (typeof testimonials)[number];

interface PortalTarget {
  element: HTMLElement;
  key: string;
  heading?: string;
  content?: TestimonialItem[];
}

function parseEditableTestimonials(
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

  if (explicitQuotes.length > 0) return explicitQuotes;

  const candidateParts = Array.from(
    element.querySelectorAll<HTMLElement>("blockquote, p"),
  )
    .map((node) => {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("br").forEach((lineBreak) => {
        lineBreak.replaceWith(document.createTextNode("\n"));
      });
      return (copy.textContent || "").replace(/\u00a0/g, " ").trim();
    })
    .filter(
      (text) =>
        text &&
        !/rotating testimonials appear here on the live site/i.test(text),
    );

  if (candidateParts.length === 0) return undefined;

  const lines = candidateParts
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const attributionIndex = lines.findIndex((line) => /^[-—~:]/.test(line));
  if (attributionIndex < 1) {
    if (lines.length >= 2) {
      const quote = lines[0].replace(/^[“"']+|[”"']+$/g, "").trim();
      const author = lines
        .slice(1)
        .join(" ")
        .replace(/^[-—~:\s]+/, "")
        .trim();
      if (quote && author) return [{ quote, author }];
    }
    return undefined;
  }

  const quote = lines
    .slice(0, attributionIndex)
    .join(" ")
    .replace(/^[“"']+|[”"']+$/g, "")
    .trim();
  const author = lines
    .slice(attributionIndex)
    .join(" ")
    .replace(/^[-—~:\s]+/, "")
    .trim();

  return quote && author ? [{ quote, author }] : undefined;
}

export default function TestimonialsPortal({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [targets, setTargets] = useState<PortalTarget[]>([]);

  useEffect(() => {
    const markers = containerRef.current?.querySelectorAll<HTMLElement>(
      '[data-cms-block="testimonials-carousel"]',
    );
    const portalTargets = Array.from(markers || []).map((element, index) => {
      const headingEl = element.querySelector("h2, h3, h4");
      const headingText = headingEl?.textContent?.trim();
      return {
        element,
        key: `${index}-${element.dataset.cmsBlock}`,
        heading: headingText || undefined,
        content: parseEditableTestimonials(element),
      };
    });
    portalTargets.forEach(({ element }) => element.replaceChildren());
    setTargets(
      portalTargets.map(({ element, key, heading, content }) => ({
        element,
        key,
        heading,
        content,
      })),
    );
  }, [html]);

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      {targets.map(({ element, key, heading, content }) =>
        createPortal(
          <TestimonialsSection items={content} heading={heading} />,
          element,
          key,
        ),
      )}
    </>
  );
}
