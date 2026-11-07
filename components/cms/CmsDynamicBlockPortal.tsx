"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TestimonialsSection from "@/components/TestimonialsSection";
import ProjectCarousel from "@/components/ProjectCarousel";
import PortfolioSpotlightCarousel from "@/components/PortfolioSpotlightCarousel";
import ContactFormClient from "@/components/cms/ContactFormClient";
import ProjectGridSection from "@/components/cms/ProjectGridSection";
import PortfolioCollection from "@/components/PortfolioCollection";
import ClientsSection, {
  type ClientItem,
  type AnimationType,
  type AnimationSpeed,
  type AnimationDirection,
  type HoverEffect,
} from "@/components/ClientsSection";
import { parseTestimonialBlock } from "@/lib/dynamic-blocks";
import {
  ProjectShareBlock,
  ProjectCommentsBlock,
  ProjectLikeBlock,
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
  projectId?: string;
}

interface ExtractedHeadingInfo {
  text?: string;
  props?: {
    id?: string;
    className?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    fontSize?: string;
    letterSpacing?: string;
    textTransform?: React.CSSProperties["textTransform"];
    textAlign?: React.CSSProperties["textAlign"];
    color?: string;
    marginLeft?: string;
    marginRight?: string;
    width?: string;
    height?: string;
    maxWidth?: string;
    style?: React.CSSProperties;
  };
  eyebrow?: string | null;
}

interface ExtractedCardInfo {
  styles: Record<string, React.CSSProperties>;
  subtitles: Record<string, string>;
  customCards: Array<{
    id: string;
    title: string;
    subtitle?: string;
    slug?: string;
    coverImage?: string;
    href?: string;
  }>;
}



function extractElementStyles(
  el: HTMLElement | null | undefined,
  targetDoc?: Document | null,
): Record<string, string> {
  const matched: Record<string, string> = {};
  if (!el) return matched;

  if (targetDoc) {
    const id = el.id ? `#${el.id}` : null;
    const classList = Array.from(el.classList || []);

    const styleTags = Array.from(targetDoc.querySelectorAll("style"));
    for (const styleEl of styleTags) {
      const cssText = styleEl.textContent || "";
      if (!cssText.includes("{")) continue;
      const rules = cssText.split("}");
      for (const r of rules) {
        const parts = r.split("{");
        if (parts.length < 2) continue;
        const selector = parts[0].trim();
        const body = parts[1].trim();

        let isMatch = false;
        if (id && selector.includes(id)) {
          isMatch = true;
        } else if (classList.length > 0) {
          const selectorClasses = selector
            .split(".")
            .filter(Boolean)
            .map((c) => c.split(/[:\s,>]/)[0]);
          if (
            selectorClasses.length > 0 &&
            selectorClasses.every((c) => classList.includes(c))
          ) {
            isMatch = true;
          }
        }

        if (isMatch) {
          body.split(";").forEach((declaration) => {
            const [prop, val] = declaration.split(":").map((s) => s?.trim());
            if (prop && val) {
              matched[prop.toLowerCase()] = val;
            }
          });
        }
      }
    }
  }

  if (typeof document !== "undefined" && targetDoc !== document) {
    const id = el.id ? `#${el.id}` : null;
    const classList = Array.from(el.classList || []);

    const styleTags = Array.from(document.querySelectorAll("style"));
    for (const styleEl of styleTags) {
      const cssText = styleEl.textContent || "";
      if (!cssText.includes("{")) continue;
      const rules = cssText.split("}");
      for (const r of rules) {
        const parts = r.split("{");
        if (parts.length < 2) continue;
        const selector = parts[0].trim();
        const body = parts[1].trim();

        let isMatch = false;
        if (id && selector.includes(id)) {
          isMatch = true;
        } else if (classList.length > 0) {
          const selectorClasses = selector
            .split(".")
            .filter(Boolean)
            .map((c) => c.split(/[:\s,>]/)[0]);
          if (
            selectorClasses.length > 0 &&
            selectorClasses.every((c) => classList.includes(c))
          ) {
            isMatch = true;
          }
        }

        if (isMatch) {
          body.split(";").forEach((declaration) => {
            const [prop, val] = declaration.split(":").map((s) => s?.trim());
            if (prop && val) {
              matched[prop.toLowerCase()] = val;
            }
          });
        }
      }
    }
  }

  if (typeof window !== "undefined" && el.isConnected) {
    try {
      const comp = window.getComputedStyle(el);
      const propsToCheck = [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "textAlign",
        "textTransform",
        "color",
        "marginLeft",
        "marginRight",
        "marginTop",
        "marginBottom",
        "paddingLeft",
        "paddingRight",
        "paddingTop",
        "paddingBottom",
        "position",
        "top",
        "bottom",
        "left",
        "right",
        "transform",
        "width",
        "height",
        "minHeight",
        "maxWidth",
      ];
      const compRecord = comp as unknown as Record<string, string>;
      propsToCheck.forEach((prop) => {
        const val = compRecord[prop];
        const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
        if (
          val &&
          !matched[kebab] &&
          val !== "auto" &&
          val !== "0px" &&
          val !== "none" &&
          val !== "static"
        ) {
          matched[kebab] = val;
        }
      });
    } catch {
      // ignore
    }
  }

  // Parse inline style attribute directly (ensures accurate extraction across environments)
  const inlineStyleAttr = el.getAttribute?.("style");
  if (inlineStyleAttr) {
    inlineStyleAttr.split(";").forEach((pair) => {
      const colonIdx = pair.indexOf(":");
      if (colonIdx > 0) {
        const prop = pair.slice(0, colonIdx).trim().toLowerCase();
        const rawVal = pair.slice(colonIdx + 1).trim();
        const val = rawVal.replace(/\s*!important\s*$/i, "").trim();
        if (prop && val) {
          matched[prop] = val;
        }
      }
    });
  }

  if (el.style) {
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      const rawVal = el.style.getPropertyValue(prop);
      const val = rawVal ? rawVal.replace(/\s*!important\s*$/i, "").trim() : "";
      if (prop && val) {
        matched[prop.toLowerCase()] = val;
      }
    }
  }

  return matched;
}

