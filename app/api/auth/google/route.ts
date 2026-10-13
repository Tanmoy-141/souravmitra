import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isGoogleOAuthConfigured,
  generateGooglePKCEFlow,
  buildGoogleAuthUrl,
  packAndSignFlowCookie,
  GOOGLE_OAUTH_COOKIE_NAME,
} from "@/lib/google-auth";

const RATE_LIMIT_CONFIG = {
  limit: 20, // 20 OAuth attempts per 15 min per IP
  windowMs: 15 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await checkRateLimit(`oauth-init:${ip}`, RATE_LIMIT_CONFIG);

  if (!rateLimitResult.success) {
    return NextResponse.redirect(
      new URL("/admin?error=rate_limited", req.nextUrl.origin),
    );
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/admin?error=google_not_configured", req.nextUrl.origin),
    );
  }

  const cookieSigningKey = process.env.AUTH_SECRET;
  if (!cookieSigningKey) {
    console.error("[OAuth] AUTH_SECRET is not configured in the environment.");
    return NextResponse.redirect(
      new URL("/admin?error=server_error", req.nextUrl.origin),
    );
  }

  try {
    const flow = generateGooglePKCEFlow();
    const authUrl = buildGoogleAuthUrl(flow);
    const signedCookie = packAndSignFlowCookie(
      {
        state: flow.state,
        codeVerifier: flow.codeVerifier,
        nonce: flow.nonce,
      },
      cookieSigningKey,
    );

    const response = NextResponse.redirect(authUrl);

    response.cookies.set(GOOGLE_OAUTH_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 10 * 60, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("[OAuth] Error initiating Google OAuth flow:", error);
    return NextResponse.redirect(
      new URL("/admin?error=server_error", req.nextUrl.origin),
    );
  }
}

