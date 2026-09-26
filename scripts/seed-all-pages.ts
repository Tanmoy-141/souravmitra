import "dotenv/config";
import { db } from "../db";
import { pages } from "../db/schema";
import { eq } from "drizzle-orm";

const HERO_IMAGE_URL =
  "https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_696,h_426,al_c,q_80,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg";
const HERO_IMAGE_ALT = "Sourav Mitra";
const HERO_IMAGE_CLASSES =
  "w-full max-w-4xl h-auto object-cover mx-auto mb-8 rounded";
const OLD_HERO_TAGLINE = "Illustrator • Book Cover Designer • Fine Artist";
const HERO_TAGLINE = "550+ covers in 8+ years, and still learning.";

interface SavedGrapesComponent {
  tagName?: string;
  type?: string;
  content?: string;
  classes?: string[];
  style?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  components?: SavedGrapesComponent[];
}

interface SavedGrapesStyleRule {
  selectors?: string[];
  style?: Record<string, unknown>;
}

interface SavedGrapesProject {
  pages?: Array<{
    frames?: Array<{ component?: SavedGrapesComponent }>;
  }>;
  styles?: SavedGrapesStyleRule[];
}

function findTagEnd(html: string, start: number): number {
  let quote: "'" | '"' | null = null;

  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }

  return -1;
}

