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
    /url\s*\(\s*['"]?(?:javascript|vbscript)\s*:/i,
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
 * Allows: https://, http://, relative paths (/...), mailto:, and in-page anchors (#...).
 * Blocks: javascript:, vbscript:, data:, protocol-relative //, and control characters.
 */
export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Disallow control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return false;
  // Disallow dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) return false;
  // Disallow protocol-relative URLs (//example.com or /\example.com)
  if (/^[/\\]{2}/.test(trimmed)) return false;
  // Allow root-relative paths like /path or /
  if (/^\/[^/\\]/.test(trimmed) || trimmed === "/") return true;
  // Allow in-page hash anchors like #contact
  if (/^#[a-zA-Z0-9_-]+$/.test(trimmed)) return true;
  // Allow safe absolute protocols: http, https, mailto
  return /^(https?:\/\/|mailto:)/i.test(trimmed);
}

/**
 * Returns a guaranteed safe URL or falls back to a safe fallback (default: "#").
 */
export function safeUrlOrFallback(url: unknown, fallback = "#"): string {
  return typeof url === "string" && isSafeUrl(url) ? url.trim() : fallback;
}

/**
 * Sanitizes page slug input by removing any protocol schemes, normalizing slashes,
 * and restricting to safe URL path characters.
 */
export function sanitizeSlugInput(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trimStart();

  if (trimmed === "/" || trimmed === "") {
    return trimmed;
  }

  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:/, "");
  const normalized = withoutScheme.replace(/^\/+/, "");
  const safe = normalized.replace(/[^a-zA-Z0-9\-._~/]/g, "");

  return safe;
}

/**
 * Validates that an image or favicon URL uses a safe scheme.
 * Allows: https://, http://, relative paths (/...), and base64 image data URLs.
 * Blocks: javascript:, vbscript:, non-image data URLs, etc.
 */
export function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return false;
  if (/^(javascript|vbscript):/i.test(trimmed)) return false;
  if (/^[/\\]{2}/.test(trimmed)) return false;
  if (/^\/[^/\\]/.test(trimmed) || trimmed === "/") return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^data:image\/(?:png|jpeg|jpg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/i.test(
    trimmed
  );
}

export const isSafeFaviconUrl = isSafeImageUrl;

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

/**
 * Creates a URL-friendly path slug supporting nested route segments (e.g. fine-art/04624c3f or template/fine-art).
 */
export function sanitizePathSlug(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "/") return "/";
  return trimmed
    .toLowerCase()
    .split("/")
    .map((segment) =>
      segment
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
    .join("/");
}

/**
 * Validates and sanitizes a CSS color value (hex, rgb/rgba, hsl/hsla, or safe named colors).
 * Uses linear deterministic parsing to prevent regular expression denial of service (ReDoS).
 * Falls back to "#FFFFFF" if invalid.
 */
export function sanitizeColor(color: unknown, fallback = "#FFFFFF"): string {
  if (typeof color !== "string") return fallback;
  const trimmed = color.trim();
  if (!trimmed || trimmed.length > 100) return fallback;

  // Hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA (checked linearly without backtracking)
  if (/^#[0-9a-fA-F]+$/.test(trimmed)) {
    const len = trimmed.length;
    if (len === 4 || len === 5 || len === 7 || len === 9) {
      return trimmed;
    }
    return fallback;
  }

  // Standard CSS safe keywords
  const safeNamedColors = new Set([
    "white",
    "black",
    "gold",
    "silver",
    "ivory",
    "gray",
    "grey",
    "transparent",
    "inherit",
    "currentcolor",
  ]);
  if (safeNamedColors.has(trimmed.toLowerCase())) {
    return trimmed.toLowerCase();
  }

  // Validates rgb/rgba/hsl/hsla functions deterministically without nested quantifiers
  const match = trimmed.match(/^(rgba?|hsla?)\((.+)\)$/i);
  if (match) {
    const content = match[2].trim();
    // Allow only numeric digits, comma, period, percent, slash, and whitespace
    if (/^[0-9.,%/\s]+$/.test(content)) {
      const parts = content.includes(",")
        ? content.split(",")
        : content.replace(/\//g, " ").trim().split(/\s+/);

      if (parts.length === 3 || parts.length === 4) {
        const allValid = parts.every((p) => {
          const part = p.trim();
          return /^\d+(?:\.\d+)?%?$/.test(part);
        });
        if (allValid) {
          return trimmed;
        }
      }
    }
  }

  return fallback;
}

