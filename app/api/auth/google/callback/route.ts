import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createSessionToken } from "@/lib/auth";
import {
  verifyAndUnpackFlowCookie,
  exchangeCodeForTokens,
  verifyGoogleIdToken,
  resolveGoogleLogin,
  GOOGLE_OAUTH_COOKIE_NAME,
} from "@/lib/google-auth";

const RATE_LIMIT_CONFIG = {
  limit: 20, // 20 callback attempts per 15 min per IP
  windowMs: 15 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await checkRateLimit(`oauth-callback:${ip}`, RATE_LIMIT_CONFIG);

  const clearCookieAndRedirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.nextUrl.origin));
    response.cookies.set(GOOGLE_OAUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });
    return response;
  };

  if (!rateLimitResult.success) {
    return clearCookieAndRedirect("/admin?error=rate_limited");
  }

  const searchParams = req.nextUrl.searchParams;
  const googleError = searchParams.get("error");
  if (googleError) {
    console.warn("[OAuth] Google returned authorization error:", googleError);
    return clearCookieAndRedirect("/admin?error=google_denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return clearCookieAndRedirect("/admin?error=invalid_request");
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    console.error("[OAuth] AUTH_SECRET is not configured in the environment.");
    return clearCookieAndRedirect("/admin?error=server_error");
  }

  // Verify and unpack the signed flow cookie
  const rawCookie = req.cookies.get(GOOGLE_OAUTH_COOKIE_NAME)?.value;
  const flowData = verifyAndUnpackFlowCookie(rawCookie, authSecret);

  if (!flowData || flowData.state !== state) {
    console.warn("[OAuth] State mismatch or expired flow cookie.");
    return clearCookieAndRedirect("/admin?error=invalid_state");
  }

  try {
    // 1. Exchange authorization code with Google using PKCE code_verifier
    const tokenData = await exchangeCodeForTokens(code, flowData.codeVerifier);

    // 2. Cryptographically verify the ID token against Google's JWKS and validate nonce
    const claims = await verifyGoogleIdToken(tokenData.id_token, flowData.nonce);

    // 3. Resolve user account according to closed-access allowlist policy
    const loginResult = await resolveGoogleLogin(claims);

    if (!loginResult.success) {
      if (loginResult.code === "UNAUTHORIZED") {
        return clearCookieAndRedirect("/admin?error=unauthorized");
      }
      if (loginResult.code === "UNVERIFIED_EMAIL") {
        return clearCookieAndRedirect("/admin?error=unverified_email");
      }
      if (loginResult.code === "ACCOUNT_CONFLICT") {
        return clearCookieAndRedirect("/admin?error=account_conflict");
      }
      return clearCookieAndRedirect("/admin?error=unauthorized");
    }

    // 4. Issue the standard HMAC admin_session token
    const sessionToken = createSessionToken(loginResult.user);

    // 5. Build success response: clear flow cookie, set admin_session, redirect to /admin
    const response = clearCookieAndRedirect("/admin");
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[OAuth] Unexpected callback error:", error);
    return clearCookieAndRedirect("/admin?error=auth_failed");
  }
}

