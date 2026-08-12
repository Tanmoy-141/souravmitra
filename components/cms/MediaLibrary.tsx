"use client";
import { useState } from "react";
import Image from "next/image";
import { defaultMediaAssets, MediaAsset } from "@/data/cms";

interface MediaLibraryProps {
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}

export default function MediaLibrary({ onSelect, onClose }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(defaultMediaAssets);
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    setUploading(true);
    // Simulate upload progress
    setTimeout(() => {
      const newAsset: MediaAsset = {
        id: `m${Date.now()}`,
        name: "New Upload",
        url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=800",
        type: "image",
      };
      setAssets([newAsset, ...assets]);
      setUploading(false);
    }, 1500);
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
          <button
            onClick={handleUpload}
            className="aspect-square border-2 border-dashed border-[#333333] hover:border-[#C5A059] flex flex-col items-center justify-center gap-2 text-gray-500 transition-colors">
            <span className="text-2xl">{uploading ? "..." : "+"}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest">
              {uploading ? "Uploading" : "Upload Mock"}
            </span>
          </button>

          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelect(asset)}
              className="group relative aspect-square bg-black border border-[#333333] overflow-hidden cursor-pointer hover:border-[#C5A059] transition-colors">
              <Image
                src={asset.url}
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
          ))}
        </div>
      </div>
    </div>
  );
}