function extractHeadingInfo(
  element: HTMLElement,
  sourceEl?: HTMLElement,
  doc?: Document | null,
): ExtractedHeadingInfo {
  const headingEl =
    element.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6") ||
    sourceEl?.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6");

  if (!headingEl) {
    return { eyebrow: null };
  }

  const text =
    headingEl.textContent?.replace(/\u00a0/g, " ").trim() || undefined;

  const styles = extractElementStyles(headingEl, doc);

  // Check parent wrapper if heading was placed inside a div
  const parentEl =
    headingEl.parentElement ||
    sourceEl?.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6")?.parentElement;
  const parentStyles = parentEl ? extractElementStyles(parentEl, doc) : {};

  const blockFont =
    element.getAttribute?.("data-heading-font") ||
    sourceEl?.getAttribute?.("data-heading-font") ||
    undefined;
  const blockColor =
    element.getAttribute?.("data-heading-color") ||
    sourceEl?.getAttribute?.("data-heading-color") ||
    undefined;

  const isDefaultSysFont = (f?: string) =>
    !f || f.includes("-apple-system") || f.includes("BlinkMacSystemFont");

  const rawFontFamily = styles["font-family"] || parentStyles["font-family"] || undefined;
  const fontFamily =
    (rawFontFamily && !isDefaultSysFont(rawFontFamily) ? rawFontFamily : undefined) ||
    blockFont ||
    rawFontFamily ||
    undefined;

  const fontWeight = styles["font-weight"] || parentStyles["font-weight"] || undefined;
  const fontStyle = styles["font-style"] || parentStyles["font-style"] || undefined;
  const fontSize = styles["font-size"] || undefined;
  const letterSpacing = styles["letter-spacing"] || undefined;
  const textTransform = (styles["text-transform"] || parentStyles["text-transform"]) as
    | React.CSSProperties["textTransform"]
    | undefined;

  let textAlign = (styles["text-align"] || parentStyles["text-align"]) as
    | React.CSSProperties["textAlign"]
    | undefined;
  if (
    !textAlign &&
    (parentStyles["justify-content"] === "center" ||
      parentStyles["margin-left"] === "auto" ||
      parentStyles["text-align"] === "center")
  ) {
    textAlign = "center";
  }

  const color = styles["color"] || parentStyles["color"] || blockColor || undefined;

  const position = (styles["position"] || parentStyles["position"]) as
    | React.CSSProperties["position"]
    | undefined;
  const top = styles["top"] || parentStyles["top"] || undefined;
  const bottom = styles["bottom"] || parentStyles["bottom"] || undefined;
  const left = styles["left"] || parentStyles["left"] || undefined;
  const right = styles["right"] || parentStyles["right"] || undefined;
  const transform = styles["transform"] || parentStyles["transform"] || undefined;

  const marginLeft =
    (styles["margin-left"] && styles["margin-left"] !== "0px" ? styles["margin-left"] : undefined) ||
    (parentStyles["margin-left"] && parentStyles["margin-left"] !== "0px" ? parentStyles["margin-left"] : undefined) ||
    (left && position === "relative" ? left : undefined);

  const marginRight =
    (styles["margin-right"] && styles["margin-right"] !== "0px" ? styles["margin-right"] : undefined) ||
    (parentStyles["margin-right"] && parentStyles["margin-right"] !== "0px" ? parentStyles["margin-right"] : undefined);

  const marginTop = styles["margin-top"] || parentStyles["margin-top"] || undefined;
  const marginBottom = styles["margin-bottom"] || parentStyles["margin-bottom"] || undefined;
  const paddingLeft = styles["padding-left"] || parentStyles["padding-left"] || undefined;
  const paddingRight = styles["padding-right"] || parentStyles["padding-right"] || undefined;

  const width = styles["width"] || parentStyles["width"] || undefined;
  const height = undefined;
  const maxWidth = styles["max-width"] || parentStyles["max-width"] || (width ? "100%" : undefined);

  const props = {
    id: headingEl.id || undefined,
    className: headingEl.className || undefined,
    fontFamily,
    fontWeight,
    fontStyle,
    fontSize,
    letterSpacing,
    textTransform,
    textAlign,
    color,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    paddingLeft,
    paddingRight,
    width,
    height,
    maxWidth,
    position,
    top,
    bottom,
    left,
    right,
    transform,
    style: {
      ...(fontFamily ? { fontFamily } : {}),
      ...(fontWeight ? { fontWeight } : {}),
      ...(fontSize ? { fontSize } : {}),
      ...(fontStyle ? { fontStyle } : {}),
      ...(letterSpacing ? { letterSpacing } : {}),
      ...(textTransform ? { textTransform } : {}),
      ...(textAlign ? { textAlign } : {}),
      ...(color ? { color } : {}),
      ...(position ? { position } : {}),
      ...(top ? { top } : {}),
      ...(bottom ? { bottom } : {}),
      ...(left ? { left } : {}),
      ...(right ? { right } : {}),
      ...(transform ? { transform } : {}),
      ...(marginLeft ? { marginLeft } : {}),
      ...(marginRight ? { marginRight } : {}),
      ...(marginTop ? { marginTop } : {}),
      ...(marginBottom ? { marginBottom } : {}),
      ...(paddingLeft ? { paddingLeft } : {}),
      ...(paddingRight ? { paddingRight } : {}),
      ...(width ? { width, maxWidth: "100%" } : {}),
      height: "auto",
      maxHeight: "none",
      maxWidth: "100%",
    },
  };

  const eyebrowEl =
    element.querySelector<HTMLElement>("[data-cms-eyebrow], .eyebrow") ||
    sourceEl?.querySelector<HTMLElement>("[data-cms-eyebrow], .eyebrow");

  let eyebrow: string | null = null;
  if (eyebrowEl && eyebrowEl.textContent?.trim()) {
    eyebrow = eyebrowEl.textContent.trim();
  } else {
    const prevSibling = headingEl.previousElementSibling as HTMLElement | null;
    if (
      prevSibling &&
      prevSibling.textContent?.trim() &&
      prevSibling.textContent.trim().length < 60
    ) {
      eyebrow = prevSibling.textContent.trim();
    }
  }

  return { text, props, eyebrow };
}

