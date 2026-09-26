"use client";

import { useEffect, useRef, useState } from "react";
import AdminLogin from "@/components/cms/AdminLogin";
import MediaLibrary from "@/components/cms/MediaLibrary";
import ProjectsAdmin from "@/components/cms/ProjectsAdmin";
import MessagesAdmin from "@/components/cms/MessagesAdmin";
import GrapesEditor, {
  type GrapesEditorHandle,
} from "@/components/cms/GrapesEditor";
import { CustomPage, Block } from "@/data/cms";

type CmsPage = CustomPage & {
  htmlCache?: string;
  cssCache?: string;
};

type CmsApiResponse = {
  authenticated?: boolean;
  pages?: unknown;
  success?: boolean;
  error?: string;
  faviconUrl?: string;
  siteName?: string;
  footerHeading?: string;
  footerText?: string;
  socialLinks?: Record<string, string>;
};

const SOCIAL_LINK_FIELDS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["behance", "Behance"],
  ["pinterest", "Pinterest"],
  ["linkedin", "LinkedIn"],
  ["x", "X"],
] as const;

function normalizePages(value: unknown): CustomPage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const page = item as Partial<CmsPage>;

    return {
      ...page,
      blocks: Array.isArray(page.blocks) ? page.blocks : [],
    } as CustomPage;
  });
}

function isSamePage(page: CustomPage, target: CustomPage): boolean {
  return target.id
    ? page.id === target.id
    : !page.id && page.slug === target.slug;
}

function getPublishSlug(page: CustomPage): string {
  const slug = typeof page.slug === "string" ? page.slug.trim() : "";

  if (slug) {
    return slug;
  }

  const title =
    typeof page.title === "string" ? page.title.trim().toLowerCase() : "";

  if (title === "home") {
    return "/";
  }

  return "";
}

