import { isSafeImageUrl, sanitizeColor } from "@/lib/sanitize";

export const BEHANCE_DETAILS_PREFIX = "__BEHANCE_V1__:";

export interface BehanceImageModule {
  id: string;
  type: "image";
  url: string;
  caption?: string;
  layout?: "full" | "contained";
}

export interface BehanceGridImage {
  url: string;
  caption?: string;
}

export interface BehanceGridModule {
  id: string;
  type: "grid";
  columns: 2 | 3;
  images: BehanceGridImage[];
  gap?: number;
}

export interface BehanceTextModule {
  id: string;
  type: "text";
  heading?: string;
  body: string;
  align?: "left" | "center" | "right";
  fontStyle?: "serif" | "sans";
}

export interface BehanceSpacerModule {
  id: string;
  type: "spacer";
  height: number;
  showDivider?: boolean;
}

export type BehanceModule =
  | BehanceImageModule
  | BehanceGridModule
  | BehanceTextModule
  | BehanceSpacerModule;

export interface BehanceProjectPresentation {
  version: 1;
  backgroundColor: string;
  contentSpacing: number;
  modules: BehanceModule[];
}

export const BEHANCE_CANVAS_PRESETS = [
  { label: "Gallery Dark", color: "#070707" },
  { label: "Obsidian", color: "#000000" },
  { label: "Charcoal", color: "#141414" },
  { label: "Warm Gallery", color: "#F5F3EE" },
  { label: "Pure White", color: "#FFFFFF" },
] as const;

