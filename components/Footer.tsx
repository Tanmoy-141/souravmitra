"use client";

import { useEffect, useState } from "react";

type FooterSettings = {
  siteName?: string;
  footerHeading?: string;
  footerText?: string;
  socialLinks?: Record<string, string>;
};

export const Footer = () => {
  const year = new Date().getFullYear();
  const [settings, setSettings] = useState<FooterSettings>({});

  useEffect(() => {
    fetch("/api/cms/settings")
      .then((response) => response.json())
      .then((data: FooterSettings) => setSettings(data))
      .catch(() => {});
  }, []);

  const socialLinks = settings.socialLinks || {};

  return (
    <footer className="py-10 text-center bg-[#000000] text-[#D4D4D4] border-t border-[#333333]">
      <p className="mb-2 text-sm uppercase tracking-widest">
        {settings.footerHeading || "FOLLOW ME ON"}
      </p>
      <div className="flex justify-center gap-6 mb-4">
        <a
          href={socialLinks.facebook || "#"}
          className="hover:text-[#C5A059]"
          aria-label="Facebook">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
          </svg>
        </a>
        <a
          href={socialLinks.instagram || "#"}
          className="hover:text-[#C5A059]"
          aria-label="Instagram">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12 2c3.176 0 3.56.012 4.81.07 1.23.056 2.06.242 2.76.516.75.292 1.28.64 1.84 1.2.56.56.91 1.09 1.2 1.84.27.7.46 1.53.52 2.76.06 1.25.07 1.63.07 4.81s-.01 3.56-.07 4.81c-.05 1.23-.24 2.06-.52 2.76-.29.75-.64 1.28-1.2 1.84-.56.56-1.09.91-1.84 1.2-.7.27-1.53.46-2.76.52-1.25.06-1.63.07-4.81.07s-3.56-.01-4.81-.07c-1.23-.05-2.06-.24-2.76-.52-.75-.29-1.28-.64-1.84-1.2-.56-.56-.91-1.09-1.2-1.84-.27-.7-.46-1.53-.52-2.76-.06-1.25-.07-1.63-.07-4.81s.01-3.56.07-4.81c.05-1.23.24-2.06.52-2.76.29-.75.64-1.28 1.2-1.84.56-.56 1.09-.91 1.84-1.2.7-.27 1.53-.46 2.76-.52 1.25-.06 1.63-.07 4.81-.07zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
          </svg>
        </a>
        <a
          href={socialLinks.threads || socialLinks.behance || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#C5A059]"
          aria-label="Threads">
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true">
            <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098c1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015c-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164c1.43 1.783 3.631 2.698 6.54 2.717c2.623-.02 4.358-.631 5.8-2.045c1.647-1.613 1.618-3.593 1.09-4.798c-.31-.71-.873-1.3-1.634-1.75c-.192 1.352-.622 2.446-1.284 3.272c-.886 1.102-2.14 1.704-3.73 1.79c-1.202.065-2.361-.218-3.259-.801c-1.063-.689-1.685-1.74-1.752-2.964c-.065-1.19.408-2.285 1.33-3.082c.88-.76 2.119-1.207 3.583-1.291a14 14 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757c-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.18c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388q.163.07.321.142c1.49.7 2.58 1.761 3.154 3.07c.797 1.82.871 4.79-1.548 7.158c-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69q-.362 0-.739.021c-1.836.103-2.98.946-2.916 2.143c.067 1.256 1.452 1.839 2.784 1.767c1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221" />
          </svg>
        </a>
        <a
          href={socialLinks.pinterest || "#"}
          className="hover:text-[#C5A059]"
          aria-label="Pinterest">
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.161 9.429 7.62 11.19-.105-.95-.2-2.413.042-3.455.218-.937 1.407-5.963 1.407-5.963s-.36-.72-.36-1.782c0-1.669.968-2.915 2.171-2.915 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.567-.992 3.993-.283 1.193.599 2.165 1.775 2.165 2.13 0 3.768-2.245 3.768-5.486 0-2.868-2.061-4.873-5.006-4.873-3.411 0-5.416 2.56-5.416 5.204 0 1.031.397 2.138.893 2.739.098.118.112.221.083.341-.091.375-.293 1.193-.333 1.359-.052.219-.172.265-.398.159-1.487-.692-2.417-2.872-2.417-4.627 0-3.766 2.736-7.222 7.891-7.222 4.144 0 7.366 2.953 7.366 6.9 0 4.117-2.596 7.43-6.2 7.43-1.211 0-2.35-.629-2.741-1.371l-.745 2.84c-.269 1.039-1 2.34-1.49 3.133 1.122.347 2.312.535 3.55.535 6.627 0 12-5.373 12-12S18.627 0 12 0z" />
          </svg>
        </a>
        <a
          href={socialLinks.linkedin || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#C5A059]"
          aria-label="LinkedIn">
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true">
            <path d="M20.447 20.452H16.89v-5.569c0-1.328-.026-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.266 2.37 4.266 5.455v6.286zM5.337 7.433a2.063 2.063 0 110-4.126 2.063 2.063 0 010 4.126zM3.555 20.452H7.12V9H3.555v11.452z" />
          </svg>
        </a>
        <a
          href={socialLinks.x || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#C5A059]"
          aria-label="X (Twitter)">
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
        </a>
      </div>
      <p>
        &copy; {year} {settings.siteName || "Sourav Mitra"}.{" "}
        {settings.footerText || "All rights reserved."}
      </p>
    </footer>
  );
};
