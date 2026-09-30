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
import { generateProjectDetailHtml } from "@/lib/project-detail-template";
import type { Project } from "@/db/schema";

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
  logoUrl?: string;
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

const DEFAULT_CATEGORY_TEMPLATES = [
  {
    slug: "template/fine-art",
    title: "Fine Art Inside Page (Template)",
    category: "fine-art" as const,
    sample: {
      id: "sample-fine-art",
      slug: "sample-fine-art",
      title: "Fine Art Presentation (Template)",
      category: "fine-art" as const,
      status: "published" as const,
      medium: "Oil on Canvas",
      dimensions: '24" x 36"',
      year: "2024",
      description:
        "Classical exhibition study focusing on atmospheric lighting, oil brushwork texture, and narrative depth.",
      details:
        "Rendered using multi-layered glazing and tactile pigment impasto on custom linen canvas.",
      coverImage:
        "https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg",
      images: [],
      tags: ["Fine Art", "Oil on Canvas", "Gallery"],
      isFeatured: false,
      likes: 124,
      views: 1450,
      sortOrder: 0,
      publisher: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    slug: "template/book-covers",
    title: "Book Cover Inside Page (Template)",
    category: "book-covers" as const,
    sample: {
      id: "sample-book-cover",
      slug: "sample-book-cover",
      title: "Book Cover Presentation (Template)",
      category: "book-covers" as const,
      status: "published" as const,
      medium: "Digital Cover Illustration",
      dimensions: "6 x 9 inches",
      year: "2024",
      publisher: "Penguin Random House",
      description:
        "Literary fiction book cover design balancing bold focal hierarchy, bespoke typography, and evocative mood.",
      details:
        "Created with high-impact color palettes designed for maximum bookshelf impact and digital thumbnail clarity.",
      coverImage:
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800",
      images: [],
      tags: ["Book Cover", "Typography", "Fiction"],
      isFeatured: false,
      likes: 98,
      views: 1120,
      sortOrder: 0,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    slug: "template/illustration",
    title: "Illustration Inside Page (Template)",
    category: "illustration" as const,
    sample: {
      id: "sample-illustration",
      slug: "sample-illustration",
      title: "Illustration Presentation (Template)",
      category: "illustration" as const,
      status: "published" as const,
      medium: "Digital Painting / Concept Art",
      dimensions: "300 DPI High-Res",
      year: "2024",
      description:
        "Concept illustration exploring cinematic focal gradients, volumetric lights, and detailed narrative staging.",
      details:
        "Developed from initial thumbnail value studies through to detailed texture finish and cinematic color grading.",
      coverImage:
        "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920",
      images: [],
      tags: ["Illustration", "Concept Art", "Digital Painting"],
      isFeatured: false,
      likes: 165,
      views: 1890,
      sortOrder: 0,
      publisher: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

function normalizePages(value: unknown): CustomPage[] {
  let list: CustomPage[] = [];
  if (Array.isArray(value)) {
    list = value.map((item) => {
      const page = item as Partial<CmsPage>;
      return {
        ...page,
        blocks: Array.isArray(page.blocks) ? page.blocks : [],
      } as CustomPage;
    });
  }

  // Ensure default category templates are available in the editor list
  for (const t of DEFAULT_CATEGORY_TEMPLATES) {
    if (!list.some((p) => p.slug === t.slug)) {
      list.push({
        slug: t.slug,
        title: t.title,
        status: "published",
        blocks: [],
        htmlCache: generateProjectDetailHtml(t.sample),
      } as CustomPage);
    }
  }

  return list;
}

function isSamePage(page: CustomPage, target: CustomPage): boolean {
  return target.id
    ? page.id === target.id
    : !page.id && page.slug === target.slug;
}

function getPublishSlug(page: CustomPage): string {
  const slug = typeof page.slug === "string" ? page.slug.trim() : "";

  if (slug === "" || slug === "/") {
    return "/";
  }

  const title =
    typeof page.title === "string" ? page.title.trim().toLowerCase() : "";

  if (title === "home") {
    return "/";
  }

  return slug;
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
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [showMediaLibrary, setShowMediaLibrary] = useState<{
    blockId: string;
    field: "images" | "background" | "favicon" | "logo";
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [faviconUrl, setFaviconUrl] = useState("/favicon.svg");

  const [logoUrl, setLogoUrl] = useState("");

  const [siteName, setSiteName] = useState("Sourav Mitra");

  const [footerHeading, setFooterHeading] = useState("FOLLOW ME ON");

  const [footerText, setFooterText] = useState("All rights reserved.");

  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  const [viewTrash, setViewTrash] = useState(false);

  const [trashPages, setTrashPages] = useState<CustomPage[]>([]);

  // Project Inside Page Picker states
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [pickerProjects, setPickerProjects] = useState<Project[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState<string>("all");
  const [loadingProjects, setLoadingProjects] = useState(false);

  const handleOpenProjectPicker = async () => {
    setShowProjectPicker(true);
    if (pickerProjects.length === 0) {
      setLoadingProjects(true);
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (Array.isArray(data.projects)) {
          setPickerProjects(data.projects);
        }
      } catch (err) {
        console.error("Failed to load projects for picker:", err);
      } finally {
        setLoadingProjects(false);
      }
    }
  };

  const handleEditProjectInside = (project: Project) => {
    const slug = `${project.category}/${project.id}`;
    const slugByTitle = `${project.category}/${project.slug}`;

    // 1. Check if page already exists in state
    const existing = pages.find((p) => p.slug === slug || p.slug === slugByTitle);
    if (existing) {
      setActivePage(existing);
      setActiveTab("pages");
      setViewTrash(false);
      setShowProjectPicker(false);
      return;
    }

    // 2. Generate initial HTML tailored to this project's category & data
    const initialHtml = generateProjectDetailHtml(project);
    const newProjectPage: CustomPage = {
      slug,
      title: `${project.title} (${project.category.replace("-", " ")})`,
      status: "published",
      blocks: [],
      // @ts-expect-error adding htmlCache to CustomPage
      htmlCache: initialHtml,
    };

    setPages((prev) => [newProjectPage, ...prev]);
    setActivePage(newProjectPage);
    setActiveTab("pages");
    setViewTrash(false);
    setShowProjectPicker(false);
  };

  useEffect(() => {
    fetch("/api/cms/settings", { cache: "no-store" })
      .then((res) => res.json() as Promise<CmsApiResponse>)
      .then((data) => {
        if (data.faviconUrl) {
          setFaviconUrl(data.faviconUrl);
        }
        if (typeof data.logoUrl === "string") {
          setLogoUrl(data.logoUrl);
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
          logoUrl,
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

  const handleFaviconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/svg+xml",
    ];

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isExtensionValid =
      ext && ["png", "jpg", "jpeg", "webp", "ico", "svg"].includes(ext);

    if (!validTypes.includes(file.type) && !isExtensionValid) {
      alert("Please upload a valid image file (PNG, JPG, WebP, SVG, or ICO).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Favicon file size must be under 5MB.");
      return;
    }

    setUploadingFavicon(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFaviconUrl(dataUrl);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const uploadedUrl = data.asset?.blobUrl || data.data?.[0]?.src;
        if (data.success && uploadedUrl) {
          setFaviconUrl(uploadedUrl);
        }
      } catch (err) {
        console.warn("Media API upload fallback, using data URL:", err);
      } finally {
        setUploadingFavicon(false);
        setSaveStatus("Favicon uploaded! Click 'Save Site Settings' to apply.");
        setTimeout(() => setSaveStatus(null), 4000);
        if (faviconInputRef.current) {
          faviconInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setUploadingFavicon(false);
      alert("Failed to read the selected file.");
    };

    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/svg+xml",
    ];

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isExtensionValid =
      ext && ["png", "jpg", "jpeg", "webp", "ico", "svg"].includes(ext);

    if (!validTypes.includes(file.type) && !isExtensionValid) {
      alert("Please upload a valid image file (PNG, JPG, WebP, or SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Logo file size must be under 5MB.");
      return;
    }

    setUploadingLogo(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const uploadedUrl = data.asset?.blobUrl || data.data?.[0]?.src;
        if (data.success && uploadedUrl) {
          setLogoUrl(uploadedUrl);
        }
      } catch (err) {
        console.warn(
          "Media API upload fallback for logo, using data URL:",
          err,
        );
      } finally {
        setUploadingLogo(false);
        setSaveStatus("Logo uploaded! Click 'Save Site Settings' to apply.");
        setTimeout(() => setSaveStatus(null), 4000);
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setUploadingLogo(false);
      alert("Failed to read the selected file.");
    };

    reader.readAsDataURL(file);
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
          status: page.status || "published",
          htmlCache: (page as CmsPage).htmlCache || "",
          cssCache: (page as CmsPage).cssCache || "",
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

    // Safely publish ONLY the currently active page.
    // Never bulk-overwrite other pages to prevent data loss and misalignment.
    await handlePublishPage(
      editorContent.projectData,
      editorContent.html,
      editorContent.css,
    );
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

  const handleSaveDraft = async (
    projectData: unknown,
    html?: string,
    css?: string,
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
          title: activePage.title || pageWithId.title,
          gjsData: projectData,
          ...(html !== undefined && { htmlCache: html }),
          ...(css !== undefined && { cssCache: css }),
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
          title: activePage.title || pageWithId.title,
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

  // Group pages for the select dropdown
  const corePages = pages.filter((p) =>
    ["/", "", "about", "contact"].includes(p.slug),
  );
  const collectionPages = pages.filter((p) =>
    ["book-covers", "illustration", "fine-art"].includes(p.slug),
  );
  const templatePages = pages.filter((p) => p.slug.startsWith("template/"));
  const projectPages = pages.filter(
    (p) =>
      p.slug.startsWith("book-covers/") ||
      p.slug.startsWith("illustration/") ||
      p.slug.startsWith("fine-art/"),
  );
  const otherPages = pages.filter(
    (p) =>
      !corePages.includes(p) &&
      !collectionPages.includes(p) &&
      !templatePages.includes(p) &&
      !projectPages.includes(p),
  );

  const filteredPickerProjects = pickerProjects.filter((p) => {
    if (pickerCategory !== "all" && p.category !== pickerCategory) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.medium && p.medium.toLowerCase().includes(q)) ||
      (p.year && String(p.year).includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  });

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
                className="bg-[#111111] border border-[#333333] px-3 py-1.5 text-xs font-medium focus:outline-none min-w-50 max-w-85"
                disabled={viewTrash}>
                {corePages.length > 0 && (
                  <optgroup label="Core Site Pages">
                    {corePages.map((page) => (
                      <option key={page.id ?? page.slug} value={page.slug}>
                        {page.title} ({page.status})
                      </option>
                    ))}
                  </optgroup>
                )}
                {collectionPages.length > 0 && (
                  <optgroup label="Portfolio Archives">
                    {collectionPages.map((page) => (
                      <option key={page.id ?? page.slug} value={page.slug}>
                        {page.title} Collection ({page.status})
                      </option>
                    ))}
                  </optgroup>
                )}
                {templatePages.length > 0 && (
                  <optgroup label="Project Inside Templates (By Type)">
                    {templatePages.map((page) => (
                      <option key={page.id ?? page.slug} value={page.slug}>
                        🎨 {page.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {projectPages.length > 0 && (
                  <optgroup label="Customized Project Insides">
                    {projectPages.map((page) => (
                      <option key={page.id ?? page.slug} value={page.slug}>
                        🖼️ {page.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherPages.length > 0 && (
                  <optgroup label="Other Custom Pages">
                    {otherPages.map((page) => (
                      <option key={page.id ?? page.slug} value={page.slug}>
                        {page.title} ({page.status})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                type="button"
                onClick={handleOpenProjectPicker}
                className="text-xs px-2.5 py-1 uppercase tracking-widest font-bold border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors shrink-0 flex items-center gap-1.5"
                title="Select any portfolio project to visually edit its inside page"
                disabled={viewTrash}>
                <span>🎨 Edit Project Inside...</span>
              </button>

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

          {activeTab === "pages" && activePage && (
            <a
              href={
                activePage.slug === "/" || activePage.slug === ""
                  ? "/"
                  : `/${activePage.slug}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#333] hover:border-[#C5A059] text-gray-300 hover:text-white px-3 py-2 text-xs uppercase tracking-widest font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              title="View live page in a new tab">
              <span>🔗 View Live</span>
            </a>
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
          <ProjectsAdmin onEditInsidePage={handleEditProjectInside} />
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

                {/* Site Logo Section */}
                <div className="mt-4 pt-4 border-t border-[#222]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase text-[#C5A059] font-bold tracking-wider">
                      Site Logo (PNG / JPG / SVG)
                    </span>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl("");
                          setSaveStatus(
                            "Logo removed! Click 'Save Site Settings' to apply.",
                          );
                          setTimeout(() => setSaveStatus(null), 4000);
                        }}
                        className="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                        Remove Logo
                      </button>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.svg,image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />

                  {/* Preview Card */}
                  <div className="flex items-center gap-3 p-2.5 bg-black border border-[#2b2b2b] rounded-sm mb-2">
                    <div className="w-12 h-10 shrink-0 bg-[#141414] border border-[#3a3a3a] rounded-sm flex items-center justify-center overflow-hidden p-1 shadow-inner">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-gray-600 uppercase font-bold">
                          None
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-200 truncate">
                        {logoUrl.startsWith("http") ||
                        logoUrl.startsWith("data:")
                          ? logoUrl.startsWith("data:")
                            ? "Custom Logo (Data URL)"
                            : logoUrl.split("/").pop()?.slice(0, 24) ||
                              "Custom Logo"
                          : logoUrl
                            ? logoUrl
                            : "Text only (No image logo)"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {uploadingLogo
                          ? "Uploading..."
                          : logoUrl
                            ? "Image logo active"
                            : "Click below to add a logo image"}
                      </p>
                    </div>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl("");
                          setSaveStatus(
                            "Logo removed! Click 'Save Site Settings' to apply.",
                          );
                          setTimeout(() => setSaveStatus(null), 4000);
                        }}
                        className="px-2 py-1 bg-[#1f1212] hover:bg-[#321616] border border-[#522] hover:border-red-500 text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                        title="Remove custom logo">
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] hover:border-[#C5A059] text-[10px] uppercase font-bold tracking-wider text-white transition-colors disabled:opacity-50">
                      {uploadingLogo ? "Uploading..." : "📁 Upload Logo"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setShowMediaLibrary({
                          blockId: "logo",
                          field: "logo",
                        })
                      }
                      className="py-1.5 px-2.5 bg-[#141414] hover:bg-[#202020] border border-[#333] text-[10px] uppercase font-bold tracking-wider text-[#C5A059] transition-colors">
                      Library
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#222]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase text-[#C5A059] font-bold tracking-wider">
                      Favicon (PNG / JPG)
                    </span>
                    {faviconUrl !== "/favicon.svg" && (
                      <button
                        type="button"
                        onClick={() => setFaviconUrl("/favicon.svg")}
                        className="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                        Reset Default
                      </button>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.svg,.ico,image/png,image/jpeg,image/jpg,image/webp,image/x-icon,image/svg+xml"
                    className="hidden"
                    onChange={handleFaviconUpload}
                  />

                  {/* Preview Card */}
                  <div className="flex items-center gap-3 p-2.5 bg-black border border-[#2b2b2b] rounded-sm mb-2">
                    <div className="w-10 h-10 shrink-0 bg-[#141414] border border-[#3a3a3a] rounded-sm flex items-center justify-center overflow-hidden p-1 shadow-inner">
                      {faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={faviconUrl}
                          alt="Favicon preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-gray-600">None</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-200 truncate">
                        {faviconUrl.startsWith("http") ||
                        faviconUrl.startsWith("data:")
                          ? faviconUrl.startsWith("data:")
                            ? "Custom Upload (Data URL)"
                            : faviconUrl.split("/").pop()?.slice(0, 24) ||
                              "Custom Favicon"
                          : faviconUrl === "/favicon.svg"
                            ? "Default (/favicon.svg)"
                            : faviconUrl}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {uploadingFavicon
                          ? "Uploading..."
                          : faviconUrl !== "/favicon.svg"
                            ? "Custom icon active"
                            : "Default icon active"}
                      </p>
                    </div>
                    {faviconUrl !== "/favicon.svg" && (
                      <button
                        type="button"
                        onClick={() => {
                          setFaviconUrl("/favicon.svg");
                          setSaveStatus(
                            "Favicon reset to default! Click 'Save Site Settings' to apply.",
                          );
                          setTimeout(() => setSaveStatus(null), 4000);
                        }}
                        className="px-2 py-1 bg-[#1f1212] hover:bg-[#321616] border border-[#522] hover:border-red-500 text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                        title="Remove custom favicon and reset to default">
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      disabled={uploadingFavicon}
                      onClick={() => faviconInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] hover:border-[#C5A059] text-[10px] uppercase font-bold tracking-wider text-white transition-colors disabled:opacity-50">
                      {uploadingFavicon ? "Uploading..." : "📁 Upload File"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setShowMediaLibrary({
                          blockId: "favicon",
                          field: "favicon",
                        })
                      }
                      className="py-1.5 px-2.5 bg-[#141414] hover:bg-[#202020] border border-[#333] text-[10px] uppercase font-bold tracking-wider text-[#C5A059] transition-colors">
                      Library
                    </button>
                  </div>
                </div>

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
              initialCss={activePageWithCache?.cssCache}
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
            if (showMediaLibrary.field === "favicon") {
              setFaviconUrl(asset.blobUrl);
              setShowMediaLibrary(null);
              setSaveStatus(
                "Favicon selected! Click 'Save Site Settings' to apply.",
              );
              setTimeout(() => setSaveStatus(null), 4000);
              return;
            }

            if (showMediaLibrary.field === "logo") {
              setLogoUrl(asset.blobUrl);
              setShowMediaLibrary(null);
              setSaveStatus(
                "Logo selected! Click 'Save Site Settings' to apply.",
              );
              setTimeout(() => setSaveStatus(null), 4000);
              return;
            }

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

      {/* Project Inside Page Picker Modal */}
      {showProjectPicker && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#C5A059] uppercase tracking-widest font-bold block">
                  Visual Editor &bull; Portfolio Project Insides
                </span>
                <h3 className="text-lg font-serif text-white font-bold mt-0.5">
                  Select a Project to Edit Inside Page
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectPicker(false)}
                className="w-8 h-8 rounded-full border border-[#333] text-gray-400 hover:text-white flex items-center justify-center text-sm hover:border-[#555] transition-colors">
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-[#222] bg-[#111] flex flex-col sm:flex-row gap-3 items-center justify-between">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search projects by title, medium, year..."
                className="w-full sm:flex-1 bg-black border border-[#333] rounded px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A059]"
              />
              <div className="flex gap-1 shrink-0">
                {["all", "book-covers", "illustration", "fine-art"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPickerCategory(cat)}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-colors ${
                      pickerCategory === cat
                        ? "bg-[#C5A059] text-black"
                        : "bg-[#181818] text-gray-400 hover:text-white"
                    }`}>
                    {cat === "all" ? "All" : cat.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Project List */}
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2">
              {loadingProjects ? (
                <div className="py-12 text-center text-gray-500 text-xs uppercase tracking-widest">
                  Loading projects...
                </div>
              ) : filteredPickerProjects.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs uppercase tracking-widest">
                  No matching projects found.
                </div>
              ) : (
                filteredPickerProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 bg-[#111] hover:bg-[#161616] border border-[#222] hover:border-[#C5A059]/40 rounded flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-black rounded overflow-hidden shrink-0 border border-[#333] flex items-center justify-center">
                        {proj.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={proj.coverImage}
                            alt={proj.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-[#C5A059] font-bold">Art</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-serif font-bold text-white truncate">
                          {proj.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 truncate">
                          <span className="text-[#C5A059] uppercase tracking-wider font-semibold">
                            {proj.category.replace("-", " ")}
                          </span>
                          {proj.year ? ` • ${proj.year}` : ""}
                          {proj.medium ? ` • ${proj.medium}` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditProjectInside(proj)}
                      className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-white text-black font-bold uppercase tracking-wider text-[11px] rounded transition-colors shrink-0">
                      Open in Visual Editor &rarr;
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
