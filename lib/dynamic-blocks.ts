import { ReactNode } from "react";

export type DynamicCmsBlock =
  | "project-grid"
  | "testimonials-carousel"
  | "project-carousel"
  | "contact-form";

export type PageSegment =
  | { type: "html"; html: string }
  | { type: "block"; block: DynamicCmsBlock; rawHtml?: string };

export interface DynamicBlockRenderOptions {
  ignoreBlocks?: readonly DynamicCmsBlock[];
}

const DYNAMIC_BLOCKS: DynamicCmsBlock[] = [
  "project-grid",
  "testimonials-carousel",
  "project-carousel",
  "contact-form",
];

export function parseTestimonialBlock(blockHtml?: string): {
  heading?: string;
  items?: Array<{ quote: string; author: string }>;
} {
  if (!blockHtml) return {};

  const headingMatch = blockHtml.match(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/i);
  const heading = headingMatch
    ? headingMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim()
    : undefined;

  const pMatches = Array.from(
    blockHtml.matchAll(
      /<(?:p|blockquote)[^>]*>([\s\S]*?)<\/(?:p|blockquote)>/gi,
    ),
  );
  const items: Array<{ quote: string; author: string }> = [];

  for (const match of pMatches) {
    const raw = match[1]
      .replace(/&nbsp;/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (
      !raw ||
      /rotating testimonials appear here on the live site/i.test(raw)
    ) {
      continue;
    }

    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const attrIdx = lines.findIndex((l) => /^[-—~:]/.test(l));

    if (attrIdx >= 1) {
      const quote = lines
        .slice(0, attrIdx)
        .join(" ")
        .replace(/^[“"']+|[”"']+$/g, "")
        .trim();
      const author = lines
        .slice(attrIdx)
        .join(" ")
        .replace(/^[-—~:\s]+/, "")
        .trim();
      if (quote && author) items.push({ quote, author });
    } else if (lines.length >= 2) {
      const quote = lines[0].replace(/^[“"']+|[”"']+$/g, "").trim();
      const author = lines
        .slice(1)
        .join(" ")
        .replace(/^[-—~:\s]+/, "")
        .trim();
      if (quote && author) items.push({ quote, author });
    } else if (lines.length === 1 && lines[0]) {
      const quote = lines[0].replace(/^[“"']+|[”"']+$/g, "").trim();
      if (quote) items.push({ quote, author: "Editorial Client" });
    }
  }

  return {
    heading: heading || undefined,
    items: items.length > 0 ? items : undefined,
  };
}

/**
 * Splits sanitized page HTML around the marker divs the GrapesJS "Project
 * Grid" and "Contact Form" blocks insert (`data-cms-block="..."`), so the
 * caller can render everything else as static HTML and swap in real,
 * server-rendered content (live portfolio data, the working contact form)
 * wherever a marker appears — GrapesJS's canvas only ever shows a
 * placeholder for these, it can't run a database query or a live form.
 *
 * Matching is done with a small tag-depth scan rather than a single regex
 * so a marker div survives being resized/restyled (or having other markup
 * nested inside it) in the editor without breaking the split.
 */
export function splitDynamicBlocks(
  html: string,
  options: DynamicBlockRenderOptions = {},
): PageSegment[] {
  const segments: PageSegment[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    let nextMatch: { index: number; block: DynamicCmsBlock } | null = null;

    for (const block of DYNAMIC_BLOCKS) {
      if (options.ignoreBlocks?.includes(block)) continue;
      const needle = `data-cms-block="${block}"`;
      const idx = html.indexOf(needle, cursor);
      if (idx !== -1 && (nextMatch === null || idx < nextMatch.index)) {
        nextMatch = { index: idx, block };
      }
    }

    if (!nextMatch) {
      segments.push({ type: "html", html: html.slice(cursor) });
      break;
    }

    const tagStart = html.lastIndexOf("<", nextMatch.index);

    if (tagStart === -1 || tagStart < cursor) {
      // Malformed / attribute not actually inside a tag — bail out safely.
      segments.push({ type: "html", html: html.slice(cursor) });
      break;
    }

    if (tagStart > cursor) {
      segments.push({ type: "html", html: html.slice(cursor, tagStart) });
    }

    const openTagEnd = html.indexOf(">", tagStart);

    if (openTagEnd === -1) {
      segments.push({ type: "html", html: html.slice(cursor) });
      break;
    }

    // Walk forward counting nested <div> / </div> pairs to find the matching
    // close tag, however much the block's inner markup has changed.
    let depth = 1;
    let scan = openTagEnd + 1;

    while (depth > 0 && scan < html.length) {
      const nextOpen = html.indexOf("<div", scan);
      const nextClose = html.indexOf("</div>", scan);

      if (nextClose === -1) {
        scan = html.length;
        break;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        scan = nextOpen + 4;
      } else {
        depth -= 1;
        scan = nextClose + 6;
      }
    }

    segments.push({
      type: "block",
      block: nextMatch.block,
      rawHtml: html.slice(tagStart, scan),
    });
    cursor = scan;
  }

  return segments;
}

/**
 * Renders the segments from splitDynamicBlocks, mapping each dynamic block
 * marker to real content via `renderBlock`. Empty/whitespace-only HTML
 * segments are skipped so they don't add stray empty wrapper elements.
 */
export function renderDynamicSegments(
  html: string,
  renderBlock: (
    block: DynamicCmsBlock,
    key: string,
    rawHtml?: string,
  ) => ReactNode,
  renderHtml: (html: string, key: string) => ReactNode,
  options: DynamicBlockRenderOptions = {},
): ReactNode[] {
  return splitDynamicBlocks(html, options)
    .map((segment, i) => {
      const key = `segment-${i}`;
      if (segment.type === "block") {
        return renderBlock(segment.block, key, segment.rawHtml);
      }
      return segment.html.trim() ? renderHtml(segment.html, key) : null;
    })
    .filter((node): node is ReactNode => node !== null);
}