async function getApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as CmsApiResponse;

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Ignore invalid error responses.
  }

  return fallback;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState<"pages" | "projects" | "messages">(
    "pages",
  );

  const [pages, setPages] = useState<CustomPage[]>([]);

  const [activePage, setActivePage] = useState<CustomPage | null>(null);

  const editorRef = useRef<GrapesEditorHandle>(null);

  const [showMediaLibrary, setShowMediaLibrary] = useState<{
    blockId: string;
    field: "images" | "background";
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [faviconUrl, setFaviconUrl] = useState("/favicon.svg");

  const [siteName, setSiteName] = useState("Sourav Mitra");

  const [footerHeading, setFooterHeading] = useState("FOLLOW ME ON");

  const [footerText, setFooterText] = useState("All rights reserved.");

  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  const [viewTrash, setViewTrash] = useState(false);

  const [trashPages, setTrashPages] = useState<CustomPage[]>([]);

  useEffect(() => {
    fetch("/api/cms/settings", { cache: "no-store" })
      .then((res) => res.json() as Promise<CmsApiResponse>)
      .then((data) => {
        if (data.faviconUrl) {
          setFaviconUrl(data.faviconUrl);
        }
        if (data.siteName) setSiteName(data.siteName);
        if (data.footerHeading) setFooterHeading(data.footerHeading);
        if (data.footerText) setFooterText(data.footerText);
        if (data.socialLinks) setSocialLinks(data.socialLinks);
      })
      .catch(() => {});
  }, []);

  const handleSaveSiteSettings = async () => {
    try {
      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faviconUrl,
          siteName,
          footerHeading,
          footerText,
          socialLinks,
        }),
      });

      if (res.ok) {
        setSaveStatus("Site settings saved successfully!");

        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const error = await getApiError(res, "Failed to save site settings.");

        setSaveStatus(error);
      }
    } catch {
      setSaveStatus("Failed to save site settings.");
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const authRes = await fetch("/api/auth", { cache: "no-store" });

        const authData = (await authRes.json()) as CmsApiResponse;

        if (authData.authenticated) {
          setIsAuthenticated(true);
        }

        const res = await fetch("/api/cms", { cache: "no-store" });

        const data = (await res.json()) as CmsApiResponse;

        const pagesList = Array.isArray(data.pages)
          ? data.pages
          : Array.isArray(data)
            ? data
            : [];

        const normalizedPages = normalizePages(pagesList);

        setPages(normalizedPages);

        if (normalizedPages.length > 0) {
          setActivePage(normalizedPages[0]);
        }
      } catch {
        console.error("Failed to load pages");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "logout",
        }),
      });
    } catch {
      // Ignore logout errors.
    } finally {
      setIsAuthenticated(false);
    }
  };

  const refreshPages = async (): Promise<CustomPage[]> => {
    const refreshRes = await fetch("/api/cms", { cache: "no-store" });
    if (!refreshRes.ok) {
      throw new Error(
        await getApiError(refreshRes, "Failed to refresh pages."),
      );
    }

    const refreshData = (await refreshRes.json()) as CmsApiResponse;
    if (refreshData.error) {
      throw new Error(refreshData.error);
    }

    const freshPages = Array.isArray(refreshData.pages)
      ? refreshData.pages
      : Array.isArray(refreshData)
        ? refreshData
        : [];

    const normalizedPages = normalizePages(freshPages);

    setPages(normalizedPages);

    return normalizedPages;
  };

  /**
   * A page created via "+ New Page" only exists in browser state (no `id`)
   * until it's actually saved once. Saving/publishing from inside the
   * GrapesJS editor used to just alert and stop for such a page — this
   * creates the DB record first so that first save/publish goes through.
   */
  const ensurePageId = async (
    page: CustomPage,
    slug: string,
  ): Promise<CustomPage | null> => {
    if (page.id) {
      return page;
    }

    try {
      const res = await fetch("/api/cms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          title: page.title || "Untitled Page",
          status: "draft",
        }),
      });

      if (!res.ok) {
        return null;
      }

      const created = (await res.json()) as CmsPage;
      const createdPage: CustomPage = {
        ...page,
        ...created,
        blocks: Array.isArray(created.blocks) ? created.blocks : page.blocks,
      };

      setPages((currentPages) =>
        currentPages.map((p) =>
          p === page || (!p.id && p.slug === page.slug) ? createdPage : p,
        ),
      );

      return createdPage;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!activePage) {
      setSaveStatus("Select a page before publishing.");
      return;
    }

    const editorContent = editorRef.current?.getCurrentContent();
    if (!editorContent) {
      setSaveStatus(
        "The visual editor is still loading. Try publishing again shortly.",
      );
      return;
    }

    const publishablePages = pages.map((page) => {
      const isActivePage = isSamePage(page, activePage);
      const pageWithEditorContent =
        isActivePage && editorContent
          ? {
              ...page,
              ...activePage,
              id: page.id ?? activePage.id,
              gjsData: editorContent.projectData,
              htmlCache: editorContent.html,
              cssCache: editorContent.css,
            }
          : page;
      const slug = getPublishSlug(pageWithEditorContent);

      return slug
        ? {
            ...pageWithEditorContent,
            slug,
          }
        : pageWithEditorContent;
    });

    const invalidPage = publishablePages.find((page) => !getPublishSlug(page));

    if (invalidPage) {
      setSaveStatus(
        `Cannot publish: "${invalidPage.title}" has no valid slug.`,
      );
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/cms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pages: publishablePages,
        }),
      });

      const result = (await res.json()) as CmsApiResponse;
      if (res.ok && result.success) {
        const normalizedFresh = await refreshPages();
        const activeSlug = getPublishSlug(activePage);
        const updatedActive = normalizedFresh.find(
          (page) =>
            (activePage.id && page.id === activePage.id) ||
            page.slug === activeSlug,
        );

        if (!updatedActive) {
          setSaveStatus(
            `Publish request succeeded, but "${activePage.title}" was not returned by the CMS refresh.`,
          );
          return;
        }

        setActivePage(updatedActive);
        setSaveStatus(
          updatedActive.status === "published"
            ? "Site published successfully!"
            : `Site saved, but "${updatedActive.title}" is still a draft and is not publicly visible.`,
        );
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus(
          `Failed to publish: ${result.error || "The server rejected the update."}`,
        );
      }
    } catch {
      setSaveStatus("Network error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const createNewPage = () => {
    const newPage: CustomPage = {
      slug: `new-page-${Date.now()}`,
      title: "Untitled Page",
      status: "draft",
      blocks: [],
    };

    setPages((currentPages) => [...currentPages, newPage]);

    setActivePage(newPage);
  };

  const deletePage = async () => {
    if (!activePage) {
      return;
    }

    if (
      !confirm(`Are you sure you want to delete page "${activePage.title}"?`)
    ) {
      return;
    }

    const activePageId = activePage.id;

    if (activePageId) {
      try {
        const res = await fetch(`/api/cms?id=${activePageId}`, {
          method: "DELETE",
        });

        const data = (await res.json()) as CmsApiResponse;

        if (!data.success) {
          alert(data.error || "Failed to delete page");
          return;
        }
      } catch {
        alert("Network error while deleting page");
        return;
      }
    }

    const remainingPages = pages.filter((page) => {
      if (activePageId) {
        return page.id !== activePageId;
      }

      return page.slug !== activePage.slug;
    });

    setPages(remainingPages);
    setActivePage(remainingPages[0] || null);
  };

  const fetchTrash = async () => {
    try {
      const res = await fetch("/api/cms?trash=true", { cache: "no-store" });

      const data = (await res.json()) as CmsApiResponse;

      const list = Array.isArray(data.pages)
        ? data.pages
        : Array.isArray(data)
          ? data
          : [];

      setTrashPages(normalizePages(list));
    } catch {
      console.error("Failed to fetch trash");
    }
  };

  const executeAction = async (
    id: string,
    action: "publish" | "unpublish" | "recover",
  ) => {
    try {
      const res = await fetch("/api/cms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action,
        }),
      });

      const data = (await res.json()) as CmsApiResponse;

      if (data.success) {
        const freshPages = await refreshPages();

        if (viewTrash) {
          await fetchTrash();
        } else if (activePage?.id === id) {
          const updated = freshPages.find((page) => page.id === id);

          if (updated) {
            setActivePage(updated);
          }
        }

        setSaveStatus(`Action '${action}' successful!`);

        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        alert(data.error || "Action failed");
      }
    } catch {
      alert("Network error during action");
    }
  };

  const handleSaveDraft = async (projectData: unknown) => {
    if (!activePage) {
      alert("Please select a page first.");
      return;
    }

    const currentPage =
      pages.find((page) => isSamePage(page, activePage)) || activePage;

    const slug = getPublishSlug(currentPage);

    if (!slug) {
      setSaveStatus(
        `Cannot save draft: "${currentPage.title}" has no valid slug.`,
      );
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const pageWithId = await ensurePageId(currentPage, slug);

      if (!pageWithId?.id) {
        setSaveStatus("Failed to create the page record before saving.");
        return;
      }

      const res = await fetch("/api/cms", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: pageWithId.id,
          slug,
          title: pageWithId.title,
          gjsData: projectData,
          status: currentPage.status,
        }),
      });

      if (res.ok) {
        const freshPages = await refreshPages();
        const updatedActive = freshPages.find(
          (page) => page.id === pageWithId.id,
        );
        if (updatedActive) setActivePage(updatedActive);

        setSaveStatus(
          currentPage.status === "published"
            ? "Draft saved. Publish Page to make these changes live."
            : "Draft saved successfully!",
        );

        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const error = await getApiError(res, "Error");

        setSaveStatus(`Failed to save draft: ${error}`);
      }
    } catch {
      setSaveStatus("Network error occurred while saving draft.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishPage = async (
    projectData: unknown,
    html: string,
    css: string,
  ) => {
    if (!activePage) {
      alert("Please select a page first.");
      return;
    }

    const currentPage =
      pages.find((page) => isSamePage(page, activePage)) || activePage;

    const slug = getPublishSlug(currentPage);

    if (!slug) {
      setSaveStatus(
        `Cannot publish: "${currentPage.title}" has no valid slug.`,
      );
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const pageWithId = await ensurePageId(currentPage, slug);

      if (!pageWithId?.id) {
        setSaveStatus("Failed to create the page record before publishing.");
        return;
      }

      const res = await fetch("/api/cms", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: pageWithId.id,
          slug,
          title: pageWithId.title,
          gjsData: projectData,
          htmlCache: html,
          cssCache: css,
          status: "published",
        }),
      });

      if (res.ok) {
        const freshPages = await refreshPages();

        const updatedActive =
          freshPages.find((page) => page.id === pageWithId.id) ||
          freshPages.find((page) => getPublishSlug(page) === slug);

        if (!updatedActive || updatedActive.status !== "published") {
          setSaveStatus(
            `Publish request returned success, but "${pageWithId.title}" is not available as a published page.`,
          );
          return;
        }

        setActivePage(updatedActive);
        setSaveStatus("Page published successfully!");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const error = await getApiError(res, "Error");

        setSaveStatus(`Failed to publish: ${error}`);
      }
    } catch {
      setSaveStatus("Network error occurred while publishing.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold uppercase tracking-widest">
        Loading Dashboard...
      </div>
    );
  }

  const activePageWithCache = activePage as CmsPage | null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Top Bar */}
      <div className="border-b border-[#333333] px-4 md:px-8 py-3 md:h-16 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          <span className="text-[#C5A059] font-bold uppercase tracking-widest text-xs shrink-0">
            Admin Dashboard
          </span>

          <div className="flex gap-1 border border-[#333] p-0.5">
            <button
              onClick={() => setActiveTab("pages")}
              className={`px-3 py-1 text-xs uppercase tracking-widest font-bold transition-colors ${
                activeTab === "pages"
                  ? "bg-[#C5A059] text-black"
                  : "text-gray-500 hover:text-white"
              }`}>
              Pages
            </button>

            <button
              onClick={() => setActiveTab("projects")}
              className={`px-3 py-1 text-xs uppercase tracking-widest font-bold transition-colors ${
                activeTab === "projects"
                  ? "bg-[#C5A059] text-black"
                  : "text-gray-500 hover:text-white"
              }`}>
              Projects
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`px-3 py-1 text-xs uppercase tracking-widest font-bold transition-colors ${
                activeTab === "messages"
                  ? "bg-[#C5A059] text-black"
                  : "text-gray-500 hover:text-white"
              }`}>
              Messages
            </button>
          </div>

          {activeTab === "pages" && (
            <>
              <select
                value={activePage?.slug ?? ""}
                onChange={(e) => {
                  setViewTrash(false);

                  setActivePage(
                    pages.find((page) => page.slug === e.target.value) || null,
                  );
                }}
                className="bg-[#111111] border border-[#333333] px-3 py-1 text-sm focus:outline-none min-w-0 flex-1 md:flex-none"
                disabled={viewTrash}>
                {pages.map((page) => (
                  <option key={page.id ?? page.slug} value={page.slug}>
                    {page.title} ({page.status})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setViewTrash(false);
                  createNewPage();
                }}
                className="text-xs text-gray-500 hover:text-white uppercase tracking-widest shrink-0"
                disabled={viewTrash}>
                + New Page
              </button>

              <button
                onClick={() => {
                  const nextTrash = !viewTrash;

                  setViewTrash(nextTrash);

                  if (nextTrash) {
                    void fetchTrash();
                  }
                }}
                className={`text-xs px-2.5 py-1 uppercase tracking-widest font-bold border transition-colors shrink-0 ${
                  viewTrash
                    ? "bg-[#C5A059] text-black border-[#C5A059]"
                    : "border-[#333] text-gray-400 hover:text-white"
                }`}>
                {viewTrash ? "Active Pages" : `Trash (${trashPages.length})`}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span
              className={`text-xs font-medium px-3 py-1 ${
                saveStatus.includes("Failed") || saveStatus.includes("Cannot")
                  ? "bg-red-900/50 text-red-300 border border-red-800"
                  : "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
              }`}>
              {saveStatus}
            </span>
          )}

          {activeTab === "pages" && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#C5A059] text-black px-6 py-2 font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50 w-full md:w-auto">
              {saving ? "Publishing..." : "Publish Site"}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-400 border border-[#333333] hover:border-red-800 px-3 py-2 uppercase tracking-widest transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      {activeTab === "projects" ? (
        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-[#000000]">
          <ProjectsAdmin />
        </div>
      ) : activeTab === "messages" ? (
        <div className="flex-1 overflow-y-auto bg-[#000000]">
          <MessagesAdmin />
        </div>
      ) : viewTrash ? (
        <div className="flex-1 overflow-y-auto p-8 bg-[#000000] max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#C5A059] uppercase tracking-wider">
              Deleted Pages (Trash)
            </h2>

            <button
              onClick={() => setViewTrash(false)}
              className="px-4 py-2 bg-[#111] border border-[#333] text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white">
              Back to Active Pages
            </button>
          </div>

          {trashPages.length === 0 ? (
            <div className="py-16 text-center border border-[#222] text-gray-500 text-sm uppercase tracking-widest">
              Trash is empty.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {trashPages.map((page) => {
                const pageId = page.id;

                return (
                  <div
                    key={pageId ?? page.slug}
                    className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#222]">
                    <div>
                      <h4 className="text-white font-bold">{page.title}</h4>

                      <p className="text-xs text-gray-500 font-mono">
                        /{page.slug}
                      </p>
                    </div>

                    {pageId ? (
                      <button
                        onClick={() => executeAction(pageId, "recover")}
                        className="px-4 py-2 bg-[#C5A059] hover:bg-white text-black text-xs font-bold uppercase tracking-widest transition-colors">
                        Recover
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden">
          {/* Sidebar Controls */}
          <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#333333] p-6 max-h-[50vh] md:max-h-none overflow-y-auto flex flex-col gap-8 bg-[#050505]">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Page Settings
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] uppercase text-gray-600 font-bold mb-1 block">
                    Page Title
                  </label>

                  <input
                    type="text"
                    value={activePage?.title || ""}
                    onChange={(e) => {
                      if (!activePage) {
                        return;
                      }

                      const updated = {
                        ...activePage,
                        title: e.target.value,
                      };

                      setPages((currentPages) =>
                        currentPages.map((page) =>
                          isSamePage(page, activePage) ? updated : page,
                        ),
                      );

                      setActivePage(updated);
                    }}
                    className="w-full bg-black border border-[#333333] p-2 text-sm focus:border-[#C5A059] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-600 font-bold mb-1 block">
                    Slug (URL)
                  </label>

                  <input
                    type="text"
                    value={activePage?.slug || ""}
                    onChange={(e) => {
                      if (!activePage) {
                        return;
                      }

                      const updated = {
                        ...activePage,
                        slug: e.target.value.trimStart(),
                      };

                      setPages((currentPages) =>
                        currentPages.map((page) =>
                          isSamePage(page, activePage) ? updated : page,
                        ),
                      );

                      setActivePage(updated);
                    }}
                    className="w-full bg-black border border-[#333333] p-2 text-sm focus:border-[#C5A059] font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-600 font-bold mb-1 block">
                    Status
                  </label>

                  <select
                    value={activePage?.status}
                    onChange={(e) => {
                      if (!activePage) {
                        return;
                      }

                      const updated = {
                        ...activePage,
                        status: e.target.value as "draft" | "published",
                      };

                      setPages((currentPages) =>
                        currentPages.map((page) =>
                          isSamePage(page, activePage) ? updated : page,
                        ),
                      );

                      setActivePage(updated);
                    }}
                    className="w-full bg-black border border-[#333333] p-2 text-sm focus:border-[#C5A059] outline-none">
                    <option value="draft">Draft (Unpublished)</option>

                    <option value="published">Published</option>
                  </select>
                </div>

                {activePage?.id ? (
                  <div className="flex gap-2 pt-1">
                    {activePage.status === "draft" ? (
                      <button
                        onClick={() =>
                          executeAction(activePage.id as string, "publish")
                        }
                        className="flex-1 py-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[10px] uppercase font-bold tracking-widest transition-colors">
                        Publish Now
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          executeAction(activePage.id as string, "unpublish")
                        }
                        className="flex-1 py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[10px] uppercase font-bold tracking-widest transition-colors">
                        Unpublish
                      </button>
                    )}
                  </div>
                ) : null}

                {activePage && pages.length > 1 ? (
                  <button
                    onClick={deletePage}
                    className="mt-2 w-full py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-red-400 text-[10px] uppercase font-bold tracking-widest transition-colors">
                    Delete Page
                  </button>
                ) : null}
              </div>
            </div>

            <div className="pt-6 border-t border-[#222]">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Site Branding & Footer
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase text-gray-600 font-bold block">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full bg-black border border-[#333333] p-2 text-xs focus:border-[#C5A059] outline-none"
                />

                <label className="text-[10px] uppercase text-gray-600 font-bold block mt-2">
                  Footer Heading
                </label>
                <input
                  type="text"
                  value={footerHeading}
                  onChange={(e) => setFooterHeading(e.target.value)}
                  className="w-full bg-black border border-[#333333] p-2 text-xs focus:border-[#C5A059] outline-none"
                />

                <label className="text-[10px] uppercase text-gray-600 font-bold block mt-2">
                  Footer Copyright Text
                </label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full bg-black border border-[#333333] p-2 text-xs focus:border-[#C5A059] outline-none"
                />

                {SOCIAL_LINK_FIELDS.map(([key, label]) => (
                  <label
                    key={key}
                    className="text-[10px] uppercase text-gray-600 font-bold block mt-2">
                    {label} URL
                    <input
                      type="url"
                      value={socialLinks[key] || ""}
                      onChange={(e) =>
                        setSocialLinks((current) => ({
                          ...current,
                          [key]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full bg-black border border-[#333333] p-2 text-xs normal-case focus:border-[#C5A059] outline-none"
                    />
                  </label>
                ))}

                <label className="text-[10px] uppercase text-gray-600 font-bold block mt-2">
                  Favicon URL or Path
                </label>
                <label className="text-[10px] uppercase text-gray-600 font-bold block">
                  <input
                    type="text"
                    placeholder="/favicon.svg or image URL"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    className="mt-1 w-full bg-black border border-[#333333] p-2 text-xs focus:border-[#C5A059] outline-none font-mono"
                  />
                </label>

                <button
                  onClick={handleSaveSiteSettings}
                  className="py-1.5 px-3 bg-[#111] hover:bg-[#222] border border-[#333] text-[10px] uppercase font-bold tracking-widest text-[#C5A059] transition-colors">
                  Save Site Settings
                </button>
              </div>
            </div>
          </aside>

          {/* GrapesJS Visual Builder Canvas */}
          <main className="flex-1 flex flex-col overflow-hidden bg-black">
            <GrapesEditor
              ref={editorRef}
              key={activePage?.id || activePage?.slug}
              initialData={activePage?.gjsData}
              initialHtml={activePageWithCache?.htmlCache}
              onSave={handleSaveDraft}
              onPublish={handlePublishPage}
            />
          </main>
        </div>
      )}

      {showMediaLibrary ? (
        <MediaLibrary
          onClose={() => setShowMediaLibrary(null)}
          onSelect={(asset) => {
            if (!activePage) {
              return;
            }

            if (showMediaLibrary.field === "background") {
              const currentBlocks = Array.isArray(activePage.blocks)
                ? activePage.blocks
                : [];

              const updatedPage = {
                ...activePage,
                blocks: currentBlocks.map((block: Block) =>
                  block.id === showMediaLibrary.blockId
                    ? {
                        ...block,
                        content: {
                          ...block.content,
                          background: asset.blobUrl,
                        },
                      }
                    : block,
                ),
              };

              setPages((currentPages) =>
                currentPages.map((page) =>
                  isSamePage(page, activePage) ? updatedPage : page,
                ),
              );

              setActivePage(updatedPage);
            } else {
              const currentImages =
                activePage.blocks.find(
                  (block: Block) => block.id === showMediaLibrary.blockId,
                )?.content.images || [];

              const updatedPage = {
                ...activePage,
                blocks: activePage.blocks.map((block: Block) =>
                  block.id === showMediaLibrary.blockId
                    ? {
                        ...block,
                        content: {
                          ...block.content,
                          images: [...currentImages, asset.blobUrl],
                        },
                      }
                    : block,
                ),
              };

              setPages((currentPages) =>
                currentPages.map((page) =>
                  isSamePage(page, activePage) ? updatedPage : page,
                ),
              );

              setActivePage(updatedPage);
            }

            setShowMediaLibrary(null);
          }}
        />
      ) : null}
    </div>
  );
}
