/**
 * Animated Counter Engine for Sourav Mitra Portfolio & CMS.
 *
 * Provides smooth, reliable counting animations from 0 to target values
 * matching the original 2000ms duration and 50ms interval from Counter.tsx.
 *
 * Supports both explicit data-attributes (data-counter-target, data-counter-suffix)
 * and automatic parsing of inline text (e.g. "150+", "50+", "$10k", "99%").
 */

export interface ParsedCounter {
  prefix: string;
  target: number;
  suffix: string;
  duration: number;
}

/**
 * Extracts target number, prefix, and suffix from an element's data attributes
 * or by parsing its inner text content.
 */
export function parseCounterElement(el: HTMLElement): ParsedCounter {
  const targetAttr =
    el.getAttribute("data-counter-target") ||
    el.getAttribute("data-target") ||
    el.dataset.counterTarget ||
    el.dataset.target;

  const prefixAttr =
    el.getAttribute("data-counter-prefix") ||
    el.getAttribute("data-prefix") ||
    el.dataset.counterPrefix ||
    el.dataset.prefix;

  const suffixAttr =
    el.getAttribute("data-counter-suffix") ||
    el.getAttribute("data-suffix") ||
    el.dataset.counterSuffix ||
    el.dataset.suffix;

  const durationAttr =
    el.getAttribute("data-counter-duration") ||
    el.getAttribute("data-duration") ||
    el.dataset.counterDuration ||
    el.dataset.duration;

  const duration = durationAttr ? Math.max(300, parseInt(durationAttr, 10)) : 2000;

  // 1. Direct visible text content in the element (e.g. "8+", "150+", "250+", "$10k", "98%")
  // Direct text edits made on the CMS canvas reflect immediately in inner text and take precedence.
  const rawText = el.textContent?.trim() || "";
  const match = rawText.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);

  if (match) {
    const rawDigits = match[2].replace(/,/g, "");
    const parsedTextNum = parseFloat(rawDigits);
    if (!Number.isNaN(parsedTextNum)) {
      // If the parsed number from current text is 0, but data-counter-target has a non-zero value,
      // the counter is likely in the middle of an active animation (which started at 0).
      // Preserve the non-zero target in this situation.
      let target = parsedTextNum;
      if (parsedTextNum === 0 && targetAttr) {
        const fallbackTarget = parseFloat(targetAttr);
        if (!Number.isNaN(fallbackTarget) && fallbackTarget > 0) {
          target = fallbackTarget;
        }
      }

      const prefix =
        prefixAttr !== null && prefixAttr !== undefined && prefixAttr !== ""
          ? prefixAttr
          : match[1];
      const suffix =
        suffixAttr !== null && suffixAttr !== undefined && suffixAttr !== ""
          ? suffixAttr
          : (match[3] || "+");

      // Keep element attribute in sync with the parsed text
      el.setAttribute("data-counter-target", String(target));
      el.setAttribute("data-counter-suffix", suffix);
      if (prefix) el.setAttribute("data-counter-prefix", prefix);

      return {
        prefix,
        target,
        suffix,
        duration,
      };
    }
  }

  // 2. Fallback to explicit data-counter-target attribute if text doesn't contain digits
  if (targetAttr !== null && targetAttr !== undefined && targetAttr.trim() !== "") {
    const parsedNum = parseFloat(targetAttr);
    if (!Number.isNaN(parsedNum)) {
      return {
        prefix: prefixAttr ?? "",
        target: parsedNum,
        suffix: suffixAttr ?? "+",
        duration,
      };
    }
  }

  return {
    prefix: prefixAttr ?? "",
    target: 0,
    suffix: suffixAttr ?? "+",
    duration,
  };
}

/**
 * Runs the counter animation on an element, matching the original 2000ms duration
 * and 50ms interval from Counter.tsx.
 */
export function animateCounter(
  el: HTMLElement,
  options?: Partial<ParsedCounter>,
): () => void {
  const parsed =
    options?.target !== undefined
      ? { ...parseCounterElement(el), ...options }
      : parseCounterElement(el);

  const { prefix, target, suffix, duration } = parsed;

  if (target <= 0) return () => {};

  const interval = 50;
  const steps = Math.max(1, Math.round(duration / interval));
  const increment = Math.max(1, Math.ceil(target / steps));

  let current = 0;
  el.textContent = `${prefix}0${suffix}`;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = `${prefix}${target}${suffix}`;
      clearInterval(timer);
    } else {
      el.textContent = `${prefix}${current}${suffix}`;
    }
  }, interval);

  return () => clearInterval(timer);
}

/**
 * Attaches an IntersectionObserver to all counter elements inside a container.
 * When a counter scrolls into view, the animation triggers smoothly.
 */
export function initCountersInContainer(container: HTMLElement): () => void {
  if (!container) return () => {};

  // Find all elements marked as counters
  const candidateEls = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-counter-target], .counter-number, [data-counter="item"], .counter-item',
    ),
  );

  const targetsToAnimate = new Set<HTMLElement>();

  candidateEls.forEach((el) => {
    if (el.hasAttribute("data-counter-target") || el.classList.contains("counter-number")) {
      targetsToAnimate.add(el);
    } else {
      // It's a counter container (.counter-item)
      const numChild = el.querySelector<HTMLElement>(
        '[data-counter-target], .counter-number',
      );
      if (numChild) {
        targetsToAnimate.add(numChild);
      } else {
        // Find first child element containing digits
        const childWithDigits = Array.from(el.querySelectorAll<HTMLElement>("*")).find(
          (c) => /\d/.test(c.textContent || ""),
        );
        if (childWithDigits) {
          targetsToAnimate.add(childWithDigits);
        } else if (/\d/.test(el.textContent || "")) {
          targetsToAnimate.add(el);
        }
      }
    }
  });

  if (targetsToAnimate.size === 0) return () => {};

  // Store original target values on elements before resetting for animation
  targetsToAnimate.forEach((el) => {
    parseCounterElement(el);
  });

  if (typeof IntersectionObserver === "undefined") {
    targetsToAnimate.forEach((el) => animateCounter(el));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          animateCounter(el);
        }
      });
    },
    { threshold: 0.15 },
  );

  targetsToAnimate.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
  };
}
