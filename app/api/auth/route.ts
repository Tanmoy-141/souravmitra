import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSessionToken,
  verifySessionToken,
  findUserByUsernameOrEmail,
  verifyPassword,
  hashPassword,
  verifyRecoveryCode,
  bootstrapAdminUserIfEmpty,
  createDbVerificationToken,
  verifyAndConsumeDbToken,
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

      // Check / bootstrap initial admin user if empty
      await bootstrapAdminUserIfEmpty();

      // Query real DB user
      const user = await findUserByUsernameOrEmail(identifier);

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid username or password" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      // If user has no password set (OAuth-only account)
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

      // Verify hashed password using constant-time PBKDF2 check
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

      // Generate cryptographically signed HMAC token containing DB user details
      const sessionToken = createSessionToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
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

      // Set secure HTTP-only cookie
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
    // ACTION: REQUEST USERNAME RECOVERY
    // ------------------------------------------------------------------
    if (action === "request-username-otp") {
      const email = (body.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json(
          { success: false, message: "Email is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      await bootstrapAdminUserIfEmpty();
      const user = await findUserByUsernameOrEmail(email);

      if (!user) {
        return NextResponse.json(
          { success: false, message: "No account found matching this email" },
          { status: 404, headers: rateLimitHeaders },
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Account verified. Please enter your recovery code.",
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

      if (!otp) {
        return NextResponse.json(
          { success: false, message: "Recovery code is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const isValidCode = verifyRecoveryCode(otp);
      if (!isValidCode) {
        return NextResponse.json(
          { success: false, message: "Invalid recovery code" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      const user = await findUserByUsernameOrEmail(email);
      return NextResponse.json(
        {
          success: true,
          username: user
            ? user.username
            : process.env.ADMIN_USERNAME || "admin",
          message: "Username retrieved successfully",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: REQUEST PASSWORD RESET OTP
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
          { success: false, message: "No account found with these details" },
          { status: 404, headers: rateLimitHeaders },
        );
      }

      return NextResponse.json(
        {
          success: true,
          message:
            "Verification initiated. Enter your recovery code to reset password.",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: VERIFY PASSWORD RESET OTP -> ISSUES RESET TOKEN
    // ------------------------------------------------------------------
    if (action === "verify-password-otp") {
      const otp = (body.otp || "").toString().trim();
      const identifier = (body.username || body.email || "").trim();

      if (!otp) {
        return NextResponse.json(
          { success: false, message: "Recovery code is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const isValidCode = verifyRecoveryCode(otp);
      if (!isValidCode) {
        return NextResponse.json(
          { success: false, message: "Invalid recovery code" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      const user = await findUserByUsernameOrEmail(identifier);
      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404, headers: rateLimitHeaders },
        );
      }

      // Generate single-use reset token in database
      const resetToken = await createDbVerificationToken(
        user.email,
        "password_reset",
        15, // valid for 15 minutes
      );

      return NextResponse.json(
        {
          success: true,
          resetToken,
          email: user.email,
          message: "Identity verified. You may now set a new password.",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: RESET PASSWORD (SAVES HASHED NEW PASSWORD TO DB)
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

      // Verify and consume token from DB
      const isTokenValid = await verifyAndConsumeDbToken(
        email,
        resetToken,
        "password_reset",
      );

      if (!isTokenValid) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired reset token" },
          { status: 401, headers: rateLimitHeaders },
        );
      }

      // Hash the new password with a fresh cryptographically secure salt
      const { hash, salt } = hashPassword(newPassword);

      await db
        .update(users)
        .set({
          passwordHash: hash,
          passwordSalt: salt,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));

      return NextResponse.json(
        {
          success: true,
          message:
            "Password updated successfully. Please log in with your new password.",
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
      { success: false, message: "Internal server error" },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}
