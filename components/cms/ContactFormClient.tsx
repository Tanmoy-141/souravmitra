"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactFormClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [projectType, setProjectType] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, projectType, message }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setCompany("");
      setProjectType("");
      setMessage("");
    } catch {
      setErrorMessage("Connection error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-2xl mx-auto text-[#D4D4D4] text-center">
        <h1 className="text-3xl sm:text-4xl font-serif text-white mb-4">Message Sent</h1>
        <p className="text-base sm:text-lg mb-8 text-gray-300">
          Thanks for reaching out — I&apos;ll get back to you as soon as possible.
        </p>
        <Button onClick={() => setStatus("idle")} className="min-h-11 w-full sm:w-auto">
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-2xl mx-auto text-[#D4D4D4]">
      <h1 className="text-3xl sm:text-4xl font-serif text-white mb-6 sm:mb-8">
        Let&apos;s Connect!
      </h1>
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3.5 bg-[#111111] border border-[#333333] text-white text-base rounded-none focus:outline-none focus:border-[#C5A059] transition-colors"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3.5 bg-[#111111] border border-[#333333] text-white text-base rounded-none focus:outline-none focus:border-[#C5A059] transition-colors"
          required
        />
        <input
          type="text"
          placeholder="Writer / Publisher / Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-3.5 bg-[#111111] border border-[#333333] text-white text-base rounded-none focus:outline-none focus:border-[#C5A059] transition-colors"
        />
        <select
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
          className="w-full p-3.5 bg-[#111111] border border-[#333333] text-white text-base rounded-none focus:outline-none focus:border-[#C5A059] transition-colors"
        >
          <option value="">Select Project Type</option>
          <option value="book-cover">Book Cover</option>
          <option value="illustration">Illustration</option>
          <option value="fine-art">Fine Art</option>
        </select>
        <textarea
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3.5 bg-[#111111] border border-[#333333] text-white text-base rounded-none focus:outline-none focus:border-[#C5A059] transition-colors h-32"
          required
        />
        {status === "error" && (
          <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
        )}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={status === "submitting"}
            className="w-full sm:w-auto min-h-11">
            {status === "submitting" ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </form>
    </div>
  );
}
