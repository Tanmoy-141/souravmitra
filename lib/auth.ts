import crypto from "crypto";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens, type User } from "@/db/schema";
import { sendOtpEmail } from "@/lib/email";

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is missing. Please set AUTH_SECRET in your environment.",
    );
  }
  return secret;
}

export interface SessionPayload {
  userId: string;
  sub: string; // username
  role: "owner" | "admin";
  email: string;
  v: number; // token/session version for instant revocation
  iat: number;
  exp: number;
  nonce: string;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

function computeHmacSignature(data: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("base64url");
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token embedding the user's current tokenVersion.
 */
export function createSessionToken(
  user: {
    id: string;
    username: string;
    email: string;
    role: "owner" | "admin";
    tokenVersion?: number;
  },
  durationDays = 7,
): string {
  const secret = getAuthSecret();
  const now = Date.now();
  const exp = now + durationDays * 24 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(16).toString("hex");

  const payload: SessionPayload = {
    userId: user.id,
    sub: user.username,
    email: user.email,
    role: user.role,
    v: user.tokenVersion ?? 1,
    iat: now,
    exp,
    nonce,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = computeHmacSignature(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the cryptographic HMAC signature and expiration of a session token.
 */
export function verifySessionToken(token: string | undefined | null): {
  valid: boolean;
  payload?: SessionPayload;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing token" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed token format" };
  }

  const [encodedPayload, signature] = parts;
  let secret: string;
  try {
    secret = getAuthSecret();
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "AUTH_SECRET not configured",
    };
  }

  const expectedSignature = computeHmacSignature(encodedPayload, secret);

  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, error: "Invalid signature" };
  }

  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(rawPayload);

    if (!payload.userId || !payload.sub || !payload.exp) {
      return { valid: false, error: "Invalid token payload" };
    }

    if (Date.now() > payload.exp) {
      return { valid: false, error: "Session token expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Failed to parse payload" };
  }
}

/**
 * Verifies the token signature AND verifies against the database that the session
 * has not been revoked (via password change or version bump).
 */
export async function verifySessionWithRevocationCheck(
  token: string | undefined | null,
): Promise<{
  valid: boolean;
  user?: User;
  payload?: SessionPayload;
  error?: string;
}> {
  const syncResult = verifySessionToken(token);
  if (!syncResult.valid || !syncResult.payload) {
    return { valid: false, error: syncResult.error || "Invalid session" };
  }

  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, syncResult.payload.userId))
      .limit(1);

    if (dbUsers.length === 0) {
      return { valid: false, error: "User no longer exists" };
    }

    const user = dbUsers[0];
    const currentVersion = user.tokenVersion ?? 1;
    const tokenVersion = syncResult.payload.v ?? 1;

    if (tokenVersion !== currentVersion) {
      return {
        valid: false,
        error:
          "Session has been revoked (password was changed). Please log in again.",
      };
    }

    return { valid: true, user, payload: syncResult.payload };
  } catch {
    // If DB check fails transiently, fall back to valid cryptographic signature
    return { valid: true, payload: syncResult.payload };
  }
}

/**
 * Performs a timing-safe string equality check.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Hashes a plaintext password using PBKDF2-HMAC-SHA512 with a cryptographically secure salt.
 */
export function hashPassword(
  password: string,
  existingSalt?: string,
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const iterations = 100_000;
  const keylen = 64;
  const digest = "sha512";

  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    keylen,
    digest,
  );
  const hash = derivedKey.toString("hex");

  return { hash, salt };
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash using constant-time comparison.
 */
export function verifyPassword(
  attempt: string,
  storedHash: string,
  salt: string,
): boolean {
  const { hash: computedHash } = hashPassword(attempt, salt);
  return timingSafeEqualString(computedHash, storedHash);
}

/**
 * Queries the database for a user matching username or email.
 */
export async function findUserByUsernameOrEmail(
  identifier: string,
): Promise<User | null> {
  const trimmed = identifier.trim().toLowerCase();
  const results = await db
    .select()
    .from(users)
    .where(or(eq(users.username, trimmed), eq(users.email, trimmed)))
    .limit(1);

  return results[0] || null;
}

/**
 * Ensures an initial admin exists in the database.
 * If the users table is completely empty, it securely hashes the environment ADMIN_PASSWORD
 * and creates the first owner record.
 */
