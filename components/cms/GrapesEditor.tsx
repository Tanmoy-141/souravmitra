"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import grapesjs from "grapesjs";
import type { Editor, ToolbarButtonProps, Component } from "grapesjs";
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

    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

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

      let lastSelectedImageComponent: Component | null = null;

      /*
       * When an image or dynamic carousel component is selected, switch right sidebar to Settings/Traits
       * and ensure quick edit buttons are available in the toolbar
       */
      editor.on("component:selected", (component) => {
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
            width: 8px !important;
            height: 8px !important;
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