export function createModuleId(prefix = "mod"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Determines whether a hex background color is perceptually light, so text
 * and captions rendered on the Behance canvas maintain high contrast.
 */
export function isLightCanvasColor(color: string): boolean {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

function sanitizeModule(raw: unknown, idx: number): BehanceModule | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id =
    typeof obj.id === "string" && obj.id.trim()
      ? obj.id.trim()
      : `mod_${idx}`;

  if (obj.type === "image") {
    const url = typeof obj.url === "string" ? obj.url.trim() : "";
    if (!url || !isSafeImageUrl(url)) return null;
    return {
      id,
      type: "image",
      url,
      caption: typeof obj.caption === "string" ? obj.caption : "",
      layout: obj.layout === "contained" ? "contained" : "full",
    };
  }

  if (obj.type === "grid") {
    const rawImgs = Array.isArray(obj.images) ? obj.images : [];
    const images: BehanceGridImage[] = [];
    for (const item of rawImgs) {
      if (item && typeof item === "object") {
        const imgObj = item as Record<string, unknown>;
        const url = typeof imgObj.url === "string" ? imgObj.url.trim() : "";
        if (url && isSafeImageUrl(url)) {
          images.push({
            url,
            caption: typeof imgObj.caption === "string" ? imgObj.caption : "",
          });
        }
      }
    }
    const columns = obj.columns === 3 ? 3 : 2;
    const gap =
      typeof obj.gap === "number" && Number.isFinite(obj.gap)
        ? Math.max(0, Math.min(48, Math.round(obj.gap)))
        : 12;
    return { id, type: "grid", columns, images, gap };
  }

  if (obj.type === "text") {
    const heading = typeof obj.heading === "string" ? obj.heading : "";
    const body = typeof obj.body === "string" ? obj.body : "";
    const align =
      obj.align === "left" || obj.align === "right" ? obj.align : "center";
    const fontStyle = obj.fontStyle === "sans" ? "sans" : "serif";
    return { id, type: "text", heading, body, align, fontStyle };
  }

  if (obj.type === "spacer") {
    const height =
      typeof obj.height === "number" && Number.isFinite(obj.height)
        ? Math.max(8, Math.min(160, Math.round(obj.height)))
        : 40;
    return {
      id,
      type: "spacer",
      height,
      showDivider: Boolean(obj.showDivider),
    };
  }

  return null;
}

/**
 * Parses a project's `details` column into structured Behance presentation
 * modules. Falls back gracefully for legacy plain-text projects by assembling
 * modules from `coverImage`, `images[]`, `description`, and plain `details`.
 */
export function parseBehancePresentation(input: {
  title?: string;
  coverImage?: string | null;
  images?: string[] | null;
  description?: string | null;
  details?: string | null;
}): BehanceProjectPresentation {
  const rawDetails = typeof input.details === "string" ? input.details.trim() : "";

  if (rawDetails.startsWith(BEHANCE_DETAILS_PREFIX)) {
    try {
      const parsed = JSON.parse(
        rawDetails.slice(BEHANCE_DETAILS_PREFIX.length),
      ) as Partial<BehanceProjectPresentation>;
      const rawModules = Array.isArray(parsed.modules) ? parsed.modules : [];
      const modules = rawModules
        .map((m, i) => sanitizeModule(m, i))
        .filter((m): m is BehanceModule => m !== null);

      const backgroundColor = sanitizeColor(parsed.backgroundColor, "#070707");
      const contentSpacing =
        typeof parsed.contentSpacing === "number" &&
        Number.isFinite(parsed.contentSpacing)
          ? Math.max(0, Math.min(80, Math.round(parsed.contentSpacing)))
          : 0;

      return {
        version: 1,
        backgroundColor,
        contentSpacing,
        modules,
      };
    } catch {
      // Fall through to legacy builder below if JSON is malformed
    }
  }

  // Legacy project fallback: convert coverImage + images[] + description/details into Behance modules
  const modules: BehanceModule[] = [];
  const rawUrls = [
    input.coverImage,
    ...(Array.isArray(input.images) ? input.images : []),
  ].filter(
    (u): u is string =>
      typeof u === "string" && u.trim() !== "" && isSafeImageUrl(u.trim()),
  );
  const seen = new Set<string>();
  rawUrls.forEach((url, idx) => {
    const clean = url.trim();
    if (!seen.has(clean)) {
      seen.add(clean);
      modules.push({
        id: `legacy_img_${idx}`,
        type: "image",
        url: clean,
        caption: "",
        layout: "full",
      });
    }
  });

  const desc = typeof input.description === "string" ? input.description.trim() : "";
  const plainDetails =
    rawDetails && !rawDetails.startsWith(BEHANCE_DETAILS_PREFIX)
      ? rawDetails
      : "";

  if (desc || plainDetails) {
    const combinedBody =
      desc && plainDetails && desc !== plainDetails
        ? `${desc}\n\n${plainDetails}`
        : desc || plainDetails;
    modules.push({
      id: "legacy_text_0",
      type: "text",
      heading: input.title ? `About ${input.title}` : "About This Project",
      body: combinedBody,
      align: "center",
      fontStyle: "serif",
    });
  }

  return {
    version: 1,
    backgroundColor: "#070707",
    contentSpacing: 0,
    modules,
  };
}

/**
 * Serializes a Behance presentation back into `details` text format.
 */
export function serializeBehancePresentation(
  presentation: BehanceProjectPresentation,
): string {
  const safe: BehanceProjectPresentation = {
    version: 1,
    backgroundColor: sanitizeColor(presentation.backgroundColor, "#070707"),
    contentSpacing: Math.max(
      0,
      Math.min(80, Math.round(presentation.contentSpacing || 0)),
    ),
    modules: presentation.modules,
  };
  return `${BEHANCE_DETAILS_PREFIX}${JSON.stringify(safe)}`;
}

/**
 * Extracts a flat deduplicated list of all image URLs across Image and Photo
 * Grid modules (used for syncing `project.images` and building the Lightbox).
 */
export function extractAllModuleImages(modules: BehanceModule[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    const clean = url.trim();
    if (clean && isSafeImageUrl(clean) && !seen.has(clean)) {
      seen.add(clean);
      urls.push(clean);
    }
  };
  for (const mod of modules) {
    if (mod.type === "image") {
      add(mod.url);
    } else if (mod.type === "grid") {
      for (const img of mod.images) {
        add(img.url);
      }
    }
  }
  return urls;
}
