"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import grapesjs from "grapesjs";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
type GrapesProjectData = ReturnType<Editor["getProjectData"]>;

interface GrapesEditorProps {
  initialData?: unknown;
  initialHtml?: string;
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
}

function isProjectData(value: unknown): value is GrapesProjectData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Array.isArray((value as Record<string, unknown>).pages);
}

function registerCmsDynamicBlockTypes(editorInstance: Editor) {
  const lockedDynamicBlockDefaults = {
    droppable: false,
    editable: false,
    draggable: true,
    removable: true,
    copyable: true,
  };

  editorInstance.Components.addType("project-grid", {
    isComponent: (el: HTMLElement) =>
      el.getAttribute?.("data-cms-block") === "project-grid"
        ? { type: "project-grid" }
        : undefined,
    model: {
      defaults: {
        ...lockedDynamicBlockDefaults,
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
        droppable: true,
        editable: true,
        draggable: true,
        removable: true,
        copyable: true,
        attributes: { "data-cms-block": "testimonials-carousel" },
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
        ...lockedDynamicBlockDefaults,
        attributes: { "data-cms-block": "project-carousel" },
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
        ...lockedDynamicBlockDefaults,
        attributes: { "data-cms-block": "contact-form" },
      },
    },
  });
}

const GrapesEditor = forwardRef<GrapesEditorHandle, GrapesEditorProps>(
  function GrapesEditor({ initialData, initialHtml, onSave, onPublish }, ref) {
    const editorRef = useRef<Editor | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [activeRightTab, setActiveRightTab] = useState<
      "styles" | "traits" | "layers"
    >("styles");

    useImperativeHandle(
      ref,
      () => ({
        getCurrentContent: () => {
          const editor = editorRef.current;
          if (!editor) return null;

          return {
            projectData: editor.getProjectData(),
            html: editor.getHtml() ?? "",
            css: editor.getCss() ?? "",
          };
        },
      }),
      [],
    );

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

        plugins: [registerCmsDynamicBlockTypes],

        assetManager: {
          upload: "/api/media",
          uploadName: "file",
          autoAdd: true,
          assets: [
            {
              src: "https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg",
              name: "Hero Default Artwork",
              type: "image",
            },
          ],
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
            }),

        canvas: {
          styles: [
            "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
          ],
        },

        styleManager: {
          appendTo: ".gjs-sm-container",

          sectors: [
            {
              name: "Size & Spacing",
              open: true,

              buildProps: [
                "width",
                "height",
                "min-width",
                "max-width",
                "min-height",
                "max-height",
                "box-sizing",
                "margin-top",
                "margin-right",
                "margin-bottom",
                "margin-left",
                "padding-top",
                "padding-right",
                "padding-bottom",
                "padding-left",
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

              buildProps: [
                "font-family",
                "font-size",
                "font-weight",
                "font-style",
                "letter-spacing",
                "color",
                "line-height",
                "text-align",
                "text-transform",
                "text-decoration",
                "white-space",
                "word-break",
              ],
            },

            {
              name: "Background & Effects",
              open: false,

              buildProps: [
                "background-color",
                "background-image",
                "background-size",
                "background-position",
                "background-repeat",
                "opacity",
                "border-radius",
                "border",
                "box-shadow",
                "transform",
                "transition",
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

      /*
       * When an image component is selected, switch right sidebar to Settings/Traits
       * and ensure a quick "Change Image" button is available in the toolbar
       */
      editor.on("component:selected", (component) => {
        if (component.is("image")) {
          setActiveRightTab("traits");
          const defaultToolbar = component.get("toolbar") || [];
          if (!defaultToolbar.some((item) => item.command === "open-assets")) {
            component.set("toolbar", [
              {
                attributes: { title: "Change / Upload Image" },
                command: "open-assets",
                label: "🖼️ Change Image",
              },
              ...defaultToolbar,
            ]);
          }
        }
      });

      /*
       * Preload uploaded media from /api/media into AssetManager
       */
      fetch("/api/media")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.assets && Array.isArray(data.assets)) {
            const existingAssets = data.assets.map(
              (a: { blobUrl: string; name?: string; type?: string }) => ({
                src: a.blobUrl,
                name: a.name || "Uploaded Media",
                type: a.type?.startsWith("video") ? "video" : "image",
              }),
            );
            editor.AssetManager.add(existingAssets);
          }
        })
        .catch((err) => {
          console.error(
            "Failed to load existing media assets for GrapesJS:",
            err,
          );
        });

      /*
       * GrapesJS device commands.
       */
      editor.Commands.add("set-device-desktop", {
        run: () => {
          editor.setDevice("Desktop");
        },
      });

      editor.Commands.add("set-device-mobile", {
        run: () => {
          editor.setDevice("Mobile");
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
       * Basic Image block
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
       * Project carousel block
       */
      bm.add("project-carousel-block", {
        label: "Project Carousel",
        category: "Portfolio",

        content: `
        <div
          data-cms-block="project-carousel"
          class="min-h-72 border border-dashed border-[#C5A059] bg-[#0a0a0a] p-12 text-center text-white"
        >
          <h3 class="mb-2 text-2xl font-serif text-[#C5A059]">Featured Projects Carousel</h3>
          <p class="text-xs uppercase tracking-widest text-gray-400">Featured artwork carousel rotates here on the live site</p>
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

      bm.add("testimonials-carousel-block", {
        label: "Testimonials Carousel",
        category: "Portfolio",
        content: `
        <div
          data-cms-block="testimonials-carousel"
          class="min-h-72 border border-dashed border-[#444] bg-[#0a0a0a] p-12 text-center text-white"
        >
          <h3 class="mb-2 text-2xl font-serif text-[#C5A059]">What Publishers &amp; Clients Say</h3>
          <p class="text-xs uppercase tracking-widest text-gray-400">Rotating testimonials appear here on the live site</p>
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
    }, [initialData, initialHtml]);

    const handleExportSave = (isPublish = false) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const projectData = editor.getProjectData();

      /*
       * GrapesJS typings allow these methods
       * to return undefined, while our callbacks
       * require strings.
       *
       * Normalize them here.
       */
      const html = editor.getHtml() ?? "";

      const css = editor.getCss() ?? "";

      if (isPublish && onPublish) {
        onPublish(projectData, html, css);

        return;
      }

      if (!isPublish && onSave) {
        onSave(projectData, html, css);
      }
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
            border-radius: 4px !important;
            max-width: 720px !important;
          }
          .gjs-mdl-header {
            border-bottom: 1px solid #222 !important;
            color: #C5A059 !important;
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
          }
          .gjs-am-asset:hover {
            border-color: #C5A059 !important;
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
        `}</style>
        <div className="flex items-center justify-between px-4 py-2 bg-[#0c0c0c] border-b border-[#222] text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#C5A059] uppercase tracking-widest">
              Visual Editor (GrapesJS)
            </span>

            <div
              className="panel__devices relative z-20 flex gap-1 rounded-sm border border-[#333] bg-[#141414] p-1 shadow-lg"
              role="group"
              aria-label="Preview viewport"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportSave(false)}
              className="px-3 py-1.5 border border-[#333] text-gray-300 hover:text-white hover:border-[#C5A059] transition-colors uppercase tracking-widest font-bold">
              Save Draft
            </button>

            <button
              onClick={() => handleExportSave(true)}
              className="px-3 py-1.5 bg-[#C5A059] text-black hover:bg-white transition-colors uppercase tracking-widest font-bold">
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
              <div className="px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold text-[#C5A059] border-b border-[#222]">
                Styles &amp; Resizing
              </div>
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
      </div>
    );
  },
);

export default GrapesEditor;
