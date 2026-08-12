"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import AdminLogin from "@/components/cms/AdminLogin";
import MediaLibrary from "@/components/cms/MediaLibrary";
import { CustomPage, Block, BlockType } from "@/data/cms";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [activePage, setActivePage] = useState<CustomPage | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState<{
    blockId: string;
    field: "images" | "background";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch("/api/cms");
        const data = await res.json();
        setPages(data.pages);
        if (data.pages.length > 0) setActivePage(data.pages[0]);
      } catch {
        console.error("Failed to load pages");
      } finally {
        setLoading(false);
      }
    };
    fetchPages();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages, token: "session_active_token" }),
      });
      if (res.ok) alert("Site published successfully!");
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: BlockType) => {
    if (!activePage) return;
    const newBlock: Block = {
      id: `b-${activePage.blocks.length + 1}`,
      type,
      content: {
        title: `New ${type} block`,
        subtitle: "Subtitle goes here",
        body: "Body content goes here",
        buttonText: "Click Me",
        images: [],
      },
    };
    const updatedPage = {
      ...activePage,
      blocks: [...activePage.blocks, newBlock],
    };
    setPages(pages.map((p) => (p.slug === activePage.slug ? updatedPage : p)));
    setActivePage(updatedPage);
  };

  const removeBlock = (id: string) => {
    if (!activePage) return;
    const updatedPage = {
      ...activePage,
      blocks: activePage.blocks.filter((b) => b.id !== id),
    };
    setPages(pages.map((p) => (p.slug === activePage.slug ? updatedPage : p)));
    setActivePage(updatedPage);
  };

  const updateBlockContent = (id: string, field: string, value: unknown) => {
    if (!activePage) return;
    const updatedPage = {
      ...activePage,
      blocks: activePage.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, [field]: value } } : b,
      ),
    };
    setPages(pages.map((p) => (p.slug === activePage.slug ? updatedPage : p)));
    setActivePage(updatedPage);
  };

  const createNewPage = () => {
    const newPage: CustomPage = {
      slug: `new-page-${Date.now()}`,
      title: "Untitled Page",
      status: "draft",
      blocks: [],
    };
    setPages([...pages, newPage]);
    setActivePage(newPage);
  };

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold uppercase tracking-widest">
        Loading Dashboard...
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-16 border-b border-[#333333] px-8 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-6">
          <span className="text-[#C5A059] font-bold uppercase tracking-widest text-xs">
            Admin Dashboard
          </span>
          <select
            value={activePage?.slug}
            onChange={(e) =>
              setActivePage(
                pages.find((p) => p.slug === e.target.value) || null,
              )
            }
            className="bg-[#111111] border border-[#333333] px-3 py-1 text-sm focus:outline-none">
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title} ({p.status})
              </option>
            ))}
          </select>
          <button
            onClick={createNewPage}
            className="text-xs text-gray-500 hover:text-white uppercase tracking-widest">
            + New Page
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#C5A059] text-black px-6 py-2 font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50">
          {saving ? "Publishing..." : "Publish Site"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-[#333333] p-6 overflow-y-auto flex flex-col gap-8 bg-[#050505]">
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
                    const updated = { ...activePage!, title: e.target.value };
                    setPages(
                      pages.map((p) =>
                        p.slug === activePage?.slug ? updated : p,
                      ),
                    );
                    setActivePage(updated);
                  }}
                  className="w-full bg-black border border-[#333333] p-2 text-sm focus:border-[#C5A059] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-600 font-bold mb-1 block">
                  Status
                </label>
                <select
                  value={activePage?.status}
                  onChange={(e) => {
                    const updated = {
                      ...activePage!,
                      status: e.target.value as "draft" | "published",
                    };
                    setPages(
                      pages.map((p) =>
                        p.slug === activePage?.slug ? updated : p,
                      ),
                    );
                    setActivePage(updated);
                  }}
                  className="w-full bg-black border border-[#333333] p-2 text-sm focus:border-[#C5A059] outline-none">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Add Block
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {["hero", "text-content", "gallery", "cta"].map((type) => (
                <button
                  key={type}
                  onClick={() => addBlock(type as BlockType)}
                  className="p-3 bg-[#111111] border border-[#333333] text-[10px] uppercase font-bold tracking-widest hover:border-[#C5A059] transition-colors">
                  {type}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Builder Canvas */}
        <main className="flex-1 overflow-y-auto p-12 bg-[#000000]">
          <div className="max-w-4xl mx-auto flex flex-col gap-12">
            {activePage?.blocks.map((block) => (
              <div
                key={block.id}
                className="group relative border border-[#222222] hover:border-[#C5A059] transition-colors p-8 bg-[#080808]">
                <div className="absolute -top-3 left-4 bg-black px-2 text-[10px] font-bold text-[#C5A059] uppercase tracking-widest border border-[#333333]">
                  {block.type}
                </div>
                <button
                  onClick={() => removeBlock(block.id)}
                  className="absolute top-4 right-4 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Remove
                </button>

                <div className="flex flex-col gap-6">
                  {/* Common Title/Subtitle Fields */}
                  {"title" in block.content && (
                    <input
                      type="text"
                      placeholder="Title"
                      value={block.content.title}
                      onChange={(e) =>
                        updateBlockContent(block.id, "title", e.target.value)
                      }
                      className="text-2xl font-sans font-bold bg-transparent border-b border-[#222222] focus:border-[#C5A059] outline-none w-full pb-2"
                    />
                  )}
                  {"subtitle" in block.content && (
                    <input
                      type="text"
                      placeholder="Subtitle"
                      value={block.content.subtitle}
                      onChange={(e) =>
                        updateBlockContent(block.id, "subtitle", e.target.value)
                      }
                      className="text-sm text-gray-400 bg-transparent border-b border-[#222222] focus:border-[#C5A059] outline-none w-full pb-2"
                    />
                  )}
                  {block.type === "text-content" && (
                    <textarea
                      placeholder="Body Content"
                      value={block.content.body}
                      onChange={(e) =>
                        updateBlockContent(block.id, "body", e.target.value)
                      }
                      className="h-32 bg-[#111111] border border-[#222222] p-4 text-gray-300 text-sm focus:border-[#C5A059] outline-none"
                    />
                  )}
                  {block.type === "hero" && (
                    <button
                      onClick={() =>
                        setShowMediaLibrary({
                          blockId: block.id,
                          field: "background",
                        })
                      }
                      className="py-2 border border-dashed border-gray-700 text-[10px] uppercase font-bold tracking-widest text-gray-500 hover:text-white">
                      {block.content.background
                        ? "Change Background"
                        : "Select Background"}
                    </button>
                  )}
                  {block.type === "gallery" && (
                    <div className="flex flex-wrap gap-4">
                      {block.content.images?.map((url, i) => (
                        <div
                          key={i}
                          className="w-20 h-20 bg-gray-900 border border-[#333333]">
                          <Image
                            src={url}
                            alt="Gallery image"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setShowMediaLibrary({
                            blockId: block.id,
                            field: "images",
                          })
                        }
                        className="w-20 h-20 border-2 border-dashed border-gray-800 flex items-center justify-center text-gray-600 hover:text-white">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {activePage?.blocks.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-[#222222] text-gray-600 uppercase tracking-widest text-sm">
                This page is empty. Add a block from the sidebar to get started.
              </div>
            )}
          </div>
        </main>
      </div>

      {showMediaLibrary && (
        <MediaLibrary
          onClose={() => setShowMediaLibrary(null)}
          onSelect={(asset) => {
            if (showMediaLibrary.field === "background") {
              updateBlockContent(
                showMediaLibrary.blockId,
                "background",
                asset.url,
              );
            } else {
              const currentImages =
                activePage?.blocks.find(
                  (b) => b.id === showMediaLibrary.blockId,
                )?.content.images || [];
              updateBlockContent(showMediaLibrary.blockId, "images", [
                ...currentImages,
                asset.url,
              ]);
            }
            setShowMediaLibrary(null);
          }}
        />
      )}
    </div>
  );
}