function extractCardStyles(
  element: HTMLElement,
  sourceEl?: HTMLElement,
  doc?: Document | null,
): ExtractedCardInfo {
  const styles: Record<string, React.CSSProperties> = {};
  const subtitles: Record<string, string> = {};
  const customCards: Array<{
    id: string;
    title: string;
    subtitle?: string;
    slug?: string;
    coverImage?: string;
    href?: string;
  }> = [];

  const root = element.children.length > 0 ? element : (sourceEl || element);
  if (!root) return { styles, subtitles, customCards };

  const allDivs = Array.from(root.querySelectorAll<HTMLElement>("div"));
  let cardCandidates = allDivs.filter((el) => {
    if (el.querySelector("h1, h2, h3, h4, h5, h6")) return false;
    const txt = el.textContent || "";
    if (txt.includes("Edit Heading") || txt.includes("FEATURED WORKS CAROUSEL")) return false;
    const span = Array.from(el.children).find((c) => c.tagName === "SPAN");
    const hasView = txt.includes("View Artwork") || txt.includes("View");
    return Boolean(span) && hasView;
  });

  // Fallback: if strict span/view filter didn't match, check for explicit data-card-tag or grid children
  if (cardCandidates.length === 0) {
    const explicitTagged = Array.from(root.querySelectorAll<HTMLElement>("[data-card-tag]"));
    if (explicitTagged.length > 0) {
      cardCandidates = explicitTagged;
    } else {
      const gridContainer = allDivs.find((d) => {
        const style = d.getAttribute("style") || "";
        const cls = d.getAttribute("class") || "";
        return (style.includes("grid-template-columns") || cls.includes("grid")) && !d.querySelector("h1, h2, h3, h4, h5, h6");
      });
      if (gridContainer) {
        cardCandidates = Array.from(gridContainer.children).filter((c): c is HTMLElement => c.tagName === "DIV");
      }
    }
  }

  cardCandidates.forEach((cardEl, idx) => {
    const spanTag = Array.from(cardEl.children).find((c) => c.tagName === "SPAN");
    const title = (spanTag?.textContent || "").trim();
    const pTags = Array.from(cardEl.querySelectorAll("p"));
    const subtitle =
      pTags
        .find((p) => !p.textContent?.includes("View"))
        ?.textContent?.trim() || "";

    let key = `card-${idx}`;
    let slug = "";
    const lower = title.toLowerCase();
    if (lower.includes("book") || lower.includes("cover")) {
      key = "book-covers";
      slug = "book-covers";
    } else if (lower.includes("illustrat")) {
      key = "illustration";
      slug = "illustration";
    } else if (lower.includes("fine") || lower.includes("art")) {
      key = "fine-art";
      slug = "fine-art";
    } else if (lower.includes("fantasy") || lower.includes("dark")) {
      key = "dark-fantasy";
      slug = "fine-art";
    } else if (title) {
      key = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      slug = key;
    }

    if (subtitle) {
      subtitles[key] = subtitle;
      if (cardEl.id) subtitles[cardEl.id] = subtitle;
    }

    const cardComputed = extractElementStyles(cardEl, doc);

    const width = cardComputed["width"] || undefined;
    const height = cardComputed["height"] || undefined;
    const minHeight = cardComputed["min-height"] || height;
    const maxWidth = cardComputed["max-width"] || (width ? "none" : undefined);
    const aspectRatio = cardComputed["aspect-ratio"] || undefined;

    const cardStyle: React.CSSProperties = {
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(minHeight ? { minHeight } : {}),
      ...(maxWidth ? { maxWidth } : {}),
      ...(aspectRatio ? { aspectRatio } : {}),
    };

    if (Object.keys(cardStyle).length > 0) {
      styles[key] = cardStyle;
      if (cardEl.id) styles[cardEl.id] = cardStyle;
      styles[`card-${idx}`] = cardStyle;
    }

    const cardTag = cardEl.getAttribute("data-card-tag") || title;
    const cardTitle = cardEl.getAttribute("data-card-title") || subtitle || title;
    const customImage = cardEl.getAttribute("data-card-image") || undefined;
    const customLink =
      cardEl.getAttribute("data-card-link") ||
      cardEl.querySelector("a")?.getAttribute("href") ||
      undefined;

    customCards.push({
      id: cardEl.id || key,
      title: cardTag || title || `Category ${idx + 1}`,
      subtitle: cardTitle || subtitle || undefined,
      slug: slug || "fine-art",
      coverImage: customImage,
      href: customLink || `/${slug || "fine-art"}`,
    });
  });

  return { styles, subtitles, customCards };
}

function extractBlockContainerStyles(
  element: HTMLElement,
  sourceEl?: HTMLElement,
  doc?: Document | null,
): React.CSSProperties {
  const target = element || sourceEl;
  if (!target) return {};
  const styles = extractElementStyles(target, doc);
  const width = styles["width"] || undefined;
  const minHeight = styles["min-height"] || undefined;
  const fontFamily = styles["font-family"] || undefined;

  return {
    ...(width ? { width, maxWidth: "100%" } : {}),
    ...(minHeight ? { minHeight } : {}),
    ...(fontFamily ? { fontFamily } : {}),
  };
}