function replacePlaceholderHeroHtml(html: string): string {
  const altMarker = 'alt="Hero Artwork Placeholder"';
  const altIndex = html.indexOf(altMarker);
  if (altIndex === -1) return html;

  const tagStart = html.lastIndexOf("<img", altIndex);
  const tagEnd = findTagEnd(html, tagStart);
  if (tagStart === -1 || tagEnd === -1) return html;

  const oldTag = html.slice(tagStart, tagEnd + 1);
  const idMatch = oldTag.match(/\bid=(['"])(.*?)\1/);
  const idAttribute = idMatch ? ` id="${idMatch[2]}"` : "";
  const newTag = `<img${idAttribute} alt="${HERO_IMAGE_ALT}" src="${HERO_IMAGE_URL}" width="696" height="426" class="${HERO_IMAGE_CLASSES}" />`;

  return `${html.slice(0, tagStart)}${newTag}${html.slice(tagEnd + 1)}`.replace(
    OLD_HERO_TAGLINE,
    HERO_TAGLINE,
  );
}

function updatePlaceholderHeroProject(
  value: unknown,
): SavedGrapesProject | null {
  if (!value || typeof value !== "object") return null;

  const project = JSON.parse(JSON.stringify(value)) as SavedGrapesProject;
  if (!Array.isArray(project.pages)) return null;

  const oldHeroClasses = new Set([
    "w-full",
    "max-w-4xl",
    "h-[400px]",
    "object-cover",
    "mx-auto",
    "mb-8",
    "rounded",
    "border-2",
    "border-dashed",
    "border-[#444]",
    "cursor-pointer",
  ]);
  let heroFound = false;

  const updateTree = (component: SavedGrapesComponent) => {
    const attributes = component.attributes ?? {};
    const isHeroImage =
      component.type === "image" &&
      (attributes.alt === "Hero Artwork Placeholder" ||
        attributes.src === HERO_IMAGE_URL);

    if (isHeroImage) {
      component.attributes = {
        ...attributes,
        alt: HERO_IMAGE_ALT,
        src: HERO_IMAGE_URL,
        width: "696",
        height: "426",
        class: HERO_IMAGE_CLASSES,
      };
      component.classes = HERO_IMAGE_CLASSES.split(" ");

      if (component.style) {
        const style = { ...component.style };
        delete style.width;
        delete style.height;
        if (Object.keys(style).length > 0) component.style = style;
        else delete component.style;
      }
      heroFound = true;
    }

    if (component.content?.includes(OLD_HERO_TAGLINE)) {
      component.content = component.content.replace(
        OLD_HERO_TAGLINE,
        HERO_TAGLINE,
      );
      heroFound = true;
    }

    component.components?.forEach(updateTree);
  };

  project.pages.forEach((page) =>
    page.frames?.forEach((frame) => {
      if (frame.component) updateTree(frame.component);
    }),
  );

  if (!heroFound) return null;

  project.styles = (project.styles ?? []).flatMap((rule) => {
    const selectors = rule.selectors ?? [];
    const style = { ...(rule.style ?? {}) };
    const isHeroClassRule =
      selectors.length > 0 &&
      selectors.every((selector) => oldHeroClasses.has(selector));
    const isHeroIdRule = selectors.includes("#inbmr");

    if (isHeroClassRule) {
      delete style.width;
      delete style.height;
    }
    if (isHeroIdRule && style.height === "25rem") {
      style.height = "auto";
    }

    return Object.keys(style).length > 0 ? [{ ...rule, style }] : [];
  });

  return project;
}

function replaceSectionContaining(
  html: string,
  text: string,
  replacement: string,
): string | null {
  const textIndex =
    html.indexOf(text) !== -1
      ? html.indexOf(text)
      : html.indexOf(text.replaceAll("&", "&amp;"));
  if (textIndex === -1) return null;

  const sectionStart = html.lastIndexOf("<section", textIndex);
  if (sectionStart === -1) return null;

  let depth = 0;
  let cursor = sectionStart;

  while (cursor < html.length) {
    const nextOpen = html.indexOf("<section", cursor);
    const nextClose = html.indexOf("</section>", cursor);
    if (nextClose === -1) return null;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const openTagEnd = html.indexOf(">", nextOpen);
      if (openTagEnd === -1) return null;
      depth += 1;
      cursor = openTagEnd + 1;
      continue;
    }

    depth -= 1;
    cursor = nextClose + "</section>".length;
    if (depth === 0) {
      return `${html.slice(0, sectionStart)}${replacement}${html.slice(cursor)}`;
    }
  }

  return null;
}

function replaceEditorSection(
  value: unknown,
  heading: string,
): SavedGrapesProject | null {
  if (!value || typeof value !== "object") return null;

  const project = JSON.parse(JSON.stringify(value)) as SavedGrapesProject;
  if (!Array.isArray(project.pages)) return null;

  const containsHeading = (component: SavedGrapesComponent): boolean =>
    (component.content?.includes(heading) ?? false) ||
    (component.components?.some(containsHeading) ?? false);

  const replacement: SavedGrapesComponent = {
    type: "testimonials-carousel",
    tagName: "div",
    attributes: {
      "data-cms-block": "testimonials-carousel",
      class: "py-16",
    },
    components: [
      {
        type: "textnode",
        content:
          "What Publishers & Clients Say carousel appears on the live page.",
      },
    ],
  };

  const replaceInTree = (component: SavedGrapesComponent): boolean => {
    const children = component.components;
    if (!Array.isArray(children)) return false;

    const sectionIndex = children.findIndex(
      (child) =>
        child.tagName?.toLowerCase() === "section" && containsHeading(child),
    );

    if (sectionIndex !== -1) {
      children[sectionIndex] = replacement;
      return true;
    }

    return children.some(replaceInTree);
  };

  for (const page of project.pages) {
    for (const frame of page.frames ?? []) {
      if (frame.component && replaceInTree(frame.component)) return project;
    }
  }

  return null;
}

function hasTestimonialsMarker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasTestimonialsMarker);
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  const attributes = record.attributes;
  if (
    attributes &&
    typeof attributes === "object" &&
    (attributes as Record<string, unknown>)["data-cms-block"] ===
      "testimonials-carousel"
  ) {
    return true;
  }

  return Object.values(record).some(hasTestimonialsMarker);
}

function findDivRange(html: string, start: number) {
  const openTagEnd = html.indexOf(">", start);
  if (openTagEnd === -1) return null;

  let depth = 1;
  let cursor = openTagEnd + 1;

  while (cursor < html.length) {
    const nextOpen = html.indexOf("<div", cursor);
    const nextClose = html.indexOf("</div>", cursor);
    if (nextClose === -1) return null;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const nestedOpenEnd = html.indexOf(">", nextOpen);
      if (nestedOpenEnd === -1) return null;
      depth += 1;
      cursor = nestedOpenEnd + 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        return { openTagEnd, closeStart: nextClose, end: nextClose + 6 };
      }
      cursor = nextClose + 6;
    }
  }

  return null;
}