export async function bootstrapAdminUserIfEmpty(): Promise<User | null> {
  try {
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return null;
    }

    const { hash, salt } = hashPassword(adminPassword);

    const [newUser] = await db
      .insert(users)
      .values({
        username: adminUsername.toLowerCase(),
        email: adminEmail.toLowerCase(),
        passwordHash: hash,
        passwordSalt: salt,
        role: "owner",
        tokenVersion: 1,
      })
      .returning();

    return newUser;
  } catch (err) {
    console.error("[Auth] Database bootstrap check warning:", err);
    return null;
  }
}

/**
 * Generates and dispatches a single-use 6-digit expiring email OTP code.
 * The code is hashed before storage in the database.
 */
export async function createAndSendEmailOtp(
  email: string,
  type: "password_reset" | "username_recovery" | "email_verify",
  purpose: "Password Reset" | "Username Recovery" | "Email Verification",
): Promise<{ success: boolean; error?: string }> {
  // Generate random 6-digit numeric OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = crypto.createHash("sha256").update(rawOtp).digest("hex");

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // Invalidate any previously unconsumed OTPs for this identifier and type
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.identifier, email.trim().toLowerCase()));

  // Store hashed OTP
  await db.insert(verificationTokens).values({
    identifier: email.trim().toLowerCase(),
    tokenHash,
    type,
    expiresAt,
  });

  // Dispatch email to user's inbox
  return await sendOtpEmail({
    to: email.trim().toLowerCase(),
    otpCode: rawOtp,
    purpose,
  });
}

/**
 * Verifies and consumes a 6-digit OTP code against the database.
 */
export async function verifyEmailOtp(
  email: string,
  rawOtp: string,
  type: "password_reset" | "username_recovery" | "email_verify",
): Promise<{ valid: boolean; error?: string }> {
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawOtp.trim())
    .digest("hex");

  const records = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, email.trim().toLowerCase()))
    .limit(10);

  const validRecord = records.find(
    (r) =>
      r.type === type &&
      !r.consumedAt &&
      r.expiresAt > new Date() &&
      timingSafeEqualString(r.tokenHash, tokenHash),
  );

  if (!validRecord) {
    return { valid: false, error: "Invalid or expired verification code" };
  }

  // Mark OTP as consumed
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, validRecord.id));

  return { valid: true };
}

/**
 * Generates and stores a single-use password reset token in the database.
 */
export async function createDbVerificationToken(
  identifier: string,
  type: "password_reset" | "username_recovery" | "email_verify",
  durationMinutes = 15,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  await db.insert(verificationTokens).values({
    identifier: identifier.trim().toLowerCase(),
    tokenHash,
    type,
    expiresAt,
  });

  return rawToken;
}

/**
 * Verifies, consumes a reset token, updates the user's password, and increments tokenVersion
 * to instantly revoke all active sessions across all devices.
 */
export async function resetPasswordAndRevokeSessions(
  email: string,
  rawToken: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const records = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, email.trim().toLowerCase()))
    .limit(10);

  const validRecord = records.find(
    (r) =>
      r.type === "password_reset" &&
      !r.consumedAt &&
      r.expiresAt > new Date() &&
      timingSafeEqualString(r.tokenHash, tokenHash),
  );

  if (!validRecord) {
    return { success: false, error: "Invalid or expired reset token" };
  }

  // Mark token as consumed
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, validRecord.id));

  const user = await findUserByUsernameOrEmail(email);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const { hash, salt } = hashPassword(newPassword);
  const nextTokenVersion = (user.tokenVersion ?? 1) + 1;

  // Update password and increment tokenVersion (revokes all active sessions)
  await db
    .update(users)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      tokenVersion: nextTokenVersion,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return { success: true };
}

/**
 * Backward compatibility: verifies single-use DB token.
 */
export async function verifyAndConsumeDbToken(
  identifier: string,
  rawToken: string,
  type: "password_reset" | "username_recovery" | "email_verify",
): Promise<boolean> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const records = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, identifier.trim().toLowerCase()))
    .limit(10);

  const validRecord = records.find(
    (r) =>
      r.type === type &&
      !r.consumedAt &&
      r.expiresAt > new Date() &&
      timingSafeEqualString(r.tokenHash, tokenHash),
  );

  if (!validRecord) {
    return false;
  }

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, validRecord.id));

  return true;
}

/**
 * Backward compatibility: verifies recovery code against RECOVERY_CODE environment variable if configured.
 */
export function verifyRecoveryCode(candidateCode: string): boolean {
  const configuredCode = process.env.RECOVERY_CODE;
  if (!configuredCode || !candidateCode) {
    return false;
  }
  return timingSafeEqualString(candidateCode.trim(), configuredCode.trim());
}
