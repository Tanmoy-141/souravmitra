"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { MediaAsset as DbMediaAsset } from "@/db/schema";

interface MediaLibraryProps {
  onSelect: (asset: DbMediaAsset) => void;
  onClose: () => void;
}

export default function MediaLibrary({ onSelect, onClose }: MediaLibraryProps) {
  const [assets, setAssets] = useState<DbMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch (err) {
      console.error("Failed to fetch assets", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssets();
  }, [fetchAssets]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAssets([data.asset, ...assets]);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-[#111111] border border-[#333333] w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-[#333333] flex justify-between items-center">
          <h2 className="text-xl font-sans font-bold text-white uppercase tracking-widest">
            Media Library
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            &times; Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="aspect-square border-2 border-dashed border-[#333333] hover:border-[#C5A059] flex flex-col items-center justify-center gap-2 text-gray-500 transition-colors cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <span className="text-2xl">{uploading ? "..." : "+"}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest">
              {uploading ? "Uploading" : "Upload Image"}
            </span>
          </label>

          {loading ? (
            <div className="col-span-full text-center text-gray-500 text-xs py-10">Loading...</div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onSelect(asset)}
                className="group relative aspect-square bg-black border border-[#333333] overflow-hidden cursor-pointer hover:border-[#C5A059] transition-colors">
                <Image
                  src={asset.blobUrl}
                  alt={asset.name}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                  <span className="text-[10px] text-white font-bold uppercase tracking-widest">
                    Select
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
