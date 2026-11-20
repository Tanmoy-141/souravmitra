import type { Project } from "@/db/schema";

/**
 * Escapes HTML special characters.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Returns type-specific category badge and subtitle.
 */
export function getCategoryMeta(category: string) {
  switch (category) {
    case "book-covers":
      return {
        badge: "Book Cover Design",
        shortLabel: "Book Covers",
        tagline: "Cover Typography & Composition Study",
        defaultMedium: "Digital Cover Illustration",
      };
    case "illustration":
      return {
        badge: "Illustration & Concept Art",
        shortLabel: "Illustration",
        tagline: "Narrative & Worldbuilding Visual",
        defaultMedium: "Digital Painting / Concept Art",
      };
    case "fine-art":
      return {
        badge: "Fine Art",
        shortLabel: "Fine Art",
        tagline: "Gallery Exhibition & Traditional Study",
        defaultMedium: "Oil on Canvas",
      };
    default:
      return {
        badge: "Artwork",
        shortLabel: "Portfolio",
        tagline: "Portfolio Work",
        defaultMedium: "Mixed Media",
      };
  }
}

/**
 * Generates Behance-style Obsidian Black & Gold HTML markup for a project's
 * inside page, editable in GrapesJS.
 */
export function generateProjectDetailHtml(project: Project): string {
  const title = escapeHtml(project.title || "Untitled Project");
  const meta = getCategoryMeta(project.category);
  const year = escapeHtml(String(project.year || "2024"));
  const medium = escapeHtml(project.medium || meta.defaultMedium);
  const dimensions = project.dimensions ? escapeHtml(project.dimensions) : "";
  const publisher = project.publisher ? escapeHtml(project.publisher) : "";
  const description = project.description ? escapeHtml(project.description) : "";
  const details = project.details ? escapeHtml(project.details) : "";

  const rawImages = [
    project.coverImage,
    ...(Array.isArray(project.images) ? project.images : []),
  ].filter((u): u is string => typeof u === "string" && u.trim() !== "");
  const uniqueImages = Array.from(new Set(rawImages.map((u) => u.trim())));
  const backUrl = `/${project.category}`;

  const tags = (Array.isArray(project.tags) ? project.tags : [])
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  const imageModulesHtml =
    uniqueImages.length > 0
      ? uniqueImages
          .map(
            (url, idx) => `
          <div style="width: 100%; background-color: #080808; display: flex; justify-content: center; border-bottom: 1px solid #141414;">
            <img src="${escapeHtml(url)}" alt="${title}${uniqueImages.length > 1 ? ` - Presentation ${idx + 1}` : ""}" style="width: 100%; max-width: 100%; height: auto; display: block; object-fit: contain;" />
          </div>`,
          )
          .join("")
      : `
          <div style="padding: 5rem 2rem; text-align: center; background-color: #0a0a0a; color: #C5A059; font-family: serif; font-size: 28px;">
            ${title}
          </div>`;

  const editorialHtml =
    description || details
      ? `
      <div style="background-color: #090909; border-top: 1px solid #161616; padding: 3.5rem 2rem; text-align: center;">
        <span style="font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 0.75rem;">
          About This Project
        </span>
        <h2 style="font-family: serif; font-size: 1.75rem; font-weight: 700; color: #ffffff; margin: 0 0 1.25rem 0;">
          ${title}
        </h2>
        <div style="max-width: 48rem; margin: 0 auto; font-size: 15px; line-height: 1.75; color: #d1d5db;">
          ${description ? `<p style="margin: 0 0 1rem 0;">${description}</p>` : ""}
          ${details && details !== description ? `<p style="margin: 0; color: #9ca3af;">${details}</p>` : ""}
        </div>
      </div>`
      : "";

  const tagsHtml =
    tags.length > 0
      ? `
        <div style="background-color: #090909; border: 1px solid #1b1b1b; border-radius: 8px; padding: 1.5rem; margin-top: 1.5rem;">
          <p style="font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #737373; font-weight: 700; margin: 0 0 1rem 0;">
            Creative Fields &amp; Tags
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${tags
              .map(
                (t) =>
                  `<span style="padding: 6px 12px; border-radius: 9999px; background-color: #131313; border: 1px solid #262626; font-size: 11px; color: #d4d4d4;">${escapeHtml(t)}</span>`,
              )
              .join("")}
          </div>
        </div>`
      : "";

  return `
    <div style="background-color: #000000; color: #d4d4d4; width: 100%;">
      <!-- Behance Project Header Bar -->
      <div style="border-bottom: 1px solid #191919; background-color: #050505;">
        <div style="max-width: 1400px; margin: 0 auto; padding: 1.5rem 2rem;">
          <div style="margin-bottom: 1rem;">
            <a href="${backUrl}" style="color: #9ca3af; text-decoration: none; font-size: 12px; font-weight: 500;">
              &larr; Back to ${escapeHtml(meta.shortLabel)}
            </a>
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.25rem;">
            <div>
              <h1 style="font-family: serif; font-size: 1.75rem; font-weight: 700; color: #ffffff; margin: 0 0 0.35rem 0;">
                ${title}
              </h1>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                <strong style="color: #ffffff;">Sourav Mitra</strong> &bull; <span style="color: #C5A059;">${escapeHtml(meta.badge)}</span> &bull; ${year}
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <div data-cms-block="project-like"></div>
              <a href="/contact" style="padding: 10px 20px; border-radius: 9999px; border: 1px solid rgba(197,160,89,0.6); color: #C5A059; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none;">
                Inquire
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Behance Full-Width Artwork Canvas -->
      <div style="max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem;">
        <div style="background-color: #070707; border: 1px solid #1a1a1a; border-radius: 2px; overflow: hidden;">
          ${imageModulesHtml}
          ${editorialHtml}
        </div>
      </div>

      <!-- Behance Two-Column Footer: Comments + Project Info -->
      <div style="max-width: 1400px; margin: 0 auto; padding: 2.5rem 2rem 4rem 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; align-items: start;">
        <div data-cms-block="project-comments" style="background-color: #090909; border: 1px solid #1b1b1b; border-radius: 8px; padding: 1.75rem;">
          <h3 style="font-family: serif; font-size: 1.15rem; color: #ffffff; margin: 0 0 1rem 0;">
            Discussion &amp; Feedback
          </h3>
          <p style="font-size: 12px; color: #737373; margin: 0;">
            Interactive comments are live on the published page.
          </p>
        </div>

        <div>
          <div style="background-color: #090909; border: 1px solid #1b1b1b; border-radius: 8px; padding: 1.5rem;">
            <p style="font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #737373; font-weight: 700; margin: 0 0 1rem 0;">
              Project Information
            </p>
            <div style="font-size: 12px; color: #d4d4d4; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #161616; padding-bottom: 0.5rem;">
                <span style="color: #737373;">Category</span>
                <span style="color: #ffffff; font-weight: 500;">${escapeHtml(meta.badge)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #161616; padding-bottom: 0.5rem;">
                <span style="color: #737373;">Medium / Style</span>
                <span style="color: #ffffff; font-weight: 500;">${medium}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #161616; padding-bottom: 0.5rem;">
                <span style="color: #737373;">Year</span>
                <span style="color: #ffffff; font-weight: 500;">${year}</span>
              </div>
              ${
                publisher
                  ? `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #161616; padding-bottom: 0.5rem;">
                      <span style="color: #737373;">Publisher</span>
                      <span style="color: #ffffff; font-weight: 500;">${publisher}</span>
                    </div>`
                  : ""
              }
              ${
                dimensions
                  ? `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #161616; padding-bottom: 0.5rem;">
                      <span style="color: #737373;">Dimensions</span>
                      <span style="color: #ffffff; font-weight: 500;">${dimensions}</span>
                    </div>`
                  : ""
              }
            </div>
            <div data-cms-block="project-share" style="margin-top: 1.25rem;"></div>
          </div>
          ${tagsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Replaces placeholders in a category template with concrete project data.
 */
export function renderProjectWithTemplate(
  templateHtml: string,
  project: Project,
): string {
  const title = escapeHtml(project.title || "Untitled Project");
  const meta = getCategoryMeta(project.category);
  const year = escapeHtml(String(project.year || "2024"));
  const medium = escapeHtml(project.medium || meta.defaultMedium);
  const dimensions = project.dimensions ? escapeHtml(project.dimensions) : "";
  const publisher = project.publisher ? escapeHtml(project.publisher) : "";
  const description = escapeHtml(project.description || "");
  const details = escapeHtml(project.details || "");
  const imageUrl = project.coverImage || project.images?.[0] || "";

  let result = templateHtml;

  result = result.replace(/\{\{\s*title\s*\}\}/gi, title);
  result = result.replace(/\{\{\s*year\s*\}\}/gi, year);
  result = result.replace(/\{\{\s*medium\s*\}\}/gi, medium);
  result = result.replace(/\{\{\s*dimensions\s*\}\}/gi, dimensions);
  result = result.replace(/\{\{\s*publisher\s*\}\}/gi, publisher);
  result = result.replace(/\{\{\s*description\s*\}\}/gi, description);
  result = result.replace(/\{\{\s*details\s*\}\}/gi, details);
  result = result.replace(/\{\{\s*badge\s*\}\}/gi, meta.badge);
  result = result.replace(/\{\{\s*category\s*\}\}/gi, project.category);

  if (imageUrl) {
    result = result.replace(/\{\{\s*coverImage\s*\}\}/gi, imageUrl);
  }

  return result;
}
