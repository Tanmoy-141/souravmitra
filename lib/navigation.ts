import { z } from "zod";
import { isSafeUrl } from "@/lib/sanitize";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  isCta?: boolean;
  openInNewTab?: boolean;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    id: "nav-book-covers",
    label: "Book Covers",
    href: "/book-covers",
    visible: true,
    isCta: false,
    openInNewTab: false,
  },
  {
    id: "nav-illustration",
    label: "Illustration",
    href: "/illustration",
    visible: true,
    isCta: false,
    openInNewTab: false,
  },
  {
    id: "nav-fine-art",
    label: "Fine Art",
    href: "/fine-art",
    visible: true,
    isCta: false,
    openInNewTab: false,
  },
  {
    id: "nav-about",
    label: "About",
    href: "/about",
    visible: true,
    isCta: false,
    openInNewTab: false,
  },
  {
    id: "nav-contact",
    label: "Contact",
    href: "/contact",
    visible: true,
    isCta: true,
    openInNewTab: false,
  },
];

/**
 * Allows internal paths (/...), http(s)://..., mailto:..., or in-page #anchors.
 * Strictly blocks javascript:, data:, vbscript:, and protocol-relative // URLs.
 */
export function isSafeNavHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (/^#[a-zA-Z0-9_-]+$/.test(trimmed)) return true;
  return isSafeUrl(trimmed);
}

export function isExternalNavHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim()) || /^mailto:/i.test(href.trim());
}

export const NavItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1, "Link label is required").max(80),
  href: z
    .string()
    .trim()
    .min(1, "Link URL is required")
    .max(500)
    .refine(isSafeNavHref, {
      message: "URL must start with /, #, https://, http://, or mailto:",
    }),
  visible: z.boolean().default(true),
  isCta: z.boolean().optional().default(false),
  openInNewTab: z.boolean().optional().default(false),
});

export const NavItemsArraySchema = z.array(NavItemSchema).max(30);

export function normalizeStoredNavItems(raw: unknown): NavItem[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed = NavItemsArraySchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}
