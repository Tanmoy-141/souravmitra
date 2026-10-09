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
 * Returns type-specific category badge and subtitle
 */
export function getCategoryMeta(category: string) {
  switch (category) {
    case "book-covers":
      return {
        badge: "Book Cover Design",
        tagline: "Cover Typography & Composition Study",
        defaultMedium: "Digital Cover Illustration",
      };
    case "illustration":
      return {
        badge: "Illustration & Concept Art",
        tagline: "Narrative & Worldbuilding Visual",
        defaultMedium: "Digital Painting / Concept Art",
      };
    case "fine-art":
      return {
        badge: "Fine Art",
        tagline: "Gallery Exhibition & Traditional Study",
        defaultMedium: "Oil on Canvas",
      };
    default:
      return {
        badge: "Artwork",
        tagline: "Portfolio Work",
        defaultMedium: "Mixed Media",
      };
  }
}

/**
 * Generates the full HTML markup for a project's inside page
 * tailored to its category type (book-covers, illustration, fine-art).
 *
 * This HTML contains standard semantic markup with Tailwind and inline styles,
 * making it 100% editable inside the GrapesJS visual editor.
 */
export function generateProjectDetailHtml(project: Project): string {
  const title = escapeHtml(project.title || "Untitled Project");
  const meta = getCategoryMeta(project.category);
  const year = escapeHtml(String(project.year || "2024"));
  const medium = escapeHtml(project.medium || meta.defaultMedium);
  const dimensions = project.dimensions ? escapeHtml(project.dimensions) : "";
  const publisher = project.publisher ? escapeHtml(project.publisher) : "";
  const description = escapeHtml(
    project.description ||
      "This piece explores classical structure, visual weight, and atmospheric narrative. Every element is carefully balanced with intentional focal points to evoke an emotional response."
  );
  const details = escapeHtml(
    project.details ||
      "Created with a focus on harmony between texture, value structure, and narrative composition. Developed through initial thumbnail studies, value sketches, and final presentation refinement."
  );

  const imageUrl = project.coverImage || project.images?.[0] || "";
  const backUrl = `/${project.category}`;

  // 1. Top Navigation Bar
  const backButtonHtml = `
    <div style="margin-bottom: 2rem;">
      <a href="${backUrl}" class="inline-flex items-center gap-2 text-[#C5A059] hover:text-white font-medium text-sm transition-colors" style="color: #C5A059; text-decoration: none; font-size: 14px; font-weight: 500;">
        &larr; Back to ${escapeHtml(meta.badge)} Portfolio
      </a>
    </div>
  `;

  // 2. Header Block
  const headerBlockHtml = `
    <div data-gjs-type="default" class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl flex flex-col gap-6" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2rem; margin-bottom: 2.5rem;">
      <div>
        <span class="text-[10px] tracking-widest uppercase text-[#C5A059] font-bold block mb-1" style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 0.5rem;">
          ${meta.badge}
        </span>
        <h1 class="text-4xl sm:text-5xl font-serif font-black text-white leading-tight" style="font-size: 2.5rem; font-family: serif; font-weight: 900; color: #ffffff; line-height: 1.15; margin: 0 0 0.5rem 0;">
          ${title}
        </h1>
        <p class="text-sm text-gray-400 mt-2" style="font-size: 14px; color: #9ca3af; margin: 0.5rem 0 0 0;">
          By <span class="text-white font-medium" style="color: #ffffff; font-weight: 600;">Sourav Mitra</span>
        </p>
      </div>

      <!-- Interactive Share Action Button -->
      <div data-cms-block="project-share" style="width: 100%;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}" target="_blank" rel="noopener noreferrer" style="padding: 8px 16px; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; color: #ccc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none;">
            Share on X
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php" target="_blank" rel="noopener noreferrer" style="padding: 8px 16px; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; color: #ccc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none;">
            Facebook
          </a>
          <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" style="padding: 8px 16px; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; color: #ccc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none;">
            Pinterest
          </a>
          <a href="https://behance.net" target="_blank" rel="noopener noreferrer" style="padding: 8px 16px; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; color: #C5A059; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none;">
            Behance
          </a>
        </div>
      </div>

      <!-- Metadata Badges -->
      <div class="flex flex-wrap gap-4 text-sm text-gray-400" style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 13px; color: #9ca3af; padding-top: 0.5rem; border-top: 1px solid #1a1a1a;">
        ${publisher ? `<span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828;"><strong style="color: #fff;">Publisher:</strong> ${publisher}</span>` : ""}
        <span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828;"><strong style="color: #fff;">Year:</strong> ${year}</span>
        <span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828;"><strong style="color: #fff;">Medium:</strong> ${medium}</span>
        ${dimensions ? `<span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828;"><strong style="color: #fff;">Dimensions:</strong> ${dimensions}</span>` : ""}
        ${(() => {
          const avail = ((project.tags as string[]) ?? []).find((t) => {
            const l = t.trim().toLowerCase();
            return l === "available" || l === "sold" || l === "private collection";
          });
          if (avail) {
            const isAvail = avail.toLowerCase() === "available";
            const isSold = avail.toLowerCase() === "sold";
            const color = isAvail ? "#38bdf8" : isSold ? "#f43f5e" : "#c084fc";
            return `<span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: ${color}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">${escapeHtml(avail)}</span>`;
          }
          if (project.category === "fine-art") {
            return `<span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: #38bdf8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Available</span>`;
          }
          return `<span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: #4ade80;">Available for Licensing</span>`;
        })()}
      </div>
    </div>
  `;

  // 3. Visual Block 1: Artwork Presentation Frame
  const visualBlock1Html = `
    <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-6 sm:p-8 flex flex-col gap-4 shadow-2xl" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2rem; margin-bottom: 2.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 16px;">
        <span class="text-[10px] tracking-widest uppercase text-gray-500 font-bold font-sans" style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #888; font-weight: 700;">
          Visual Block 01 // Final Presentation
        </span>
        <span style="font-size: 11px; color: #C5A059; font-weight: 600;">
          ${escapeHtml(project.category.toUpperCase())}
        </span>
      </div>
      <div class="w-full bg-[#111111] rounded-lg overflow-hidden border border-[#222]" style="background-color: #111; border: 1px solid #222; border-radius: 8px; padding: 20px; display: flex; justify-content: center; align-items: center;">
        <div style="max-width: ${project.category === "book-covers" ? "480px" : "780px"}; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);">
          ${
            imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" class="w-full h-auto object-cover rounded shadow-2xl" style="width: 100%; height: auto; display: block; border-radius: 4px; border: 1px solid #333;" />`
              : `<div style="aspect-ratio: 3/4; background: linear-gradient(135deg, #1c1026, #2d1445); display: flex; align-items: center; justify-content: center; color: #C5A059; font-family: serif; font-size: 24px; font-weight: bold; border: 1px solid #444;">${title}</div>`
          }
        </div>
      </div>
    </div>
  `;

  // 4. Visual Block 2: Type-Specific Presentation (3D Book Mockup for Book Covers, Exhibition Wall for Fine Art, Showcase for Illustration)
  let visualBlock2Html = "";
  if (project.category === "book-covers") {
    visualBlock2Html = `
      <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2.5rem; margin-bottom: 2.5rem; text-align: center;">
        <span style="font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 2rem;">
          Visual Block 02 // 3D Book Presentation Mockup
        </span>
        <div style="display: flex; justify-content: center; align-items: center; padding: 3rem 1rem; background: #080808; border-radius: 8px; border: 1px solid #1a1a1a;">
          <div style="position: relative; width: 260px; height: 380px; box-shadow: -15px 20px 40px rgba(0,0,0,0.9); border-radius: 4px; overflow: hidden; border: 1px solid #444; background: #111;">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #C5A059; font-family: serif; font-size: 20px;">${title}</div>`
            }
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(255,255,255,0.1), rgba(0,0,0,0.6)); pointer-events: none;"></div>
          </div>
        </div>
      </div>
    `;
  } else if (project.category === "fine-art") {
    visualBlock2Html = `
      <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2.5rem; margin-bottom: 2.5rem; text-align: center;">
        <span style="font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 2rem;">
          Visual Block 02 // Exhibition Wall View (Gallery Lighting)
        </span>
        <div style="padding: 4rem 2rem; background: #eae7df; border-radius: 8px; border: 1px solid #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Wooden Frame -->
          <div style="padding: 16px; background: linear-gradient(to bottom, #2e1d11, #1d1109, #0d0703); border: 6px solid #3e291b; border-radius: 2px; box-shadow: 0 25px 50px rgba(0,0,0,0.35); position: relative; max-width: 480px; width: 100%;">
            <!-- Gold inner fillet -->
            <div style="position: absolute; inset: 4px; border: 1px solid rgba(197, 160, 89, 0.6); pointer-events: none;"></div>
            <!-- Passpartout White Matting -->
            <div style="padding: 24px; background: #faf8f5; border: 1px solid #ddd; box-shadow: inset 0 0 10px rgba(0,0,0,0.08);">
              ${
                imageUrl
                  ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" style="width: 100%; height: auto; display: block; border: 1px solid rgba(0,0,0,0.2); box-shadow: 0 8px 16px rgba(0,0,0,0.15);" />`
                  : `<div style="aspect-ratio: 1/1; background: #222; display: flex; align-items: center; justify-content: center; color: #C5A059; font-family: serif; font-size: 20px;">${title}</div>`
              }
            </div>
          </div>
          <!-- Gallery Placard -->
          <div style="margin-top: 2rem; padding: 12px 20px; background: #ffffff; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: left; width: 220px;">
            <p style="font-family: serif; font-size: 13px; font-weight: 700; color: #111; margin: 0;">${title}</p>
            <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 4px 0 0 0;">${medium}</p>
            ${dimensions ? `<p style="font-size: 10px; color: #888; margin: 2px 0 0 0;">${dimensions}</p>` : ""}
            <p style="font-size: 9px; color: #999; margin: 6px 0 0 0;">Sourav Mitra &bull; ${year}</p>
          </div>
        </div>
      </div>
    `;
  } else {
    // Illustration Showcase
    visualBlock2Html = `
      <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2.5rem; margin-bottom: 2.5rem; text-align: center;">
        <span style="font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 2rem;">
          Visual Block 02 // Concept Study & Narrative Framing
        </span>
        <div style="padding: 2rem; background: #0a0a0a; border-radius: 8px; border: 1px solid #222; display: flex; justify-content: center;">
          <div style="max-width: 600px; width: 100%; border: 1px solid #333; padding: 12px; background: #141414; border-radius: 6px;">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" style="width: 100%; height: auto; border-radius: 4px;" />`
                : `<div style="aspect-ratio: 16/9; background: #1a1a1a; display: flex; align-items: center; justify-content: center; color: #C5A059;">${title}</div>`
            }
            <p style="font-size: 11px; color: #888; margin-top: 10px; font-style: italic;">
              High-definition digital render focusing on environmental storytelling and light gradients.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Visual Block 3: Process Studies (Blueprint & Macro Texture)
  const visualBlock3Html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
      <!-- Blueprint Grid Study -->
      <div style="background: #0c121c; border: 1px solid rgba(30, 58, 138, 0.4); border-radius: 12px; padding: 2rem; text-align: center; color: #fff;">
        <span style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #60a5fa; font-weight: 700; font-family: monospace; display: block; margin-bottom: 1.5rem;">
          Blueprint &amp; Grid Study
        </span>
        <div style="width: 160px; height: 160px; margin: 0 auto 1.5rem auto; border: 1px dashed #3b82f6; display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);"></div>
          <span style="font-family: monospace; font-size: 11px; color: #93c5fd;">Proportion Matrix</span>
        </div>
        <p style="font-size: 12px; color: #93c5fd; font-family: monospace; font-style: italic; margin: 0;">
          Geometric proportions, golden ratio guides &amp; composition vectors
        </p>
      </div>

      <!-- Macro Texture Lens -->
      <div style="background: #141414; border: 1px solid #252525; border-radius: 12px; padding: 2rem; text-align: center; color: #fff;">
        <span style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 1.5rem;">
          Detail Crop &amp; Macro Texture
        </span>
        <div style="width: 160px; height: 160px; margin: 0 auto 1.5rem auto; border-radius: 50%; border: 3px solid rgba(197, 160, 89, 0.4); overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
          ${
            imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" style="width: 180%; height: 180%; object-fit: cover; transform: scale(1.4);" />`
              : `<div style="color: #C5A059; font-size: 12px;">Zoom Lens</div>`
          }
        </div>
        <p style="font-size: 12px; color: #9ca3af; font-style: italic; margin: 0;">
          Macro surface magnification showing fine brushwork &amp; tactile grain
        </p>
      </div>
    </div>
  `;

  // 6. Editorial Creative Process Description Block
  const creativeProcessHtml = `
    <div class="bg-[#0c0c0c] rounded-xl border border-[#1d1d1d] p-8 flex flex-col gap-4 shadow-xl" style="background-color: #0c0c0c; border: 1px solid #1d1d1d; border-radius: 12px; padding: 2rem; margin-bottom: 2.5rem;">
      <h3 class="text-xl font-serif text-white font-bold border-b border-[#222] pb-3 mb-2" style="font-size: 1.35rem; font-family: serif; color: #ffffff; font-weight: 700; border-bottom: 1px solid #222; padding-bottom: 0.75rem; margin-top: 0; margin-bottom: 0.75rem;">
        The Creative Process &amp; Insight
      </h3>
      <p class="text-sm leading-relaxed text-gray-300" style="font-size: 14px; line-height: 1.7; color: #d1d5db; margin: 0 0 1rem 0;">
        ${description}
      </p>
      <p class="text-sm leading-relaxed text-gray-300" style="font-size: 14px; line-height: 1.7; color: #d1d5db; margin: 0;">
        ${details}
      </p>
    </div>
  `;

  // 7. Comments & Visitor Interaction Section
  const commentsHtml = `
    <div data-cms-block="project-comments" class="bg-[#0a0a0a] rounded-xl border border-[#1e1e1e] p-8 shadow-xl" style="background-color: #0a0a0a; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2rem; margin-bottom: 2rem;">
      <h4 style="font-size: 16px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.5rem 0;">
        Visitor Comments &amp; Appreciation
      </h4>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.5rem;">
        <div style="background: #111; padding: 12px 16px; border-radius: 6px; border: 1px solid #222;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #C5A059; font-weight: bold; margin-bottom: 4px;">
            <span>Elena Rostova</span>
            <span style="color: #666; font-weight: normal;">2 hours ago</span>
          </div>
          <p style="font-size: 13px; color: #ddd; margin: 0;">
            The composition and lighting here are extraordinary. The tonal values create such an evocative mood!
          </p>
        </div>
      </div>
      <p style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
        Interactive comment submissions are live on published page.
      </p>
    </div>
  `;

  return `
    <div class="px-4 sm:px-6 md:px-10 py-12 max-w-5xl mx-auto text-[#D4D4D4]" style="max-width: 64rem; margin: 0 auto; padding: 3rem 1.5rem; color: #d4d4d4;">
      ${backButtonHtml}
      ${headerBlockHtml}
      ${visualBlock1Html}
      ${visualBlock2Html}
      ${visualBlock3Html}
      ${creativeProcessHtml}
      ${commentsHtml}
    </div>
  `;
}

/**
 * Replaces placeholders in a category template with concrete project data.
 */
export function renderProjectWithTemplate(
  templateHtml: string,
  project: Project
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

  // Replace standard variable tags
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
