export interface CustomFont {
  id: string;
  family: string;
  type: "google" | "url" | "upload";
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype" | "otf";
  category?: "serif" | "sans-serif" | "display" | "handwriting" | "monospace";
  createdAt: number;
}

/** Sanitize font family name: strip quotes, semicolons, brackets, and limit length */
export function sanitizeFontFamily(name: string): string {
  return name
    .replace(/['"`;\\{}]/g, "")
    .trim()
    .slice(0, 80);
}

/** Construct standard Google Fonts API v2 stylesheet URL */
export function buildGoogleFontUrl(familyName: string): string {
  const clean = sanitizeFontFamily(familyName);
  const encoded = encodeURIComponent(clean).replace(/%20/g, "+");
  // Request multiple common weights with font-display: swap
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,300..900;1,300..900&display=swap`;
}

/** Generate a clean @font-face CSS rule for uploaded font files */
export function formatFontFaceCss(font: CustomFont): string {
  if (font.type !== "upload") return "";
  const cleanFamily = sanitizeFontFamily(font.family);
  let format = font.format || "woff2";
  if (format === "otf") {
    format = "opentype";
  } else if (!font.format) {
    const lowerUrl = font.url.toLowerCase();
    if (lowerUrl.includes(".woff2") || lowerUrl.includes("font/woff2")) format = "woff2";
    else if (lowerUrl.includes(".woff") || lowerUrl.includes("font/woff")) format = "woff";
    else if (lowerUrl.includes(".ttf") || lowerUrl.includes("font/ttf") || lowerUrl.includes("truetype")) format = "truetype";
    else if (lowerUrl.includes(".otf") || lowerUrl.includes("font/otf") || lowerUrl.includes("opentype")) format = "opentype";
  }

  const srcFormat =
    format === "opentype"
      ? `url('${font.url}') format('opentype'), url('${font.url}') format('truetype')`
      : `url('${font.url}') format('${format}')`;

  return `@font-face {
  font-family: '${cleanFamily}';
  src: ${srcFormat};
  font-display: swap;
  font-style: normal;
}`;
}

/** Curated recommended artistic and editorial fonts for Sourav Mitra Portfolio */
export interface CuratedFontSuggestion {
  name: string;
  category: "serif" | "sans-serif" | "display" | "handwriting" | "monospace";
  description: string;
}

export const RECOMMENDED_GOOGLE_FONTS: CuratedFontSuggestion[] = [
  {
    name: "Aboreto",
    category: "serif",
    description: "Slender, luxury monumental geometric Roman typography",
  },
  {
    name: "Cormorant Unicase",
    category: "serif",
    description: "Ornate literary unicase with historic calligraphic finesse",
  },
  {
    name: "Cinzel Decorative",
    category: "serif",
    description: "Majestic classical Roman with ornate fantasy capitals",
  },
  {
    name: "Marcellus SC",
    category: "serif",
    description:
      "Refined monumental Roman small caps for prestigious book titles",
  },
  {
    name: "Federo",
    category: "sans-serif",
    description: "Art Deco high-contrast luxury headline display",
  },
  {
    name: "Syne",
    category: "sans-serif",
    description: "Avant-garde French geometric poster and gallery branding",
  },
  {
    name: "Megrim",
    category: "display",
    description: "Architectural avant-garde thin display for concept artwork",
  },
  {
    name: "Monoton",
    category: "display",
    description: "Retro multi-line neon poster typography",
  },
  {
    name: "UnifrakturMaguntia",
    category: "display",
    description: "Authentic Blackletter Gothic script for dark fantasy & myth",
  },
  {
    name: "Major Mono Display",
    category: "monospace",
    description: "Experimental modern geometric monospace with eclectic glyphs",
  },
  {
    name: "Stalemate",
    category: "handwriting",
    description: "Vintage script with spontaneous artistic brush flourishes",
  },
  {
    name: "Zeyada",
    category: "handwriting",
    description: "Raw ink artist sketchbook signature script",
  },
  {
    name: "Almendra Display",
    category: "display",
    description: "Stylized fantasy medieval typography for novel titles",
  },
  {
    name: "Pirata One",
    category: "display",
    description: "Gothic adventure and dark romanticism poster font",
  },
  {
    name: "Gruppo",
    category: "sans-serif",
    description: "Ultra-clean sci-fi minimalist display with open counters",
  },
  {
    name: "Silkscreen",
    category: "display",
    description: "Crisp modern pixel art typography for digital graphics",
  },
  {
    name: "Big Shoulders Display",
    category: "sans-serif",
    description: "Condensed monumental Chicago protest & gallery poster",
  },
  {
    name: "Italiana",
    category: "serif",
    description: "Vogue Italian fashion editorial title serif",
  },
  {
    name: "Castoro Titling",
    category: "serif",
    description: "Stately formal academic & literary heading serif",
  },
  {
    name: "Russo One",
    category: "sans-serif",
    description: "Bold heroic headline typography with strong presence",
  },
];
