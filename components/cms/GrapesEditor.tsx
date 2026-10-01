"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import grapesjs from "grapesjs";
import type { Editor, ToolbarButtonProps, Component, ResizerOptions } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import CustomFontModal from "./CustomFontModal";
import { CustomFont, formatFontFaceCss } from "@/lib/fonts";
import { initCountersInContainer } from "@/lib/counter-animation";
type GrapesProjectData = ReturnType<Editor["getProjectData"]>;

interface GrapesEditorProps {
  initialData?: unknown;
  initialHtml?: string;
  initialCss?: string;
  onSave?: (projectData: GrapesProjectData, html: string, css: string) => void;
  onPublish?: (
    projectData: GrapesProjectData,
    html: string,
    css: string,
  ) => void;
}

export interface GrapesEditorContent {
  projectData: GrapesProjectData;
  html: string;
  css: string;
}

export interface GrapesEditorHandle {
  getCurrentContent: () => GrapesEditorContent | null;
  refresh?: () => void;
}

function isProjectData(value: unknown): value is GrapesProjectData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Array.isArray((value as Record<string, unknown>).pages);
}

function registerCmsDynamicBlockTypes(editorInstance: Editor) {
  const dynamicBlockDefaults = {
    droppable: true,
    editable: true,
    draggable: true,
    removable: true,
    copyable: true,
    resizable: {
      tl: true,
      tc: true,
      tr: true,
      cl: true,
      cr: true,
      bl: true,
      bc: true,
      br: true,
      step: 1,
      minDim: 10,
      currentUnit: true,
      keyWidth: "width",
      keyHeight: "height",
    },
  };

  editorInstance.Components.addType("default", {
    model: {
      defaults: {
        resizable: {
          tl: true,
          tc: true,
          tr: true,
          cl: true,
          cr: true,
          bl: true,
          bc: true,
          br: true,
          step: 1,
          minDim: 10,
          currentUnit: true,
          keyWidth: "width",
          keyHeight: "height",
        },
      },
    },
  });

  editorInstance.Components.addType("project-grid", {
    isComponent: (el: HTMLElement) =>
      el.getAttribute?.("data-cms-block") === "project-grid"
        ? { type: "project-grid" }
        : undefined,
    model: {
      defaults: {
        ...dynamicBlockDefaults,
        attributes: { "data-cms-block": "project-grid" },
      },
    },
  });

  editorInstance.Components.addType("testimonials-carousel", {
    isComponent: (el: HTMLElement) =>
      el.getAttribute?.("data-cms-block") === "testimonials-carousel"
        ? { type: "testimonials-carousel" }
        : undefined,
    model: {
      defaults: {
        ...dynamicBlockDefaults,
        attributes: { "data-cms-block": "testimonials-carousel" },
        traits: [
          {
            type: "button",
            name: "edit_testimonials_btn",
            label: "Testimonials Carousel",
            text: "💬 Edit Slides & Quotes",
            command: "open-testimonials-editor",
          },
        ],
      },
    },
  });

  editorInstance.Components.addType("project-carousel", {
    isComponent: (el: HTMLElement) =>
      el.getAttribute?.("data-cms-block") === "project-carousel"
        ? { type: "project-carousel" }
        : undefined,
    model: {
      defaults: {
        ...dynamicBlockDefaults,
        attributes: { "data-cms-block": "project-carousel" },
        traits: [
          {
            type: "button",
            name: "edit_project_carousel_btn",
            label: "Projects Carousel",
            text: "🖼️ Edit Carousel Heading",
            command: "open-project-carousel-editor",
          },
        ],
      },
    },
  });

  editorInstance.Components.addType("contact-form", {
    isComponent: (el: HTMLElement) =>
      el.getAttribute?.("data-cms-block") === "contact-form"
        ? { type: "contact-form" }
        : undefined,
    model: {
      defaults: {
        ...dynamicBlockDefaults,
        attributes: { "data-cms-block": "contact-form" },
      },
    },
  });

  editorInstance.Components.addType("counter-item", {
    isComponent: (el: HTMLElement) =>
      el.getAttribute?.("data-counter") === "item" ||
      el.classList?.contains?.("counter-item")
        ? { type: "counter-item" }
        : undefined,
    model: {
      defaults: {
        selectable: true,
        hoverable: true,
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        traits: [
          {
            type: "text",
            name: "counter_item_num_val",
            label: "Counter Number",
            placeholder: "e.g. 150+",
          },
          {
            type: "text",
            name: "counter_item_lbl_val",
            label: "Counter Label",
            placeholder: "e.g. Projects Completed",
          },
          {
            type: "button",
            name: "play_counter_anim",
            label: "Animation Test",
            text: "▶ Play Counter Animation",
            command: "preview-counter-animation",
          },
        ],
      },
      init() {
        const syncTraitsFromChildren = () => {
          const numComp =
            this.find?.(".counter-number")?.[0] ||
            this.find?.("[data-counter-target]")?.[0];
          const lblComp = this.find?.(".counter-label")?.[0];
          if (numComp) {
            const numText =
              numComp.get("content") ||
              (numComp.components?.()?.models?.[0] as unknown as { get?: (k: string) => string })?.get?.("content") ||
              numComp.getAttributes()["data-counter-target"] ||
              "";
            if (numText && typeof numText === "string") {
              this.set("counter_item_num_val", numText);
            }
          }
          if (lblComp) {
            const lblText =
              lblComp.get("content") ||
              (lblComp.components?.()?.models?.[0] as unknown as { get?: (k: string) => string })?.get?.("content") ||
              "";
            if (lblText && typeof lblText === "string") {
              this.set("counter_item_lbl_val", lblText);
            }
          }
        };

        syncTraitsFromChildren();
        this.on("change:selected", (_comp: unknown, isSelected: boolean) => {
          if (isSelected) syncTraitsFromChildren();
        });

        this.on("change:counter_item_num_val", () => {
          const val = this.get("counter_item_num_val");
          if (typeof val === "string" && val.trim() !== "") {
            const numComp =
              this.find?.(".counter-number")?.[0] ||
              this.find?.("[data-counter-target]")?.[0];
            if (numComp) {
              numComp.components(val);
              numComp.set("counter_display_val", val);
              const match = val.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
              if (match) {
                const num = parseFloat(match[2].replace(/,/g, ""));
                if (!Number.isNaN(num)) {
                  numComp.addAttributes({
                    "data-counter-target": String(num),
                    "data-counter-prefix": match[1] || "",
                    "data-counter-suffix": match[3] || "",
                  });
                }
              }
            }
          }
        });

        this.on("change:counter_item_lbl_val", () => {
          const val = this.get("counter_item_lbl_val");
          if (typeof val === "string") {
            const lblComp = this.find?.(".counter-label")?.[0];
            if (lblComp) {
              lblComp.components(val);
            }
          }
        });
      },
    },
  });

  editorInstance.Components.addType("counter-number", {
    extend: "text",
    isComponent: (el: HTMLElement) =>
      el.classList?.contains?.("counter-number") ||
      el.hasAttribute?.("data-counter-target")
        ? { type: "counter-number" }
        : undefined,
    model: {
      defaults: {
        type: "text",
        tagName: "div",
        editable: true,
        selectable: true,
        hoverable: true,
        draggable: true,
        droppable: false,
        traits: [
          {
            type: "text",
            name: "counter_display_val",
            label: "Display Value",
            placeholder: "e.g. 150+",
          },
          {
            type: "number",
            name: "data-counter-target",
            label: "Target Value",
            placeholder: "150",
          },
          {
            type: "text",
            name: "data-counter-suffix",
            label: "Suffix",
            placeholder: "e.g. +",
          },
          {
            type: "text",
            name: "data-counter-prefix",
            label: "Prefix",
            placeholder: "e.g. $",
          },
          {
            type: "number",
            name: "data-counter-duration",
            label: "Duration (ms)",
            placeholder: "2000",
          },
          {
            type: "button",
            name: "play_counter_anim",
            label: "Animation Test",
            text: "▶ Play Counter Animation",
            command: "preview-counter-animation",
          },
        ],
      },
      init() {
        const getCurrText = () => {
          const content = this.get("content");
          if (content && typeof content === "string") return content;
          const firstChild = this.components?.()?.models?.[0] as unknown as { get?: (k: string) => string };
          const childContent = firstChild?.get?.("content");
          if (childContent && typeof childContent === "string") return childContent;
          const target = this.getAttributes()["data-counter-target"];
          const suffix = this.getAttributes()["data-counter-suffix"] || "+";
          if (target) return `${target}${suffix}`;
          return "";
        };

        const initialVal = getCurrText();
        if (initialVal) {
          this.set("counter_display_val", initialVal);
        }

        this.on("change:selected", (_comp: unknown, isSelected: boolean) => {
          if (isSelected) {
            const curr = getCurrText();
            if (curr) this.set("counter_display_val", curr);
          }
        });

        const syncFromText = (raw: string) => {
          if (!raw) return;
          this.set("counter_display_val", raw);
          const match = raw.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
          if (match) {
            const num = parseFloat(match[2].replace(/,/g, ""));
            if (!Number.isNaN(num)) {
              this.addAttributes({
                "data-counter-target": String(num),
                "data-counter-prefix": match[1] || "",
                "data-counter-suffix": match[3] || "",
              });
            }
          }
        };

        // When trait 'Display Value' is modified
        this.on("change:counter_display_val", () => {
          const val = this.get("counter_display_val");
          if (typeof val === "string" && val.trim() !== "") {
            this.components(val);
            syncFromText(val);
          }
        });

        // When data-counter-target, suffix, or prefix traits change
        const updateFromAttributes = () => {
          const target = this.getAttributes()["data-counter-target"];
          const suffix = this.getAttributes()["data-counter-suffix"] ?? "+";
          const prefix = this.getAttributes()["data-counter-prefix"] ?? "";
          if (target !== undefined && target !== null && String(target) !== "") {
            const formatted = `${prefix}${target}${suffix}`;
            this.components(formatted);
            this.set("counter_display_val", formatted);
          }
        };

        this.on("change:attributes:data-counter-target", updateFromAttributes);
        this.on("change:attributes:data-counter-suffix", updateFromAttributes);
        this.on("change:attributes:data-counter-prefix", updateFromAttributes);

        // When content is directly typed/edited on the canvas
        this.on("change:content", () => {
          const raw = this.get("content");
          if (typeof raw === "string") syncFromText(raw);
        });

        this.on("change:components", () => {
          const text = getCurrText();
          if (text) syncFromText(text);
        });
      },
    },
  });

  editorInstance.Components.addType("counter-label", {
    extend: "text",
    isComponent: (el: HTMLElement) =>
      el.classList?.contains?.("counter-label")
        ? { type: "counter-label" }
        : undefined,
    model: {
      defaults: {
        type: "text",
        tagName: "div",
        editable: true,
        selectable: true,
        hoverable: true,
        draggable: true,
        droppable: false,
      },
    },
  });
}