function splitHtmlRootAroundMarker(html: string): string | null {
  const marker = 'data-cms-block="testimonials-carousel"';
  const markerIndex = html.indexOf(marker);
  const rootStart = html.indexOf("<div");
  if (markerIndex === -1 || rootStart === -1) return null;

  const markerStart = html.lastIndexOf("<div", markerIndex);
  const rootRange = findDivRange(html, rootStart);
  const markerRange = findDivRange(html, markerStart);
  if (!rootRange || !markerRange) return null;
  if (markerStart <= rootStart || markerRange.end > rootRange.closeStart) {
    return html;
  }

  const rootOpenTag = html.slice(rootStart, rootRange.openTagEnd + 1);
  if (!rootOpenTag.includes("py-12")) return null;

  const prefixOpenTag = rootOpenTag.replace("py-12", "pt-12");
  const suffixOpenTag = rootOpenTag.replace("py-12", "pb-12");
  const prefixContent = html.slice(rootRange.openTagEnd + 1, markerStart);
  const markerContent = html.slice(markerStart, markerRange.end);
  const suffixContent = html.slice(markerRange.end, rootRange.closeStart);

  return [
    html.slice(0, rootStart),
    prefixOpenTag,
    prefixContent,
    "</div>",
    markerContent,
    suffixOpenTag,
    suffixContent,
    "</div>",
    html.slice(rootRange.end),
  ].join("");
}

function splitEditorRootAroundMarker(
  value: unknown,
): SavedGrapesProject | null {
  if (!value || typeof value !== "object") return null;

  const project = JSON.parse(JSON.stringify(value)) as SavedGrapesProject;
  if (!Array.isArray(project.pages)) return null;

  const hasMarker = (component: SavedGrapesComponent) =>
    component.attributes?.["data-cms-block"] === "testimonials-carousel";

  const splitTree = (parent: SavedGrapesComponent): boolean => {
    const children = parent.components;
    if (!Array.isArray(children)) return false;

    for (let index = 0; index < children.length; index += 1) {
      const wrapper = children[index];
      const wrapperClasses = wrapper.classes;
      const wrapperChildren = wrapper.components;

      if (
        Array.isArray(wrapperClasses) &&
        wrapperClasses.includes("py-12") &&
        Array.isArray(wrapperChildren)
      ) {
        const markerIndex = wrapperChildren.findIndex(hasMarker);
        if (markerIndex !== -1) {
          const prefix: SavedGrapesComponent = {
            ...wrapper,
            classes: wrapperClasses.map((name) =>
              name === "py-12" ? "pt-12" : name,
            ),
            components: wrapperChildren.slice(0, markerIndex),
          };
          const marker = wrapperChildren[markerIndex];
          const suffix: SavedGrapesComponent = {
            ...wrapper,
            classes: wrapperClasses.map((name) =>
              name === "py-12" ? "pb-12" : name,
            ),
            components: wrapperChildren.slice(markerIndex + 1),
          };

          children.splice(index, 1, prefix, marker, suffix);
          return true;
        }
      }

      if (splitTree(wrapper)) return true;
    }

    return false;
  };

  for (const page of project.pages) {
    for (const frame of page.frames ?? []) {
      if (!frame.component) continue;
      if (frame.component.components?.some(hasMarker)) return project;
      if (splitTree(frame.component)) return project;
    }
  }

  return null;
}

