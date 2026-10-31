"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Status = "idle" | "submitting" | "success" | "error";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  threads?: string;
  behance?: string;
  linkedin?: string;
  x?: string;
  twitter?: string;
  pinterest?: string;
}

export interface ContactFormClientProps {
  renderMode?: "full" | "form-only";
  initialHeading?: string;
  initialCopyHtml?: string;
  initialEmail?: string;
  cardStyle?: CSSProperties;
  firstNameLabel?: string;
  lastNameLabel?: string;
  emailLabel?: string;
  messageLabel?: string;
  submitButtonText?: string;
  submitButtonBg?: string;
  submitButtonTextColor?: string;
  inputBorderColor?: string;
  cardBg?: string;
  cardTextColor?: string;
  cardHover?: string;
  roles?: string[];
}

export default function ContactFormClient({
  renderMode = "full",
  initialHeading = "Hello,",
  initialCopyHtml,
  initialEmail = "souravmitra045@gmail.com",
  cardStyle,
  firstNameLabel = "First Name *",
  lastNameLabel = "Last Name *",
  emailLabel = "Email *",
  messageLabel = "Message",
  submitButtonText = "Send",
  submitButtonBg,
  submitButtonTextColor,
  inputBorderColor,
  cardBg,
  cardTextColor,
  cardHover = "lift",
  roles = ["Publisher", "Writer", "Individual"],
}: ContactFormClientProps = {}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [userType, setUserType] = useState<string>("Individual");
  const [hpCompany, setHpCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  useEffect(() => {
    fetch("/api/cms/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.socialLinks) {
          setSocialLinks(data.socialLinks);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          message,
          userType: userType || "Individual",
          hp_company: hpCompany,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.message || "Something went wrong. Please try again.",
        );
        setStatus("error");
        return;
      }

      setStatus("success");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
      setUserType("Individual");
    } catch {
      setErrorMessage("Connection error. Please try again.");
      setStatus("error");
    }
  };

  const formElement = (
    <div className="contact-form-container transition-all duration-300 ease-out">
      {status === "success" ? (
        <div className="border border-white/20 p-6 sm:p-8 text-center bg-black transition-all duration-300 hover:border-white/40">
          <h2 className="text-xl sm:text-2xl font-sans text-white mb-3">
            Message Sent!
          </h2>
          <p className="text-sm text-gray-300 mb-6">
            Thanks for reaching out — I&apos;ll get back to you as soon as
            possible.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="w-full bg-[#DBDBDB] hover:bg-[#EAEAEA] active:bg-[#BFBFBF] text-black font-normal text-xs sm:text-sm py-2.5 rounded-none transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg">
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          {/* Row 1: First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-white text-xs sm:text-[13px] mb-1 font-normal">
                {firstNameLabel}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={inputBorderColor ? { borderColor: inputBorderColor } : undefined}
                className="w-full bg-black border border-white text-white text-xs sm:text-sm px-3 py-1.5 sm:py-2 rounded-none focus:outline-none focus:ring-1 focus:ring-white transition-all duration-200 hover:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-white text-xs sm:text-[13px] mb-1 font-normal">
                {lastNameLabel}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={inputBorderColor ? { borderColor: inputBorderColor } : undefined}
                className="w-full bg-black border border-white text-white text-xs sm:text-sm px-3 py-1.5 sm:py-2 rounded-none focus:outline-none focus:ring-1 focus:ring-white transition-all duration-200 hover:border-gray-300"
              />
            </div>
          </div>

          {/* Row 2: Email */}
          <div>
            <label className="block text-white text-xs sm:text-[13px] mb-1 font-normal">
              {emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputBorderColor ? { borderColor: inputBorderColor } : undefined}
              className="w-full bg-black border border-white text-white text-xs sm:text-sm px-3 py-1.5 sm:py-2 rounded-none focus:outline-none focus:ring-1 focus:ring-white transition-all duration-200 hover:border-gray-300"
            />
          </div>

          {/* Row 3: Message */}
          <div>
            <label className="block text-white text-xs sm:text-[13px] mb-1 font-normal">
              {messageLabel}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={inputBorderColor ? { borderColor: inputBorderColor } : undefined}
              className="w-full bg-black border border-white text-white text-xs sm:text-sm px-3 py-1.5 sm:py-2 rounded-none focus:outline-none focus:ring-1 focus:ring-white transition-all duration-200 hover:border-gray-300 resize-none h-16 sm:h-20"
            />
          </div>

          {/* Row 4: Radio Buttons (Publisher, Writer, Individual) */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 pt-1 pb-1">
            {roles.map((role) => (
              <label
                key={role}
                className="inline-flex items-center gap-2 cursor-pointer text-white text-xs sm:text-[13px] font-normal select-none transition-opacity hover:opacity-80">
                <input
                  type="radio"
                  name="userType"
                  value={role}
                  checked={userType === role}
                  onChange={() => setUserType(role)}
                  className="sr-only peer"
                />
                <span className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center peer-focus-visible:ring-1 peer-focus-visible:ring-white shrink-0">
                  {userType === role && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                  )}
                </span>
                <span>{role}</span>
              </label>
            ))}
          </div>

          {/* Honeypot field (hidden) */}
          <input
            type="text"
            name="hp_company"
            value={hpCompany}
            onChange={(e) => setHpCompany(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* Error feedback */}
          {status === "error" && (
            <p className="text-red-400 text-xs text-center font-normal">
              {errorMessage}
            </p>
          )}

          {/* Row 5: Send Button with hover lift & shadow */}
          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              backgroundColor: submitButtonBg || undefined,
              color: submitButtonTextColor || undefined,
            }}
            className="w-full bg-[#DBDBDB] hover:bg-[#EAEAEA] active:bg-[#BFBFBF] text-black font-normal text-xs sm:text-sm py-2 sm:py-2.5 rounded-none transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
            {status === "submitting" ? "Sending..." : submitButtonText}
          </button>
        </form>
      )}
    </div>
  );

  if (renderMode === "form-only") {
    return <div className="w-full flex flex-col justify-center">{formElement}</div>;
  }

  return (
    <div className="w-full flex justify-center items-center py-4 sm:py-8">
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-6 md:gap-7 lg:gap-8 px-2 sm:px-4">
        {/* Left Light Grey Card with hover lift and ambient luminous glow */}
        <div
          className="contact-card w-full md:w-80 lg:w-85 shrink-0 bg-[#DBDBDB] text-black p-6 sm:p-8 lg:p-9 rounded-none flex flex-col justify-between self-stretch cursor-pointer"
          data-card-hover={cardHover}
          style={{
            backgroundColor: cardBg || undefined,
            color: cardTextColor || undefined,
            ...cardStyle,
          }}>
          <div>
            <h1 className="text-3xl sm:text-4xl font-sans font-medium text-black mb-5 tracking-tight"
                style={{ color: cardTextColor || undefined }}>
              {initialHeading}
            </h1>

            {initialCopyHtml ? (
              <div
                className="text-[13px] sm:text-sm font-normal leading-relaxed mb-6 space-y-4"
                style={{ color: cardTextColor || undefined }}
                dangerouslySetInnerHTML={{ __html: initialCopyHtml }}
              />
            ) : (
              <div className="text-[13px] sm:text-sm font-normal leading-relaxed mb-6 space-y-4"
                   style={{ color: cardTextColor || undefined }}>
                <p>
                  Got a story that needs a<br />
                  cover? An idea you&apos;d like<br />
                  illustrated? Or just want to<br />
                  share what you felt looking at<br />
                  my work?
                </p>
                <p>I&apos;d love to hear from you.</p>
              </div>
            )}
          </div>

          <div>
            <div className="mb-4">
              <a
                href={`mailto:${initialEmail}`}
                className="text-[13px] sm:text-sm font-normal hover:underline inline-block"
                style={{ color: cardTextColor || undefined }}>
                {initialEmail}
              </a>
            </div>

            {/* 6 Circular Social Icons with hover scale */}
            <div className="flex items-center gap-2">
              {/* Facebook */}
              <a
                href={socialLinks.facebook || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:shadow-md hover:opacity-85"
                aria-label="Facebook">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"
                  viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href={socialLinks.instagram || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:shadow-md hover:opacity-85"
                aria-label="Instagram">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"
                  viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Threads */}
              <a
                href={socialLinks.threads || socialLinks.behance || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:shadow-md hover:opacity-85"
                aria-label="Threads">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"
                  viewBox="0 0 24 24">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098c1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015c-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164c1.43 1.783 3.631 2.698 6.54 2.717c2.623-.02 4.358-.631 5.8-2.045c1.647-1.613 1.618-3.593 1.09-4.798c-.31-.71-.873-1.3-1.634-1.75c-.192 1.352-.622 2.446-1.284 3.272c-.886 1.102-2.14 1.704-3.73 1.79c-1.202.065-2.361-.218-3.259-.801c-1.063-.689-1.685-1.74-1.752-2.964c-.065-1.19.408-2.285 1.33-3.082c.88-.76 2.119-1.207 3.583-1.291a14 14 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757c-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.18c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388q.163.07.321.142c1.49.7 2.58 1.761 3.154 3.07c.797 1.82.871 4.79-1.548 7.158c-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69q-.362 0-.739.021c-1.836.103-2.98.946-2.916 2.143c.067 1.256 1.452 1.839 2.784 1.767c1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href={socialLinks.linkedin || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:shadow-md hover:opacity-85"
                aria-label="LinkedIn">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"
                  viewBox="0 0 24 24">
                  <path d="M20.447 20.452H16.89v-5.569c0-1.328-.026-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.266 2.37 4.266 5.455v6.286zM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM3.555 20.452H7.12V9H3.555v11.452z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href={socialLinks.x || socialLinks.twitter || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:shadow-md hover:opacity-85"
                aria-label="X">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"
                  viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>

              {/* Pinterest */}
              <a
                href={socialLinks.pinterest || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black flex items-center justify-center transition-all duration-200 ease-out hover:scale-115 hover:shadow-md hover:opacity-85"
                aria-label="Pinterest">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white"
                  viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.161 9.429 7.62 11.19-.105-.95-.2-2.413.042-3.455.218-.937 1.407-5.963 1.407-5.963s-.36-.72-.36-1.782c0-1.669.968-2.915 2.171-2.915 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.567-.992 3.993-.283 1.193.599 2.165 1.775 2.165 2.13 0 3.768-2.245 3.768-5.486 0-2.868-2.061-4.873-5.006-4.873-3.411 0-5.416 2.56-5.416 5.204 0 1.031.397 2.138.893 2.739.098.118.112.221.083.341-.091.375-.293 1.193-.333 1.359-.052.219-.172.265-.398.159-1.487-.692-2.417-2.872-2.417-4.627 0-3.766 2.736-7.222 7.891-7.222 4.144 0 7.366 2.953 7.366 6.9 0 4.117-2.596 7.43-6.2 7.43-1.211 0-2.35-.629-2.741-1.371l-.745 2.84c-.269 1.039-1 2.34-1.49 3.133 1.122.347 2.312.535 3.55.535 6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Right Dark Form */}
        <div className="w-full md:w-105 lg:w-115 flex flex-col justify-center">
          {formElement}
        </div>
      </div>
    </div>
  );
}
