import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { resolveSession, type SessionPayload } from "@/lib/auth";

/**
 * Single source of truth for "who is calling this API route?".
 *
 * This replaces the identical per-route copies of `isAuthorized()` /
 * `getAuthenticatedUserId()` that used to live in each route file.
 * Behaviour is intentionally unchanged:
 *   1. the `admin_session` cookie is checked first;
 *   2. if that is missing or invalid AND a `req` was passed, an
 *      `Authorization: Bearer <token>` header is checked.
 * Every token goes through `resolveSession`, so signature, expiry and
 * `sessionVersion` revocation are all still enforced.
 *
 * Calling without `req` is cookie-only (what /api/cms/settings relied on).
 *
 * Role-based checks (owner vs admin) and the Google sign-in flow will build
 * on `getSessionPayload` in a later step; nothing here restricts by role yet.
 */
export async function getSessionPayload(
  req?: NextRequest,
): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (sessionCookie) {
    const result = await resolveSession(sessionCookie);
    if (result.valid && result.payload) return result.payload;
  }

  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const result = await resolveSession(authHeader.substring(7).trim());
      if (result.valid && result.payload) return result.payload;
    }
  }

  return null;
}

/** True when the request carries a valid, non-revoked admin session. */
export async function isAuthorized(req?: NextRequest): Promise<boolean> {
  return (await getSessionPayload(req)) !== null;
}

/** The authenticated user's id, or null when there is no valid session. */
export async function getAuthenticatedUserId(
  req?: NextRequest,
): Promise<string | null> {
  const payload = await getSessionPayload(req);
  return payload ? payload.userId : null;
}
