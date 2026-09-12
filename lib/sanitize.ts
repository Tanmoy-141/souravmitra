import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitizes HTML content using DOMPurify (allow-list based).
 */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    // Enable SVG but rely on DOMPurify's default attribute stripping
    // to remove dangerous attributes like 'onload' and 'onerror'.
    ADD_TAGS: ['svg'],
  });
}

/**
 * Validates CSS content to prevent dangerous imports, javascript URLs, etc.
 * Rejects content if it contains potentially malicious patterns.
 */
export function validateCss(css: string): string {
  const lowerCss = css.toLowerCase();
  
  // Basic dangerous pattern rejection
  const dangerousPatterns = [
    /expression\s*\(/,
    /javascript:/,
    /behavior\s*:/,
    /@import/,
    /url\s*\(\s*['"]?javascript:/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(lowerCss)) {
      throw new Error("Potentially malicious CSS detected");
    }
  }

  return css;
}