const GrapesEditor = forwardRef<GrapesEditorHandle, GrapesEditorProps>(
  function GrapesEditor(
    { initialData, initialHtml, initialCss, onSave, onPublish },
    ref,
  ) {
    const editorRef = useRef<Editor | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const initialCssRef = useRef<string>(initialCss || "");
    initialCssRef.current = initialCss || "";

    const [activeRightTab, setActiveRightTab] = useState<
      "styles" | "traits" | "layers"
    >("styles");
    const [isPreviewActive, setIsPreviewActive] = useState(false);
    const [showFontModal, setShowFontModal] = useState(false);
    const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
    const [hasSelectedElement, setHasSelectedElement] = useState(false);
    const customFontsRef = useRef<CustomFont[]>([]);
    customFontsRef.current = customFonts;

    const exportCleanCss = (editor: Editor): string => {
      let css = editor.getCss() ?? "";
      if (initialCssRef.current && initialCssRef.current.trim()) {
        const initial = initialCssRef.current.trim();
        if (!css || css.trim().length <= 50) {
          return initial;
        }
        // Extract all rules from initialCss and preserve any that are not already present in css
        const initialBlocks = initial.split("}");
        for (const block of initialBlocks) {
          const trimmedBlock = block.trim();
          if (!trimmedBlock) continue;
          const openBrace = trimmedBlock.indexOf("{");
          if (openBrace === -1) continue;
          const selector = trimmedBlock.substring(0, openBrace).trim();
          if (
            selector &&
            !css.includes(selector) &&
            !selector.startsWith("*") &&
            !selector.startsWith("body")
          ) {
            css += `\n${trimmedBlock}}`;
          }
        }
      }
      return css;
    };

    const syncAllCounters = (editor: Editor) => {
      try {
        const wrapper = editor.getWrapper();
        if (!wrapper) return;

        const counterComps = wrapper.find(
          ".counter-number, [data-counter-target], .counter-item, [data-counter='item']",
        );

        const canvasDoc = editor.Canvas?.getDocument();

        const processComp = (comp: Component) => {
          const el = comp.getEl();
          let rawText = "";

          if (el && typeof el.textContent === "string" && el.textContent.trim()) {
            rawText = el.textContent.trim();
          } else {
            const content = comp.get("content");
            if (typeof content === "string" && content.trim()) {
              rawText = content.trim();
            } else {
              const children = comp.components?.();
              if (children && children.models) {
                for (const child of children.models) {
                  const cContent = (
                    child as unknown as { get?: (k: string) => string }
                  ).get?.("content");
                  if (typeof cContent === "string" && cContent.trim()) {
                    rawText = cContent.trim();
                    break;
                  }
                }
              }
            }
          }

          if (rawText) {
            const match = rawText.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
            if (match) {
              const num = parseFloat(match[2].replace(/,/g, ""));
              if (!Number.isNaN(num)) {
                comp.addAttributes({
                  "data-counter-target": String(num),
                  "data-counter-prefix": match[1] || "",
                  "data-counter-suffix": match[3] || "+",
                });
                comp.set("counter_display_val", rawText);
              }
            }
          }
        };

        counterComps.forEach((comp) => {
          if (
            comp.getClasses?.().includes("counter-number") ||
            comp.getAttributes?.()["data-counter-target"] !== undefined
          ) {
            processComp(comp);
          } else {
            const childNum =
              comp.find?.(".counter-number")?.[0] ||
              comp.find?.("[data-counter-target]")?.[0];
            if (childNum) {
              processComp(childNum);
            }
          }
        });

        if (canvasDoc) {
          const domCounters = canvasDoc.querySelectorAll<HTMLElement>(
            ".counter-number, [data-counter-target]",
          );
          domCounters.forEach((el) => {
            const raw = el.textContent?.trim() || "";
            const m = raw.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
            if (m) {
              const num = parseFloat(m[2].replace(/,/g, ""));
              if (!Number.isNaN(num)) {
                el.setAttribute("data-counter-target", String(num));
                el.setAttribute("data-counter-prefix", m[1] || "");
                el.setAttribute("data-counter-suffix", m[3] || "+");
              }
            }
          });
        }
      } catch (err) {
        console.warn("Failed to sync counter components:", err);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        getCurrentContent: () => {
          const editor = editorRef.current;
          if (!editor) return null;

          syncAllCounters(editor);

          return {
            projectData: editor.getProjectData(),
            html: editor.getHtml() ?? "",
            css: exportCleanCss(editor),
          };
        },
        refresh: () => {
          editorRef.current?.refresh();
        },
      }),
      [],
    );

    const injectFontIntoDocumentAndCanvas = (font: CustomFont, ed: Editor) => {
      // 1. Host document head injection (for modal specimens & UI previews)
      const hostId = `custom-font-style-${font.id}`;
      if (!document.getElementById(hostId)) {
        if (font.type === "upload") {
          const style = document.createElement("style");
          style.id = hostId;
          style.textContent = formatFontFaceCss(font);
          document.head.appendChild(style);
        } else {
          const link = document.createElement("link");
          link.id = hostId;
          link.rel = "stylesheet";
          link.href = font.url;
          document.head.appendChild(link);
        }
      }

      // 2. Editor Canvas iframe document head injection
      try {
        const canvasDoc = ed.Canvas?.getDocument();
        if (canvasDoc && canvasDoc.head && !canvasDoc.getElementById(hostId)) {
          if (font.type === "upload") {
            const style = canvasDoc.createElement("style");
            style.id = hostId;
            style.textContent = formatFontFaceCss(font);
            canvasDoc.head.appendChild(style);
          } else {
            const link = canvasDoc.createElement("link");
            link.id = hostId;
            link.rel = "stylesheet";
            link.href = font.url;
            canvasDoc.head.appendChild(link);
          }
        }
      } catch (err) {
        console.warn("Canvas iframe head injection pending:", err);
      }

      // 3. Add to StyleManager 'font-family' property options
      try {
        interface StyleManagerProperty {
          getOptions?: () => Array<{ id?: string; label?: string } | string>;
          get?: (propName: string) => Array<{ id?: string; label?: string } | string> | undefined;
          addOption?: (opt: { id: string; label: string }) => void;
          set?: (propName: string, value: unknown) => void;
        }

        interface StyleManagerLike {
          getProperty: (sectorOrName: string, prop?: string) => unknown;
        }

        const sm = ed.StyleManager as unknown as StyleManagerLike | undefined;
        if (sm) {
          const fontProp = (sm.getProperty("Typography", "font-family") ||
            sm.getProperty("font-family")) as StyleManagerProperty | null | undefined;
          if (fontProp) {
            const fontId = `'${font.family}', sans-serif`;
            const fontLabel = `✨ ${font.family} (${
              font.type === "google"
                ? "Google"
                : font.type === "upload"
                  ? "Uploaded"
                  : "Custom"
            })`;
            const currentOpts =
              (typeof fontProp.getOptions === "function"
                ? fontProp.getOptions()
                : fontProp.get?.("options")) || [];

            const exists = currentOpts.some((opt: { id?: string } | string | null | undefined) => {
              const optId = typeof opt === "string" ? opt : opt?.id;
              return (
                optId &&
                (optId === fontId ||
                  optId.toLowerCase().includes(font.family.toLowerCase()))
              );
            });

            if (!exists) {
              if (typeof fontProp.addOption === "function") {
                fontProp.addOption({ id: fontId, label: fontLabel });
              } else if (typeof fontProp.set === "function") {
                fontProp.set("options", [
                  ...currentOpts,
                  { id: fontId, label: fontLabel },
                ]);
              }
            }
          }
        }
      } catch (err) {
        console.warn("StyleManager font-family option sync error:", err);
      }
    };

    const setupTypographyCustomFontButton = () => {
      const container = document.querySelector(".gjs-sm-container");
      if (!container) return;
      const titles = container.querySelectorAll(
        ".gjs-sm-sector-title, .gjs-sm-title",
      );
      titles.forEach((titleEl) => {
        if (
          titleEl.textContent?.includes("Typography") &&
          !titleEl.querySelector(".gjs-custom-add-font-btn")
        ) {
          const btn = document.createElement("button");
          btn.className = "gjs-custom-add-font-btn";
          btn.type = "button";
          btn.innerHTML = "+ Custom Font";
          btn.title =
            "Install Google Font, Web Font URL, or upload .woff2 font file";
          btn.style.cssText =
            "margin-left: auto; padding: 2px 7px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #1c1508; color: #C5A059; border: 1px solid rgba(197,160,89,0.4); border-radius: 2px; cursor: pointer; transition: all 0.2s;";
          btn.onmouseenter = () => {
            btn.style.background = "#C5A059";
            btn.style.color = "#000000";
          };
          btn.onmouseleave = () => {
            btn.style.background = "#1c1508";
            btn.style.color = "#C5A059";
          };
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowFontModal(true);
          };
          titleEl.appendChild(btn);
        }
      });
    };

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      if (destroyTimerRef.current !== null) {
        clearTimeout(destroyTimerRef.current);

        destroyTimerRef.current = null;
      }

      if (editorRef.current) {
        return;
      }

      const projectData = isProjectData(initialData) ? initialData : undefined;

      const fallbackHtml =
        typeof initialHtml === "string" && initialHtml.trim() !== ""
          ? initialHtml
          : `
          <section style="position: relative; width: 100%; min-height: 85vh; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; padding: 4rem 1.5rem;">
            <!-- Background Image (Editable, Replaceable, Deletable) -->
            <img 
              src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" 
              alt="Sourav Mitra - Hero Artwork" 
              style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" 
            />

            <!-- Dark overlay -->
            <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); pointer-events: none; z-index: 1;"></div>

            <!-- Text overlay centered on the image -->
            <div style="position: relative; z-index: 2; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
              <h1 style="font-size: 4rem; font-family: serif; color: #FFFFFF; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; text-shadow: 0 4px 20px rgba(0,0,0,0.8); line-height: 1.1;">
                Sourav Mitra
              </h1>

              <p style="font-size: 1.4rem; color: #E5E5E5; margin-bottom: 2.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.8); font-weight: 300;">
                550+ covers in 8+ years, and still learning.
              </p>

              <a
                href="/book-covers"
                style="display: inline-block; padding: 1rem 2.5rem; background-color: #C5A059; color: #000000; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.75rem; text-decoration: none; border-radius: 2px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"
              >
                Explore My Work
              </a>
            </div>
          </section>
        `;

      const editor = grapesjs.init({
        container: containerRef.current,

        height: "100%",
        width: "auto",

        storageManager: false,
        avoidInlineStyle: false,

        selectorManager: {
          appendTo: ".gjs-clm-tags",
          componentFirst: true,
        },

        plugins: [registerCmsDynamicBlockTypes],

        assetManager: {
          upload: "/api/media",
          uploadName: "file",
          autoAdd: true,
          assets: [],
        },

        traitManager: {
          appendTo: ".gjs-traits-container",
        },

        layerManager: {
          appendTo: ".gjs-layers-container",
        },

        /*
         * Load valid GrapesJS project data directly
         * during initialization.
         */
        ...(projectData
          ? {
              projectData,
            }
          : {
              components: fallbackHtml,
              style:
                typeof initialCss === "string" && initialCss.trim() !== ""
                  ? initialCss
                  : undefined,
            }),

        canvas: {
          styles: [
            "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
            "https://fonts.googleapis.com/css2?family=Almendra:ital,wght@0,400;0,700;1,400&family=Bellefair&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cardo:ital,wght@0,400;0,700;1,400&family=Castoro+Titling&family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400..900&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Crimson+Pro:ital,wght@0,300..900;1,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Faustina:ital,wght@0,300..800;1,300..800&family=Forum&family=Frank+Ruhl+Libre:wght@300..900&family=Italiana&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Marcellus&family=MedievalSharp&family=Merriweather:ital,wght@0,300..900;1,300..900&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Playfair+Display+SC:ital,wght@0,400;0,700;0,900;1,400&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Prata&family=Spectral:ital,wght@0,200..800;1,200..800&family=Unna:ital,wght@0,400;0,700;1,400&family=Vollkorn:ital,wght@0,400..900;1,400..900&display=swap",
            "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300..900;1,300..900&family=Be+Vietnam+Pro:ital,wght@0,300..900;1,300..900&family=Cabin:ital,wght@0,400..700;1,400..700&family=DM+Sans:ital,opsz,wght@0,9..40,300..900;1,9..40,300..900&family=Epilogue:ital,wght@0,300..900;1,300..900&family=Inter:wght@300..900&family=Jost:ital,wght@0,300..900;1,300..900&family=Lexend:wght@300..900&family=Manrope:wght@300..800&family=Montserrat:ital,wght@0,300..900;1,300..900&family=Outfit:wght@300..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Poppins:ital,wght@0,300..900;1,300..900&family=Raleway:ital,wght@0,300..900;1,300..900&family=Sora:wght@300..800&family=Space+Grotesk:wght@300..700&family=Syne:wght@400..800&family=Urbanist:ital,wght@0,300..900;1,300..900&family=Work+Sans:ital,wght@0,300..900;1,300..900&display=swap",
            "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Anton&family=Audiowide&family=Bebas+Neue&family=Bungee&family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Creepster&family=Dancing+Script:wght@400..700&family=Fira+Code:wght@400..700&family=Great+Vibes&family=JetBrains+Mono:ital,wght@0,300..800;1,300..800&family=Nosifer&family=Orbitron:wght@400..900&family=Oswald:wght@300..700&family=Parisienne&family=Pirata+One&family=Righteous&family=Russo+One&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Special+Elite&family=Teko:wght@400..700&family=Uncial+Antiqua&display=swap",
          ],
        },

        styleManager: {
          appendTo: ".gjs-sm-container",

          sectors: [
            {
              name: "Size & Spacing",
              open: true,
              properties: [
                {
                  name: "Width",
                  property: "width",
                  type: "integer",
                  units: ["px", "%", "vw", "rem", "em", "auto"],
                  defaults: "auto",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Height",
                  property: "height",
                  type: "integer",
                  units: ["px", "%", "vh", "rem", "em", "auto"],
                  defaults: "auto",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Min Width",
                  property: "min-width",
                  type: "integer",
                  units: ["px", "%", "vw", "rem", "auto"],
                  defaults: "auto",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Max Width",
                  property: "max-width",
                  type: "integer",
                  units: ["px", "%", "vw", "rem", "none", "auto"],
                  defaults: "none",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Min Height",
                  property: "min-height",
                  type: "integer",
                  units: ["px", "%", "vh", "rem", "auto"],
                  defaults: "auto",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Max Height",
                  property: "max-height",
                  type: "integer",
                  units: ["px", "%", "vh", "rem", "none", "auto"],
                  defaults: "none",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Box Sizing",
                  property: "box-sizing",
                  type: "select",
                  defaults: "border-box",
                  options: [
                    { id: "border-box", label: "Border Box" },
                    { id: "content-box", label: "Content Box" },
                  ],
                },
                {
                  name: "Margin Top",
                  property: "margin-top",
                  type: "integer",
                  units: ["px", "%", "rem", "auto"],
                  defaults: "0px",
                  step: 1,
                },
                {
                  name: "Margin Right",
                  property: "margin-right",
                  type: "integer",
                  units: ["px", "%", "rem", "auto"],
                  defaults: "0px",
                  step: 1,
                },
                {
                  name: "Margin Bottom",
                  property: "margin-bottom",
                  type: "integer",
                  units: ["px", "%", "rem", "auto"],
                  defaults: "0px",
                  step: 1,
                },
                {
                  name: "Margin Left",
                  property: "margin-left",
                  type: "integer",
                  units: ["px", "%", "rem", "auto"],
                  defaults: "0px",
                  step: 1,
                },
                {
                  name: "Padding Top",
                  property: "padding-top",
                  type: "integer",
                  units: ["px", "%", "rem"],
                  defaults: "0px",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Padding Right",
                  property: "padding-right",
                  type: "integer",
                  units: ["px", "%", "rem"],
                  defaults: "0px",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Padding Bottom",
                  property: "padding-bottom",
                  type: "integer",
                  units: ["px", "%", "rem"],
                  defaults: "0px",
                  min: 0,
                  step: 1,
                },
                {
                  name: "Padding Left",
                  property: "padding-left",
                  type: "integer",
                  units: ["px", "%", "rem"],
                  defaults: "0px",
                  min: 0,
                  step: 1,
                },
              ],
            },

            {
              name: "Position & Layout",
              open: true,
              buildProps: [
                "display",
                "position",
                "top",
                "right",
                "bottom",
                "left",
                "z-index",
                "overflow",
                "float",
                "clear",
              ],
            },
            {
              name: "Flexbox & Alignment",
              open: false,
              buildProps: [
                "flex-direction",
                "flex-wrap",
                "justify-content",
                "align-items",
                "align-content",
                "align-self",
                "order",
                "flex-basis",
                "flex-grow",
                "flex-shrink",
                "gap",
                "row-gap",
                "column-gap",
              ],
            },
            {
              name: "Grid Layout",
              open: false,
              buildProps: [
                "grid-template-columns",
                "grid-template-rows",
                "grid-auto-columns",
                "grid-auto-rows",
                "grid-auto-flow",
                "grid-column",
                "grid-row",
                "justify-items",
                "place-items",
              ],
            },
            {
              name: "Typography",
              open: false,
              properties: [
                {
                  name: "Font Family",
                  property: "font-family",
                  type: "select",
                  defaults: "inherit",
                  options: [
                    { id: "inherit", label: "Default / Inherit" },

                    // Classical, Roman & Monumental (Book Covers / Fantasy / Luxury)
                    {
                      id: "'Playfair Display', Georgia, serif",
                      label: "Playfair Display (Classical Serif)",
                    },
                    {
                      id: "'Playfair Display SC', Georgia, serif",
                      label: "Playfair Display SC (Small Caps / Title)",
                    },
                    {
                      id: "'Cinzel', serif",
                      label: "Cinzel (Classical Roman)",
                    },
                    {
                      id: "'Cinzel Decorative', serif",
                      label: "Cinzel Decorative (Ornate Fantasy Title)",
                    },
                    {
                      id: "'Cormorant Garamond', Garamond, serif",
                      label: "Cormorant Garamond (Fine Art Editorial)",
                    },
                    {
                      id: "'EB Garamond', Garamond, serif",
                      label: "EB Garamond (Humanist Classic)",
                    },
                    {
                      id: "'Bodoni Moda', 'Didot', serif",
                      label: "Bodoni Moda (Vogue Fashion Editorial)",
                    },
                    {
                      id: "'Marcellus', 'Times New Roman', serif",
                      label: "Marcellus (Sculpted Roman Elegance)",
                    },
                    {
                      id: "'Italiana', 'Didot', serif",
                      label: "Italiana (Italian Fashion Title)",
                    },
                    {
                      id: "'Prata', 'Didot', serif",
                      label: "Prata (Didone Tear-Drop Serif)",
                    },
                    {
                      id: "'Castoro Titling', serif",
                      label: "Castoro Titling (Stately Formal Title)",
                    },
                    {
                      id: "'Forum', serif",
                      label: "Forum (Antique Roman Monumental)",
                    },
                    {
                      id: "'Bellefair', serif",
                      label: "Bellefair (Slender Luxury Editorial)",
                    },
                    {
                      id: "'Unna', serif",
                      label: "Unna (Delicate Literary Serif)",
                    },
                    {
                      id: "'Almendra', serif",
                      label: "Almendra (Dark Fantasy & Gothic Novel)",
                    },
                    {
                      id: "'MedievalSharp', cursive",
                      label: "MedievalSharp (Illuminated Manuscript)",
                    },

                    // Literary & Editorial Serifs
                    {
                      id: "'Lora', Georgia, serif",
                      label: "Lora (Contemporary Book Editorial)",
                    },
                    {
                      id: "'Merriweather', Georgia, serif",
                      label: "Merriweather (Readable Literary Serif)",
                    },
                    {
                      id: "'Crimson Pro', serif",
                      label: "Crimson Pro (Prestigious Publishing)",
                    },
                    {
                      id: "'Newsreader', serif",
                      label: "Newsreader (Refined Editorial Long-Form)",
                    },
                    {
                      id: "'Spectral', serif",
                      label: "Spectral (Scholarly & Fiction Serif)",
                    },
                    {
                      id: "'Libre Baskerville', serif",
                      label: "Libre Baskerville (British Editorial)",
                    },
                    {
                      id: "'Cardo', serif",
                      label: "Cardo (Ancient & Scholarly Text)",
                    },
                    {
                      id: "'Faustina', serif",
                      label: "Faustina (Literary Classic)",
                    },
                    {
                      id: "'Frank Ruhl Libre', serif",
                      label: "Frank Ruhl Libre (Grand Headline Serif)",
                    },
                    {
                      id: "'Vollkorn', serif",
                      label: "Vollkorn (Warm Humanist Serif)",
                    },
                    {
                      id: "Georgia, serif",
                      label: "Georgia (Traditional Web Serif)",
                    },
                    {
                      id: "Garamond, 'Times New Roman', serif",
                      label: "Garamond (Old-Style Serif)",
                    },
                    {
                      id: "'Times New Roman', Times, serif",
                      label: "Times New Roman (Web Classic)",
                    },

                    // Modern Clean & Geometric Sans-Serif
                    {
                      id: "'Plus Jakarta Sans', -apple-system, sans-serif",
                      label: "Plus Jakarta Sans (Ultra Clean Modern)",
                    },
                    {
                      id: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      label: "Inter (High Legibility UI)",
                    },
                    {
                      id: "'Outfit', -apple-system, sans-serif",
                      label: "Outfit (Geometric Minimalist)",
                    },
                    {
                      id: "'Montserrat', sans-serif",
                      label: "Montserrat (Bold Architectural)",
                    },
                    {
                      id: "'Poppins', sans-serif",
                      label: "Poppins (Rounded Geometric)",
                    },
                    {
                      id: "'Raleway', sans-serif",
                      label: "Raleway (Light Elegant Sans)",
                    },
                    {
                      id: "'Space Grotesk', sans-serif",
                      label: "Space Grotesk (Neo-Brutalist Tech)",
                    },
                    {
                      id: "'Syne', sans-serif",
                      label: "Syne (Avant-Garde Expressive)",
                    },
                    {
                      id: "'DM Sans', sans-serif",
                      label: "DM Sans (Crisp Contemporary Sans)",
                    },
                    {
                      id: "'Urbanist', sans-serif",
                      label: "Urbanist (Futuristic Geometric Sans)",
                    },
                    {
                      id: "'Manrope', sans-serif",
                      label: "Manrope (Semi-Geometric Modern)",
                    },
                    {
                      id: "'Sora', sans-serif",
                      label: "Sora (Humanist Tech Sans)",
                    },
                    {
                      id: "'Lexend', sans-serif",
                      label: "Lexend (Hyper-Legible Clean Sans)",
                    },
                    {
                      id: "'Work Sans', sans-serif",
                      label: "Work Sans (Versatile Grotesque)",
                    },
                    {
                      id: "'Jost', sans-serif",
                      label: "Jost (Futura-Style Geometric)",
                    },
                    {
                      id: "'Be Vietnam Pro', sans-serif",
                      label: "Be Vietnam Pro (Contemporary Balanced)",
                    },
                    {
                      id: "'Cabin', sans-serif",
                      label: "Cabin (Humanist Warm Sans)",
                    },
                    {
                      id: "'Archivo', sans-serif",
                      label: "Archivo (Dynamic Editorial Sans)",
                    },
                    {
                      id: "'Epilogue', sans-serif",
                      label: "Epilogue (Expressive Contemporary Sans)",
                    },
                    {
                      id: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      label: "System UI (Apple / Segoe)",
                    },
                    {
                      id: "'Helvetica Neue', Arial, sans-serif",
                      label: "Helvetica Neue (Swiss Modern)",
                    },
                    {
                      id: "Arial, sans-serif",
                      label: "Arial (Standard Clean)",
                    },
                    {
                      id: "'Trebuchet MS', sans-serif",
                      label: "Trebuchet MS (Humanist Sans)",
                    },

                    // Display, Poster, Sci-Fi & Horror
                    {
                      id: "'Bebas Neue', sans-serif",
                      label: "Bebas Neue (Punchy Headline Sans)",
                    },
                    {
                      id: "'Oswald', sans-serif",
                      label: "Oswald (Condensed Bold Headline)",
                    },
                    {
                      id: "'Anton', sans-serif",
                      label: "Anton (Massive Impact Poster)",
                    },
                    {
                      id: "'Teko', sans-serif",
                      label: "Teko (Narrow Ultra-Condensed Title)",
                    },
                    {
                      id: "'Orbitron', sans-serif",
                      label: "Orbitron (Cyberpunk & Sci-Fi Display)",
                    },
                    {
                      id: "'Audiowide', cursive",
                      label: "Audiowide (Futuristic Galactic Tech)",
                    },
                    {
                      id: "'Russo One', sans-serif",
                      label: "Russo One (Bold Heroic Title)",
                    },
                    {
                      id: "'Righteous', cursive",
                      label: "Righteous (Retro-Futuristic Display)",
                    },
                    {
                      id: "'Bungee', cursive",
                      label: "Bungee (Urban Block Poster)",
                    },
                    {
                      id: "'Pirata One', cursive",
                      label: "Pirata One (Gothic Adventure Fantasy)",
                    },
                    {
                      id: "'Uncial Antiqua', cursive",
                      label: "Uncial Antiqua (Celtic & Ancient Myth)",
                    },
                    {
                      id: "'Creepster', cursive",
                      label: "Creepster (Horror & Supernatural)",
                    },
                    {
                      id: "'Nosifer', cursive",
                      label: "Nosifer (Bleeding Dark Horror)",
                    },

                    // Elegant Calligraphy & Script
                    {
                      id: "'Great Vibes', cursive",
                      label: "Great Vibes (Royal Calligraphy Script)",
                    },
                    {
                      id: "'Alex Brush', cursive",
                      label: "Alex Brush (Fluid Luxury Signature Script)",
                    },
                    {
                      id: "'Dancing Script', cursive",
                      label: "Dancing Script (Artistic Dynamic Script)",
                    },
                    {
                      id: "'Parisienne', cursive",
                      label: "Parisienne (French Art Deco Script)",
                    },

                    // Monospace & Screenplay Typewriter
                    {
                      id: "'Courier Prime', monospace",
                      label: "Courier Prime (Screenplay & Crisp Typewriter)",
                    },
                    {
                      id: "'Special Elite', cursive",
                      label: "Special Elite (Vintage Distressed Typewriter)",
                    },
                    {
                      id: "'Space Mono', monospace",
                      label: "Space Mono (Tech Monospace)",
                    },
                    {
                      id: "'JetBrains Mono', monospace",
                      label: "JetBrains Mono (Developer Minimalist)",
                    },
                    {
                      id: "'Fira Code', monospace",
                      label: "Fira Code (Modern Code Monospace)",
                    },
                    {
                      id: "'Courier New', Courier, monospace",
                      label: "Courier New (Classic Typewriter)",
                    },
                  ],
                },
                {
                  name: "Font Size",
                  property: "font-size",
                  type: "integer",
                  units: ["px", "rem", "em", "vw"],
                  defaults: "16px",
                  min: 8,
                  max: 160,
                  step: 1,
                },
                {
                  name: "Font Weight",
                  property: "font-weight",
                  type: "select",
                  defaults: "400",
                  options: [
                    { id: "100", label: "100 - Thin" },
                    { id: "200", label: "200 - Extra Light" },
                    { id: "300", label: "300 - Light" },
                    { id: "400", label: "400 - Regular" },
                    { id: "500", label: "500 - Medium" },
                    { id: "600", label: "600 - Semi Bold" },
                    { id: "700", label: "700 - Bold" },
                    { id: "800", label: "800 - Extra Bold" },
                    { id: "900", label: "900 - Black" },
                  ],
                },
                {
                  name: "Font Style",
                  property: "font-style",
                  type: "radio",
                  defaults: "normal",
                  options: [
                    { id: "normal", label: "Normal" },
                    { id: "italic", label: "Italic" },
                    { id: "oblique", label: "Oblique" },
                  ],
                },
                {
                  name: "Letter Spacing",
                  property: "letter-spacing",
                  type: "integer",
                  units: ["px", "em", "rem"],
                  defaults: "0px",
                  min: -5,
                  max: 30,
                  step: 0.5,
                },
                {
                  name: "Line Height",
                  property: "line-height",
                  type: "integer",
                  units: ["", "px", "em", "rem", "%"],
                  defaults: "1.5",
                  min: 0.5,
                  max: 4,
                  step: 0.1,
                },
                {
                  name: "Text Color",
                  property: "color",
                  type: "color",
                },
                {
                  name: "Text Align",
                  property: "text-align",
                  type: "radio",
                  defaults: "left",
                  options: [
                    { id: "left", label: "Left" },
                    { id: "center", label: "Center" },
                    { id: "right", label: "Right" },
                    { id: "justify", label: "Justify" },
                  ],
                },
                {
                  name: "Text Transform",
                  property: "text-transform",
                  type: "radio",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    { id: "uppercase", label: "UPPER" },
                    { id: "lowercase", label: "lower" },
                    { id: "capitalize", label: "Capital" },
                  ],
                },
                {
                  name: "Text Decoration",
                  property: "text-decoration",
                  type: "radio",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    { id: "underline", label: "Underline" },
                    { id: "line-through", label: "Strikethrough" },
                  ],
                },
                {
                  name: "Text Shadow",
                  property: "text-shadow",
                  type: "select",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    {
                      id: "0 2px 4px rgba(0,0,0,0.6)",
                      label: "Soft Shadow (0 2px 4px)",
                    },
                    {
                      id: "0 4px 12px rgba(0,0,0,0.85)",
                      label: "Deep Dark (0 4px 12px)",
                    },
                    {
                      id: "0 0 10px rgba(197, 160, 89, 0.65)",
                      label: "Gold Glow (#C5A059)",
                    },
                    {
                      id: "0 0 20px rgba(255, 255, 255, 0.7)",
                      label: "White Neon Glow",
                    },
                    {
                      id: "2px 2px 0px rgba(0,0,0,1)",
                      label: "Hard Retro Shadow",
                    },
                  ],
                },
                {
                  name: "White Space",
                  property: "white-space",
                  type: "select",
                  defaults: "normal",
                  options: [
                    { id: "normal", label: "Normal" },
                    { id: "nowrap", label: "No Wrap" },
                    { id: "pre", label: "Pre" },
                    { id: "pre-line", label: "Pre-Line" },
                    { id: "pre-wrap", label: "Pre-Wrap" },
                  ],
                },
              ],
            },

            {
              name: "Background & Effects",
              open: false,
              properties: [
                {
                  name: "Background Color",
                  property: "background-color",
                  type: "color",
                },
                {
                  name: "Background Image",
                  property: "background-image",
                  type: "file",
                },
                {
                  name: "Background Size",
                  property: "background-size",
                  type: "select",
                  defaults: "auto",
                  options: [
                    { id: "auto", label: "Auto" },
                    { id: "cover", label: "Cover (Fill Container)" },
                    { id: "contain", label: "Contain (Fit Inside)" },
                  ],
                },
                {
                  name: "Background Position",
                  property: "background-position",
                  type: "select",
                  defaults: "center center",
                  options: [
                    { id: "center center", label: "Center Center" },
                    { id: "top center", label: "Top Center" },
                    { id: "bottom center", label: "Bottom Center" },
                    { id: "left center", label: "Left Center" },
                    { id: "right center", label: "Right Center" },
                  ],
                },
                {
                  name: "Background Repeat",
                  property: "background-repeat",
                  type: "select",
                  defaults: "repeat",
                  options: [
                    { id: "repeat", label: "Repeat" },
                    { id: "no-repeat", label: "No Repeat" },
                    { id: "repeat-x", label: "Repeat X" },
                    { id: "repeat-y", label: "Repeat Y" },
                  ],
                },
                {
                  name: "Glassmorphism Blur",
                  property: "backdrop-filter",
                  type: "select",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    { id: "blur(8px)", label: "Soft Glass (8px)" },
                    { id: "blur(16px)", label: "Medium Glass (16px)" },
                    {
                      id: "blur(24px) saturate(180%)",
                      label: "Deep Saturated Glass (24px)",
                    },
                    {
                      id: "blur(12px) brightness(1.2)",
                      label: "Bright Frosted Glass",
                    },
                  ],
                },
                {
                  name: "Opacity",
                  property: "opacity",
                  type: "slider",
                  defaults: "1",
                  min: 0,
                  max: 1,
                  step: 0.05,
                },
                {
                  name: "Border Radius",
                  property: "border-radius",
                  type: "integer",
                  units: ["px", "%", "rem"],
                  defaults: "0px",
                  min: 0,
                  max: 100,
                },
                {
                  name: "Box Shadow Presets",
                  property: "box-shadow",
                  type: "select",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    {
                      id: "0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)",
                      label: "Subtle Drop Shadow",
                    },
                    {
                      id: "0 10px 25px -5px rgba(0,0,0,0.6), 0 8px 10px -6px rgba(0,0,0,0.5)",
                      label: "Deep Floating Shadow",
                    },
                    {
                      id: "0 20px 45px -10px rgba(0,0,0,0.85)",
                      label: "Cinematic High Elevation",
                    },
                    {
                      id: "0 0 25px rgba(197, 160, 89, 0.4)",
                      label: "Gold Atmospheric Glow",
                    },
                    {
                      id: "0 0 40px rgba(197, 160, 89, 0.7)",
                      label: "Intense Gold Spotlight",
                    },
                    {
                      id: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.6)",
                      label: "Inner Inset Shadow",
                    },
                    {
                      id: "inset 0 0 0 1px rgba(255, 255, 255, 0.12)",
                      label: "Glassmorphic Inner Border",
                    },
                    {
                      id: "inset 0 0 0 1px rgba(197, 160, 89, 0.4)",
                      label: "Gold Inset Border",
                    },
                  ],
                },
                {
                  name: "Image / Color Filter",
                  property: "filter",
                  type: "select",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None (Full Color)" },
                    { id: "grayscale(100%)", label: "Monochrome (B&W 100%)" },
                    { id: "grayscale(50%)", label: "Muted B&W (50%)" },
                    { id: "sepia(40%)", label: "Vintage Sepia" },
                    {
                      id: "contrast(125%) brightness(105%)",
                      label: "Punchy High Contrast",
                    },
                    { id: "blur(4px)", label: "Soft Focus Blur (4px)" },
                  ],
                },
                {
                  name: "Hover Scale & Float",
                  property: "transform",
                  type: "select",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    { id: "scale(1.03)", label: "Subtle Zoom (1.03x)" },
                    { id: "scale(1.06)", label: "Medium Zoom (1.06x)" },
                    { id: "translateY(-6px)", label: "Hover Float Up (-6px)" },
                    { id: "translateY(-12px)", label: "Deep Float Up (-12px)" },
                  ],
                },
                {
                  name: "Smooth Transition",
                  property: "transition",
                  type: "select",
                  defaults: "none",
                  options: [
                    { id: "none", label: "None" },
                    { id: "all 0.2s ease", label: "Fast (200ms ease)" },
                    {
                      id: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                      label: "Smooth Fluid (350ms)",
                    },
                    {
                      id: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                      label: "Luxurious Slow (500ms)",
                    },
                    {
                      id: "transform 0.4s ease, box-shadow 0.4s ease",
                      label: "Transform & Shadow Only",
                    },
                  ],
                },
              ],
            },
          ],
        },

        panels: {
          defaults: [
            {
              id: "panel-devices",
              el: ".panel__devices",

              buttons: [
                {
                  id: "device-desktop",
                  label: "Desktop",
                  command: "set-device-desktop",
                  active: true,
                },

                {
                  id: "device-tablet",
                  label: "Tablet",
                  command: "set-device-tablet",
                },

                {
                  id: "device-mobile",
                  label: "Mobile",
                  command: "set-device-mobile",
                },
              ],
            },
          ],
        },

        deviceManager: {
          devices: [
            {
              name: "Desktop",
              width: "",
            },

            {
              name: "Tablet",
              width: "768px",
              widthMedia: "992px",
            },

            {
              name: "Mobile",
              width: "375px",
              widthMedia: "480px",
            },
          ],
        },

        blockManager: {
          appendTo: ".gjs-blocks-container",
        },
      });

      editorRef.current = editor;

      // Safe patch for GrapesJS ClassTagsView.syncStyle / CssComposer.getIdRule TypeError:
      // When tags or styles are synced on an element without an explicit ID rule, GrapesJS calls
      // `ruleComponent = cssC.getIdRule(target.getId(), ...)` followed immediately by `ruleComponent.getStyle()`.
      // If getIdRule returns undefined, GrapesJS crashes with: Cannot read properties of undefined (reading 'getStyle').
      // We wrap getIdRule so it safely creates or returns a valid rule object, preventing the crash.
      if (editor.Css && typeof editor.Css.getIdRule === "function") {
        const originalGetIdRule = editor.Css.getIdRule.bind(editor.Css);
        editor.Css.getIdRule = function (
          name: string,
          opts: Record<string, unknown> = {},
        ) {
          let rule = originalGetIdRule(name, opts);
          if (!rule) {
            if (name) {
              try {
                rule = editor.Css.setIdRule(name, {}, opts);
              } catch {
                // ignore
              }
            }
            if (!rule) {
              rule = {
                getStyle: () => ({}),
                setStyle: () => {},
                addStyle: () => {},
              } as unknown as ReturnType<typeof originalGetIdRule>;
            }
          }
          return rule;
        };
      }

      if (initialCss && typeof initialCss === "string" && initialCss.trim()) {
        try {
          editor.setStyle(initialCss);
        } catch (e) {
          console.warn("Could not set initialCss in editor.setStyle:", e);
        }
      }

      let lastSelectedImageComponent: Component | null = null;

      /*
       * When an image or dynamic carousel component is selected, switch right sidebar to Settings/Traits
       * and ensure quick edit buttons are available in the toolbar
       */
      editor.on("component:selected", (component) => {
        setHasSelectedElement(true);

        // Enable on-canvas interactive resize handles (tl, tc, tr, cl, cr, bl, bc, br) on selected element
        if (component && !component.get("resizable")) {
          component.set("resizable", {
            tl: true,
            tc: true,
            tr: true,
            cl: true,
            cr: true,
            bl: true,
            bc: true,
            br: true,
            step: 1,
            minDim: 10,
            currentUnit: true,
            keyWidth: "width",
            keyHeight: "height",
          });
        }

        if (
          component.is("image") ||
          component.get("tagName")?.toLowerCase() === "img" ||
          (component.find && component.find("img").length > 0)
        ) {
          lastSelectedImageComponent =
            component.is("image") ||
            component.get("tagName")?.toLowerCase() === "img"
              ? component
              : component.find("img")[0];

          setActiveRightTab("traits");
          const defaultToolbar = (component.get("toolbar") ||
            []) as ToolbarButtonProps[];
          if (!defaultToolbar.some((item) => item.command === "open-assets")) {
            const filteredDefaults = defaultToolbar.filter(
              (item) =>
                item.command !== "core:component-delete" &&
                item.command !== "tlb-delete",
            );
            component.set("toolbar", [
              {
                id: "change-image",
                attributes: { title: "Change / Upload Image" },
                command: "open-assets",
                label: "🖼️ Change Image",
              },
              ...filteredDefaults,
              {
                id: "remove-image",
                attributes: { title: "Remove Image from page" },
                command: "remove-image-component",
                label: "🗑️ Remove",
              },
            ]);
          }
        } else if (
          component.is("link") ||
          component.get("tagName")?.toLowerCase() === "a"
        ) {
          setActiveRightTab("traits");
        } else if (
          component.is("testimonials-carousel") ||
          component.closest?.('[data-cms-block="testimonials-carousel"]')
        ) {
          const target = component.is("testimonials-carousel")
            ? component
            : component.closest('[data-cms-block="testimonials-carousel"]');
          if (!target) return;
          setActiveRightTab("traits");
          const defaultToolbar = (target.get("toolbar") ||
            []) as ToolbarButtonProps[];
          if (
            !defaultToolbar.some(
              (item) => item.command === "open-testimonials-editor",
            )
          ) {
            target.set("toolbar", [
              {
                id: "edit-testimonials",
                attributes: { title: "Edit Carousel Slides & Quotes" },
                command: "open-testimonials-editor",
                label: "💬 Edit Carousel",
              },
              ...defaultToolbar,
            ]);
          }
        } else if (
          component.is("project-carousel") ||
          component.closest?.('[data-cms-block="project-carousel"]')
        ) {
          const target = component.is("project-carousel")
            ? component
            : component.closest('[data-cms-block="project-carousel"]');
          if (!target) return;
          setActiveRightTab("traits");
          const defaultToolbar = (target.get("toolbar") ||
            []) as ToolbarButtonProps[];
          if (
            !defaultToolbar.some(
              (item) => item.command === "open-project-carousel-editor",
            )
          ) {
            target.set("toolbar", [
              {
                id: "edit-project-carousel",
                attributes: { title: "Edit Projects Carousel Heading" },
                command: "open-project-carousel-editor",
                label: "🖼️ Edit Heading",
              },
              ...defaultToolbar,
            ]);
          }
        }
      });

      // Dynamically attach resizer handles to all components
      editor.on(
        "component:resize:init",
        (opts: { resizable?: ResizerOptions | boolean; component?: Component }) => {
          opts.resizable = {
            tl: true,
            tc: true,
            tr: true,
            cl: true,
            cr: true,
            bl: true,
            bc: true,
            br: true,
            step: 1,
            minDim: 10,
            currentUnit: true,
            keyWidth: "width",
            keyHeight: "height",
          };
        },
      );

      // When resizing ends, ensure Tailwind max-w classes don't constrain custom width
      editor.on(
        "component:resize:end",
        (data?: { component?: Component }) => {
          const component = data?.component || editor.getSelected();
          if (component) {
            const curStyle = component.getStyle() || {};
            if (curStyle.width && curStyle.width !== "auto") {
              component.addStyle({ "max-width": "none" });
            }
          }
        },
      );

      // When width style is changed via Style Manager, clear max-width constraint
      editor.on("styleable:change:width", () => {
        const selected = editor.getSelected();
        if (selected) {
          const curStyle = selected.getStyle() || {};
          if (curStyle.width && curStyle.width !== "auto" && !curStyle["max-width"]) {
            selected.addStyle({ "max-width": "none" });
          }
        }
      });

      // When height style is changed via Style Manager, clear max-height constraint
      editor.on("styleable:change:height", () => {
        const selected = editor.getSelected();
        if (selected) {
          const curStyle = selected.getStyle() || {};
          if (curStyle.height && curStyle.height !== "auto" && !curStyle["max-height"]) {
            selected.addStyle({ "max-height": "none" });
          }
        }
      });

      editor.on("component:create", (component: Component) => {
        if (component && !component.get("resizable")) {
          component.set("resizable", {
            tl: true,
            tc: true,
            tr: true,
            cl: true,
            cr: true,
            bl: true,
            bc: true,
            br: true,
            step: 1,
            minDim: 10,
            currentUnit: true,
            keyWidth: "width",
            keyHeight: "height",
          });
        }
      });

      editor.on("rte:disable", () => {
        syncAllCounters(editor);
      });

      editor.on("component:deselected", () => {
        setHasSelectedElement(Boolean(editor.getSelected()));
        syncAllCounters(editor);
      });

      editor.on("component:dblclick", (component) => {
        if (
          component.is("testimonials-carousel") ||
          component.closest?.('[data-cms-block="testimonials-carousel"]')
        ) {
          editor.runCommand("open-testimonials-editor");
        } else if (
          component.is("project-carousel") ||
          component.closest?.('[data-cms-block="project-carousel"]')
        ) {
          editor.runCommand("open-project-carousel-editor");
        }
      });

      /*
       * Synchronize asset deletion with /api/media
       */
      editor.on("asset:remove", async (asset) => {
        const src = asset.get
          ? asset.get("src")
          : (asset as { src?: string }).src;
        if (!src) return;
        try {
          await fetch("/api/media", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ src }),
          });
        } catch (err) {
          console.error("Failed to delete asset from server:", err);
        }
      });

      /*
       * Command to remove the currently selected image component from canvas
       */
      editor.Commands.add("remove-image-component", {
        run: (ed) => {
          const selected = ed.getSelected() || lastSelectedImageComponent;
          if (selected) {
            selected.remove();
          }
        },
      });

      /*
       * Active Image Asset Manager with explicit Save button & footer bar.
       * Only loads the current/active image and newly uploaded image — no unrelated image clutter.
       */
      let modalActiveSrc = "";
      let isManagingAssetCollection = false;
      let isAssetModalOpen = false;

      const getTargetImageComponent = (): Component | null => {
        if (
          lastSelectedImageComponent &&
          (lastSelectedImageComponent.is?.("image") ||
            lastSelectedImageComponent.get?.("tagName")?.toLowerCase() ===
              "img")
        ) {
          return lastSelectedImageComponent;
        }
        const selected = editor.getSelected();
        if (
          selected &&
          (selected.is?.("image") ||
            selected.get?.("tagName")?.toLowerCase() === "img")
        ) {
          lastSelectedImageComponent = selected;
          return selected;
        }
        if (selected && selected.find?.("img")?.length) {
          lastSelectedImageComponent = selected.find("img")[0];
          return lastSelectedImageComponent;
        }
        // Fallback: look for hero artwork img in canvas
        const heroImg = editor
          .getWrapper()
          ?.find?.(
            'img[alt*="Hero"], img[src*="static.wixstatic.com"], section img',
          )?.[0];
        if (heroImg) {
          lastSelectedImageComponent = heroImg;
          return heroImg;
        }
        return null;
      };

      const getAssetSrcFromCard = (cardEl: HTMLElement): string => {
        const preview = cardEl.querySelector(".gjs-am-preview") as HTMLElement;
        if (preview) {
          const bg =
            preview.style.backgroundImage ||
            window.getComputedStyle(preview).backgroundImage;
          if (bg && bg !== "none") {
            const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1]) {
              return match[1];
            }
          }
        }
        const img = cardEl.querySelector("img");
        if (img && img.src) return img.src;
        const dataSrc =
          cardEl.getAttribute("data-src") || cardEl.getAttribute("data-url");
        if (dataSrc) return dataSrc;
        return "";
      };

      // Updates only the active selection indicators (footer & card highlights)
      const updateActiveUI = (src: string) => {
        modalActiveSrc = src;
        const dialog = document.querySelector(".gjs-mdl-dialog");
        if (!dialog) return;

        const fileName = src ? src.split("/").pop() || "Active Image" : "None";

        const footerThumb = dialog.querySelector(
          ".gjs-custom-active-thumb",
        ) as HTMLImageElement | null;
        const footerName = dialog.querySelector(
          ".gjs-custom-active-name",
        ) as HTMLElement | null;

        if (footerThumb) {
          if (src) {
            footerThumb.src = src;
            footerThumb.style.display = "block";
          } else {
            footerThumb.style.display = "none";
          }
        }
        if (footerName) {
          footerName.textContent = fileName;
          footerName.setAttribute("title", src);
        }

        // Highlight corresponding card
        dialog.querySelectorAll(".gjs-am-asset").forEach((card) => {
          const cardEl = card as HTMLElement;
          const cardSrc = getAssetSrcFromCard(cardEl);
          if (cardSrc && cardSrc === src) {
            cardEl.classList.add("gjs-custom-active-card");
            cardEl.style.outline = "2px solid #C5A059";
            cardEl.style.outlineOffset = "2px";
            cardEl.style.boxShadow = "0 0 14px rgba(197, 160, 89, 0.45)";
          } else {
            cardEl.classList.remove("gjs-custom-active-card");
            cardEl.style.outline = "";
            cardEl.style.outlineOffset = "";
            cardEl.style.boxShadow = "";
          }
        });
      };

      const applyAndSaveImage = (srcToApply?: string) => {
        const finalSrc = srcToApply || modalActiveSrc;
        if (!finalSrc) {
          alert("Please select or upload an image first.");
          return;
        }
        const comp = getTargetImageComponent();
        if (comp) {
          comp.set("src", finalSrc);
          comp.addAttributes({ src: finalSrc });
        }
        editor.trigger("change:canvas");

        // Persist draft immediately if onSave callback is provided
        if (onSaveRef.current) {
          const projectData = editor.getProjectData();
          const html = editor.getHtml() ?? "";
          const css = editor.getCss() ?? "";
          onSaveRef.current(projectData, html, css);
        }

        editor.Modal.close();
      };

      // Injects Header Save button and Footer bar into modal safely
      const injectModalControls = () => {
        const dialog = document.querySelector(
          ".gjs-mdl-dialog",
        ) as HTMLElement | null;
        const header = document.querySelector(
          ".gjs-mdl-header",
        ) as HTMLElement | null;
        if (!dialog || !header) return;

        // Verify this is the Asset Manager modal
        const isAssetModal =
          Boolean(
            dialog.querySelector(
              ".gjs-am-file-uploader, .gjs-am-assets-cont, .gjs-am-assets, [data-open-assets]",
            ),
          ) ||
          (dialog.querySelector(".gjs-mdl-title")?.textContent || "")
            .toLowerCase()
            .includes("image");

        if (!isAssetModal) return;

        // 1. Header: "Save Image" and "Remove Image" buttons
        let headerActions = header.querySelector(
          ".gjs-custom-header-actions",
        ) as HTMLElement | null;
        if (!headerActions) {
          headerActions = document.createElement("div");
          headerActions.className = "gjs-custom-header-actions";
          headerActions.style.cssText =
            "display: inline-flex; align-items: center; gap: 8px; margin-left: auto; margin-right: 12px;";

          const headerSaveBtn = document.createElement("button");
          headerSaveBtn.className = "gjs-custom-save-img-btn";
          headerSaveBtn.type = "button";
          headerSaveBtn.innerHTML = "💾 Save Image";
          headerSaveBtn.title = "Save and apply selected active image";
          headerSaveBtn.style.cssText =
            "padding: 6px 18px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: #C5A059; color: #000000; border: 1px solid #C5A059; border-radius: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(197, 160, 89, 0.35);";
          headerSaveBtn.onmouseenter = () => {
            headerSaveBtn.style.background = "#dfb96e";
          };
          headerSaveBtn.onmouseleave = () => {
            headerSaveBtn.style.background = "#C5A059";
          };
          headerSaveBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            applyAndSaveImage();
          };

          const headerRemoveBtn = document.createElement("button");
          headerRemoveBtn.className = "gjs-custom-remove-img-btn";
          headerRemoveBtn.type = "button";
          headerRemoveBtn.innerHTML = "🗑️ Remove Image";
          headerRemoveBtn.title = "Remove image from page";
          headerRemoveBtn.style.cssText =
            "padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #2a1111; color: #ff6b6b; border: 1px solid #6b2222; border-radius: 3px; cursor: pointer; transition: all 0.2s;";
          headerRemoveBtn.onmouseenter = () => {
            headerRemoveBtn.style.background = "#d32f2f";
            headerRemoveBtn.style.color = "#ffffff";
          };
          headerRemoveBtn.onmouseleave = () => {
            headerRemoveBtn.style.background = "#2a1111";
            headerRemoveBtn.style.color = "#ff6b6b";
          };
          headerRemoveBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const comp = getTargetImageComponent();
            if (comp) {
              comp.remove();
            }
            editor.trigger("change:canvas");
            if (onSaveRef.current) {
              onSaveRef.current(
                editor.getProjectData(),
                editor.getHtml() ?? "",
                editor.getCss() ?? "",
              );
            }
            editor.Modal.close();
          };

          headerActions.appendChild(headerSaveBtn);
          headerActions.appendChild(headerRemoveBtn);

          const closeBtn = header.querySelector(".gjs-mdl-btn-close");
          if (closeBtn) {
            header.insertBefore(headerActions, closeBtn);
          } else {
            header.appendChild(headerActions);
          }
        }

        // 2. Footer Bar with Active Thumbnail & Save Button
        let footer = dialog.querySelector(
          ".gjs-custom-modal-footer",
        ) as HTMLElement | null;
        if (!footer) {
          footer = document.createElement("div");
          footer.className = "gjs-custom-modal-footer";
          footer.style.cssText =
            "display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid #282828; background: #0e0e0e; border-radius: 0 0 6px 6px; box-sizing: border-box; width: 100%; margin-top: 8px;";

          const activeInfo = document.createElement("div");
          activeInfo.className = "gjs-custom-active-container";
          activeInfo.style.cssText =
            "display: flex; align-items: center; gap: 12px; font-size: 12px; color: #ccc;";

          const fileName = modalActiveSrc
            ? modalActiveSrc.split("/").pop() || "Active Image"
            : "None";

          activeInfo.innerHTML = `
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #C5A059; font-weight: 700;">Selected:</span>
            <img class="gjs-custom-active-thumb" src="${modalActiveSrc || ""}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid #C5A059; display: ${modalActiveSrc ? "block" : "none"};" />
            <div style="display: flex; flex-direction: column;">
              <span class="gjs-custom-active-name" style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff; font-size: 11px; font-weight: 600;" title="${modalActiveSrc}">${fileName}</span>
              <span style="font-size: 10px; color: #888;">Click Save to apply to page</span>
            </div>
          `;

          const footerActions = document.createElement("div");
          footerActions.style.cssText =
            "display: flex; align-items: center; gap: 10px;";

          const cancelBtn = document.createElement("button");
          cancelBtn.type = "button";
          cancelBtn.innerHTML = "Cancel";
          cancelBtn.style.cssText =
            "padding: 7px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: #222; color: #bbb; border: 1px solid #444; border-radius: 3px; cursor: pointer; transition: all 0.2s;";
          cancelBtn.onmouseenter = () => {
            cancelBtn.style.background = "#333";
            cancelBtn.style.color = "#fff";
          };
          cancelBtn.onmouseleave = () => {
            cancelBtn.style.background = "#222";
            cancelBtn.style.color = "#bbb";
          };
          cancelBtn.onclick = (e) => {
            e.preventDefault();
            editor.Modal.close();
          };

          const footerSaveBtn = document.createElement("button");
          footerSaveBtn.className = "gjs-custom-footer-save-btn";
          footerSaveBtn.type = "button";
          footerSaveBtn.innerHTML = "💾 Save &amp; Apply Image";
          footerSaveBtn.style.cssText =
            "padding: 7px 22px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: #C5A059; color: #000; border: 1px solid #C5A059; border-radius: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 10px rgba(197, 160, 89, 0.35);";
          footerSaveBtn.onmouseenter = () => {
            footerSaveBtn.style.background = "#dfb96e";
          };
          footerSaveBtn.onmouseleave = () => {
            footerSaveBtn.style.background = "#C5A059";
          };
          footerSaveBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            applyAndSaveImage();
          };

          footerActions.appendChild(cancelBtn);
          footerActions.appendChild(footerSaveBtn);

          footer.appendChild(activeInfo);
          footer.appendChild(footerActions);
          dialog.appendChild(footer);
        }

        // Configure file uploader input to accept JPG, JPEG, PNG, SVG
        const uploaderInput = dialog.querySelector(
          ".gjs-am-file-uploader input[type='file']",
        ) as HTMLInputElement | null;
        if (
          uploaderInput &&
          !uploaderInput.getAttribute("data-custom-accept")
        ) {
          uploaderInput.setAttribute("data-custom-accept", "true");
          uploaderInput.setAttribute(
            "accept",
            ".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml",
          );
        }
        const uploaderTitle = dialog.querySelector(".gjs-am-title");
        if (uploaderTitle && !uploaderTitle.getAttribute("data-custom-title")) {
          uploaderTitle.setAttribute("data-custom-title", "true");
          uploaderTitle.textContent =
            "Drop JPG, JPEG, PNG, or SVG files here or click to upload";
        }

        // 3. Card click & delete listener in the modal (bound only once via attribute)
        if (!dialog.getAttribute("data-custom-handlers-bound")) {
          dialog.setAttribute("data-custom-handlers-bound", "true");

          // Capture phase to intercept card removal BEFORE GrapesJS throws undefined error
          dialog.addEventListener(
            "click",
            (e) => {
              const removeBtn = (e.target as HTMLElement).closest(
                "[data-toggle='asset-remove'], .gjs-am-close",
              );
              if (!removeBtn) return;

              e.stopPropagation();
              e.preventDefault();

              const card = removeBtn.closest(
                ".gjs-am-asset",
              ) as HTMLElement | null;
              if (card) {
                const src = getAssetSrcFromCard(card);
                card.remove();

                if (src && modalActiveSrc === src) {
                  modalActiveSrc = "";
                  updateActiveUI("");
                }

                if (src) {
                  const am = editor.AssetManager;
                  const found = am
                    .getAll()
                    .find(
                      (a: { get?: (prop: string) => string; src?: string }) => {
                        const s = a.get ? a.get("src") : a.src;
                        return s === src;
                      },
                    );
                  if (found) {
                    am.getAll().remove(found);
                  }

                  fetch("/api/media", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ src }),
                  }).catch(() => {});
                }
              }
            },
            true, // Capture phase!
          );

          // Card selection click
          dialog.addEventListener("click", (e) => {
            const card = (e.target as HTMLElement).closest(
              ".gjs-am-asset",
            ) as HTMLElement | null;
            if (!card) return;
            if (
              (e.target as HTMLElement).closest(
                "[data-toggle='asset-remove'], .gjs-am-close",
              )
            ) {
              return;
            }
            const src = getAssetSrcFromCard(card);
            if (src) {
              updateActiveUI(src);
            }
          });

          // Card double click -> apply & save immediately
          dialog.addEventListener("dblclick", (e) => {
            const card = (e.target as HTMLElement).closest(
              ".gjs-am-asset",
            ) as HTMLElement | null;
            if (!card) return;
            if (
              (e.target as HTMLElement).closest(
                "[data-toggle='asset-remove'], .gjs-am-close",
              )
            ) {
              return;
            }
            const src = getAssetSrcFromCard(card);
            if (src) {
              updateActiveUI(src);
              applyAndSaveImage(src);
            }
          });
        }

        if (modalActiveSrc) {
          updateActiveUI(modalActiveSrc);
        }
      };

      const triggerModalInjection = () => {
        injectModalControls();
        setTimeout(injectModalControls, 50);
        setTimeout(injectModalControls, 150);
        setTimeout(injectModalControls, 350);
      };

      // Called when user opens the asset manager modal
      const handleOpenAssetManager = (targetComp?: Component | null) => {
        if (isAssetModalOpen) {
          triggerModalInjection();
          return;
        }
        isAssetModalOpen = true;

        const target = targetComp || getTargetImageComponent();
        const currentSrc = target
          ? target.get("src") ||
            (target.getAttributes() as Record<string, string>)?.src ||
            ""
          : "";

        modalActiveSrc = currentSrc;

        const am = editor.AssetManager;
        if (am) {
          isManagingAssetCollection = true;
          try {
            // Keep ONLY the current active image in the asset list — no clutter from other images
            am.getAll().reset([]);
            if (currentSrc) {
              am.add({
                src: currentSrc,
                name: "Current Artwork",
                type: "image",
              });
            }
          } finally {
            isManagingAssetCollection = false;
          }
        }

        triggerModalInjection();
      };

      // Listen for newly uploaded assets
      editor.on(
        "asset:add",
        (asset: { get?: (prop: string) => string; src?: string }) => {
          // If we are resetting the collection ourselves, DO NOT recurse!
          if (isManagingAssetCollection) return;

          const src = asset.get ? asset.get("src") : asset.src;
          if (src) {
            modalActiveSrc = src;
            updateActiveUI(src);
          }
          triggerModalInjection();
        },
      );

      editor.on("command:run:open-assets", (data) => {
        const options = (data as { options?: { target?: Component } })?.options;
        if (options && options.target) {
          lastSelectedImageComponent = options.target || null;
        }
        handleOpenAssetManager(lastSelectedImageComponent);
      });

      editor.on("asset:open", () => {
        handleOpenAssetManager(lastSelectedImageComponent);
      });

      editor.on("modal:open", () => {
        setTimeout(() => {
          const dialog = document.querySelector(".gjs-mdl-dialog");
          if (
            dialog &&
            (dialog.querySelector(
              ".gjs-am-file-uploader, .gjs-am-assets-cont, .gjs-am-assets",
            ) ||
              (dialog.querySelector(".gjs-mdl-title")?.textContent || "")
                .toLowerCase()
                .includes("image"))
          ) {
            handleOpenAssetManager(lastSelectedImageComponent);
          }
        }, 15);
      });

      editor.on("modal:close", () => {
        isAssetModalOpen = false;
      });

      editor.on("asset:close", () => {
        isAssetModalOpen = false;
      });

      /*
       * GrapesJS device commands.
       */
      editor.Commands.add("set-device-desktop", {
        run: () => {
          editor.setDevice("Desktop");
        },
      });

      editor.Commands.add("set-device-tablet", {
        run: () => {
          editor.setDevice("Tablet");
        },
      });

      editor.Commands.add("set-device-mobile", {
        run: () => {
          editor.setDevice("Mobile");
        },
      });

      /*
       * Custom Font Studio command
       */
      editor.Commands.add("open-custom-fonts-studio", {
        run: () => {
          setShowFontModal(true);
        },
      });

      /*
       * Inject custom fonts and setup typography studio trigger when canvas loads
       */
      const injectEditorResetStyles = () => {
        try {
          const doc = editor.Canvas.getDocument();
          if (doc?.head) {
            if (!doc.head.querySelector("#cms-counter-reset-style")) {
              const style = doc.createElement("style");
              style.id = "cms-counter-reset-style";
              style.textContent = `
                .counter-item {
                  background: transparent !important;
                  border: none !important;
                  box-shadow: none !important;
                }
              `;
              doc.head.appendChild(style);
            }
            if (
              initialCssRef.current &&
              initialCssRef.current.trim() &&
              !doc.head.querySelector("#cms-page-initial-styles")
            ) {
              const pageStyle = doc.createElement("style");
              pageStyle.id = "cms-page-initial-styles";
              pageStyle.textContent = initialCssRef.current;
              doc.head.appendChild(pageStyle);
            }
          }
        } catch {
          // ignore
        }
      };

      editor.on("load", () => {
        customFontsRef.current.forEach((font) => {
          injectFontIntoDocumentAndCanvas(font, editor);
        });
        setTimeout(setupTypographyCustomFontButton, 250);
        injectEditorResetStyles();
      });

      editor.on("canvas:frame:load", () => {
        customFontsRef.current.forEach((font) => {
          injectFontIntoDocumentAndCanvas(font, editor);
        });
        injectEditorResetStyles();
      });

      /*
       * Listen for preview mode events to synchronize top bar preview state
       */
      editor.on("stop:preview", () => {
        setIsPreviewActive(false);
      });
      editor.on("run:preview", () => {
        setIsPreviewActive(true);
        const doc = editor.Canvas.getDocument();
        if (doc?.body) {
          initCountersInContainer(doc.body);
        }
      });

      /*
       * Counter animation preview command
       */
      editor.Commands.add("preview-counter-animation", {
        run: () => {
          const doc = editor.Canvas.getDocument();
          if (doc?.body) {
            initCountersInContainer(doc.body);
          }
        },
      });

      /*
       * Testimonials Carousel visual slide manager command
       */
      editor.Commands.add("open-testimonials-editor", {
        run: () => {
          const selected = editor.getSelected();
          const target =
            selected && selected.is("testimonials-carousel")
              ? selected
              : selected?.closest?.(
                  '[data-cms-block="testimonials-carousel"]',
                ) ||
                editor
                  .getWrapper()
                  ?.find?.('[data-cms-block="testimonials-carousel"]')?.[0];

          if (!target) {
            alert("Please select the Testimonials Carousel block first.");
            return;
          }

          // Extract existing heading
          const headingComp = target.find("h1, h2, h3, h4")[0];
          let currentHeading = "What Publishers & Clients Say";
          if (headingComp) {
            const text = (
              headingComp.get("content") ||
              headingComp.toHTML?.() ||
              ""
            )
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .trim();
            if (text) currentHeading = text;
          }

          // Extract existing slides
          let slides: Array<{ quote: string; author: string }> = [];
          const quoteComps = target.find("[data-testimonial-quote]");
          if (quoteComps && quoteComps.length > 0) {
            for (const qc of quoteComps) {
              const attrs = qc.getAttributes?.() || {};
              const q = (
                attrs["data-testimonial-quote"] ||
                qc.get("content") ||
                ""
              )
                .replace(/^[“"']+|[”"']+$/g, "")
                .trim();
              const a = (attrs["data-testimonial-author"] || "")
                .replace(/^[-—~:\s]+/, "")
                .trim();
              if (q) slides.push({ quote: q, author: a });
            }
          }

          if (slides.length === 0) {
            // Fallback: parse from child <p>/<blockquote> tags (the current
            // default format, and anything hand-edited directly in canvas)
            const pComps = target.find("p, blockquote");
            for (const p of pComps) {
              const raw = (p.get("content") || p.toHTML?.() || "")
                .replace(/&nbsp;/g, " ")
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]+>/g, "")
                .trim();
              if (!raw || /rotating testimonials appear/i.test(raw)) continue;
              const lines = raw
                .split(/\r?\n/)
                .map((l: string) => l.trim())
                .filter(Boolean);
              const attrIdx = lines.findIndex((l: string) => /^[-—~:]/.test(l));
              if (attrIdx >= 1) {
                const q = lines
                  .slice(0, attrIdx)
                  .join(" ")
                  .replace(/^[“"']+|[”"']+$/g, "")
                  .trim();
                const a = lines
                  .slice(attrIdx)
                  .join(" ")
                  .replace(/^[-—~:\s]+/, "")
                  .trim();
                if (q) slides.push({ quote: q, author: a });
              } else if (lines.length >= 2) {
                const q = lines[0].replace(/^[“"']+|[”"']+$/g, "").trim();
                const a = lines
                  .slice(1)
                  .join(" ")
                  .replace(/^[-—~:\s]+/, "")
                  .trim();
                if (q) slides.push({ quote: q, author: a });
              } else if (lines.length === 1 && lines[0]) {
                const q = lines[0].replace(/^[“"']+|[”"']+$/g, "").trim();
                if (q) slides.push({ quote: q, author: "Editorial Client" });
              }
            }
          }

          if (slides.length === 0) {
            slides = [
              {
                quote:
                  "Sourav's artwork captured the exact haunting atmosphere of our novel. An absolute master of his craft.",
                author: "Editorial Director, Tor Books",
              },
              {
                quote:
                  "Working with Sourav was effortless. The cover delivered exceeded all expectations and drove pre-orders through the roof.",
                author: "Senior Editor, Orbit Books",
              },
              {
                quote:
                  "A rare visionary talent whose evocative style immediately commands attention on any bookshelf.",
                author: "Creative Director, Penguin Random House",
              },
            ];
          }

          const modal = editor.Modal;
          modal.setTitle("💬 Edit Testimonials Carousel");

          const container = document.createElement("div");
          container.style.cssText =
            "display: flex; flex-direction: column; gap: 16px; color: #fff; max-height: 75vh; overflow-y: auto; padding: 4px 8px;";

          // Section Heading field
          const headingGroup = document.createElement("div");
          headingGroup.innerHTML = `
            <label style="display: block; font-size: 11px; font-weight: 700; color: #C5A059; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
              Section Heading
            </label>
            <input
              id="cms-testimonials-modal-heading"
              type="text"
              value="${currentHeading.replace(/"/g, "&quot;")}"
              style="width: 100%; padding: 8px 12px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 3px; font-size: 14px; box-sizing: border-box;"
            />
          `;
          container.appendChild(headingGroup);

          // Slides container
          const slidesLabel = document.createElement("div");
          slidesLabel.style.cssText =
            "display: flex; justify-content: space-between; align-items: center; margin-top: 4px;";
          slidesLabel.innerHTML = `
            <span style="font-size: 11px; font-weight: 700; color: #C5A059; text-transform: uppercase; letter-spacing: 0.1em;">
              Testimonial Slides (<span id="cms-slide-count">${slides.length}</span>)
            </span>
          `;
          container.appendChild(slidesLabel);

          const slidesList = document.createElement("div");
          slidesList.id = "cms-slides-list";
          slidesList.style.cssText =
            "display: flex; flex-direction: column; gap: 12px;";
          container.appendChild(slidesList);

          const renderSlideCard = (
            slide: { quote: string; author: string },
            index: number,
          ) => {
            const card = document.createElement("div");
            card.className = "cms-slide-card";
            card.style.cssText =
              "background: #161616; border: 1px solid #2e2e2e; border-radius: 4px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;";

            card.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="cms-slide-num" style="font-size: 11px; font-weight: bold; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em;">
                  Slide ${index + 1}
                </span>
                <button
                  type="button"
                  class="cms-btn-remove-slide"
                  style="background: none; border: none; color: #e57373; font-size: 11px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 6px;"
                >
                  ✕ Remove
                </button>
              </div>
              <div>
                <label style="display: block; font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 3px;">
                  Quote Text
                </label>
                <textarea
                  class="cms-input-quote"
                  rows="3"
                  placeholder="Enter testimonial quote..."
                  style="width: 100%; padding: 8px; background: #0e0e0e; border: 1px solid #333; color: #fff; border-radius: 2px; font-size: 13px; resize: vertical; box-sizing: border-box;"
                >${slide.quote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
              </div>
              <div>
                <label style="display: block; font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 3px;">
                  Author / Client Name & Title
                </label>
                <input
                  type="text"
                  class="cms-input-author"
                  placeholder="e.g. UTSA TARAFDAR or Senior Editor, Orbit Books"
                  value="${slide.author.replace(/"/g, "&quot;")}"
                  style="width: 100%; padding: 6px 8px; background: #0e0e0e; border: 1px solid #333; color: #fff; border-radius: 2px; font-size: 12px; box-sizing: border-box;"
                />
              </div>
            `;

            const removeBtn = card.querySelector(
              ".cms-btn-remove-slide",
            ) as HTMLButtonElement;
            removeBtn.onclick = () => {
              const allCards = slidesList.querySelectorAll(".cms-slide-card");
              if (allCards.length <= 1) {
                alert("You must keep at least 1 testimonial slide.");
                return;
              }
              card.remove();
              slidesList
                .querySelectorAll(".cms-slide-card")
                .forEach((c, idx) => {
                  const num = c.querySelector(".cms-slide-num");
                  if (num) num.textContent = `Slide ${idx + 1}`;
                });
              const countEl = container.querySelector("#cms-slide-count");
              if (countEl) {
                countEl.textContent = String(
                  slidesList.querySelectorAll(".cms-slide-card").length,
                );
              }
            };

            return card;
          };

          slides.forEach((slide, idx) => {
            slidesList.appendChild(renderSlideCard(slide, idx));
          });

          // Add Slide Button
          const addBtn = document.createElement("button");
          addBtn.type = "button";
          addBtn.style.cssText =
            "padding: 10px; border: 1px dashed #444; background: #111; color: #C5A059; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; cursor: pointer; transition: all 0.2s;";
          addBtn.textContent = "+ Add Another Testimonial Slide";
          addBtn.onmouseenter = () => {
            addBtn.style.borderColor = "#C5A059";
            addBtn.style.background = "#181818";
          };
          addBtn.onmouseleave = () => {
            addBtn.style.borderColor = "#444";
            addBtn.style.background = "#111";
          };
          addBtn.onclick = () => {
            const currentCount =
              slidesList.querySelectorAll(".cms-slide-card").length;
            slidesList.appendChild(
              renderSlideCard({ quote: "", author: "" }, currentCount),
            );
            const countEl = container.querySelector("#cms-slide-count");
            if (countEl) countEl.textContent = String(currentCount + 1);
            addBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
          };
          container.appendChild(addBtn);

          // Action buttons
          const actionsRow = document.createElement("div");
          actionsRow.style.cssText =
            "display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #222;";

          const cancelBtn = document.createElement("button");
          cancelBtn.type = "button";
          cancelBtn.style.cssText =
            "padding: 8px 16px; border: 1px solid #333; background: #1a1a1a; color: #ccc; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 2px; cursor: pointer;";
          cancelBtn.textContent = "Cancel";
          cancelBtn.onclick = () => modal.close();

          const saveBtn = document.createElement("button");
          saveBtn.type = "button";
          saveBtn.style.cssText =
            "padding: 8px 20px; border: none; background: #C5A059; color: #000; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 2px; cursor: pointer;";
          saveBtn.textContent = "Save Changes";
          saveBtn.onclick = () => {
            const headingInput = container.querySelector(
              "#cms-testimonials-modal-heading",
            ) as HTMLInputElement;
            const updatedHeading =
              headingInput?.value.trim() || "What Publishers & Clients Say";

            const cards = slidesList.querySelectorAll(".cms-slide-card");
            const updatedSlides: Array<{ quote: string; author: string }> = [];

            cards.forEach((card) => {
              const qInput = card.querySelector(
                ".cms-input-quote",
              ) as HTMLTextAreaElement;
              const aInput = card.querySelector(
                ".cms-input-author",
              ) as HTMLInputElement;
              const quote = qInput?.value.trim() || "";
              const author = aInput?.value.trim() || "Editorial Client";
              if (quote) {
                updatedSlides.push({ quote, author });
              }
            });

            if (updatedSlides.length === 0) {
              alert("Please provide at least one testimonial quote.");
              return;
            }

            const escapeStr = (s: string) =>
              s
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");

            const safeHeading = escapeStr(updatedHeading);

            // One visible <blockquote> per slide — this is the ONLY copy of
            // the content. An earlier version kept a small "preview card"
            // showing just the first slide plus a separate hidden div
            // carrying the real data-testimonial-* attributes; a friend
            // editing the visible card directly (very natural to try) would
            // silently leave the hidden — and actually rendered — copy
            // untouched, so their edits appeared to do nothing after
            // publishing. A single visible source of truth can't desync
            // like that, and it's also just simpler to read/duplicate by
            // hand in the canvas.
            const slidesHtml = updatedSlides
              .map(
                (s) =>
                  `<blockquote class="text-sm text-gray-300 italic mb-3" data-testimonial-quote="${escapeStr(s.quote)}" data-testimonial-author="${escapeStr(s.author)}">"${escapeStr(s.quote)}"<br>- ${escapeStr(s.author)}</blockquote>`,
              )
              .join("");

            const html = `<h3 class="mb-4 text-2xl font-serif text-[#C5A059]">${safeHeading}</h3>${slidesHtml}`;

            target.components(html);
            editor.trigger("change:canvas");
            modal.close();
          };

          actionsRow.appendChild(cancelBtn);
          actionsRow.appendChild(saveBtn);
          container.appendChild(actionsRow);

          modal.setContent(container);
          modal.open();
        },
      });

      /*
       * Projects Carousel heading editor command
       */
      editor.Commands.add("open-project-carousel-editor", {
        run: () => {
          const selected = editor.getSelected();
          const target =
            selected && selected.is("project-carousel")
              ? selected
              : selected?.closest?.('[data-cms-block="project-carousel"]') ||
                editor
                  .getWrapper()
                  ?.find?.('[data-cms-block="project-carousel"]')?.[0];

          if (!target) {
            alert("Please select the Projects Carousel block first.");
            return;
          }

          const headingComp = target.find("h1, h2, h3, h4")[0];
          let currentHeading = "Featured Projects Carousel";
          if (headingComp) {
            const text = (
              headingComp.get("content") ||
              headingComp.toHTML?.() ||
              ""
            )
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .trim();
            if (text) currentHeading = text;
          }

          const modal = editor.Modal;
          modal.setTitle("🖼️ Edit Projects Carousel Heading");

          const container = document.createElement("div");
          container.style.cssText =
            "display: flex; flex-direction: column; gap: 16px; color: #fff; padding: 4px 8px;";

          container.innerHTML = `
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: #C5A059; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
                Carousel Section Heading
              </label>
              <input
                id="cms-project-carousel-modal-heading"
                type="text"
                value="${currentHeading.replace(/"/g, "&quot;")}"
                style="width: 100%; padding: 8px 12px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 3px; font-size: 14px; box-sizing: border-box;"
              />
            </div>
            <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 4px; padding: 12px; font-size: 12px; color: #aaa; line-height: 1.5;">
              <span style="color: #C5A059; font-weight: bold;">Note:</span> This carousel automatically displays all portfolio projects that have <strong style="color: #fff;">Featured</strong> checked in the Projects admin tab.
            </div>
          `;

          const actionsRow = document.createElement("div");
          actionsRow.style.cssText =
            "display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #222;";

          const cancelBtn = document.createElement("button");
          cancelBtn.type = "button";
          cancelBtn.style.cssText =
            "padding: 8px 16px; border: 1px solid #333; background: #1a1a1a; color: #ccc; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 2px; cursor: pointer;";
          cancelBtn.textContent = "Cancel";
          cancelBtn.onclick = () => modal.close();

          const saveBtn = document.createElement("button");
          saveBtn.type = "button";
          saveBtn.style.cssText =
            "padding: 8px 20px; border: none; background: #C5A059; color: #000; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 2px; cursor: pointer;";
          saveBtn.textContent = "Save Heading";
          saveBtn.onclick = () => {
            const headingInput = container.querySelector(
              "#cms-project-carousel-modal-heading",
            ) as HTMLInputElement;
            const updatedHeading =
              headingInput?.value.trim() || "Featured Projects Carousel";
            const escapeStr = (s: string) =>
              s
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");

            const safeHeading = escapeStr(updatedHeading);
            const html = `
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #222; padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #C5A059; font-weight: bold;">
                    ★ FEATURED WORKS CAROUSEL (Animated Tiles)
                  </div>
                  <h3 class="text-2xl font-serif text-white mt-1">${safeHeading}</h3>
                </div>
                <div style="font-size: 11px; color: #C5A059; border: 1px solid rgba(197,160,89,0.4); padding: 4px 10px; border-radius: 4px; background: rgba(197,160,89,0.1);">
                  Double-click to Edit Heading
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
                  <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Book Covers</span>
                  <div>
                    <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Literary Fiction</p>
                    <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
                  </div>
                </div>
                <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
                  <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Illustration</span>
                  <div>
                    <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Conceptual Piece</p>
                    <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
                  </div>
                </div>
                <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
                  <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Fine Art</span>
                  <div>
                    <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Oil on Canvas</p>
                    <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
                  </div>
                </div>
                <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
                  <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Dark Fantasy</span>
                  <div>
                    <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Myth &amp; Legend</p>
                    <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
                  </div>
                </div>
              </div>
            `;
            target.components(html);
            editor.trigger("change:canvas");
            modal.close();
          };

          actionsRow.appendChild(cancelBtn);
          actionsRow.appendChild(saveBtn);
          container.appendChild(actionsRow);

          modal.setContent(container);
          modal.open();
        },
      });

      const bm = editor.BlockManager;

      /*
       * Hero block (Image Container Section — editable <img> inside container)
       */
      bm.add("hero-block", {
        label: "Hero Section",
        category: "Portfolio",

        content: `
        <section style="position: relative; width: 100%; min-height: 85vh; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; padding: 4rem 1.5rem;">
          <img 
            src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" 
            alt="Sourav Mitra - Hero Artwork" 
            style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" 
          />
          <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); pointer-events: none; z-index: 1;"></div>
          <div style="position: relative; z-index: 2; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
            <h1 style="font-size: 4rem; font-family: serif; color: #FFFFFF; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; text-shadow: 0 4px 20px rgba(0,0,0,0.8); line-height: 1.1;">
              Sourav Mitra
            </h1>
            <p style="font-size: 1.4rem; color: #E5E5E5; margin-bottom: 2.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.8); font-weight: 300;">
              550+ covers in 8+ years, and still learning.
            </p>
            <a
              href="/book-covers"
              style="display: inline-block; padding: 1rem 2.5rem; background-color: #C5A059; color: #000000; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.75rem; text-decoration: none; border-radius: 2px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"
            >
              Explore My Work
            </a>
          </div>
        </section>
      `,
      });

      /*
       * Hero Background Image block
       */
      bm.add("hero-image-block", {
        label: "Hero Background Image",
        category: "Portfolio",

        content: `
        <img 
          src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" 
          alt="Hero Artwork" 
          style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;"
        />
      `,
      });

      /*
       * Basic: Text block
       */
      bm.add("text-block", {
        label: "Text",
        category: "Basic",
        content: {
          type: "text",
          content:
            "Enter your custom text here. Click to edit or format text directly.",
          style: {
            padding: "0.5rem 0",
            color: "#d1d5db",
            "font-size": "1.05rem",
            "line-height": "1.7",
            "margin-bottom": "1rem",
          },
        },
      });

      /*
       * Basic: Heading block
       */
      bm.add("heading-block", {
        label: "Heading",
        category: "Basic",
        content: {
          type: "text",
          tagName: "h2",
          content: "Section Heading",
          style: {
            "font-family": "serif",
            "font-size": "2.25rem",
            color: "#ffffff",
            "margin-bottom": "1rem",
            "line-height": "1.2",
          },
        },
      });

      /*
       * Basic: Button / Link block
       */
      bm.add("link-button-block", {
        label: "Button / Link",
        category: "Basic",
        content: {
          type: "link",
          content: "Explore Work &rarr;",
          attributes: { href: "#" },
          style: {
            display: "inline-block",
            padding: "0.85rem 2.25rem",
            "background-color": "#C5A059",
            color: "#000000",
            "font-weight": "700",
            "text-transform": "uppercase",
            "letter-spacing": "0.15em",
            "font-size": "0.75rem",
            "text-decoration": "none",
            "border-radius": "2px",
          },
        },
      });

      /*
       * Basic: Text Link block
       */
      bm.add("text-link-block", {
        label: "Text Link",
        category: "Basic",
        content: {
          type: "link",
          content: "Clickable Link Text",
          attributes: { href: "#" },
          style: {
            color: "#C5A059",
            "text-decoration": "underline",
            "font-size": "1rem",
          },
        },
      });

      /*
       * Basic: Image block
       */
      bm.add("image-block", {
        label: "Image",
        category: "Basic",

        content: {
          type: "image",
          style: {
            width: "100%",
            height: "auto",
          },
        },
      });

      /*
       * Basic: Quote Box block
       */
      bm.add("quote-box-block", {
        label: "Quote Box",
        category: "Basic",
        content: `
        <div style="padding: 2.5rem; background: #0a0a0a; border-left: 3px solid #C5A059; margin: 2rem auto; max-width: 800px; box-sizing: border-box;">
          <blockquote style="font-size: 1.35rem; font-family: serif; font-style: italic; color: #e5e5e5; margin: 0 0 1rem 0; line-height: 1.5;">
            "Add an inspiring quote or highlight excerpt here."
          </blockquote>
          <p style="color: #C5A059; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; margin: 0; font-weight: bold;">
            &mdash; Author or Source
          </p>
        </div>
      `,
      });

      /*
       * Basic: Divider / Spacer block
       */
      bm.add("divider-block", {
        label: "Divider",
        category: "Basic",
        content: `
        <div style="padding: 2.5rem 0; width: 100%; max-width: 1100px; margin: 0 auto; box-sizing: border-box;">
          <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.15); margin: 0;" />
        </div>
      `,
      });

      /*
       * Layout: Container / Section block
       */
      bm.add("container-block", {
        label: "Container",
        category: "Layout",
        content: `
        <section style="padding: 4rem 1.5rem; width: 100%; min-height: 160px; box-sizing: border-box;">
          <div style="max-width: 1100px; margin: 0 auto; width: 100%; min-height: 100px; border: 1px dashed rgba(255,255,255,0.2); padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; border-radius: 4px;">
            <p style="color: #666; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
              Container &bull; Drop text, images, or blocks here
            </p>
          </div>
        </section>
      `,
      });

      /*
       * Layout: 2 Columns block
       */
      bm.add("columns-2-block", {
        label: "2 Columns",
        category: "Layout",
        content: `
        <section style="padding: 3rem 1.5rem; width: 100%; max-width: 1100px; margin: 0 auto; box-sizing: border-box;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; width: 100%;">
            <div style="min-height: 140px; padding: 1.5rem; background: #0d0d0d; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; box-sizing: border-box;">
              <p style="color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; margin: 0;">Column 1</p>
            </div>
            <div style="min-height: 140px; padding: 1.5rem; background: #0d0d0d; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; box-sizing: border-box;">
              <p style="color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; margin: 0;">Column 2</p>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Layout: 3 Columns block
       */
      bm.add("columns-3-block", {
        label: "3 Columns",
        category: "Layout",
        content: `
        <section style="padding: 3rem 1.5rem; width: 100%; max-width: 1100px; margin: 0 auto; box-sizing: border-box;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; width: 100%;">
            <div style="min-height: 140px; padding: 1.5rem; background: #0d0d0d; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; box-sizing: border-box;">
              <p style="color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; margin: 0;">Column 1</p>
            </div>
            <div style="min-height: 140px; padding: 1.5rem; background: #0d0d0d; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; box-sizing: border-box;">
              <p style="color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; margin: 0;">Column 2</p>
            </div>
            <div style="min-height: 140px; padding: 1.5rem; background: #0d0d0d; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; box-sizing: border-box;">
              <p style="color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; margin: 0;">Column 3</p>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Project carousel block
       */
      bm.add("project-carousel-block", {
        label: "Project Carousel",
        category: "Portfolio",

        content: `
        <div
          data-cms-block="project-carousel"
          class="my-8 p-8 bg-[#0a0a0a] border border-dashed border-[#C5A059] rounded-xl text-white"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #222; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #C5A059; font-weight: bold;">
                ★ FEATURED WORKS CAROUSEL (Animated Tiles)
              </div>
              <h3 class="text-2xl font-serif text-white mt-1">Featured Projects Carousel</h3>
            </div>
            <div style="font-size: 11px; color: #C5A059; border: 1px solid rgba(197,160,89,0.4); padding: 4px 10px; border-radius: 4px; background: rgba(197,160,89,0.1);">
              Double-click to Edit Heading
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
              <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Book Covers</span>
              <div>
                <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Literary Fiction</p>
                <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
              </div>
            </div>
            <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
              <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Illustration</span>
              <div>
                <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Conceptual Piece</p>
                <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
              </div>
            </div>
            <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
              <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Fine Art</span>
              <div>
                <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Oil on Canvas</p>
                <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
              </div>
            </div>
            <div style="aspect-ratio: 3/4; background: #141414; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.3));">
              <span style="font-size: 9px; color: #C5A059; font-weight: bold; text-transform: uppercase; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 2px; align-self: flex-start; border: 1px solid rgba(197,160,89,0.4);">Dark Fantasy</span>
              <div>
                <p style="font-size: 13px; font-weight: bold; color: #fff; margin: 0;">Myth &amp; Legend</p>
                <p style="font-size: 10px; color: #C5A059; margin: 2px 0 0 0;">View Artwork →</p>
              </div>
            </div>
          </div>
        </div>
      `,
      });

      bm.add("portfolio-spotlight-block", {
        label: "Portfolio Spotlight Carousel",
        category: "Portfolio",
        content: `
        <div
          data-cms-block="portfolio-spotlight"
          class="my-8 p-8 bg-[#0a0a0a] border border-dashed border-[#C5A059] rounded-xl text-white text-center"
        >
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.25em; color: #C5A059; font-weight: bold; margin-bottom: 8px;">
            ★ PORTFOLIO SPOTLIGHT CAROUSEL
          </div>
          <h3 class="text-2xl font-serif text-white mb-2">Explore Portfolios &amp; Artwork Spotlight</h3>
          <p class="text-xs text-gray-400 uppercase tracking-widest">
            Renders interactive portfolio categories synced with animated artwork spotlight on the live site
          </p>
        </div>
      `,
      });

      /*
       * Project grid block
       */
      bm.add("project-grid-block", {
        label: "Project Grid",
        category: "Portfolio",

        content: `
        <div
          data-cms-block="project-grid"
          class="p-12 bg-black text-white border border-[#222] text-center my-8"
        >
          <h3 class="text-2xl font-serif text-[#C5A059] mb-2">
            Live Project Grid
          </h3>

          <p class="text-xs text-gray-400 uppercase tracking-widest">
            Shows a placeholder here — the real, published portfolio items appear on the live site
          </p>
        </div>
      `,
      });

      /*
       * Project Inside category blocks: Customization for project detail pages
       */
      bm.add("project-header-block", {
        label: "Project Header",
        category: "Project Inside",
        content: `
        <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl flex flex-col gap-6 my-6 text-white" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2rem;">
          <div>
            <span class="text-[10px] tracking-widest uppercase text-[#C5A059] font-bold block mb-1" style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 0.5rem;">
              FINE ART &bull; EDITABLE CATEGORY
            </span>
            <h1 class="text-4xl sm:text-5xl font-serif font-black text-white leading-tight" style="font-size: 2.5rem; font-family: serif; font-weight: 900; color: #ffffff; line-height: 1.15; margin: 0 0 0.5rem 0;">
              PROJECT TITLE HEADING
            </h1>
            <p class="text-sm text-gray-400 mt-2" style="font-size: 14px; color: #9ca3af; margin: 0.5rem 0 0 0;">
              By <span class="text-white font-medium" style="color: #ffffff; font-weight: 600;">Sourav Mitra</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-4 text-sm text-gray-400 pt-4 border-t border-[#1a1a1a]" style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 13px; color: #9ca3af; padding-top: 1rem; border-top: 1px solid #1a1a1a;">
            <span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: #fff;">2024</span>
            <span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: #fff;">Oil on Canvas</span>
            <span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: #fff;">24" x 36"</span>
            <span style="background: #141414; padding: 4px 10px; border-radius: 4px; border: 1px solid #282828; color: #4ade80;">Available for Licensing</span>
          </div>
        </div>
      `,
      });

      bm.add("project-gallery-frame-block", {
        label: "Gallery Exhibition Frame",
        category: "Project Inside",
        content: `
        <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl my-6 text-center" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2.5rem; text-align: center;">
          <span style="font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 2rem;">
            Exhibition Wall View (Gallery Lighting)
          </span>
          <div style="padding: 4rem 2rem; background: #eae7df; border-radius: 8px; border: 1px solid #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);">
            <div style="padding: 16px; background: linear-gradient(to bottom, #2e1d11, #1d1109, #0d0703); border: 6px solid #3e291b; border-radius: 2px; box-shadow: 0 25px 50px rgba(0,0,0,0.35); position: relative; max-width: 480px; width: 100%;">
              <div style="position: absolute; inset: 4px; border: 1px solid rgba(197, 160, 89, 0.6); pointer-events: none;"></div>
              <div style="padding: 24px; background: #faf8f5; border: 1px solid #ddd;">
                <img src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" alt="Artwork Exhibition" style="width: 100%; height: auto; display: block; border: 1px solid rgba(0,0,0,0.2);" />
              </div>
            </div>
            <div style="margin-top: 2rem; padding: 12px 20px; background: #ffffff; border: 1px solid #ddd; text-align: left; width: 220px;">
              <p style="font-family: serif; font-size: 13px; font-weight: 700; color: #111; margin: 0;">Artwork Title</p>
              <p style="font-size: 10px; color: #666; text-transform: uppercase; margin: 4px 0 0 0;">Oil on Canvas</p>
              <p style="font-size: 9px; color: #999; margin: 6px 0 0 0;">Sourav Mitra &bull; 2024</p>
            </div>
          </div>
        </div>
      `,
      });

      bm.add("project-3d-book-block", {
        label: "3D Book Presentation Mockup",
        category: "Project Inside",
        content: `
        <div class="bg-[#0c0c0c] rounded-xl border border-[#1e1e1e] p-8 shadow-2xl my-6 text-center" style="background-color: #0c0c0c; border: 1px solid #1e1e1e; border-radius: 12px; padding: 2.5rem; text-align: center;">
          <span style="font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 2rem;">
            3D Book Presentation Mockup
          </span>
          <div style="display: flex; justify-content: center; align-items: center; padding: 3rem 1rem; background: #080808; border-radius: 8px; border: 1px solid #1a1a1a;">
            <div style="position: relative; width: 260px; height: 380px; box-shadow: -15px 20px 40px rgba(0,0,0,0.9); border-radius: 4px; overflow: hidden; border: 1px solid #444; background: #111;">
              <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800" alt="Book Cover" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(255,255,255,0.1), rgba(0,0,0,0.6)); pointer-events: none;"></div>
            </div>
          </div>
        </div>
      `,
      });

      bm.add("project-process-studies-block", {
        label: "Blueprint & Macro Studies",
        category: "Project Inside",
        content: `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
          <div style="background: #0c121c; border: 1px solid rgba(30, 58, 138, 0.4); border-radius: 12px; padding: 2rem; text-align: center; color: #fff;">
            <span style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #60a5fa; font-weight: 700; font-family: monospace; display: block; margin-bottom: 1.5rem;">
              Blueprint &amp; Grid Study
            </span>
            <div style="width: 140px; height: 140px; margin: 0 auto 1.5rem auto; border: 1px dashed #3b82f6; display: flex; align-items: center; justify-content: center; position: relative;">
              <div style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);"></div>
              <span style="font-family: monospace; font-size: 11px; color: #93c5fd;">Proportion Matrix</span>
            </div>
            <p style="font-size: 12px; color: #93c5fd; font-family: monospace; font-style: italic; margin: 0;">
              Geometric proportions, golden ratio guides &amp; composition vectors
            </p>
          </div>
          <div style="background: #141414; border: 1px solid #252525; border-radius: 12px; padding: 2rem; text-align: center; color: #fff;">
            <span style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #C5A059; font-weight: 700; display: block; margin-bottom: 1.5rem;">
              Detail Crop &amp; Macro Texture
            </span>
            <div style="width: 140px; height: 140px; margin: 0 auto 1.5rem auto; border-radius: 50%; border: 3px solid rgba(197, 160, 89, 0.4); overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
              <img src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" alt="Texture Zoom" style="width: 180%; height: 180%; object-fit: cover; transform: scale(1.4);" />
            </div>
            <p style="font-size: 12px; color: #9ca3af; font-style: italic; margin: 0;">
              Macro surface magnification showing fine brushwork &amp; tactile grain
            </p>
          </div>
        </div>
      `,
      });

      bm.add("project-creative-process-block", {
        label: "Creative Process & Insight",
        category: "Project Inside",
        content: `
        <div class="bg-[#0c0c0c] rounded-xl border border-[#1d1d1d] p-8 flex flex-col gap-4 shadow-xl my-6" style="background-color: #0c0c0c; border: 1px solid #1d1d1d; border-radius: 12px; padding: 2rem;">
          <h3 class="text-xl font-serif text-white font-bold border-b border-[#222] pb-3 mb-2" style="font-size: 1.35rem; font-family: serif; color: #ffffff; font-weight: 700; border-bottom: 1px solid #222; padding-bottom: 0.75rem; margin-top: 0; margin-bottom: 0.75rem;">
            The Creative Process &amp; Insight
          </h3>
          <p class="text-sm leading-relaxed text-gray-300" style="font-size: 14px; line-height: 1.7; color: #d1d5db; margin: 0 0 1rem 0;">
            This project is built around the harmonious combination of visual weight and structural balance. Every visual element has been carefully structured using geometric guides and organic focal points to create a compelling, immediate narrative.
          </p>
          <p class="text-sm leading-relaxed text-gray-300" style="font-size: 14px; line-height: 1.7; color: #d1d5db; margin: 0;">
            Crafted with attention to traditional techniques, depth, and atmospheric lighting that draws the eye across the canvas.
          </p>
        </div>
      `,
      });

      bm.add("project-interactive-share-comments", {
        label: "Interactive Share & Comments",
        category: "Project Inside",
        content: `
        <div class="my-6 flex flex-col gap-6">
          <div data-cms-block="project-share" class="w-full">
            <button type="button" class="w-full py-3 rounded-lg bg-black text-gray-300 border border-[#2a2a2a] font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2">
              Share Project
            </button>
          </div>
          <div data-cms-block="project-comments" class="bg-[#0a0a0a] rounded-xl border border-[#1e1e1e] p-6 shadow-xl">
            <h4 class="text-base font-bold text-white uppercase tracking-wider mb-4" style="color: #fff;">Visitor Comments</h4>
            <p class="text-xs text-gray-500">Interactive comments input and discussion will render live on this published page.</p>
          </div>
        </div>
      `,
      });

      bm.add("animated-counters-section", {
        label: "Animated Counters",
        category: "Portfolio",
        content: `
        <section class="bg-[#111111] py-12 border-t border-[#333333] my-8" data-cms-section="counters">
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
      `,
      });

      bm.add("single-counter-stat", {
        label: "Single Stat Counter",
        category: "Portfolio",
        content: `
        <div class="counter-item text-center p-4 my-3" data-counter="item">
          <div class="counter-number text-4xl sm:text-5xl font-bold text-[#C5A059] font-mono tracking-tight" data-counter-target="100" data-counter-suffix="+">100+</div>
          <div class="counter-label text-xs sm:text-sm uppercase tracking-widest text-[#D4D4D4] mt-2 font-medium">Creative Works</div>
        </div>
      `,
      });

      bm.add("testimonials-carousel-block", {
        label: "Testimonials Carousel",
        category: "Portfolio",
        content: `
        <div
          data-cms-block="testimonials-carousel"
          class="min-h-72 border border-dashed border-[#C5A059] bg-[#0a0a0a] p-8 text-center text-white"
        >
          <h3 class="mb-4 text-2xl font-serif text-[#C5A059]">What Publishers &amp; Clients Say</h3>
          <blockquote class="text-sm text-gray-300 italic mb-3" data-testimonial-quote="Sourav's artwork captured the exact haunting atmosphere of our novel. An absolute master of his craft." data-testimonial-author="Editorial Director, Tor Books">"Sourav's artwork captured the exact haunting atmosphere of our novel. An absolute master of his craft."<br>- Editorial Director, Tor Books</blockquote>
          <blockquote class="text-sm text-gray-300 italic mb-3" data-testimonial-quote="Working with Sourav was effortless. The cover delivered exceeded all expectations and drove pre-orders through the roof." data-testimonial-author="Senior Editor, Orbit Books">"Working with Sourav was effortless. The cover delivered exceeded all expectations and drove pre-orders through the roof."<br>- Senior Editor, Orbit Books</blockquote>
          <blockquote class="text-sm text-gray-300 italic mb-3" data-testimonial-quote="A rare visionary talent whose evocative style immediately commands attention on any bookshelf." data-testimonial-author="Creative Director, Penguin Random House">"A rare visionary talent whose evocative style immediately commands attention on any bookshelf."<br>- Creative Director, Penguin Random House</blockquote>
        </div>
      `,
      });

      /*
       * Contact form block
       */
      bm.add("contact-form-block", {
        label: "Contact Form",
        category: "Portfolio",

        content: `
        <div
          data-cms-block="contact-form"
          class="p-12 bg-[#080808] text-white border border-[#222] max-w-xl mx-auto my-12 text-center"
        >
          <h3 class="text-2xl font-serif text-white mb-2">
            Live Contact Form
          </h3>

          <p class="text-xs text-gray-400 uppercase tracking-widest">
            Shows a placeholder here — the real form (posting to /api/contact) appears on the live site
          </p>
        </div>
      `,
      });

      /*
       * Testimonials block
       */
      bm.add("testimonials-block", {
        label: "Testimonials",
        category: "Portfolio",

        content: `
        <section class="py-20 px-8 bg-[#0a0a0a] text-center border-t border-b border-[#222]">

          <div class="p-8 bg-black border border-[#222] transition-all duration-500 hover:scale-[1.02] hover:border-[#C5A059] shadow-lg max-w-2xl mx-auto">

            <p class="text-lg font-serif text-gray-300 italic mb-4">
              "Sourav's artwork captured the exact haunting atmosphere of our novel. An absolute master of his craft."
            </p>

            <span class="text-xs uppercase tracking-widest text-[#C5A059] font-bold">
              — Editorial Client
            </span>

          </div>

        </section>
      `,
      });

      /*
       * Portfolio: Client Logos Section block (clean monochrome logos matching reference screenshot)
       */
      bm.add("client-logos-block", {
        label: "Client Logos Section",
        category: "Portfolio",
        content: `
        <section class="py-16 border-t border-[#222]" style="background-color: #000000; width: 100%; box-sizing: border-box; padding: 4rem 1.5rem;">
          <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 1.875rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem; letter-spacing: -0.01em;">
              Clients
            </h2>
            <div style="width: 2rem; height: 2px; background-color: #9CA3AF; opacity: 0.7; margin-bottom: 3.5rem;"></div>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 3.5rem; width: 100%;">
              <div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">
                <img 
                  src="/clients/talo.png" 
                  alt="talo" 
                  style="height: 44px; width: auto; object-fit: contain; display: block; opacity: 0.85;"
                />
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">
                <img 
                  src="/clients/solid_state.png" 
                  alt="SOLID STATE" 
                  style="height: 44px; width: auto; object-fit: contain; display: block; opacity: 0.85;"
                />
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">
                <img 
                  src="/clients/noted.png" 
                  alt="NOTED" 
                  style="height: 44px; width: auto; object-fit: contain; display: block; opacity: 0.85;"
                />
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">
                <img 
                  src="/clients/goan.png" 
                  alt="GOAN" 
                  style="height: 44px; width: auto; object-fit: contain; display: block; opacity: 0.85;"
                />
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">
                <img 
                  src="/clients/mowi.png" 
                  alt="MOWI" 
                  style="height: 44px; width: auto; object-fit: contain; display: block; opacity: 0.85;"
                />
              </div>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Portfolio: Single Brand Logo Item (drag-and-drop placeholder into any section/container)
       */
      bm.add("brand-logo-item-block", {
        label: "Brand Logo Item",
        category: "Portfolio",
        content: `
        <div style="display: inline-flex; flex-direction: column; align-items: center; width: 140px; padding: 0.5rem; text-align: center;">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" 
            alt="Brand Logo" 
            style="height: 48px; width: auto; max-width: 120px; object-fit: contain; margin-bottom: 0.75rem; display: block;"
          />
          <span style="font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d1d5db; font-weight: 500;">
            Brand Name
          </span>
        </div>
      `,
      });

      /*
       * Layout: Brand Logos Container (clean container for dropping brand logos)
       */
      bm.add("brand-logos-container-block", {
        label: "Brand Logos Container",
        category: "Layout",
        content: `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2.5rem; width: 100%; min-height: 80px; padding: 1.5rem 1rem; box-sizing: border-box;">
          <div style="display: flex; flex-direction: column; align-items: center; width: 140px; padding: 0.5rem; text-align: center;">
            <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" 
              alt="Brand Logo" 
              style="height: 48px; width: auto; max-width: 120px; object-fit: contain; margin-bottom: 0.75rem; display: block;"
            />
            <span style="font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d1d5db; font-weight: 500;">
              Brand Logo
            </span>
          </div>
        </div>
      `,
      });

      /*
       * Portfolio: Hero Banner Showcase with dual CTAs and dark aesthetic
       */
      bm.add("hero-banner-showcase", {
        label: "Hero Banner Showcase",
        category: "Portfolio",
        content: `
        <section style="position: relative; width: 100%; min-height: 80vh; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; padding: 5rem 1.5rem; background: #000000; box-sizing: border-box;">
          <img 
            src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920" 
            alt="Hero Cinematic Artwork" 
            style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; opacity: 0.5; filter: contrast(110%);" 
          />
          <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%); pointer-events: none; z-index: 1;"></div>
          <div style="position: relative; z-index: 2; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: #C5A059; margin-bottom: 1.25rem;">
              Digital Painter &bull; Book Cover Artist
            </span>
            <h1 style="font-size: 3.75rem; font-family: 'Playfair Display', Georgia, serif; color: #FFFFFF; margin-bottom: 1.25rem; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.15;">
              Crafting Myth &amp; Mystery
            </h1>
            <p style="font-size: 1.25rem; color: #d4d4d4; margin-bottom: 2.5rem; font-weight: 300; max-width: 680px; line-height: 1.6;">
              Award-winning dark fantasy, sci-fi, and historical fiction illustrations for premier publishing houses worldwide.
            </p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
              <a
                href="/book-covers"
                style="display: inline-block; padding: 1rem 2.25rem; background-color: #C5A059; color: #000000; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.75rem; text-decoration: none; border-radius: 2px;"
              >
                View Cover Gallery
              </a>
              <a
                href="/contact"
                style="display: inline-block; padding: 1rem 2.25rem; background: transparent; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.75rem; text-decoration: none; border-radius: 2px;"
              >
                Inquire for Commission
              </a>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Portfolio: Artist Bio Split (50/50 Portrait & Story)
       */
      bm.add("artist-bio-split", {
        label: "Artist Bio & Portrait",
        category: "Portfolio",
        content: `
        <section style="padding: 5rem 1.5rem; background-color: #080808; width: 100%; box-sizing: border-box; border-top: 1px solid #1a1a1a; border-bottom: 1px solid #1a1a1a;">
          <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 3.5rem; align-items: center;">
            <div style="position: relative; width: 100%; max-width: 440px; margin: 0 auto;">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800" 
                alt="Artist Portrait" 
                style="width: 100%; height: auto; object-fit: cover; border-radius: 4px; border: 1px solid #2a2a2a; box-shadow: 0 16px 36px rgba(0,0,0,0.6);"
              />
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #C5A059; margin-bottom: 0.75rem;">
                About The Artist
              </span>
              <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 2.5rem; color: #ffffff; margin-bottom: 1.5rem; line-height: 1.2;">
                Sourav Mitra
              </h2>
              <p style="font-size: 1rem; color: #a3a3a3; line-height: 1.8; margin-bottom: 1.25rem;">
                With over 8 years in commercial illustration and more than 550 completed book covers, Sourav specializes in atmospheric fantasy, gothic horror, and narrative storytelling. His work combines classical painterly lighting with cinematic depth.
              </p>
              <div style="padding: 1.25rem; background: #121212; border-left: 2px solid #C5A059; margin-bottom: 1.5rem;">
                <p style="font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.05rem; color: #e5e5e5; margin: 0;">
                  "Every cover is an invitation into a world waiting to be explored."
                </p>
              </div>
              <div>
                <a href="/contact" style="display: inline-block; padding: 0.85rem 2rem; background: #C5A059; color: #000; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 2px;">
                  Get In Touch &rarr;
                </a>
              </div>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Portfolio: Artwork Feature Spotlight Card
       */
      bm.add("artwork-feature-card", {
        label: "Artwork Feature Card",
        category: "Portfolio",
        content: `
        <section style="padding: 4rem 1.5rem; background: #000000; width: 100%; box-sizing: border-box;">
          <div style="max-width: 900px; margin: 0 auto; background: #0c0c0c; border: 1px solid #222; border-radius: 4px; overflow: hidden; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); box-shadow: 0 12px 30px rgba(0,0,0,0.7);">
            <div style="min-height: 320px; position: relative;">
              <img 
                src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800" 
                alt="Featured Artwork" 
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
              />
            </div>
            <div style="padding: 2.5rem; display: flex; flex-direction: column; justify-content: center;">
              <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #C5A059; margin-bottom: 0.5rem;">
                Featured Artwork Spotlight
              </span>
              <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 2rem; color: #fff; margin-bottom: 0.75rem;">
                The Whispering Citadel
              </h3>
              <p style="font-size: 0.85rem; color: #888; margin-bottom: 1.25rem;">
                Digital Painting &bull; 2024 &bull; Tor Books Publishing
              </p>
              <p style="font-size: 0.95rem; color: #bbb; line-height: 1.6; margin-bottom: 1.75rem;">
                Created as the cover illustration for a dark fantasy bestseller. Features intricately sculpted gothic arches, eerie fog, and atmospheric rim lighting.
              </p>
              <a href="/book-covers" style="display: inline-block; align-self: flex-start; padding: 0.75rem 1.75rem; border: 1px solid #C5A059; color: #C5A059; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 2px;">
                View In Gallery
              </a>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Portfolio: Awards & Recognitions Trio
       */
      bm.add("awards-trio-block", {
        label: "Awards & Honors Trio",
        category: "Portfolio",
        content: `
        <section style="padding: 4.5rem 1.5rem; background: #090909; width: 100%; box-sizing: border-box; border-top: 1px solid #1a1a1a;">
          <div style="max-width: 1100px; margin: 0 auto; text-align: center;">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: #C5A059; margin-bottom: 0.5rem; display: block;">
              Recognition &amp; Accolades
            </span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 2.25rem; color: #ffffff; margin-bottom: 3.5rem;">
              Honors &amp; Selected Features
            </h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem;">
              <div style="background: #111111; border: 1px solid #222; padding: 2.5rem 1.5rem; border-radius: 4px; display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 2rem; color: #C5A059; margin-bottom: 1rem;">🏆</span>
                <h4 style="font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #fff; margin-bottom: 0.5rem;">
                  Best Cover Art 2023
                </h4>
                <p style="font-size: 0.85rem; color: #888; line-height: 1.6; margin: 0;">
                  Awarded for Outstanding Fantasy Cover Design at the International Speculative Fiction Guild.
                </p>
              </div>
              <div style="background: #111111; border: 1px solid #222; padding: 2.5rem 1.5rem; border-radius: 4px; display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 2rem; color: #C5A059; margin-bottom: 1rem;">⭐</span>
                <h4 style="font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #fff; margin-bottom: 0.5rem;">
                  Spectrum Fantastic Art
                </h4>
                <p style="font-size: 0.85rem; color: #888; line-height: 1.6; margin: 0;">
                  Selected for publication in Volume 29 celebrating the finest contemporary fantastic art.
                </p>
              </div>
              <div style="background: #111111; border: 1px solid #222; padding: 2.5rem 1.5rem; border-radius: 4px; display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 2rem; color: #C5A059; margin-bottom: 1rem;">🎖️</span>
                <h4 style="font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #fff; margin-bottom: 0.5rem;">
                  550+ Published Covers
                </h4>
                <p style="font-size: 0.85rem; color: #888; line-height: 1.6; margin: 0;">
                  Trusted by major publishers including Tor, Orbit, Penguin Random House, and independent authors.
                </p>
              </div>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Portfolio: Commission Call-To-Action Banner
       */
      bm.add("cta-banner-block", {
        label: "Commission CTA Banner",
        category: "Portfolio",
        content: `
        <section style="padding: 5rem 1.5rem; background: linear-gradient(180deg, #0d0d0d 0%, #050505 100%); width: 100%; box-sizing: border-box;">
          <div style="max-width: 960px; margin: 0 auto; padding: 3.5rem 2rem; background: #121212; border: 1px solid rgba(197, 160, 89, 0.35); border-radius: 4px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: #C5A059; margin-bottom: 1rem; display: block;">
              Let's Work Together
            </span>
            <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 2.5rem; color: #ffffff; margin-bottom: 1.25rem; line-height: 1.2;">
              Ready to Bring Your Story to Life?
            </h2>
            <p style="font-size: 1.05rem; color: #aaa; max-width: 600px; margin: 0 auto 2.25rem auto; line-height: 1.7;">
              Currently booking custom book cover commissions and commercial illustration projects for upcoming publishing quarters.
            </p>
            <a
              href="/contact"
              style="display: inline-block; padding: 1rem 2.5rem; background: #C5A059; color: #000; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 2px;"
            >
              Request a Commission Quote
            </a>
          </div>
        </section>
      `,
      });

      /*
       * Media: Responsive Video / Reel Embed
       */
      bm.add("video-reel-block", {
        label: "Video / Reel Embed",
        category: "Media",
        content: `
        <section style="padding: 4rem 1.5rem; background: #000000; width: 100%; box-sizing: border-box;">
          <div style="max-width: 900px; margin: 0 auto; text-align: center;">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #C5A059; margin-bottom: 0.5rem; display: block;">
              Process &amp; Timelapse
            </span>
            <h3 style="font-family: 'Playfair Display', serif; font-size: 2rem; color: #fff; margin-bottom: 2rem;">
              Behind The Canvas
            </h3>
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 4px; border: 1px solid #222; box-shadow: 0 12px 30px rgba(0,0,0,0.8);">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Artwork Process Video"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </section>
      `,
      });

      /*
       * Basic: Social & Art Links Bar
       */
      bm.add("social-links-bar-block", {
        label: "Social & Art Links Bar",
        category: "Basic",
        content: `
        <section style="padding: 2.5rem 1.5rem; background: #0a0a0a; width: 100%; box-sizing: border-box; border-top: 1px solid #1a1a1a;">
          <div style="max-width: 800px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2rem;">
            <a href="https://artstation.com" target="_blank" rel="noopener noreferrer" style="color: #999; text-decoration: none; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
              ArtStation
            </a>
            <span style="color: #333;">&bull;</span>
            <a href="https://behance.net" target="_blank" rel="noopener noreferrer" style="color: #999; text-decoration: none; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
              Behance
            </a>
            <span style="color: #333;">&bull;</span>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style="color: #999; text-decoration: none; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
              Instagram
            </a>
            <span style="color: #333;">&bull;</span>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style="color: #999; text-decoration: none; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em;">
              LinkedIn
            </a>
          </div>
        </section>
      `,
      });

      /*
       * Cleanup.
       *
       * Delayed slightly so React development
       * Strict Mode does not immediately destroy
       * and recreate the same editor instance.
       */
      return () => {
        const currentEditor = editor;

        destroyTimerRef.current = setTimeout(() => {
          if (editorRef.current === currentEditor) {
            try {
              currentEditor.destroy();
            } catch (error) {
              console.error("Failed to destroy GrapesJS editor:", error);
            }

            editorRef.current = null;
          }

          destroyTimerRef.current = null;
        }, 0);
      };
    }, [initialData, initialHtml, initialCss]);

    // Fetch installed custom fonts from DB on mount
    useEffect(() => {
      fetch("/api/cms/fonts")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.fonts)) {
            setCustomFonts(data.fonts);
            if (editorRef.current) {
              data.fonts.forEach((font: CustomFont) => {
                injectFontIntoDocumentAndCanvas(font, editorRef.current!);
              });
            }
          }
        })
        .catch((err) => console.warn("Failed to load custom fonts:", err));
    }, []);

    // Ensure Typography button is injected when switching to styles tab
    useEffect(() => {
      if (activeRightTab === "styles") {
        setTimeout(setupTypographyCustomFontButton, 100);
        setTimeout(setupTypographyCustomFontButton, 400);
      }
    }, [activeRightTab]);

    const handleFontInstalled = (
      font: CustomFont,
      applyImmediately: boolean,
    ) => {
      setCustomFonts((prev) => {
        const filtered = prev.filter(
          (f) =>
            f.id !== font.id &&
            f.family.toLowerCase() !== font.family.toLowerCase(),
        );
        return [...filtered, font];
      });

      const ed = editorRef.current;
      if (ed) {
        injectFontIntoDocumentAndCanvas(font, ed);
        if (applyImmediately) {
          const selected = ed.getSelected();
          if (selected) {
            selected.addStyle({
              "font-family": `'${font.family}', sans-serif`,
            });
            ed.trigger("component:update", selected);
          }
        }
      }
    };

    const handleFontDeleted = (fontId: string) => {
      setCustomFonts((prev) => prev.filter((f) => f.id !== fontId));
      const hostEl = document.getElementById(`custom-font-style-${fontId}`);
      if (hostEl) hostEl.remove();

      const ed = editorRef.current;
      if (ed) {
        try {
          const canvasDoc = ed.Canvas?.getDocument();
          const canvasEl = canvasDoc?.getElementById(
            `custom-font-style-${fontId}`,
          );
          if (canvasEl) canvasEl.remove();
        } catch {}
      }
    };

    const handleApplyFontToSelected = (font: CustomFont) => {
      const ed = editorRef.current;
      if (ed) {
        const selected = ed.getSelected();
        if (selected) {
          selected.addStyle({ "font-family": `'${font.family}', sans-serif` });
          ed.trigger("component:update", selected);
        }
      }
    };

    const handleExportSave = (isPublish = false) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      syncAllCounters(editor);

      const projectData = editor.getProjectData();

      /*
       * GrapesJS typings allow these methods
       * to return undefined, while our callbacks
       * require strings.
       *
       * Normalize them here.
       */
      const html = editor.getHtml() ?? "";

      const css = exportCleanCss(editor);

      if (isPublish && onPublish) {
        onPublish(projectData, html, css);
        return;
      }

      if (!isPublish && onSave) {
        onSave(projectData, html, css);
      }
    };

    const handleUndo = () => {
      editorRef.current?.UndoManager?.undo();
    };

    const handleRedo = () => {
      editorRef.current?.UndoManager?.redo();
    };

    const handleTogglePreview = () => {
      const editor = editorRef.current;
      if (!editor) return;
      if (isPreviewActive) {
        editor.stopCommand("preview");
        setIsPreviewActive(false);
      } else {
        editor.runCommand("preview");
        setIsPreviewActive(true);
      }
    };

    const handleViewCode = () => {
      editorRef.current?.runCommand("export-template");
    };

    const handleToggleFullscreen = () => {
      editorRef.current?.runCommand("core:fullscreen");
    };

    return (
      <div className="flex flex-col h-full w-full bg-black overflow-hidden">
        <style>{`
          .gjs-mdl-container {
            z-index: 99999 !important;
            background-color: rgba(0, 0, 0, 0.8) !important;
          }
          .gjs-mdl-dialog {
            background-color: #121212 !important;
            border: 1px solid #333 !important;
            color: #fff !important;
            border-radius: 6px !important;
            max-width: 760px !important;
            overflow: hidden !important;
          }
          .gjs-mdl-header {
            border-bottom: 1px solid #222 !important;
            color: #C5A059 !important;
            display: flex !important;
            align-items: center !important;
            padding: 10px 16px !important;
          }
          .gjs-am-file-uploader {
            border: 2px dashed #444 !important;
            background: #0d0d0d !important;
            color: #bbb !important;
            padding: 1.5rem !important;
            margin-bottom: 1rem !important;
            text-align: center;
          }
          .gjs-am-assets-cont {
            background: #090909 !important;
          }
          .gjs-am-asset {
            border: 1px solid #333 !important;
            background: #181818 !important;
            position: relative !important;
            cursor: pointer !important;
            border-radius: 4px !important;
            transition: all 0.2s ease !important;
          }
          .gjs-am-asset:hover {
            border-color: #C5A059 !important;
          }
          .gjs-am-asset.gjs-custom-active-card,
          .gjs-am-asset.gjs-am-highlight,
          .gjs-am-asset.gjs-highlight {
            outline: 2px solid #C5A059 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 14px rgba(197, 160, 89, 0.45) !important;
            border-color: #C5A059 !important;
          }
          .gjs-custom-save-img-btn {
            background: #C5A059 !important;
            color: #000000 !important;
            border: 1px solid #C5A059 !important;
            font-weight: 700 !important;
            transition: all 0.2s ease !important;
          }
          .gjs-custom-save-img-btn:hover {
            background: #dfb96e !important;
            box-shadow: 0 3px 12px rgba(197, 160, 89, 0.5) !important;
          }
          .gjs-am-close {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute !important;
            top: 4px !important;
            right: 4px !important;
            width: 22px !important;
            height: 22px !important;
            background: rgba(0, 0, 0, 0.85) !important;
            color: #ff5252 !important;
            border: 1px solid #ff5252 !important;
            border-radius: 50% !important;
            font-size: 14px !important;
            font-weight: bold !important;
            opacity: 0.9 !important;
            cursor: pointer !important;
            z-index: 20 !important;
            transition: all 0.2s ease !important;
          }
          .gjs-am-close:hover {
            background: #d32f2f !important;
            color: #ffffff !important;
            border-color: #d32f2f !important;
            opacity: 1 !important;
            transform: scale(1.15) !important;
          }
          .gjs-traits-container input, .gjs-traits-container select {
            background-color: #141414 !important;
            color: #fff !important;
            border: 1px solid #333 !important;
            padding: 0.4rem 0.6rem !important;
            border-radius: 2px !important;
            width: 100% !important;
            font-size: 0.8rem !important;
          }
          .gjs-traits-container .gjs-trt-trait {
            padding: 0.6rem 0.25rem !important;
            border-bottom: 1px solid #1c1c1c !important;
          }
          .gjs-traits-container .gjs-label {
            color: #C5A059 !important;
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            margin-bottom: 0.35rem !important;
          }
          .gjs-layers-container {
            color: #ccc !important;
          }
          .gjs-layers-container .gjs-layer {
            border-bottom: 1px solid #1a1a1a !important;
          }
          .gjs-layers-container .gjs-layer:hover {
            background-color: #1a1a1a !important;
            color: #C5A059 !important;
          }
          /* Ensure preview devices toolbar stays in flex layout without overlapping header */
          .panel__devices.gjs-pn-panel,
          .panel__devices {
            position: static !important;
            display: inline-flex !important;
            align-items: center !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            margin: 0 !important;
            padding: 2px !important;
            background: #141414 !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
          }
          .panel__devices .gjs-pn-buttons {
            position: static !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 2px !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .panel__devices .gjs-pn-btn {
            position: static !important;
            margin: 0 !important;
            padding: 4px 10px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
            color: #999 !important;
            background: transparent !important;
            border: 1px solid transparent !important;
            border-radius: 3px !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            line-height: normal !important;
            height: auto !important;
          }
          .panel__devices .gjs-pn-btn:hover {
            color: #fff !important;
            background: #222 !important;
          }
          .panel__devices .gjs-pn-btn.gjs-pn-active {
            color: #C5A059 !important;
            background: #222 !important;
            border-color: #383838 !important;
          }

          /* Professional floating toolbar styling & alignment (prevents overlapping) */
          :root {
            --gjs-color-blue: #C5A059 !important;
          }

          .gjs-toolbar {
            position: absolute !important;
            display: inline-flex !important;
            align-items: center !important;
            background: #141414 !important;
            background: linear-gradient(180deg, #1c1c1c 0%, #111111 100%) !important;
            border: 1px solid rgba(197, 160, 89, 0.45) !important;
            border-radius: 6px !important;
            padding: 3px 4px !important;
            gap: 3px !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75), 0 2px 6px rgba(0, 0, 0, 0.5) !important;
            z-index: 100 !important;
            white-space: nowrap !important;
            box-sizing: border-box !important;
            height: auto !important;
            line-height: normal !important;
            pointer-events: all !important;
          }

          .gjs-toolbar-item {
            width: auto !important;
            min-width: 28px !important;
            height: 28px !important;
            padding: 0 10px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            letter-spacing: 0.03em !important;
            color: #d8d8d8 !important;
            background: #202020 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-sizing: border-box !important;
            white-space: nowrap !important;
            user-select: none !important;
            line-height: 1 !important;
            margin: 0 !important;
          }

          .gjs-toolbar-item:hover {
            background: #303030 !important;
            color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            transform: translateY(-1px) !important;
          }

          .gjs-toolbar-item:active {
            transform: translateY(0) !important;
          }

          .gjs-toolbar-item svg {
            width: 14px !important;
            height: 14px !important;
            fill: currentColor !important;
            display: inline-block !important;
            vertical-align: middle !important;
            flex-shrink: 0 !important;
          }

          /* Primary Action Buttons (Change Image, Edit Carousel, Edit Heading) */
          .gjs-toolbar-item__change-image,
          .gjs-toolbar-item__edit-testimonials,
          .gjs-toolbar-item__edit-project-carousel,
          .gjs-toolbar-item[title*="Change"],
          .gjs-toolbar-item[title*="Upload"],
          .gjs-toolbar-item[title*="Edit"] {
            background: #241c0e !important;
            color: #C5A059 !important;
            border: 1px solid rgba(197, 160, 89, 0.5) !important;
            font-weight: 700 !important;
          }

          .gjs-toolbar-item__change-image:hover,
          .gjs-toolbar-item__edit-testimonials:hover,
          .gjs-toolbar-item__edit-project-carousel:hover,
          .gjs-toolbar-item[title*="Change"]:hover,
          .gjs-toolbar-item[title*="Upload"]:hover,
          .gjs-toolbar-item[title*="Edit"]:hover {
            background: #C5A059 !important;
            color: #000000 !important;
            border-color: #C5A059 !important;
            box-shadow: 0 2px 8px rgba(197, 160, 89, 0.35) !important;
          }

          /* Destructive / Remove Action Buttons */
          .gjs-toolbar-item__remove-image,
          .gjs-toolbar-item[title*="Remove"],
          .gjs-toolbar-item[title*="Delete"],
          .gjs-toolbar-item__tlb-delete {
            color: #ff7878 !important;
            border-color: rgba(239, 68, 68, 0.25) !important;
          }

          .gjs-toolbar-item__remove-image:hover,
          .gjs-toolbar-item[title*="Remove"]:hover,
          .gjs-toolbar-item[title*="Delete"]:hover,
          .gjs-toolbar-item__tlb-delete:hover {
            background: #d32f2f !important;
            color: #ffffff !important;
            border-color: #d32f2f !important;
            box-shadow: 0 2px 8px rgba(211, 47, 47, 0.4) !important;
          }

          /* Icon-only button padding */
          .gjs-toolbar-item:has(svg:only-child) {
            padding: 0 7px !important;
            min-width: 28px !important;
          }

          /* Component Selection Badge (tag indicator on hover/select) */
          .gjs-badge {
            background-color: #161616 !important;
            color: #C5A059 !important;
            border: 1px solid rgba(197, 160, 89, 0.5) !important;
            border-radius: 3px !important;
            padding: 2px 6px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6) !important;
          }

          /* Selection & Hover Outlines */
          .gjs-cv-canvas .gjs-highlighter {
            border: 1px dashed rgba(197, 160, 89, 0.6) !important;
            outline: none !important;
          }

          .gjs-cv-canvas .gjs-com-selected,
          .gjs-cv-canvas .gjs-selected {
            outline: 2px solid #C5A059 !important;
            outline-offset: -1px !important;
          }

          /* Resizer Handles (squares on edges) */
          .gjs-resizer-h {
            border: 1px solid #141414 !important;
            background-color: #C5A059 !important;
            border-radius: 2px !important;
            width: 9px !important;
            height: 9px !important;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.9) !important;
            z-index: 100 !important;
          }
          .gjs-resizer-h:hover {
            background-color: #ffffff !important;
            transform: scale(1.3) !important;
          }

          /* Selector / Class Manager styling */
          .gjs-clm-tags {
            padding: 8px 12px !important;
            background: #111111 !important;
            border-bottom: 1px solid #222222 !important;
          }
          .gjs-clm-tag {
            background-color: #222222 !important;
            color: #C5A059 !important;
            border: 1px solid rgba(197, 160, 89, 0.35) !important;
            border-radius: 3px !important;
            padding: 3px 6px !important;
            font-size: 11px !important;
            margin: 2px !important;
          }
          .gjs-clm-tag-close {
            color: #ff5252 !important;
            margin-left: 4px !important;
          }
          .gjs-clm-new {
            background: #161616 !important;
            color: #ffffff !important;
            border: 1px solid #333333 !important;
            border-radius: 3px !important;
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
        `}</style>
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c0c0c] border-b border-[#222] text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#C5A059] uppercase tracking-widest text-xs whitespace-nowrap select-none">
              Visual Editor
            </span>

            {/* Responsive Device Viewport Switcher */}
            <div
              className="panel__devices flex items-center gap-1 rounded border border-[#333] bg-[#141414] p-0.5"
              role="group"
              aria-label="Preview viewport"
            />

            <div className="h-4 w-px bg-[#262626]" />

            {/* History Controls: Undo & Redo */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                title="Undo last change (Ctrl+Z)"
                className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-gray-400 hover:text-white bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] hover:border-[#444] rounded transition-all flex items-center gap-1.5">
                <span>↶</span>
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                title="Redo next change (Ctrl+Y)"
                className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-gray-400 hover:text-white bg-[#141414] hover:bg-[#202020] border border-[#2a2a2a] hover:border-[#444] rounded transition-all flex items-center gap-1.5">
                <span>↷</span>
                <span>Redo</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Clean Preview Toggle */}
            <button
              type="button"
              onClick={handleTogglePreview}
              title={
                isPreviewActive
                  ? "Exit Preview Mode"
                  : "Preview page without editor overlays"
              }
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                isPreviewActive
                  ? "bg-[#C5A059] text-black shadow-md shadow-[#C5A059]/20"
                  : "border border-[#333] text-gray-300 hover:text-white hover:border-[#C5A059] bg-[#141414]"
              }`}>
              <span>{isPreviewActive ? "✏️" : "👁️"}</span>
              <span>{isPreviewActive ? "Edit Mode" : "Preview"}</span>
            </button>

            {/* View / Export Code */}
            <button
              type="button"
              onClick={handleViewCode}
              title="View and Export generated HTML & CSS Code"
              className="px-2.5 py-1.5 border border-[#333] text-gray-300 hover:text-white hover:border-[#C5A059] bg-[#141414] rounded transition-colors text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <span>&lt;/&gt;</span>
              <span>Code</span>
            </button>

            {/* Fullscreen Mode */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title="Toggle Fullscreen Editor"
              className="px-2.5 py-1.5 border border-[#333] text-gray-300 hover:text-white hover:border-[#C5A059] bg-[#141414] rounded transition-colors text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <span>⛶</span>
              <span>Fullscreen</span>
            </button>

            {/* Custom Font Studio Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowFontModal(true)}
              title="Install & Manage Custom Typography Fonts (Google Fonts, Web URLs, Uploads)"
              className="px-2.5 py-1.5 border border-[#333] hover:border-[#C5A059] text-[#C5A059] hover:text-white bg-[#141414] rounded transition-colors text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <span>🔤</span>
              <span>
                Fonts {customFonts.length > 0 && `(${customFonts.length})`}
              </span>
            </button>

            <div className="h-4 w-px bg-[#262626]" />

            <button
              type="button"
              onClick={() => handleExportSave(false)}
              className="px-3 py-1.5 border border-[#333] text-gray-300 hover:text-white hover:border-[#C5A059] transition-colors uppercase tracking-widest font-bold text-xs">
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => handleExportSave(true)}
              className="px-3 py-1.5 bg-[#C5A059] text-black hover:bg-white transition-colors uppercase tracking-widest font-bold text-xs shadow-md shadow-[#C5A059]/20">
              Publish Page
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative w-full h-[calc(100vh-8rem)]">
          <div className="gjs-blocks-container w-56 shrink-0 overflow-y-auto border-r border-[#222] bg-[#080808]" />

          <div
            id="gjs"
            ref={containerRef}
            className="flex-1 h-full w-full bg-[#111]"
          />

          <div className="w-72 shrink-0 flex flex-col border-l border-[#222] bg-[#080808]">
            <div className="flex border-b border-[#222] bg-[#0c0c0c] text-[10px] font-bold uppercase tracking-wider shrink-0">
              <button
                type="button"
                onClick={() => setActiveRightTab("styles")}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeRightTab === "styles"
                    ? "border-[#C5A059] text-[#C5A059] bg-[#141414]"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}>
                Styles
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab("traits")}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeRightTab === "traits"
                    ? "border-[#C5A059] text-[#C5A059] bg-[#141414]"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}>
                Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab("layers")}
                className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 ${
                  activeRightTab === "layers"
                    ? "border-[#C5A059] text-[#C5A059] bg-[#141414]"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}>
                Layers
              </button>
            </div>

            <div
              className={`flex-1 overflow-y-auto ${
                activeRightTab === "styles" ? "block" : "hidden"
              }`}>
              <div className="px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold text-[#C5A059] border-b border-[#222] flex items-center justify-between">
                <span>Styles &amp; Resizing</span>
                <button
                  type="button"
                  onClick={() => setShowFontModal(true)}
                  className="px-2 py-0.5 bg-[#1f1a10] hover:bg-[#C5A059] text-[#C5A059] hover:text-black border border-[#C5A059]/40 hover:border-[#C5A059] rounded text-[9px] font-bold tracking-wider flex items-center gap-1 transition-all"
                  title="Install Google Fonts, Web Font URLs, or Upload Font Files">
                  <span>🔤</span>
                  <span>+ Custom Font</span>
                </button>
              </div>
              <div className="gjs-clm-tags border-b border-[#222] p-2 bg-[#0c0c0c]" />
              <div className="gjs-sm-container" />
            </div>

            <div
              className={`flex-1 overflow-y-auto p-3 ${
                activeRightTab === "traits" ? "block" : "hidden"
              }`}>
              <div className="px-1 py-1.5 text-[10px] uppercase tracking-widest font-bold text-[#C5A059] border-b border-[#222] mb-3">
                Component Settings (Image URL / Alt / Links)
              </div>
              <p className="text-[11px] text-gray-400 px-1 mb-2">
                Click on any image to change its source URL or double-click to
                open the media library.
              </p>
              <div className="gjs-traits-container" />
            </div>

            <div
              className={`flex-1 overflow-y-auto p-2 ${
                activeRightTab === "layers" ? "block" : "hidden"
              }`}>
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold text-[#C5A059] border-b border-[#222] mb-2">
                Page Structure &amp; Layers
              </div>
              <p className="text-[11px] text-gray-400 px-2 mb-2">
                Select elements in tree view to easily select background images
                or sections.
              </p>
              <div className="gjs-layers-container" />
            </div>
          </div>
        </div>

        {/* Custom Font Studio Modal */}
        <CustomFontModal
          isOpen={showFontModal}
          onClose={() => setShowFontModal(false)}
          onFontInstalled={handleFontInstalled}
          onFontDeleted={handleFontDeleted}
          onApplyFontToSelected={handleApplyFontToSelected}
          installedFonts={customFonts}
          hasSelectedElement={hasSelectedElement}
        />
      </div>
    );
  },
);

export default GrapesEditor;
