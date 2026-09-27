"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import grapesjs from "grapesjs";
import type { Editor, ToolbarButtonProps } from "grapesjs";
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
        ...lockedDynamicBlockDefaults,
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
        ...lockedDynamicBlockDefaults,
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
       * When an image or dynamic carousel component is selected, switch right sidebar to Settings/Traits
       * and ensure quick edit buttons are available in the toolbar
       */
      editor.on("component:selected", (component) => {
        if (component.is("image")) {
          setActiveRightTab("traits");
          const defaultToolbar = (component.get("toolbar") ||
            []) as ToolbarButtonProps[];
          if (!defaultToolbar.some((item) => item.command === "open-assets")) {
            component.set("toolbar", [
              {
                attributes: { title: "Change / Upload Image" },
                command: "open-assets",
                label: "🖼️ Change Image",
              },
              {
                attributes: { title: "Remove Image from page" },
                command: "remove-image-component",
                label: "🗑️ Remove Image",
              },
              ...defaultToolbar,
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
                attributes: { title: "Edit Projects Carousel Heading" },
                command: "open-project-carousel-editor",
                label: "🖼️ Edit Heading",
              },
              ...defaultToolbar,
            ]);
          }
        }
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
          const selected = ed.getSelected();
          if (selected) {
            selected.remove();
          }
        },
      });

      /*
       * When AssetManager opens for an image, add a 'Remove Image from Page' option in the modal header
       */
      editor.on("run:open-assets", () => {
        const selected = editor.getSelected();
        if (selected && selected.is("image")) {
          setTimeout(() => {
            const header = document.querySelector(".gjs-mdl-header");
            if (header && !header.querySelector(".gjs-custom-remove-img-btn")) {
              const removeBtn = document.createElement("button");
              removeBtn.className = "gjs-custom-remove-img-btn";
              removeBtn.type = "button";
              removeBtn.innerHTML = "🗑️ Remove Image from Page";
              removeBtn.style.cssText =
                "margin-left: 16px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #2a1111; color: #ff6b6b; border: 1px solid #6b2222; border-radius: 3px; cursor: pointer; transition: all 0.2s;";
              removeBtn.onmouseenter = () => {
                removeBtn.style.background = "#d32f2f";
                removeBtn.style.color = "#ffffff";
              };
              removeBtn.onmouseleave = () => {
                removeBtn.style.background = "#2a1111";
                removeBtn.style.color = "#ff6b6b";
              };
              removeBtn.onclick = () => {
                selected.remove();
                editor.Modal.close();
              };
              header.appendChild(removeBtn);
            }
          }, 80);
        }
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
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #C5A059; margin-bottom: 0.5rem; font-weight: bold;">
                🖼️ Projects Carousel &bull; Double-click to Edit Heading
              </div>
              <h3 class="mb-2 text-2xl font-serif text-[#C5A059]">${safeHeading}</h3>
              <p class="text-xs uppercase tracking-widest text-gray-400">Featured artwork projects rotate here dynamically on the live site</p>
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
          class="min-h-72 border border-dashed border-[#C5A059] bg-[#0a0a0a] p-12 text-center text-white"
        >
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #C5A059; margin-bottom: 0.5rem; font-weight: bold;">
            🖼️ Projects Carousel &bull; Double-click to Edit Heading
          </div>
          <h3 class="mb-2 text-2xl font-serif text-[#C5A059]">Featured Projects Carousel</h3>
          <p class="text-xs uppercase tracking-widest text-gray-400">Featured artwork projects rotate here dynamically on the live site</p>
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
       * Portfolio: Client Logos Section block (clean inline logos, matching bottom preferred appearance, full color)
       */
      bm.add("client-logos-block", {
        label: "Client Logos Section",
        category: "Portfolio",
        content: `
        <section style="padding: 4rem 1rem; background-color: #000000; width: 100%; box-sizing: border-box;">
          <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; text-align: center;">
            <h2 style="font-family: serif; font-size: 2rem; color: #FFFFFF; margin-bottom: 0.75rem; letter-spacing: 0.02em;">
              Clients
            </h2>
            <div style="width: 2.5rem; height: 3px; background-color: #C5A059; margin-bottom: 3rem;"></div>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 3rem; width: 100%;">
              <div style="display: flex; flex-direction: column; align-items: center; width: 140px; padding: 0.5rem; text-align: center;">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" 
                  alt="Client Logo" 
                  style="height: 48px; width: auto; max-width: 120px; object-fit: contain; margin-bottom: 0.75rem; display: block;"
                />
                <span style="font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d1d5db; font-weight: 500;">
                  Penguin Random House
                </span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; width: 140px; padding: 0.5rem; text-align: center;">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" 
                  alt="Client Logo" 
                  style="height: 48px; width: auto; max-width: 120px; object-fit: contain; margin-bottom: 0.75rem; display: block;"
                />
                <span style="font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d1d5db; font-weight: 500;">
                  HarperCollins
                </span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; width: 140px; padding: 0.5rem; text-align: center;">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" 
                  alt="Client Logo" 
                  style="height: 48px; width: auto; max-width: 120px; object-fit: contain; margin-bottom: 0.75rem; display: block;"
                />
                <span style="font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d1d5db; font-weight: 500;">
                  Macmillan Publishers
                </span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; width: 140px; padding: 0.5rem; text-align: center;">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200" 
                  alt="Client Logo" 
                  style="height: 48px; width: auto; max-width: 120px; object-fit: contain; margin-bottom: 0.75rem; display: block;"
                />
                <span style="font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d1d5db; font-weight: 500;">
                  Hachette Book Group
                </span>
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
       * Layout: Brand Logos Container (placeholder container for dropping brand logos)
       */
      bm.add("brand-logos-container-block", {
        label: "Brand Logos Container",
        category: "Layout",
        content: `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2.5rem; width: 100%; min-height: 100px; padding: 2rem 1rem; border: 1px dashed rgba(197, 160, 89, 0.4); border-radius: 4px; box-sizing: border-box;">
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
            position: relative !important;
          }
          .gjs-am-asset:hover {
            border-color: #C5A059 !important;
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
        `}</style>
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c0c0c] border-b border-[#222] text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-6">
            <span className="font-bold text-[#C5A059] uppercase tracking-widest text-xs whitespace-nowrap select-none">
              Visual Editor
            </span>

            <div
              className="panel__devices flex items-center gap-1 rounded border border-[#333] bg-[#141414] p-0.5"
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
