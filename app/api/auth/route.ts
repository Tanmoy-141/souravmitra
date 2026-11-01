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
} from "@/lib/auth";
import { isGoogleOAuthConfigured } from "@/lib/google-auth";
import { sendEmail } from "@/lib/email";
import {
  LoginSchema,
  RequestUsernameRecoverySchema,
  RequestPasswordResetSchema,
  ConfirmPasswordResetSchema,
} from "@/lib/schemas";

const RATE_LIMIT_CONFIG = {
  limit: 10, // Max 10 attempts per IP window
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// GET: Check current authentication status
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const result = await resolveSession(sessionCookie);
  const googleAuthAvailable = isGoogleOAuthConfigured();

  if (!result.valid || !result.payload) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      googleAuthAvailable,
    });
  }

  return NextResponse.json({
    authenticated: true,
    googleAuthAvailable,
    user: {
      id: result.payload.userId,
      username: result.payload.sub,
      email: result.payload.email,
      role: result.payload.role,
      expiresAt: result.payload.exp,
    },
  });
}

async function handleLogin(
  body: unknown,
  rateLimitHeaders: Record<string, string>,
): Promise<NextResponse> {
  const result = LoginSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid input",
        errors: result.error.issues,
      },
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

async function handleLogout(
  _body: unknown,
  rateLimitHeaders: Record<string, string>,
): Promise<NextResponse> {
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

async function handleRequestUsernameRecovery(
  body: unknown,
  rateLimitHeaders: Record<string, string>,
): Promise<NextResponse> {
  const result = RequestUsernameRecoverySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Email is required",
        errors: result.error.issues,
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const email = result.data.email.toLowerCase();
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
      message:
        "If an account matches, you'll receive an email with your username.",
    },
    { headers: rateLimitHeaders },
  );
}

async function handleRequestPasswordReset(
  body: unknown,
  rateLimitHeaders: Record<string, string>,
): Promise<NextResponse> {
  const result = RequestPasswordResetSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Username or email is required",
        errors: result.error.issues,
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const identifier = (result.data.username || result.data.email || "").trim();
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
      message:
        "If an account matches, you'll receive an email with a reset code.",
    },
    { headers: rateLimitHeaders },
  );
}

async function handleConfirmPasswordReset(
  body: unknown,
  rateLimitHeaders: Record<string, string>,
): Promise<NextResponse> {
  const result = ConfirmPasswordResetSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.error.issues[0]?.message || "All fields are required",
        errors: result.error.issues,
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const { username, email, code, newPassword } = result.data;
  const identifier = (username || email || "").trim();

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

const AUTH_HANDLERS: Record<
  string,
  (
    body: unknown,
    rateLimitHeaders: Record<string, string>,
  ) => Promise<NextResponse>
> = {
  login: handleLogin,
  logout: handleLogout,
  "request-username-recovery": handleRequestUsernameRecovery,
  "request-password-reset": handleRequestPasswordReset,
  "confirm-password-reset": handleConfirmPasswordReset,
};

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
    const body: unknown = await req.json();
    const actionKey =
      typeof body === "object" &&
      body !== null &&
      "action" in body &&
      typeof (body as Record<string, unknown>).action === "string"
        ? ((body as Record<string, unknown>).action as string)
        : "login";

    const handler = AUTH_HANDLERS[actionKey];
    if (!handler) {
      return NextResponse.json(
        { success: false, message: `Unknown action: ${actionKey}` },
        { status: 400, headers: rateLimitHeaders },
      );
    }

    return await handler(body, rateLimitHeaders);
  } catch {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}