export function CmsDynamicBlockPortal({
  html,
  category,
  className,
  projectId,
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
      element.style.height = "auto";
      element.style.maxHeight = "none";

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

        const { text: customHeading, props: hProps } = extractHeadingInfo(
          element,
          sourceEl,
          parsedDoc,
        );
        element.replaceChildren();
        newTargets.push({
          element,
          key: `portal-testimonial-${index}`,
          node: (
            <TestimonialsSection
              items={items}
              heading={heading || customHeading}
              headingProps={hProps}
            />
          ),
        });
      } else if (block === "project-carousel") {
        const { text, props: hProps } = extractHeadingInfo(
          element,
          sourceEl,
          parsedDoc,
        );
        const { styles: cardStyles, subtitles, customCards } = extractCardStyles(
          element,
          sourceEl,
          parsedDoc,
        );
        const containerStyles = extractBlockContainerStyles(
          element,
          sourceEl,
          parsedDoc,
        );

        const containerWidth =
          element.getAttribute("data-container-width") ||
          sourceEl?.getAttribute("data-container-width") ||
          undefined;

        const cardHeight =
          element.getAttribute("data-card-height") ||
          sourceEl?.getAttribute("data-card-height") ||
          undefined;

        const cardAspect =
          element.getAttribute("data-card-aspect") ||
          sourceEl?.getAttribute("data-card-aspect") ||
          undefined;

        const layoutMode =
          element.getAttribute("data-layout-mode") ||
          sourceEl?.getAttribute("data-layout-mode") ||
          undefined;

        const carouselData = {
          text,
          hProps,
          cardStyles,
          subtitles,
          customCards,
          containerStyles,
          containerWidth,
          cardHeight,
          cardAspect,
          layoutMode,
        };

        element.replaceChildren();
        element.style.height = "auto";
        element.style.minHeight = "auto";
        element.style.maxHeight = "none";
        element.style.border = "none";
        element.style.padding = "0";
        element.style.maxWidth = "100%";
        newTargets.push({
          element,
          key: `portal-carousel-${index}`,
          node: (
            <PortfolioSpotlightCarousel
              heading={carouselData.text}
              headingProps={carouselData.hProps}
              cardStyles={carouselData.cardStyles}
              containerStyles={carouselData.containerStyles}
              containerWidth={carouselData.containerWidth}
              cardHeight={carouselData.cardHeight}
              cardAspect={carouselData.cardAspect}
              layoutMode={carouselData.layoutMode}
              customSubtitles={carouselData.subtitles}
              customCategories={
                carouselData.customCards.length > 0
                  ? carouselData.customCards
                  : undefined
              }
            />
          ),
        });
      } else if (
        block === "gallery-carousel" ||
        block === "all-projects-carousel"
      ) {
        const { text, props: hProps, eyebrow } = extractHeadingInfo(
          element,
          sourceEl,
        );
        element.replaceChildren();
        element.style.height = "auto";
        element.style.minHeight = "auto";
        element.style.maxHeight = "none";
        element.style.border = "none";
        element.style.padding = "0";
        element.style.maxWidth = "100%";
        newTargets.push({
          element,
          key: `portal-gallery-carousel-${index}`,
          node: (
            <ProjectCarousel
              heading={text}
              headingProps={hProps}
              eyebrow={eyebrow}
            />
          ),
        });
      } else if (block === "contact-form") {
        // Always locate nodes strictly in the live DOM (containerRef.current or element)
        // to avoid referencing detached nodes from parsedDoc
        const liveWrapper =
          (element.classList?.contains("contact-page-wrapper") || element.getAttribute("data-component") === "contact-wrapper")
            ? element
            : (element.closest(".contact-page-wrapper, [data-component='contact-wrapper']") as HTMLElement | null);

        const liveCard =
          (liveWrapper ? liveWrapper.querySelector<HTMLElement>(".contact-card, [data-component='contact-card']") : null) ||
          element.querySelector<HTMLElement>(".contact-card, [data-component='contact-card']");

        const liveFormContainer =
          (element.classList?.contains("contact-form-container") ? element : null) ||
          element.querySelector<HTMLElement>(".contact-form-container") ||
          (liveWrapper ? liveWrapper.querySelector<HTMLElement>(".contact-form-container") : null) ||
          (liveCard && (liveCard.nextElementSibling as HTMLElement | null)) ||
          (!element.classList?.contains("contact-page-wrapper") ? element : null);

        const hasCard = Boolean(liveCard);
        // If a card exists alongside the form, target ONLY the form container so the
        // user's edited card HTML, custom colors, fonts and hover effects stay intact in the DOM.
        const targetEl = hasCard ? (liveFormContainer || element) : (liveWrapper || element);

        const cardTextColor =
          liveCard?.getAttribute("data-card-color") ||
          liveWrapper?.getAttribute("data-card-color") ||
          undefined;

        const cardBgColor =
          liveCard?.getAttribute("data-card-bg") ||
          liveWrapper?.getAttribute("data-card-bg") ||
          undefined;

        // Honor the card's active background and text colors without overwriting saved styles with stale fallbacks
        if (liveCard) {
          if (!liveCard.style.backgroundColor && cardBgColor) {
            liveCard.style.backgroundColor = cardBgColor;
          }
          if (!liveCard.style.color && cardTextColor) {
            liveCard.style.color = cardTextColor;
          }

          // Upgrade legacy letter social links in liveCard to crisp brand SVG icons
          const socialRow = liveCard.querySelector<HTMLElement>(".contact-social-icons-row");
          if (socialRow) {
            const hasSvgIcons = Boolean(socialRow.querySelector("svg"));
            const rawText = socialRow.textContent || "";
            const hasLegacyText = rawText.includes("Bē") || rawText.includes("ig") || rawText.includes("𝕏") || rawText.includes("P");
            if (!hasSvgIcons || hasLegacyText) {
              socialRow.innerHTML = `
                <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;">
                  <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;">
                  <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Threads" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;">
                  <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098c1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015c-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164c1.43 1.783 3.631 2.698 6.54 2.717c2.623-.02 4.358-.631 5.8-2.045c1.647-1.613 1.618-3.593 1.09-4.798c-.31-.71-.873-1.3-1.634-1.75c-.192 1.352-.622 2.446-1.284 3.272c-.886 1.102-2.14 1.704-3.73 1.79c-1.202.065-2.361-.218-3.259-.801c-1.063-.689-1.685-1.74-1.752-2.964c-.065-1.19.408-2.285 1.33-3.082c.88-.76 2.119-1.207 3.583-1.291a14 14 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757c-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.18c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388q.163.07.321.142c1.49.7 2.58 1.761 3.154 3.07c.797 1.82.871 4.79-1.548 7.158c-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69q-.362 0-.739.021c-1.836.103-2.98.946-2.916 2.143c.067 1.256 1.452 1.839 2.784 1.767c1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221"/></svg>
                </a>
                <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;">
                  <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M20.447 20.452H16.89v-5.569c0-1.328-.026-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.266 2.37 4.266 5.455v6.286zM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM3.555 20.452H7.12V9H3.555v11.452z"/></svg>
                </a>
                <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="X" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;">
                  <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                </a>
                <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;">
                  <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.161 9.429 7.62 11.19-.105-.95-.2-2.413.042-3.455.218-.937 1.407-5.963 1.407-5.963s-.36-.72-.36-1.782c0-1.669.968-2.915 2.171-2.915 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.567-.992 3.993-.283 1.193.599 2.165 1.775 2.165 2.13 0 3.768-2.245 3.768-5.486 0-2.868-2.061-4.873-5.006-4.873-3.411 0-5.416 2.56-5.416 5.204 0 1.031.397 2.138.893 2.739.098.118.112.221.083.341-.091.375-.293 1.193-.333 1.359-.052.219-.172.265-.398.159-1.487-.692-2.417-2.872-2.417-4.627 0-3.766 2.736-7.222 7.891-7.222 4.144 0 7.366 2.953 7.366 6.9 0 4.117-2.596 7.43-6.2 7.43-1.211 0-2.35-.629-2.741-1.371l-.745 2.84c-.269 1.039-1 2.34-1.49 3.133 1.122.347 2.312.535 3.55.535 6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                </a>
              `;
            }
          }
        }

        const firstNameLabel =
          sourceEl.querySelector("[data-label-first-name]")?.textContent?.trim() ||
          element.querySelector("[data-label-first-name]")?.textContent?.trim() ||
          undefined;
        const lastNameLabel =
          sourceEl.querySelector("[data-label-last-name]")?.textContent?.trim() ||
          element.querySelector("[data-label-last-name]")?.textContent?.trim() ||
          undefined;
        const emailLabel =
          sourceEl.querySelector("[data-label-email]")?.textContent?.trim() ||
          element.querySelector("[data-label-email]")?.textContent?.trim() ||
          undefined;
        const messageLabel =
          sourceEl.querySelector("[data-label-message]")?.textContent?.trim() ||
          element.querySelector("[data-label-message]")?.textContent?.trim() ||
          undefined;
        const submitButtonText =
          sourceEl.querySelector("[data-submit-btn]")?.textContent?.trim() ||
          element.querySelector("[data-submit-btn]")?.textContent?.trim() ||
          undefined;

        const subBtnEl =
          sourceEl.querySelector<HTMLElement>("[data-submit-btn], button[type='submit']") ||
          element.querySelector<HTMLElement>("[data-submit-btn], button[type='submit']");
        const subBtnStyles = subBtnEl ? extractElementStyles(subBtnEl, parsedDoc) : {};

        const explicitBtnBg =
          subBtnEl?.getAttribute("data-btn-bg") ||
          sourceEl.getAttribute("data-btn-bg") ||
          element.getAttribute("data-btn-bg") ||
          liveWrapper?.getAttribute("data-btn-bg") ||
          subBtnEl?.style?.backgroundColor ||
          subBtnStyles["background-color"] ||
          undefined;

        const submitButtonBg =
          explicitBtnBg && explicitBtnBg.trim() !== ""
            ? explicitBtnBg.trim()
            : undefined;

        const explicitBtnColor =
          subBtnEl?.getAttribute("data-btn-color") ||
          sourceEl.getAttribute("data-btn-color") ||
          element.getAttribute("data-btn-color") ||
          liveWrapper?.getAttribute("data-btn-color") ||
          subBtnEl?.style?.color ||
          subBtnStyles["color"] ||
          undefined;

        const submitButtonTextColor =
          explicitBtnColor && explicitBtnColor.trim() !== ""
            ? explicitBtnColor.trim()
            : undefined;

        const inputBorderColor =
          sourceEl.getAttribute("data-input-border") ||
          element.getAttribute("data-input-border") ||
          liveWrapper?.getAttribute("data-input-border") ||
          undefined;

        const roleEls = Array.from(
          (sourceEl || element).querySelectorAll("[data-role-option]"),
        );
        const roles =
          roleEls.length > 0
            ? roleEls
                .map((el) => el.textContent?.trim())
                .filter((t): t is string => Boolean(t))
            : undefined;

        // Replace mock inputs with the real interactive React contact form
        targetEl.replaceChildren();
        newTargets.push({
          element: targetEl,
          key: `portal-contact-${index}`,
          node: (
            <ContactFormClient
              renderMode={hasCard ? "form-only" : "full"}
              cardBg={cardBgColor}
              cardTextColor={cardTextColor}
              firstNameLabel={firstNameLabel}
              lastNameLabel={lastNameLabel}
              emailLabel={emailLabel}
              messageLabel={messageLabel}
              submitButtonText={submitButtonText}
              submitButtonBg={submitButtonBg}
              submitButtonTextColor={submitButtonTextColor}
              inputBorderColor={inputBorderColor}
              roles={roles}
            />
          ),
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
        // Guard against nested blocks: if an inner clients-section is nested inside an outer one, skip the inner one
        if (
          element.parentElement?.closest(
            '[data-cms-block="clients-section"], [data-cms-block="client-logos"]',
          )
        ) {
          return;
        }

        const rawAnimType =
          element.getAttribute("data-anim-type") ||
          sourceEl.getAttribute("data-anim-type");
        const animType: AnimationType =
          rawAnimType === "fade" ||
          rawAnimType === "pulse" ||
          rawAnimType === "float" ||
          rawAnimType === "none"
            ? rawAnimType
            : "marquee";

        const rawSpeed =
          element.getAttribute("data-anim-speed") ||
          sourceEl.getAttribute("data-anim-speed");
        const animSpeed: AnimationSpeed =
          rawSpeed === "slow" || rawSpeed === "fast" ? rawSpeed : "normal";

        const rawDir =
          element.getAttribute("data-anim-direction") ||
          sourceEl.getAttribute("data-anim-direction");
        const animDirection: AnimationDirection =
          rawDir === "right" ? "right" : "left";

        const rawPause =
          element.getAttribute("data-anim-pause") ||
          sourceEl.getAttribute("data-anim-pause");
        const pauseOnHover = rawPause !== "false";

        const rawHover =
          element.getAttribute("data-hover-effect") ||
          sourceEl.getAttribute("data-hover-effect");
        const hoverEffect: HoverEffect =
          rawHover === "glow" || rawHover === "brightness" || rawHover === "none"
            ? rawHover
            : "scale";

        // Extract heading text and typography properties (font-family, font-size, etc.)
        const { text: hText, props: hProps } = extractHeadingInfo(
          element,
          sourceEl,
          parsedDoc,
        );

        const heading =
          element.getAttribute("data-heading") ||
          sourceEl.getAttribute("data-heading") ||
          hText ||
          "Clients";

        // Check if font-family or color was set on the section, heading, or data attribute
        const sectionStyles = extractElementStyles(sourceEl || element, parsedDoc);
        const headingEl = (sourceEl || element).querySelector("h1, h2, h3, h4, h5, h6");
        const headingInlineStyle = headingEl?.getAttribute("style") || "";
        const inlineFontFamilyMatch = headingInlineStyle.match(/font-family:\s*([^;]+)/i);
        const inlineColorMatch = headingInlineStyle.match(/(?:^|;\s*)color:\s*([^;]+)/i);

        const isDefaultSysFont = (f?: string) =>
          !f || f.includes("-apple-system") || f.includes("BlinkMacSystemFont");

        const hPropFont = hProps?.style?.fontFamily as string | undefined;
        const secFont = sectionStyles["font-family"];

        const headingFontFamily =
          inlineFontFamilyMatch?.[1]?.replace(/\s*!important\s*$/i, "")?.trim() ||
          element.getAttribute("data-heading-font") ||
          sourceEl.getAttribute("data-heading-font") ||
          (!isDefaultSysFont(hPropFont) ? hPropFont : undefined) ||
          (!isDefaultSysFont(secFont) ? secFont : undefined) ||
          hPropFont ||
          secFont ||
          undefined;

        const headingColor =
          inlineColorMatch?.[1]?.replace(/\s*!important\s*$/i, "")?.trim() ||
          element.getAttribute("data-heading-color") ||
          sourceEl.getAttribute("data-heading-color") ||
          hProps?.color ||
          (hProps?.style?.color as string) ||
          sectionStyles["color"] ||
          undefined;

        if (hProps) {
          if (!hProps.style) hProps.style = {};
          if (headingFontFamily) hProps.style.fontFamily = headingFontFamily;
          if (headingColor) {
            hProps.color = headingColor;
            hProps.style.color = headingColor;
          }
        }

        // Check if an inner divider was dropped inside this section or immediately adjacent
        const hasInnerDivider = Boolean(
          sourceEl.querySelector("hr") ||
          element.querySelector("hr") ||
          sourceEl.querySelector('[data-block="divider-block"]') ||
          element.querySelector('[data-block="divider-block"]') ||
          sourceEl.querySelector(".divider, .c6304, .c6307") ||
          element.querySelector(".divider, .c6304, .c6307") ||
          sourceEl.innerHTML?.includes("<hr") ||
          element.innerHTML?.includes("<hr"),
        );

        // Extract custom logos: first check data-clients JSON attribute, then fallback to img tags
        let extractedClients: ClientItem[] = [];
        const rawClientsAttr =
          element.getAttribute("data-clients") ||
          sourceEl.getAttribute("data-clients");
        if (rawClientsAttr) {
          try {
            const parsed = JSON.parse(rawClientsAttr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const seenNames = new Map<string, ClientItem>();
              for (const item of parsed) {
                if (!item?.logo || !item?.name) continue;
                const nameKey = String(item.name).trim().toLowerCase();
                seenNames.set(nameKey, {
                  name: String(item.name).trim(),
                  logo: String(item.logo).trim(),
                  href: item.href ? String(item.href) : undefined,
                });
              }
              const byName = Array.from(seenNames.values());
              const seenLogos = new Set<string>();
              extractedClients = byName.filter((item) => {
                if (seenLogos.has(item.logo)) return false;
                seenLogos.add(item.logo);
                return true;
              });
            }
          } catch {
            // fallback to parsing img tags
          }
        }

        if (extractedClients.length === 0) {
          const imgEls = Array.from((sourceEl || element).querySelectorAll("img"));
          const rawParsed: ClientItem[] = imgEls
            .map((img) => ({
              name: img.getAttribute("alt")?.trim() || "Client Logo",
              logo: img.getAttribute("src")?.trim() || "",
            }))
            .filter((c) => Boolean(c.logo));

          const seenNames = new Map<string, ClientItem>();
          for (const item of rawParsed) {
            seenNames.set(item.name.toLowerCase(), item);
          }
          const byName = Array.from(seenNames.values());
          const seenLogos = new Set<string>();
          extractedClients = byName.filter((item) => {
            if (seenLogos.has(item.logo)) return false;
            seenLogos.add(item.logo);
            return true;
          });
        }

        // Extract container styles (width, height, minHeight, padding)
        const containerStyles = extractBlockContainerStyles(
          element,
          sourceEl,
          parsedDoc,
        );

        // Extract custom logo height from attribute, inline style, or img tag
        const firstImg = (sourceEl || element).querySelector("img");
        const rawLogoHeight =
          element.getAttribute("data-logo-height") ||
          sourceEl.getAttribute("data-logo-height") ||
          firstImg?.style?.height ||
          (firstImg?.getAttribute("style")?.match(/height:\s*([^;]+)/)?.[1]) ||
          undefined;

        // Extract custom section height from attribute, container styles, or inline style
        const rawSectionHeight =
          element.getAttribute("data-section-height") ||
          sourceEl.getAttribute("data-section-height") ||
          containerStyles.height ||
          containerStyles.minHeight ||
          (element.style?.height ? element.style.height : undefined) ||
          undefined;

        element.replaceChildren();

        newTargets.push({
          element,
          key: `portal-clients-${index}`,
          node: (
            <>
              {hasInnerDivider && (
                <div
                  className="w-full max-w-275 mx-auto py-10 px-4 box-border"
                  style={{
                    width: "100%",
                    maxWidth: "1100px",
                    margin: "0 auto",
                    padding: "2.5rem 0",
                    boxSizing: "border-box",
                  }}
                >
                  <hr
                    className="border-0 border-t border-white/15 m-0"
                    style={{
                      border: "none",
                      borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                      margin: 0,
                    }}
                  />
                </div>
              )}
              <ClientsSection
                heading={heading}
                headingProps={hProps}
                fontFamily={headingFontFamily}
                clients={extractedClients.length > 0 ? extractedClients : undefined}
                animationType={animType}
                animationSpeed={animSpeed}
                animationDirection={animDirection}
                pauseOnHover={pauseOnHover}
                hoverEffect={hoverEffect}
                logoHeight={rawLogoHeight}
                sectionHeight={rawSectionHeight}
                style={containerStyles}
              />
            </>
          ),
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
        const blockProjectId =
          element.getAttribute("data-project-id") ||
          sourceEl.getAttribute("data-project-id") ||
          projectId;
        newTargets.push({
          element,
          key: `portal-project-comments-${index}`,
          node: <ProjectCommentsBlock projectId={blockProjectId} />,
        });
      } else if (block === "project-like" || block === "project-appreciation") {
        element.replaceChildren();
        const blockProjectId =
          element.getAttribute("data-project-id") ||
          sourceEl.getAttribute("data-project-id") ||
          projectId;
        newTargets.push({
          element,
          key: `portal-project-like-${index}`,
          node: <ProjectLikeBlock projectId={blockProjectId} />,
        });
      } else if (
        block === "portfolio-spotlight" ||
        block === "featured-spotlight"
      ) {
        const { text, props: hProps } = extractHeadingInfo(
          element,
          sourceEl,
          parsedDoc,
        );
        const { styles: cardStyles, subtitles, customCards } = extractCardStyles(
          element,
          sourceEl,
          parsedDoc,
        );
        const containerStyles = extractBlockContainerStyles(
          element,
          sourceEl,
          parsedDoc,
        );
        const carouselData = {
          text,
          hProps,
          cardStyles,
          subtitles,
          customCards,
          containerStyles,
        };

        element.replaceChildren();
        element.style.height = "auto";
        element.style.minHeight = "auto";
        element.style.maxHeight = "none";
        element.style.border = "none";
        element.style.padding = "0";
        element.style.maxWidth = "100%";
        newTargets.push({
          element,
          key: `portal-portfolio-spotlight-${index}`,
          node: (
            <PortfolioSpotlightCarousel
              heading={carouselData.text}
              headingProps={carouselData.hProps}
              cardStyles={carouselData.cardStyles}
              containerStyles={carouselData.containerStyles}
              customSubtitles={carouselData.subtitles}
              customCategories={
                carouselData.customCards.length > 0
                  ? carouselData.customCards
                  : undefined
              }
            />
          ),
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

    // Safety check for legacy #iq1iv element: only upgrade if no explicit project-carousel exists
    const hasCarouselBlock = containerRef.current.querySelector(
      '[data-cms-block="project-carousel"], [data-cms-block="portfolio-spotlight"]',
    );
    const spotlightEl =
      containerRef.current.querySelector<HTMLElement>("#iq1iv");
    if (spotlightEl && !hasCarouselBlock && !spotlightEl.closest("[data-cms-block]")) {
      const { text: hText, props: hProps } = extractHeadingInfo(spotlightEl, undefined, parsedDoc);
      const { styles: cardStyles, subtitles, customCards } = extractCardStyles(
        spotlightEl,
        undefined,
        parsedDoc,
      );
      spotlightEl.replaceChildren();
      spotlightEl.style.maxWidth = "100%";
      spotlightEl.style.padding = "0";
      newTargets.push({
        element: spotlightEl,
        key: "portal-auto-portfolio-spotlight",
        node: (
          <PortfolioSpotlightCarousel
            heading={hText}
            headingProps={hProps}
            cardStyles={cardStyles}
            customSubtitles={subtitles}
            customCategories={customCards.length > 0 ? customCards : undefined}
          />
        ),
      });
    }

    setTargets(newTargets);

    // Hero Section Scroll Effect (Wix-style Fixed Background Parallax Window)
    const heroEl = containerRef.current.querySelector<HTMLElement>(
      '#ivkb, [data-hero-section="true"], .hero-reveal-container, section.c1504',
    );
    if (heroEl) {
      heroEl.classList.add("hero-reveal-active");
      // Remove any counter text from hero section
      heroEl.querySelectorAll(".hero-tagline, p").forEach((el) => {
        if (el.textContent?.includes("550+ covers")) {
          el.remove();
        }
      });
    }

    // Initialize intersection-observer counter animations for all counters in container
    const cleanupCounters = initCountersInContainer(containerRef.current);
    return () => {
      cleanupCounters();
    };
  }, [html, category, projectId]);

  return (
    <>
      <style>{`
        /* Hero Section Scroll Effect (Wix-style Fixed Background Parallax Window) */
        .hero-reveal-container,
        .hero-reveal-active,
        #ivkb,
        [data-hero-section="true"] {
          position: relative !important;
          width: 100% !important;
          height: 480px !important;
          min-height: 460px !important;
          max-height: 540px !important;
          overflow: hidden !important;
          clip-path: inset(0) !important;
          -webkit-clip-path: inset(0) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          box-sizing: border-box !important;
          padding: 3rem 1.5rem !important;
        }
        .hero-reveal-container img,
        .hero-reveal-active img,
        #ivkb img,
        #ifjq,
        [data-hero-section="true"] img,
        .hero-fixed-bg {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          width: 100dvw !important;
          height: 100vh !important;
          height: 100dvh !important;
          min-height: 100vh !important;
          min-height: 100dvh !important;
          max-height: none !important;
          object-fit: cover !important;
          object-position: center center !important;
          pointer-events: none !important;
          z-index: 0 !important;
          transform: none !important;
          will-change: auto !important;
        }
        .hero-reveal-container .hero-overlay,
        .hero-reveal-active #iuth,
        #ivkb #iuth,
        #iuth,
        [data-hero-section="true"] .hero-overlay,
        .hero-fixed-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          width: 100dvw !important;
          height: 100vh !important;
          height: 100dvh !important;
          min-height: 100vh !important;
          min-height: 100dvh !important;
          background: rgba(0, 0, 0, 0.45) !important;
          pointer-events: none !important;
          z-index: 1 !important;
        }
        .hero-reveal-container .hero-content,
        .hero-reveal-active #ibak,
        #ivkb #ibak,
        #ibak,
        [data-hero-section="true"] .hero-content {
          position: relative !important;
          z-index: 2 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          max-width: 900px !important;
          margin: 0 auto !important;
          width: 100% !important;
        }

        @media (max-width: 768px) {
          .hero-reveal-container,
          .hero-reveal-active,
          #ivkb,
          [data-hero-section="true"] {
            position: relative !important;
            width: 100% !important;
            height: 480px !important;
            min-height: 450px !important;
            max-height: 520px !important;
            padding: 4.5rem 1.5rem 2rem 1.5rem !important;
            overflow: hidden !important;
            clip-path: inset(0) !important;
            -webkit-clip-path: inset(0) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .hero-reveal-container img,
          .hero-reveal-active img,
          #ivkb img,
          #ifjq,
          [data-hero-section="true"] img,
          .hero-fixed-bg {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            width: 100dvw !important;
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            max-height: none !important;
            object-fit: cover !important;
            object-position: center center !important;
            pointer-events: none !important;
            z-index: 0 !important;
            transform: none !important;
            will-change: auto !important;
          }
          .hero-reveal-container .hero-overlay,
          .hero-reveal-active #iuth,
          #ivkb #iuth,
          #iuth,
          [data-hero-section="true"] .hero-overlay,
          .hero-fixed-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            width: 100dvw !important;
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            background: rgba(0, 0, 0, 0.45) !important;
            pointer-events: none !important;
            z-index: 1 !important;
          }

          :where(.hero-reveal-container, .hero-reveal-active, [data-hero-section="true"], #ivkb) :where(h1, #iznl) {
            font-family: 'stingray', 'Stingray', 'Playfair Display', cursive, serif !important;
            font-size: clamp(3rem, 11vw, 4.5rem) !important;
            line-height: 1.15 !important;
            white-space: nowrap !important;
            margin-bottom: 1.25rem !important;
            margin-top: 0 !important;
            color: #ffffff !important;
            text-shadow: 0 4px 16px rgba(0, 0, 0, 0.6) !important;
          }

          :where(.hero-reveal-container, .hero-reveal-active, [data-hero-section="true"], #ivkb) :where(button, a, #if3pf) {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0.85rem 2.25rem !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.18em !important;
            text-transform: uppercase !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4) !important;
            border-radius: 2px !important;
            margin-top: 0.5rem !important;
            text-decoration: none !important;
          }

          /* Prevent and reset CMS free-drag pixel widths, heights, and offsets on mobile */
          [data-cms-block] h2,
          [data-cms-block] h3,
          .c3605,
          #i6el2 {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            font-size: clamp(1.25rem, 5.5vw, 1.85rem) !important;
            line-height: 1.25 !important;
            max-width: 100% !important;
          }

          #cms-page-content [style*="top:"],
          #cms-page-content [style*="bottom:"],
          #cms-page-content [style*="left:"],
          #cms-page-content [style*="right:"] {
            top: auto !important;
            bottom: auto !important;
            left: auto !important;
            right: auto !important;
          }

          #cms-page-content p {
            max-width: 100% !important;
            width: auto !important;
            height: auto !important;
          }
        }

        [data-cms-block] {
          border: none !important;
        }
        .counter-item {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .contact-page-wrapper,
        [data-component="contact-wrapper"] {
          width: 100% !important;
          max-width: 960px !important;
          margin: 2rem auto !important;
          padding: 1rem !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          gap: 2rem !important;
          justify-content: center !important;
          align-items: stretch !important;
        }
        .contact-card,
        [data-component="contact-card"] {
          color: #000000;
          width: 100% !important;
          max-width: 340px !important;
          min-width: 280px !important;
          padding: 2.5rem 2.25rem !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          border-radius: 0px !important;
          flex: 0 1 340px !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, filter 0.35s ease !important;
          will-change: transform, box-shadow;
          cursor: pointer !important;
        }
        .contact-card h1 {
          font-size: 2.25rem;
          font-weight: 500;
          margin: 0 0 1.25rem 0 !important;
          line-height: 1.15;
          color: inherit;
          font-family: inherit;
        }
        .contact-card p,
        .contact-card div {
          font-size: 0.85rem !important;
          line-height: 1.6 !important;
          color: inherit;
        }
        .contact-card a[href^="mailto:"] {
          font-size: 0.85rem !important;
          color: inherit;
          text-decoration: none !important;
          display: inline-block !important;
          margin-bottom: 1.25rem !important;
        }
        .contact-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 20px 40px -10px rgba(255, 255, 255, 0.22), 0 0 30px rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.35) !important;
        }
        .contact-card[data-card-hover="scale"]:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 20px 40px -10px rgba(255, 255, 255, 0.22), 0 0 30px rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.35) !important;
        }
        .contact-card[data-card-hover="glow"]:hover {
          transform: none !important;
          box-shadow: 0 0 40px 4px rgba(255, 255, 255, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.5) !important;
        }
        .contact-card[data-card-hover="none"]:hover {
          transform: none !important;
          box-shadow: none !important;
        }
        .contact-form-container,
        [data-cms-block="contact-form"]:not(.contact-page-wrapper):not([data-component="contact-wrapper"]) {
          width: 100% !important;
          max-width: 450px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
          box-sizing: border-box !important;
          justify-content: center !important;
          flex: 1 1 380px !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
          will-change: transform, box-shadow;
        }
        .contact-form-container:hover {
          transform: translateY(-4px) !important;
        }
        .contact-form-container input:hover,
        .contact-form-container textarea:hover,
        .contact-form-container input:focus,
        .contact-form-container textarea:focus {
          border-color: #ffffff !important;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.28) !important;
        }
        .contact-social-icon {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease !important;
          will-change: transform;
        }
        .contact-social-icon:hover {
          transform: translateY(-3px) scale(1.22) !important;
          opacity: 0.95 !important;
          box-shadow: 0 4px 14px rgba(255, 255, 255, 0.35) !important;
        }
        .contact-form-container button[type="submit"],
        [data-submit-btn] {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, filter 0.25s ease !important;
          cursor: pointer !important;
        }
        .contact-form-container button[type="submit"]:hover,
        [data-submit-btn]:hover {
          transform: translateY(-2.5px) scale(1.01) !important;
          filter: brightness(1.12) !important;
          box-shadow: 0 10px 25px -4px rgba(255, 255, 255, 0.35), 0 0 15px rgba(255, 255, 255, 0.15) !important;
        }
        @media (max-width: 768px) {
          [data-cms-block],
          [data-gjs-type],
          .gjs-row,
          .gjs-cell {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          [data-cms-block] img {
            max-width: 100% !important;
            height: auto !important;
          }
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
