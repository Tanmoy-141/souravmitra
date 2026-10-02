import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth";

const VISITOR_COOKIE_NAME = "sm_vid";
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2;

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "fallback-secret-for-visitor-sessions-change-in-production"
  );
}

function computeSignature(visitorId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(visitorId)
    .digest("hex");
}

/**
 * Validates and retrieves the visitor ID from the request's HTTP-only cookie.
 * If none exists or the signature is invalid, generates a new visitor ID.
 */
export function getOrCreateVisitorId(req: NextRequest): {
  visitorId: string;
  isNew: boolean;
} {
  const cookieValue = req.cookies.get(VISITOR_COOKIE_NAME)?.value;

  if (cookieValue) {
    const parts = cookieValue.split(".");
    if (parts.length === 2) {
      const [id, signature] = parts;
      const expectedSignature = computeSignature(id);

      const bufA = Buffer.from(signature, "utf8");
      const bufB = Buffer.from(expectedSignature, "utf8");

      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { visitorId: id, isNew: false };
      }
    }
  }

  const newId = crypto.randomUUID();
  return { visitorId: newId, isNew: true };
}

/**
 * Attaches the signed visitor ID cookie to the outgoing HTTP response.
 */
export function setVisitorCookie(res: NextResponse, visitorId: string): void {
  const signature = computeSignature(visitorId);
  const cookieValue = `${visitorId}.${signature}`;

  res.cookies.set(VISITOR_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TWO_YEARS_SECONDS,
  });
}

/**
 * Generates an anonymized hash of the client IP address for privacy-respecting
 * abuse prevention and view deduplication.
 */
export function hashClientIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${getSecret()}`)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Checks whether the incoming request is made by an authenticated admin/owner,
 * so administrative previews do not inflate public visitor counts.
 */
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    const session = await resolveSession(sessionCookie);
    if (session.valid && session.payload?.role) {
      return true;
    }
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const session = await resolveSession(token);
    if (session.valid && session.payload?.role) {
      return true;
    }
  }

  return false;
}
