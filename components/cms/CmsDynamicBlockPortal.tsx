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
        const val = pair.slice(colonIdx + 1).trim();
        if (prop && val) {
          matched[prop] = val;
        }
      }
    });
  }

  if (el.style) {
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      const val = el.style.getPropertyValue(prop);
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

  const fontFamily = styles["font-family"] || parentStyles["font-family"] || undefined;
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

  const color = styles["color"] || parentStyles["color"] || undefined;

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
  const height = styles["height"] || parentStyles["height"] || undefined;
  const maxWidth = styles["max-width"] || parentStyles["max-width"] || (width ? "none" : undefined);

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
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(maxWidth ? { maxWidth } : {}),
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
  }> = [];

  const root = element.children.length > 0 ? element : (sourceEl || element);
  if (!root) return { styles, subtitles, customCards };

  const allDivs = Array.from(root.querySelectorAll<HTMLElement>("div"));
  const cardCandidates = allDivs.filter((el) => {
    if (el.querySelector("h1, h2, h3, h4, h5, h6")) return false;
    const txt = el.textContent || "";
    if (txt.includes("Edit Heading") || txt.includes("FEATURED WORKS CAROUSEL")) return false;
    const span = Array.from(el.children).find((c) => c.tagName === "SPAN");
    const hasView = txt.includes("View Artwork") || txt.includes("View");
    return Boolean(span) && hasView;
  });

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

    const standardTitles = ["book covers", "illustration", "fine art", "dark fantasy"];
    if (title && !standardTitles.includes(lower)) {
      customCards.push({
        id: key,
        title,
        subtitle: subtitle || undefined,
        slug: slug || "fine-art",
      });
    }
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
  const height = styles["height"] || undefined;
  const maxWidth = styles["max-width"] || (width ? "none" : undefined);
  const minHeight = styles["min-height"] || undefined;
  const fontFamily = styles["font-family"] || undefined;

  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(maxWidth ? { maxWidth } : {}),
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
        newTargets.push({
          element,
          key: `portal-carousel-${index}`,
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
      } else if (
        block === "gallery-carousel" ||
        block === "all-projects-carousel"
      ) {
        const { text, props: hProps, eyebrow } = extractHeadingInfo(
          element,
          sourceEl,
        );
        element.replaceChildren();
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

        const submitButtonBg =
          sourceEl.getAttribute("data-btn-bg") ||
          element.getAttribute("data-btn-bg") ||
          liveWrapper?.getAttribute("data-btn-bg") ||
          sourceEl.querySelector<HTMLElement>("[data-submit-btn]")?.style?.backgroundColor ||
          element.querySelector<HTMLElement>("[data-submit-btn]")?.style?.backgroundColor ||
          undefined;

        const submitButtonTextColor =
          sourceEl.getAttribute("data-btn-color") ||
          element.getAttribute("data-btn-color") ||
          liveWrapper?.getAttribute("data-btn-color") ||
          sourceEl.querySelector<HTMLElement>("[data-submit-btn]")?.style?.color ||
          element.querySelector<HTMLElement>("[data-submit-btn]")?.style?.color ||
          undefined;

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

        // Check if font-family was set on the section, heading, or data attribute
        const sectionStyles = extractElementStyles(sourceEl || element, parsedDoc);
        const headingEl = (sourceEl || element).querySelector("h1, h2, h3, h4, h5, h6");
        const headingInlineStyle = headingEl?.getAttribute("style") || "";
        const inlineFontFamilyMatch = headingInlineStyle.match(/font-family:\s*([^;]+)/i);

        const isDefaultSysFont = (f?: string) =>
          !f || f.includes("-apple-system") || f.includes("BlinkMacSystemFont");

        const hPropFont = hProps?.style?.fontFamily as string | undefined;
        const secFont = sectionStyles["font-family"];

        const headingFontFamily =
          inlineFontFamilyMatch?.[1]?.trim() ||
          element.getAttribute("data-heading-font") ||
          sourceEl.getAttribute("data-heading-font") ||
          (!isDefaultSysFont(hPropFont) ? hPropFont : undefined) ||
          (!isDefaultSysFont(secFont) ? secFont : undefined) ||
          hPropFont ||
          secFont ||
          undefined;

        if (hProps?.style && headingFontFamily) {
          hProps.style.fontFamily = headingFontFamily;
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

    // Automatic upgrade for existing homepage Featured Artwork Spotlight (#iq1iv)
    const spotlightEl =
      containerRef.current.querySelector<HTMLElement>("#iq1iv");
    if (spotlightEl && !spotlightEl.closest("[data-cms-block]")) {
      const prevSection = spotlightEl.previousElementSibling as HTMLElement | null;
      const isExplorePortfolios =
        prevSection &&
        (prevSection.textContent?.includes("Explore Portfolios") ||
          Boolean(
            prevSection.querySelector(
              'a[href="/book-covers"], a[href="/illustration"], a[href*="portfolio"]',
            ),
          ));

      if (isExplorePortfolios && prevSection) {
        const { text: hText, props: hProps } = extractHeadingInfo(prevSection, undefined, parsedDoc);
        spotlightEl.style.display = "none";
        prevSection.replaceChildren();
        prevSection.style.maxWidth = "100%";
        prevSection.style.padding = "0";
        newTargets.push({
          element: prevSection,
          key: "portal-auto-portfolio-spotlight",
          node: (
            <PortfolioSpotlightCarousel
              heading={hText}
              headingProps={hProps}
            />
          ),
        });
      } else {
        const { text: hText, props: hProps } = extractHeadingInfo(spotlightEl, undefined, parsedDoc);
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
            />
          ),
        });
      }
    }

    setTargets(newTargets);

    // Initialize intersection-observer counter animations for all counters in container
    const cleanupCounters = initCountersInContainer(containerRef.current);
    return () => {
      cleanupCounters();
    };
  }, [html, category, projectId]);

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
          font-size: 2.25rem !important;
          font-weight: 500 !important;
          margin: 0 0 1.25rem 0 !important;
          line-height: 1.15 !important;
          color: inherit;
          font-family: sans-serif !important;
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
