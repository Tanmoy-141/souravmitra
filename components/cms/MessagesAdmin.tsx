"use client";
import { useState, useEffect } from "react";
import { type Inquiry } from "@/db/schema";

export default function MessagesAdmin() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filter, setFilter] = useState<"unread" | "read" | "archived" | "all">("unread");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries?filter=${filter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
        if (selectedInquiry) {
          const updatedSelected = data.inquiries.find((i: Inquiry) => i.id === selectedInquiry.id);
          setSelectedInquiry(updatedSelected || data.inquiries[0] || null);
        } else if (data.inquiries.length > 0) {
          setSelectedInquiry(data.inquiries[0]);
        } else {
          setSelectedInquiry(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inquiries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInquiries();
  };

  const updateStatus = async (id: string, updates: { isRead?: boolean; isArchived?: boolean }) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(inquiries.map((i) => (i.id === id ? data.inquiry : i)));
        if (selectedInquiry?.id === id) {
          setSelectedInquiry(data.inquiry);
        }
      }
    } catch (err) {
      console.error("Failed to update inquiry", err);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this inquiry?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        const remaining = inquiries.filter((i) => i.id !== id);
        setInquiries(remaining);
        setSelectedInquiry(remaining[0] || null);
      }
    } catch (err) {
      console.error("Failed to delete inquiry", err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-black text-white">
      {/* Left Pane: List */}
      <div className="w-full md:w-96 border-r border-[#333333] flex flex-col bg-[#050505] shrink-0">
        {/* Controls */}
        <div className="p-4 border-b border-[#333333] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
              Inquiries ({inquiries.length})
            </h3>
            <div className="flex gap-1 text-[10px] font-bold uppercase tracking-wider">
              <button
                onClick={() => setFilter("unread")}
                className={`px-2 py-1 ${filter === "unread" ? "bg-[#C5A059] text-black" : "bg-[#111] text-gray-400 hover:text-white"}`}>
                Unread
              </button>
              <button
                onClick={() => setFilter("read")}
                className={`px-2 py-1 ${filter === "read" ? "bg-[#C5A059] text-black" : "bg-[#111] text-gray-400 hover:text-white"}`}>
                Read
              </button>
              <button
                onClick={() => setFilter("archived")}
                className={`px-2 py-1 ${filter === "archived" ? "bg-[#C5A059] text-black" : "bg-[#111] text-gray-400 hover:text-white"}`}>
                Archived
              </button>
            </div>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Search name, email, message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-black border border-[#333333] px-3 py-1.5 text-xs flex-1 focus:border-[#C5A059] outline-none"
            />
            <button
              type="submit"
              className="bg-[#222] border border-[#333] px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-[#333]">
              Search
            </button>
          </form>
        </div>

        {/* List of Messages */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#222222]">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500 uppercase tracking-widest">
              Loading inquiries...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-600 uppercase tracking-widest">
              No inquiries found
            </div>
          ) : (
            inquiries.map((inq) => {
              const isSelected = selectedInquiry?.id === inq.id;
              return (
                <div
                  key={inq.id}
                  onClick={() => {
                    setSelectedInquiry(inq);
                    if (!inq.isRead) {
                      updateStatus(inq.id, { isRead: true });
                    }
                  }}
                  className={`p-4 cursor-pointer transition-colors flex flex-col gap-1.5 ${
                    isSelected ? "bg-[#111111] border-l-2 border-[#C5A059]" : "hover:bg-[#0a0a0a]"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${!inq.isRead ? "text-white" : "text-gray-300"}`}>
                      {inq.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {!inq.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#C5A059]" title="Unread" />
                      )}
                      <span className="text-[10px] text-gray-500">
                        {new Date(inq.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">{inq.email}</div>
                  {inq.projectType && (
                    <span className="self-start text-[9px] uppercase tracking-widest px-2 py-0.5 bg-[#1a1a1a] border border-[#333] text-[#C5A059]">
                      {inq.projectType}
                    </span>
                  )}
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">{inq.message}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Detail View */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-black flex flex-col">
        {selectedInquiry ? (
          <div className="max-w-3xl w-full mx-auto flex flex-col gap-8">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333333]">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold tracking-tight text-white">{selectedInquiry.name}</h2>
                  {selectedInquiry.projectType && (
                    <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 bg-[#1a1a1a] border border-[#333] text-[#C5A059]">
                      {selectedInquiry.projectType}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                  <a href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(`Re: Portfolio Inquiry - ${selectedInquiry.projectType || "General"}`)}`} className="hover:text-[#C5A059] underline">
                    {selectedInquiry.email}
                  </a>
                  {selectedInquiry.company && <span>• Company: {selectedInquiry.company}</span>}
                  <span>• Received: {new Date(selectedInquiry.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(`Re: Portfolio Inquiry - ${selectedInquiry.projectType || "General"}`)}`}
                  className="bg-[#C5A059] text-black px-4 py-2 font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors">
                  Reply via Email
                </a>
                <button
                  onClick={() => updateStatus(selectedInquiry.id, { isRead: !selectedInquiry.isRead })}
                  disabled={actionLoading}
                  className="border border-[#333] px-3 py-2 text-xs uppercase tracking-widest text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                  {selectedInquiry.isRead ? "Mark Unread" : "Mark Read"}
                </button>
                <button
                  onClick={() => updateStatus(selectedInquiry.id, { isArchived: !selectedInquiry.isArchived })}
                  disabled={actionLoading}
                  className="border border-[#333] px-3 py-2 text-xs uppercase tracking-widest text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                  {selectedInquiry.isArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  onClick={() => deleteInquiry(selectedInquiry.id)}
                  disabled={actionLoading}
                  className="border border-red-900/50 bg-red-950/20 px-3 py-2 text-xs uppercase tracking-widest text-red-400 hover:bg-red-900/40 transition-colors">
                  Delete
                </button>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message Content</h3>
              <div className="p-6 bg-[#050505] border border-[#222222] text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="pt-6 border-t border-[#222222] text-[11px] text-gray-600 flex justify-between">
              <span>Inquiry ID: {selectedInquiry.id}</span>
              {selectedInquiry.ipAddress && <span>IP Address: {selectedInquiry.ipAddress}</span>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-xs uppercase tracking-widest">
            Select an inquiry to view details
          </div>
        )}
      </div>
    </div>
  );
}
