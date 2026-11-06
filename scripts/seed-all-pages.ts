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
const HERO_TAGLINE = "";

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
          <section data-hero-section="true" class="hero-reveal-container" style="position:relative; width:100%; min-height:85vh; overflow:hidden; display:flex; align-items:center; justify-content:center;">
            <img src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_900,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" alt="Sourav Mitra - Hero Artwork" width="1920" height="900" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center;" />
            <div class="hero-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.45);"></div>
            <div class="hero-content" style="position:relative; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:3rem 1.25rem; max-width:56rem; margin:0 auto; width:100%;">
              <h1 style="font-size:clamp(2.4rem, 8vw, 6rem); font-family:serif; color:#FFFFFF; margin-bottom:1.5rem; letter-spacing:-0.02em; text-shadow:0 4px 12px rgba(0,0,0,0.6); line-height:1.15;">Sourav Mitra</h1>
              <a href="/book-covers" style="display:inline-block; padding:0.875rem 2.25rem; background:#C5A059; color:#000; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; font-size:0.75rem; text-decoration:none; border-radius:2px;">Explore My Work</a>
            </div>
          </section>

          <section class="px-6 sm:px-10 max-w-6xl mx-auto w-full">
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

          <!-- Animated Counters Section (Fully Editable in Visual Editor) -->
          <section class="bg-[#111111] py-12 border-t border-[#333333]" data-cms-section="counters">
            <div class="container mx-auto px-6 sm:px-10 max-w-6xl grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div class="counter-item text-center p-4" data-counter="item">
                <div class="counter-number text-4xl sm:text-5xl font-bold text-[#C5A059] font-mono tracking-tight" data-counter-target="150" data-counter-suffix="+">150+</div>
                <div class="counter-label text-xs sm:text-sm uppercase tracking-widest text-[#D4D4D4] mt-2 font-medium">Projects Completed</div>
              </div>
              <div class="counter-item text-center p-4" data-counter="item">
                <div class="counter-number text-4xl sm:text-5xl font-bold text-[#C5A059] font-mono tracking-tight" data-counter-target="50" data-counter-suffix="+">50+</div>
                <div class="counter-label text-xs sm:text-sm uppercase tracking-widest text-[#D4D4D4] mt-2 font-medium">Happy Clients</div>
              </div>
              <div class="counter-item text-center p-4" data-counter="item">
                <div class="counter-number text-4xl sm:text-5xl font-bold text-[#C5A059] font-mono tracking-tight" data-counter-target="10" data-counter-suffix="+">10+</div>
                <div class="counter-label text-xs sm:text-sm uppercase tracking-widest text-[#D4D4D4] mt-2 font-medium">Years Experience</div>
              </div>
            </div>
          </section>

          <section class="px-6 sm:px-10 py-16 sm:py-20 text-center">
            <h2 class="text-3xl sm:text-4xl font-serif mb-8 text-[#FFFFFF]">Let's Create Something Extraordinary Together</h2>
            <a href="/contact" class="inline-block px-8 py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-xs">Start a Project</a>
          </section>

          <!-- Client Logos Section (Animated & Customizable) — placed at the bottom, just above the footer -->
          <section data-cms-block="clients-section" data-anim-type="marquee" data-anim-speed="normal" data-anim-direction="left" data-anim-pause="true" data-hover-effect="scale" data-heading="Clients" data-logo-height="44px" data-section-height="auto" class="clients-section py-16 border-t border-[#222]">
            <div class="flex flex-col items-center">
              <h2 class="text-3xl font-bold text-white mb-2 tracking-tight">Clients</h2>
              <div class="w-8 h-0.5 bg-gray-400 opacity-70 mb-14"></div>
              <div class="client-marquee-wrapper w-full overflow-hidden">
                <div class="client-marquee-track anim-left pause-on-hover flex gap-12 items-center">
                  <img src="https://nyj2ucc9ur7y9rzh.public.blob.vercel-storage.com/39179fee_signet3-T4qa3Gb9M1P98UOpZlewVnBXaPxqgP.jpg" alt="Signet" class="h-10 sm:h-11 md:h-12 w-auto object-contain opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300" />
                  <img src="/clients/talo.png" alt="talo" class="h-10 sm:h-11 md:h-12 w-auto object-contain opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300" />
                  <img src="/clients/solid_state.png" alt="SOLID STATE" class="h-10 sm:h-11 md:h-12 w-auto object-contain opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300" />
                  <img src="/clients/noted.png" alt="NOTED" class="h-10 sm:h-11 md:h-12 w-auto object-contain opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300" />
                  <img src="/clients/goan.png" alt="GOAN" class="h-10 sm:h-11 md:h-12 w-auto object-contain opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300" />
                  <img src="/clients/mowi.png" alt="MOWI" class="h-10 sm:h-11 md:h-12 w-auto object-contain opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300" />
                </div>
              </div>
            </div>
          </section>
        </div>
      `,
    },
    {
      slug: "about",
      title: "About",
      status: "published" as const,
      htmlCache: `
        <div class="px-5 sm:px-8 md:px-10 py-8 sm:py-12 max-w-4xl mx-auto text-[#D4D4D4] bg-black">
          <div class="mb-8">
            <span class="text-xs font-bold uppercase tracking-[0.25em] text-[#C5A059] block mb-2">Introduction</span>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-serif text-white mb-3 tracking-tight">About Myself...</h1>
            <div class="w-12 h-1 bg-[#C5A059] mb-5"></div>
            <p class="text-base sm:text-lg mb-8 leading-relaxed text-[#E0E0E0]">I am Sourav Mitra, a professional illustrator, book cover designer, and fine artist based in India. My work explores the intersection of dark atmospheric storytelling and traditional illustrative techniques.</p>
          </div>
          
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
        </div>
      `,
    },
    {
      slug: "contact",
      title: "Contact",
      status: "published" as const,
      htmlCache: `
        <div class="w-full max-w-4xl mx-auto py-6 sm:py-8 px-4" style="width: 100%; max-width: 900px; margin: 0 auto; box-sizing: border-box; font-family: sans-serif;">
          <div style="display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center; align-items: stretch;">
            <!-- Left Card -->
            <div class="contact-card" style="background-color: #DBDBDB; color: #000000; padding: 2.25rem 2rem; width: 100%; max-width: 340px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border-radius: 0;">
              <div>
                <h1 style="font-size: 2.25rem; font-weight: 500; margin: 0 0 1.25rem 0; line-height: 1.15; color: #000000;">Hello,</h1>
                <div style="font-size: 0.85rem; line-height: 1.6; margin: 0 0 1.5rem 0; color: #111111;">
                  <p style="margin: 0 0 1rem 0;">
                    Got a story that needs a<br>cover? An idea you'd like<br>illustrated? Or just want to<br>share what you felt looking at<br>my work?
                  </p>
                  <p style="margin: 0;">I'd love to hear from you.</p>
                </div>
              </div>
              <div style="margin-top: 2rem;">
                <p style="font-size: 0.85rem; margin: 0 0 1rem 0; color: #000000; font-weight: 400;">
                  <a href="mailto:souravmitra045@gmail.com" style="color: #000000; text-decoration: none;">souravmitra045@gmail.com</a>
                </p>
                <div class="contact-social-icons-row" style="display: flex; gap: 0.5rem; align-items: center;">
                  <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none;">
                    <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                  </a>
                  <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none;">
                    <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                  <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Threads" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none;">
                    <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098c1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015c-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164c1.43 1.783 3.631 2.698 6.54 2.717c2.623-.02 4.358-.631 5.8-2.045c1.647-1.613 1.618-3.593 1.09-4.798c-.31-.71-.873-1.3-1.634-1.75c-.192 1.352-.622 2.446-1.284 3.272c-.886 1.102-2.14 1.704-3.73 1.79c-1.202.065-2.361-.218-3.259-.801c-1.063-.689-1.685-1.74-1.752-2.964c-.065-1.19.408-2.285 1.33-3.082c.88-.76 2.119-1.207 3.583-1.291a14 14 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757c-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.18c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388q.163.07.321.142c1.49.7 2.58 1.761 3.154 3.07c.797 1.82.871 4.79-1.548 7.158c-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69q-.362 0-.739.021c-1.836.103-2.98.946-2.916 2.143c.067 1.256 1.452 1.839 2.784 1.767c1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221"/></svg>
                  </a>
                  <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none;">
                    <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M20.447 20.452H16.89v-5.569c0-1.328-.026-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.266 2.37 4.266 5.455v6.286zM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM3.555 20.452H7.12V9H3.555v11.452z"/></svg>
                  </a>
                  <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="X" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none;">
                    <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                  </a>
                  <a href="#" class="contact-social-icon" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" style="display: inline-flex; width: 24px; height: 24px; background: #000000; border-radius: 50%; align-items: center; justify-content: center; text-decoration: none;">
                    <svg style="width: 12px; height: 12px; fill: #FFFFFF;" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.161 9.429 7.62 11.19-.105-.95-.2-2.413.042-3.455.218-.937 1.407-5.963 1.407-5.963s-.36-.72-.36-1.782c0-1.669.968-2.915 2.171-2.915 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.567-.992 3.993-.283 1.193.599 2.165 1.775 2.165 2.13 0 3.768-2.245 3.768-5.486 0-2.868-2.061-4.873-5.006-4.873-3.411 0-5.416 2.56-5.416 5.204 0 1.031.397 2.138.893 2.739.098.118.112.221.083.341-.091.375-.293 1.193-.333 1.359-.052.219-.172.265-.398.159-1.487-.692-2.417-2.872-2.417-4.627 0-3.766 2.736-7.222 7.891-7.222 4.144 0 7.366 2.953 7.366 6.9 0 4.117-2.596 7.43-6.2 7.43-1.211 0-2.35-.629-2.741-1.371l-.745 2.84c-.269 1.039-1 2.34-1.49 3.133 1.122.347 2.312.535 3.55.535 6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                  </a>
                </div>
              </div>
            </div>
            <!-- Right Form Container -->
            <div data-cms-block="contact-form" style="width: 100%; max-width: 450px; display: flex; flex-direction: column; gap: 0.9rem; box-sizing: border-box; justify-content: center;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label data-label-first-name style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">First Name *</label>
                  <div style="background: #000000; border: 1px solid #FFFFFF; height: 32px; box-sizing: border-box;"></div>
                </div>
                <div>
                  <label data-label-last-name style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">Last Name *</label>
                  <div style="background: #000000; border: 1px solid #FFFFFF; height: 32px; box-sizing: border-box;"></div>
                </div>
              </div>
              <div>
                <label data-label-email style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">Email *</label>
                <div style="background: #000000; border: 1px solid #FFFFFF; height: 32px; box-sizing: border-box;"></div>
              </div>
              <div>
                <label data-label-message style="display: block; color: #FFFFFF; font-size: 0.8rem; margin-bottom: 0.35rem;">Message</label>
                <div style="background: #000000; border: 1px solid #FFFFFF; height: 70px; box-sizing: border-box;"></div>
              </div>
              <div style="display: flex; justify-content: center; gap: 1.5rem; padding: 0.25rem 0;">
                <span data-role-option style="color: #FFFFFF; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem;">
                  <span style="display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 1px solid #FFFFFF;"></span> Publisher
                </span>
                <span data-role-option style="color: #FFFFFF; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem;">
                  <span style="display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 1px solid #FFFFFF;"></span> Writer
                </span>
                <span data-role-option style="color: #FFFFFF; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem;">
                  <span style="display: inline-block; width: 13px; height: 13px; border-radius: 50%; border: 1px solid #FFFFFF;"></span> Individual
                </span>
              </div>
              <div class="contact-submit-btn" data-submit-btn data-btn-bg="#DBDBDB" data-btn-color="#000000" style="background-color: #DBDBDB; color: #000000; text-align: center; padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: 500; cursor: pointer;">
                Send
              </div>
            </div>
          </div>
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

  const [contactPage] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, "contact"))
    .limit(1);

  if (contactPage) {
    const isOldPlaceholder =
      !contactPage.htmlCache ||
      contactPage.htmlCache.includes('<div data-cms-block="contact-form"></div>') ||
      !contactPage.htmlCache.includes("contact-card");

    if (isOldPlaceholder) {
      const newContactHtml = corePages.find((p) => p.slug === "contact")?.htmlCache;
      if (newContactHtml) {
        await db
          .update(pages)
          .set({
            htmlCache: newContactHtml,
            updatedAt: new Date(),
          })
          .where(eq(pages.id, contactPage.id));
        console.log("Updated contact page with editable two-column layout.");
      }
    }
  }

  // Ensure Clients section is moved from About page to Home page
  const [aboutPageRecord] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, "about"))
    .limit(1);

  if (aboutPageRecord && aboutPageRecord.htmlCache) {
    const clientRegex = /<section[^>]*>[\s\S]*?<h2[^>]*>\s*Clients\s*<\/h2>[\s\S]*?<\/section>/i;
    if (clientRegex.test(aboutPageRecord.htmlCache)) {
      const cleanedAboutHtml = aboutPageRecord.htmlCache.replace(clientRegex, "").trim();
      const cleanedGjsData = aboutPageRecord.gjsData as SavedGrapesProject | null;
      if (cleanedGjsData?.pages?.[0]?.frames?.[0]?.component?.components) {
        const topComps = cleanedGjsData.pages[0].frames[0].component.components;
        const targetContainer = topComps[0]?.components ? topComps[0].components : topComps;
        const filtered = targetContainer.filter((comp: SavedGrapesComponent) => {
          const str = JSON.stringify(comp);
          return !(str.includes('"Clients"') && (str.includes("client") || str.includes("i9xipt") || str.includes("c20462")));
        });
        if (topComps[0]?.components) {
          topComps[0].components = filtered;
        } else {
          cleanedGjsData.pages[0].frames[0].component.components = filtered;
        }
      }
      await db
        .update(pages)
        .set({
          htmlCache: cleanedAboutHtml,
          gjsData: cleanedGjsData,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, aboutPageRecord.id));
      console.log("Cleaned Clients section from About page database record.");
    }
  }

  console.log("Core pages professional upgrade complete.");
}

seedAllPages().catch(console.error);
