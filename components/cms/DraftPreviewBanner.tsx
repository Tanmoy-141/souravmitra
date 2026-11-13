"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSafeUrl } from "@/lib/sanitize";

interface DraftPreviewBannerProps {
  pageId: string;
  title: string;
  livePath: string;
  initialStatus: "draft" | "published";
  isTrashed: boolean;
}

export default function DraftPreviewBanner({
  pageId,
  title,
  livePath,
  initialStatus,
  isTrashed,
}: DraftPreviewBannerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"draft" | "published">(initialStatus);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleLifecycleAction = async (action: "publish" | "unpublish") => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/cms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pageId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback(data.error || "Action failed");
        return;
      }
      setStatus(action === "publish" ? "published" : "draft");
      setFeedback(action === "publish" ? "Published live!" : "Reverted to draft.");
      router.refresh();
    } catch {
      setFeedback("Network error while updating status.");
    } finally {
      setBusy(false);
    }
  };

  const safeLivePath =
    typeof livePath === "string" && isSafeUrl(livePath) ? livePath : "#";

  return (
    <div className="bg-[#0b0b0b] border-b border-[#C5A059]/40 px-4 md:px-8 py-2.5 text-xs text-gray-200 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <span className="px-2 py-0.5 rounded-sm bg-[#C5A059]/15 border border-[#C5A059]/60 text-[#C5A059] font-bold uppercase tracking-widest text-[10px] shrink-0">
          Preview Mode
        </span>
        {isTrashed ? (
          <span className="px-2 py-0.5 rounded-sm bg-red-950/60 border border-red-800 text-red-300 font-bold uppercase tracking-wider text-[10px] shrink-0">
            In Trash
          </span>
        ) : status === "draft" ? (
          <span className="px-2 py-0.5 rounded-sm bg-amber-950/60 border border-amber-700 text-amber-300 font-bold uppercase tracking-wider text-[10px] shrink-0">
            Draft (Not Live)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-sm bg-emerald-950/60 border border-emerald-700 text-emerald-300 font-bold uppercase tracking-wider text-[10px] shrink-0">
            Published
          </span>
        )}
        <span className="font-semibold text-white truncate max-w-60 sm:max-w-xs">
          {title}
        </span>
        <span className="text-gray-500 font-mono hidden sm:inline">
          ({livePath})
        </span>
        {feedback && (
          <span className="text-[#C5A059] font-medium">{feedback}</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isTrashed && status === "draft" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleLifecycleAction("publish")}
            className="px-3 py-1.5 bg-[#C5A059] hover:bg-white text-black font-bold uppercase tracking-widest text-[10px] transition-colors disabled:opacity-50 cursor-pointer">
            {busy ? "Publishing..." : "Publish Page"}
          </button>
        )}

        {!isTrashed && status === "published" && (
          <>
            <a
              href={safeLivePath}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-[#333] hover:border-[#C5A059] text-gray-200 hover:text-white uppercase tracking-widest text-[10px] font-semibold transition-colors">
              View Live
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleLifecycleAction("unpublish")}
              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-200 uppercase tracking-widest text-[10px] font-bold transition-colors disabled:opacity-50 cursor-pointer">
              {busy ? "Updating..." : "Unpublish"}
            </button>
          </>
        )}

        <Link
          href={`/admin?pageId=${encodeURIComponent(pageId)}`}
          className="px-3 py-1.5 border border-[#333] hover:border-white text-gray-300 hover:text-white uppercase tracking-widest text-[10px] font-semibold transition-colors">
          Back to Editor
        </Link>
      </div>
    </div>
  );
}
