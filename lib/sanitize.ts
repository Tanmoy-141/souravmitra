import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content using DOMPurify (allow-list based).
 * SVG profile is intentionally disabled to reduce attack surface.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: [
      "class",
      "id",
      "style",
      "target",
      "rel",
      "width",
      "height",
      "data-cms-block",
      "data-testimonial-quote",
      "data-testimonial-author",
    ],
    // Block dangerous tags that could slip through
    FORBID_TAGS: ["form", "input", "textarea", "select"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}

/**
 * Sanitizes CSS for use within a <style> tag by applying
 * both content-level sanitization and breakout prevention.
 */
export function safeCssForStyleTag(css: string): string {
  // 1. CSS-level sanitization (blocks dangerous protocols, javascript:, expression(), etc.)
  const sanitized = sanitizeCss(css);
  // 2. Prevent </style> tag breakout in SSR HTML
  return sanitized.replace(/<\/style/gi, "<\\/style");
}

/**
 * Validates CSS content to prevent dangerous script execution while
 * allowing legitimate styling, fonts, and background images.
 */
export function sanitizeCss(css: string): string {
  const dangerousPatterns = [
    /@import\b/i,
    /@charset\b/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /expression\s*\(/i,
    /url\s*\(\s*['"]?\s*(?:javascript|vbscript):/i,
    /-moz-binding/i,
    /-webkit-binding/i,
    /behavior\s*:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(css)) {
      return "/* Blocked: dangerous CSS pattern detected */";
    }
  }

  return css;
}

/**
 * Validates that a URL uses a safe scheme.
 * Allows: https://, http://, relative paths (/...), and mailto:
 * Blocks: javascript:, data:, vbscript:, etc.
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^(https?:\/\/|\/(?!\/)|mailto:)/i.test(trimmed);
}

/**
 * Creates a URL-friendly slug from a string.
 */
export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
