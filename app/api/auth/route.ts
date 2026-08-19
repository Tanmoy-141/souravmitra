import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_CONFIG = {
  limit: 5, // Max 5 login attempts
  windowMs: 15 * 60 * 1000, // 15-minute window
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
        error: "Too many login attempts. Please try again in 15 minutes.",
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
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin password not configured on server" },
        { status: 500, headers: rateLimitHeaders },
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401, headers: rateLimitHeaders },
      );
    }

    const response = NextResponse.json(
      { success: true },
      { headers: rateLimitHeaders },
    );

    // Set secure admin session cookie
    response.cookies.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400, headers: rateLimitHeaders },
    );
  }
}
