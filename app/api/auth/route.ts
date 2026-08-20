import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSessionToken,
  verifySessionWithRevocationCheck,
  findUserByUsernameOrEmail,
  verifyPassword,
  bootstrapAdminUserIfEmpty,
  createAndSendEmailOtp,
  verifyEmailOtp,
  createDbVerificationToken,
  resetPasswordAndRevokeSessions,
} from "@/lib/auth";

const RATE_LIMIT_CONFIG = {
  limit: 10, // Max 10 attempts per IP window
  windowMs: 15 * 60 * 1000, // 15 minutes
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

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName =
    name.length > 2
      ? `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`
      : `${name[0]}*`;
  return `${maskedName}@${domain}`;
}

// GET: Check current authentication status with active session revocation check
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const verification = await verifySessionWithRevocationCheck(sessionCookie);

  if (!verification.valid || !verification.payload) {
    const response = NextResponse.json({
      authenticated: false,
      user: null,
      error: verification.error,
    });

    if (sessionCookie && verification.error?.includes("revoked")) {
      response.cookies.set("admin_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: verification.payload.userId,
      username: verification.payload.sub,
      email: verification.payload.email,
      role: verification.payload.role,
      expiresAt: verification.payload.exp,
    },
  });
}

// POST: Handle authentication actions
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimitResult = await checkRateLimit(`auth:${ip}`, RATE_LIMIT_CONFIG);

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

    // ------------------------------------------------------------------
    // ACTION: LOGIN
    // ------------------------------------------------------------------
    if (action === "login") {
      const identifier = (body.username || body.email || "").trim();
      const password = body.password || "";

      if (!identifier || !password) {
        return NextResponse.json(
          {
            success: false,
            message: "Username/Email and password are required",
          },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      await bootstrapAdminUserIfEmpty();
      const user = await findUserByUsernameOrEmail(identifier);

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid username or password" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      if (!user.passwordHash || !user.passwordSalt) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This account was created via OAuth. Please sign in with your provider.",
          },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      const isValid = verifyPassword(
        password,
        user.passwordHash,
        user.passwordSalt,
      );

      if (!isValid) {
        return NextResponse.json(
          { success: false, message: "Invalid username or password" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      // Embed tokenVersion into signed HMAC session token
      const sessionToken = createSessionToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 1,
      });

      const response = NextResponse.json(
        {
          success: true,
          message: "Signed in successfully",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
        { headers: rateLimitHeaders },
      );

      response.cookies.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // ------------------------------------------------------------------
    // ACTION: LOGOUT
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // ACTION: REQUEST USERNAME RECOVERY (Real Email OTP)
    // ------------------------------------------------------------------
    if (action === "request-username-otp") {
      const email = (body.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json(
          { success: false, message: "Email address is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      await bootstrapAdminUserIfEmpty();
      const user = await findUserByUsernameOrEmail(email);

      // Prevent email enumeration while ensuring security
      if (!user) {
        return NextResponse.json(
          {
            success: true,
            message:
              "If an account exists with this email, a verification code has been sent.",
          },
          { headers: rateLimitHeaders },
        );
      }

      // Generate & send single-use OTP via real email
      await createAndSendEmailOtp(
        user.email,
        "username_recovery",
        "Username Recovery",
      );

      return NextResponse.json(
        {
          success: true,
          message:
            "A single-use verification code has been dispatched to your email address.",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: VERIFY USERNAME RECOVERY OTP
    // ------------------------------------------------------------------
    if (action === "verify-username-otp") {
      const otp = (body.otp || "").toString().trim();
      const email = (body.email || "").trim().toLowerCase();

      if (!otp || !email) {
        return NextResponse.json(
          {
            success: false,
            message: "Email and verification code are required",
          },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const otpResult = await verifyEmailOtp(email, otp, "username_recovery");
      if (!otpResult.valid) {
        return NextResponse.json(
          {
            success: false,
            message: otpResult.error || "Invalid or expired code",
          },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      const user = await findUserByUsernameOrEmail(email);
      return NextResponse.json(
        {
          success: true,
          username: user ? user.username : "admin",
          message: "Identity verified successfully",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: REQUEST PASSWORD RESET OTP (Real Email OTP)
    // ------------------------------------------------------------------
    if (action === "request-password-otp") {
      const identifier = (body.username || body.email || "").trim();
      if (!identifier) {
        return NextResponse.json(
          { success: false, message: "Username or email is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      await bootstrapAdminUserIfEmpty();
      const user = await findUserByUsernameOrEmail(identifier);

      if (!user) {
        return NextResponse.json(
          {
            success: true,
            message:
              "If an account exists, a single-use verification code has been sent.",
          },
          { headers: rateLimitHeaders },
        );
      }

      // Generate & send single-use OTP via real email
      await createAndSendEmailOtp(
        user.email,
        "password_reset",
        "Password Reset",
      );

      return NextResponse.json(
        {
          success: true,
          emailMasked: maskEmail(user.email),
          email: user.email,
          message: `A verification code has been sent to ${maskEmail(user.email)}.`,
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: VERIFY PASSWORD RESET OTP -> ISSUES SINGLE-USE RESET TOKEN
    // ------------------------------------------------------------------
    if (action === "verify-password-otp") {
      const otp = (body.otp || "").toString().trim();
      const email = (body.email || "").trim().toLowerCase();

      if (!otp || !email) {
        return NextResponse.json(
          {
            success: false,
            message: "Email and verification code are required",
          },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const otpResult = await verifyEmailOtp(email, otp, "password_reset");
      if (!otpResult.valid) {
        return NextResponse.json(
          {
            success: false,
            message: otpResult.error || "Invalid or expired code",
          },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      // Generate single-use reset token in database (15 minutes validity)
      const resetToken = await createDbVerificationToken(
        email,
        "password_reset",
        15,
      );

      return NextResponse.json(
        {
          success: true,
          resetToken,
          email,
          message: "Code verified. Please enter your new password.",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: RESET PASSWORD & REVOKE SESSIONS
    // ------------------------------------------------------------------
    if (action === "reset-password") {
      const email = (body.email || "").trim().toLowerCase();
      const resetToken = body.resetToken || "";
      const newPassword = body.newPassword || "";

      if (!email || !resetToken || !newPassword) {
        return NextResponse.json(
          { success: false, message: "Missing required reset parameters" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          {
            success: false,
            message: "Password must be at least 8 characters long",
          },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      // Validates resetToken, updates password hash, and bumps tokenVersion
      const resetResult = await resetPasswordAndRevokeSessions(
        email,
        resetToken,
        newPassword,
      );

      if (!resetResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: resetResult.error || "Failed to reset password",
          },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      // Clear any current browser session cookie so user re-authenticates with fresh token
      const response = NextResponse.json(
        {
          success: true,
          message:
            "Password updated successfully. All active sessions have been revoked. Please log in with your new password.",
        },
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

    return NextResponse.json(
      { success: false, message: `Unknown action: ${action}` },
      { status: 400, headers: rateLimitHeaders },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}
