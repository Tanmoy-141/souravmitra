import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createSessionToken,
  resolveSession,
  findUserByUsernameOrEmail,
  verifyPassword,
  hashPassword,
  bootstrapAdminUserIfEmpty,
  createDbVerificationToken,
  verifyAndConsumeDbToken,
  revokeAllSessionsForUser,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { LoginSchema, RequestPasswordResetSchema, ConfirmPasswordResetSchema } from "@/lib/schemas";
import { ZodError } from "zod";

const RATE_LIMIT_CONFIG = {
  limit: 10, // Max 10 attempts per IP window
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// GET: Check current authentication status
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const result = await resolveSession(sessionCookie);

  if (!result.valid || !result.payload) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: result.payload.userId,
      username: result.payload.sub,
      email: result.payload.email,
      role: result.payload.role,
      expiresAt: result.payload.exp,
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
        const result = LoginSchema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { success: false, message: "Invalid input", errors: result.error.errors },
            { status: 400, headers: rateLimitHeaders },
          );
        }
        const { username, email, password } = result.data;
        const identifier = (username || email || "").trim();

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
              message: "Invalid username or password",
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
          sessionVersion: user.sessionVersion,
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
    // Single step — the email itself is the verification. No shared
    // "master" code, and the username is never returned in this response;
    // it only ever goes to the account's actual inbox.
    // ------------------------------------------------------------------
    if (action === "request-username-recovery") {
      const email = (body.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json(
          { success: false, message: "Email is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      await bootstrapAdminUserIfEmpty();
      const user = await findUserByUsernameOrEmail(email);

      if (user) {
        await sendEmail({
          to: user.email,
          subject: "Your username",
          text: `Your username is: ${user.username}`,
        });
      }

      // Same response whether or not a match was found — don't let this
      // endpoint be used to enumerate registered emails.
      return NextResponse.json(
        {
          success: true,
          message: "If an account matches, you'll receive an email with your username.",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: REQUEST PASSWORD RESET — step 1: emails a real per-request,
    // single-use, 15-minute code. Nothing is returned in this response.
    // ------------------------------------------------------------------
    if (action === "request-password-reset") {
      const identifier = (body.username || body.email || "").trim();
      if (!identifier) {
        return NextResponse.json(
          { success: false, message: "Username or email is required" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      await bootstrapAdminUserIfEmpty();
      const user = await findUserByUsernameOrEmail(identifier);

      if (user) {
        const code = await createDbVerificationToken(
          user.email,
          "password_reset",
          15, // minutes
        );
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes. If you didn't request this, you can ignore this email.`,
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: "If an account matches, you'll receive an email with a reset code.",
        },
        { headers: rateLimitHeaders },
      );
    }

    // ------------------------------------------------------------------
    // ACTION: CONFIRM PASSWORD RESET — step 2: submit the emailed code +
    // new password together. On success, every existing session for this
    // user is revoked, so a previously-compromised session can't survive
    // the password change.
    // ------------------------------------------------------------------
    if (action === "confirm-password-reset") {
      const identifier = (body.username || body.email || "").trim();
      const code = (body.code || "").toString().trim();
      const newPassword = body.newPassword || "";

      if (!identifier || !code || !newPassword) {
        return NextResponse.json(
          { success: false, message: "All fields are required" },
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

      const user = await findUserByUsernameOrEmail(identifier);
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired code" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const isTokenValid = await verifyAndConsumeDbToken(
        user.email,
        code,
        "password_reset",
      );

      if (!isTokenValid) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired code" },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const { hash, salt } = hashPassword(newPassword);

      await db
        .update(users)
        .set({
          passwordHash: hash,
          passwordSalt: salt,
          sessionVersion: sql`${users.sessionVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

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
