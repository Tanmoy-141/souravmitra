import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSessionToken,
  verifySessionToken,
  verifyAdminCredentials,
  verifyRecoveryCode,
} from "@/lib/auth";

const RATE_LIMIT_CONFIG = {
  limit: 10, // Max 10 attempts per IP window
  windowMs: 15 * 60 * 1000,
};

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

// GET: Check current authentication status
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const verification = verifySessionToken(sessionCookie);

  if (!verification.valid || !verification.payload) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: verification.payload.sub,
      role: verification.payload.role,
      expiresAt: verification.payload.exp,
    },
  });
}

// POST: Handle authentication actions
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = checkRateLimit(`auth:${ip}`, RATE_LIMIT_CONFIG);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": rateLimitResult.limit.toString(),
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": rateLimitResult.reset.toString(),
  };

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many attempts. Please try again in 15 minutes.",
        message: "Too many attempts. Please try again in 15 minutes.",
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": Math.max(
            1,
            rateLimitResult.reset - Math.ceil(Date.now() / 1000),
          ).toString(),
        },
      },
    );
  }

  try {
    const body = await req.json();
    const action = body.action || "login";
    const configuredUsername = process.env.ADMIN_USERNAME || "admin";
    const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (action === "login") {
      const username = (body.username || "").trim();
      const password = body.password || "";

      if (!username || !password) {
        return NextResponse.json(
          { success: false, message: "Username and password are required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const isValid = verifyAdminCredentials(username, password);

      if (!isValid) {
        return NextResponse.json(
          { success: false, message: "Invalid username or password" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      // Generate cryptographically signed HMAC token
      const sessionToken = createSessionToken(username, "admin");

      const response = NextResponse.json(
        {
          success: true,
          message: "Signed in successfully",
          user: { username, role: "admin" },
        },
        { headers: rateLimitHeaders },
      );

      // Set signed session cookie
      response.cookies.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    if (action === "logout") {
      const response = NextResponse.json(
        { success: true, message: "Logged out successfully" },
        { headers: rateLimitHeaders },
      );
      response.cookies.set("admin_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (action === "request-username-otp") {
      return NextResponse.json(
        {
          success: true,
          message: "Recovery verification initiated. Enter your recovery code.",
        },
        { headers: rateLimitHeaders },
      );
    }

    if (action === "request-password-otp") {
      return NextResponse.json(
        {
          success: true,
          message: "Recovery verification initiated. Enter your recovery code.",
        },
        { headers: rateLimitHeaders },
      );
    }

    if (action === "verify-username-otp") {
      const otp = (body.otp || "").toString();
      if (!otp) {
        return NextResponse.json(
          { success: false, message: "Recovery code is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      if (!verifyRecoveryCode(otp)) {
        return NextResponse.json(
          { success: false, message: "Invalid recovery code" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      return NextResponse.json(
        {
          success: true,
          username: configuredUsername,
          message: "Username verified successfully",
        },
        { headers: rateLimitHeaders },
      );
    }

    if (action === "verify-password-otp") {
      const otp = (body.otp || "").toString();
      if (!otp) {
        return NextResponse.json(
          { success: false, message: "Recovery code is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      if (!verifyRecoveryCode(otp)) {
        return NextResponse.json(
          { success: false, message: "Invalid recovery code" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      return NextResponse.json(
        {
          success: true,
          password: configuredPassword,
          message: "Password verified successfully",
        },
        { headers: rateLimitHeaders },
      );
    }

    return NextResponse.json(
      { success: false, message: `Unknown action: ${action}` },
      { status: 400, headers: rateLimitHeaders },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Malformed request" },
      { status: 400, headers: rateLimitHeaders },
    );
  }
}