async function seedAllPages() {
  console.log(
    "Seeding all core website pages with fully editable & professional rich components...",
  );

  const corePages = [
    {
      slug: "/",
      title: "Home",
      status: "published" as const,
      htmlCache: `
        <div class="flex flex-col gap-16 py-12 bg-black text-white">
          <section style="position:relative; width:100%; min-height:100vh; overflow:hidden;">
            <img src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_900,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" alt="Sourav Mitra - Hero Artwork" width="1920" height="900" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" />
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4);"></div>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 1.5rem;">
              <h1 style="font-size:clamp(3rem, 8vw, 7rem); font-family:serif; color:#FFFFFF; margin-bottom:0.5rem; letter-spacing:-0.02em; text-shadow:0 4px 12px rgba(0,0,0,0.5);">Sourav Mitra</h1>
              <p style="font-size:clamp(1.1rem, 2.5vw, 1.5rem); color:#E5E5E5; margin-bottom:2.5rem; text-shadow:0 2px 8px rgba(0,0,0,0.4);">550+ covers in 8+ years, and still learning.</p>
              <a href="/book-covers" style="display:inline-block; padding:0.875rem 2.5rem; background:#C5A059; color:#000; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; font-size:0.75rem; text-decoration:none;">Explore My Work</a>
            </div>
          </section>

          <section class="px-10 max-w-6xl mx-auto w-full">
            <h2 class="text-3xl font-serif text-white text-center mb-10">Explore Portfolios</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <a href="/book-covers" class="group aspect-square bg-[#111111] p-8 flex flex-col justify-end transition-transform hover:scale-105 border border-[#333333]">
                <h3 class="text-2xl font-serif text-[#FFFFFF] group-hover:text-[#C5A059]">Book Cover Portfolio</h3>
              </a>
              <a href="/illustration" class="group aspect-square bg-[#111111] p-8 flex flex-col justify-end transition-transform hover:scale-105 border border-[#333333]">
                <h3 class="text-2xl font-serif text-[#FFFFFF] group-hover:text-[#C5A059]">Illustration Portfolio</h3>
              </a>
              <a href="/fine-art" class="group aspect-square bg-[#111111] p-8 flex flex-col justify-end transition-transform hover:scale-105 border border-[#333333]">
                <h3 class="text-2xl font-serif text-[#FFFFFF] group-hover:text-[#C5A059]">Fine Art</h3>
              </a>
            </div>
          </section>

          <div data-cms-block="testimonials-carousel" class="py-16">
            <h2 class="text-3xl font-serif text-white text-center">What Publishers &amp; Clients Say</h2>
          </div>

          <section class="px-10 py-20 text-center">
            <h2 class="text-4xl font-serif mb-8 text-[#FFFFFF]">Let's Create Something Extraordinary Together</h2>
            <a href="/contact" class="inline-block px-8 py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-xs">Start a Project</a>
          </section>
        </div>
      `,
    },
    {
      slug: "about",
      title: "About",
      status: "published" as const,
      htmlCache: `
        <div class="px-10 py-12 max-w-4xl mx-auto text-[#D4D4D4] bg-black">
          <h1 class="text-4xl font-serif text-white mb-8">About Myself...</h1>
          <p class="text-lg mb-8 leading-relaxed">I am Sourav Mitra, a professional illustrator, book cover designer, and fine artist based in India. My work explores the intersection of dark atmospheric storytelling and traditional illustrative techniques.</p>
          
          <section class="py-12 border-t border-[#222]">
            <div class="flex flex-col items-center">
              <h2 class="text-3xl font-serif text-white mb-4">Awards & Recognition</h2>
              <div class="w-10 h-1 bg-[#C5A059] mb-12"></div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-center">
                <div>
                  <h3 class="font-bold mb-6 text-lg uppercase tracking-wider text-[#C5A059]">Awards</h3>
                  <div class="mb-8 flex flex-col items-center">
                    <p class="text-white font-medium">Best Fantasy Cover Design</p>
                    <p class="text-gray-400 text-sm">World Illustration Awards, 2024</p>
                  </div>
                  <div class="mb-8 flex flex-col items-center">
                    <p class="text-white font-medium">Excellence in Editorial Art</p>
                    <p class="text-gray-400 text-sm">Society of Illustrators, 2023</p>
                  </div>
                </div>
                <div>
                  <h3 class="font-bold mb-6 text-lg uppercase tracking-wider text-[#C5A059]">Exhibitions</h3>
                  <div class="mb-8 flex flex-col items-center">
                    <p class="text-white font-medium">Shadows & Light Solo Exhibition</p>
                    <p class="text-gray-400 text-sm">Academy Gallery, New Delhi</p>
                  </div>
                  <div class="mb-8 flex flex-col items-center">
                    <p class="text-white font-medium">Contemporary Book Art Biennale</p>
                    <p class="text-gray-400 text-sm">Gallery of Fine Arts, Mumbai</p>
                  </div>
                </div>
                <div>
                  <h3 class="font-bold mb-6 text-lg uppercase tracking-wider text-[#C5A059]">Media</h3>
                  <div class="mb-8 flex flex-col items-center">
                    <p class="text-white font-medium">Feature Interview & Gallery</p>
                    <p class="text-gray-400 text-sm">ImagineFX Magazine, Issue 210</p>
                  </div>
                  <div class="mb-8 flex flex-col items-center">
                    <p class="text-white font-medium">Cover Artist Spotlight</p>
                    <p class="text-gray-400 text-sm">Publishers Weekly</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="py-16 border-t border-[#222]">
            <h2 class="text-3xl font-serif text-white text-center mb-12">Clients & Collaborators</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div class="p-6 bg-[#0a0a0a] border border-[#222] flex flex-col items-center justify-center transition-all hover:border-[#C5A059]">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" alt="Penguin Logo" class="h-10 object-contain mb-3 filter grayscale hover:grayscale-0 transition-all" />
                <span class="text-xs font-bold text-gray-300">Penguin Random House</span>
              </div>
              <div class="p-6 bg-[#0a0a0a] border border-[#222] flex flex-col items-center justify-center transition-all hover:border-[#C5A059]">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" alt="HarperCollins Logo" class="h-10 object-contain mb-3 filter grayscale hover:grayscale-0 transition-all" />
                <span class="text-xs font-bold text-gray-300">HarperCollins</span>
              </div>
              <div class="p-6 bg-[#0a0a0a] border border-[#222] flex flex-col items-center justify-center transition-all hover:border-[#C5A059]">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" alt="Macmillan Logo" class="h-10 object-contain mb-3 filter grayscale hover:grayscale-0 transition-all" />
                <span class="text-xs font-bold text-gray-300">Macmillan Publishers</span>
              </div>
              <div class="p-6 bg-[#0a0a0a] border border-[#222] flex flex-col items-center justify-center transition-all hover:border-[#C5A059]">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" alt="Hachette Logo" class="h-10 object-contain mb-3 filter grayscale hover:grayscale-0 transition-all" />
                <span class="text-xs font-bold text-gray-300">Hachette Book Group</span>
              </div>
            </div>
          </section>
        </div>
      `,
    },
    {
      slug: "contact",
      title: "Contact",
      status: "published" as const,
      htmlCache: `
        <div class="px-10 py-16 max-w-2xl mx-auto text-center bg-black text-white">
          <h1 class="text-4xl font-serif text-white mb-4">Let's Connect!</h1>
          <p class="text-gray-400 mb-8">Ready to collaborate or commission a custom piece? Send an inquiry below and let's bring your vision to life.</p>
        </div>
      `,
    },
    {
      slug: "book-covers",
      title: "Book Covers",
      status: "published" as const,
      htmlCache: `
        <section class="px-6 py-12 text-[#D4D4D4] md:px-10">
          <header class="mx-auto mb-16 max-w-2xl text-center">
            <span class="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-[#C5A059]">Portfolio</span>
            <h1 class="text-4xl font-black leading-tight text-white md:text-5xl">Book Cover Design</h1>
            <p class="mt-4 text-sm leading-relaxed text-gray-400">A collection of bespoke literary jackets and book cover layouts. Explore the mockups, sketches, and process behind each project.</p>
          </header>
          <div data-cms-block="project-grid" class="min-h-24 border border-dashed border-[#444] p-8 text-center text-gray-400">Live book cover projects</div>
        </section>
      `,
    },
    {
      slug: "illustration",
      title: "Illustration",
      status: "published" as const,
      htmlCache: `
        <section class="px-6 py-12 text-[#D4D4D4] md:px-10">
          <header class="mx-auto mb-16 max-w-2xl text-center">
            <span class="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-[#C5A059]">Portfolio</span>
            <h1 class="text-4xl font-black leading-tight text-white md:text-5xl">Illustration Portfolio</h1>
            <p class="mt-4 text-sm leading-relaxed text-gray-400">A showcase of digital editorial artwork, character design, and visual concepts. Explore the details and process behind each piece.</p>
          </header>
          <div data-cms-block="project-grid" class="min-h-24 border border-dashed border-[#444] p-8 text-center text-gray-400">Live illustration projects</div>
        </section>
      `,
    },
    {
      slug: "fine-art",
      title: "Fine Art",
      status: "published" as const,
      htmlCache: `
        <section class="px-6 py-12 text-[#D4D4D4] md:px-10">
          <header class="mx-auto mb-16 max-w-2xl text-center">
            <span class="mb-3 block text-xs font-bold uppercase tracking-[0.3em] text-[#C5A059]">Portfolio</span>
            <h1 class="text-4xl font-black leading-tight text-white md:text-5xl">Fine Art Gallery</h1>
            <p class="mt-4 text-sm leading-relaxed text-gray-400">A curatorial collection of physical oils, acrylics, and mixed media works. Explore each piece and its details.</p>
          </header>
          <div data-cms-block="project-grid" class="min-h-24 border border-dashed border-[#444] p-8 text-center text-gray-400">Live fine art projects</div>
        </section>
      `,
    },
  ];

  for (const p of corePages) {
    const existing = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, p.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(pages).values({
        slug: p.slug,
        title: p.title,
        status: p.status,
        htmlCache: p.htmlCache,
      });
      console.log(`Seeded page: ${p.title} (${p.slug})`);
    } else {
      console.log(
        `Skipped existing page to preserve edits: ${p.title} (${p.slug})`,
      );
    }
  }

  let [homePage] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, "/"))
    .limit(1);

  if (homePage) {
    const updatedHeroHtml = replacePlaceholderHeroHtml(
      homePage.htmlCache || "",
    );
    const updatedHeroProject = updatePlaceholderHeroProject(homePage.gjsData);
    const heroHtmlChanged = updatedHeroHtml !== homePage.htmlCache;
    const heroProjectChanged =
      updatedHeroProject !== null &&
      JSON.stringify(updatedHeroProject) !== JSON.stringify(homePage.gjsData);

    if (heroHtmlChanged || heroProjectChanged) {
      await db
        .update(pages)
        .set({
          ...(heroHtmlChanged && { htmlCache: updatedHeroHtml }),
          ...(heroProjectChanged && { gjsData: updatedHeroProject }),
          updatedAt: new Date(),
        })
        .where(eq(pages.id, homePage.id));
      console.log(
        "Updated the Home hero image and responsive GrapesJS styles.",
      );

      [homePage] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, homePage.id))
        .limit(1);
    }
  }

  const marker = 'data-cms-block="testimonials-carousel"';
  const hasEditorProject = Array.isArray(
    (homePage?.gjsData as { pages?: unknown } | null)?.pages,
  );
  const editorHasMarker = hasTestimonialsMarker(homePage?.gjsData);

  if (homePage?.htmlCache) {
    let updatedHtml = homePage.htmlCache;
    if (!updatedHtml.includes(marker)) {
      const replacement = `<div ${marker} class="py-16"><h2 class="text-3xl font-serif text-white text-center">What Publishers &amp; Clients Say</h2></div>`;
      const convertedHtml = replaceSectionContaining(
        updatedHtml,
        "What Publishers & Clients Say",
        replacement,
      );
      if (!convertedHtml) {
        console.log(
          "Skipped testimonial conversion: Could not locate the cached HTML section.",
        );
        return;
      }
      updatedHtml = convertedHtml;
    }

    const balancedHtml = splitHtmlRootAroundMarker(updatedHtml);
    if (!balancedHtml) {
      console.log(
        "Skipped testimonial conversion: Could not balance the cached HTML.",
      );
      return;
    }
    updatedHtml = balancedHtml;

    let updatedEditorData = homePage.gjsData;
    if (hasEditorProject) {
      if (!editorHasMarker) {
        updatedEditorData = replaceEditorSection(
          homePage.gjsData,
          "What Publishers & Clients Say",
        );
      }
      if (!updatedEditorData) {
        console.log(
          "Skipped testimonial conversion: Could not locate the editor source section.",
        );
        return;
      }

      const balancedEditorData = splitEditorRootAroundMarker(updatedEditorData);
      if (!balancedEditorData) {
        console.log(
          "Skipped testimonial conversion: Could not balance the editor source.",
        );
        return;
      }
      updatedEditorData = balancedEditorData;
    }

    const changed =
      updatedHtml !== homePage.htmlCache ||
      JSON.stringify(updatedEditorData) !== JSON.stringify(homePage.gjsData);

    if (changed) {
      const updateValues =
        updatedEditorData !== null && typeof updatedEditorData === "object"
          ? {
              htmlCache: updatedHtml,
              gjsData: updatedEditorData,
              updatedAt: new Date(),
            }
          : { htmlCache: updatedHtml, updatedAt: new Date() };

      await db.update(pages).set(updateValues).where(eq(pages.id, homePage.id));
      console.log(
        "Placed the testimonials carousel between balanced homepage sections.",
      );
    } else {
      console.log("Homepage testimonials are already converted.");
    }
  }

  console.log("Core pages professional upgrade complete.");
}

seedAllPages().catch(console.error);
