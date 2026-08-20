import crypto from "crypto";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens, type User } from "@/db/schema";

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
  iat: number;
  exp: number;
  nonce: string;
  sessionVersion: number;
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
 * Creates a cryptographically signed HMAC-SHA256 session token.
 */
export function createSessionToken(
  user: {
    id: string;
    username: string;
    email: string;
    role: "owner" | "admin";
    sessionVersion: number;
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
    iat: now,
    exp,
    nonce,
    sessionVersion: user.sessionVersion,
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
 * Full session check: cryptographic validity + expiry (via
 * verifySessionToken) PLUS a live DB check that the token's embedded
 * sessionVersion still matches the user's current one. A signature-valid,
 * unexpired token can still be rejected here if it's been revoked (e.g. by
 * a password reset) — that DB check is the only way to actually revoke a
 * stateless signed token before its natural expiry.
 */
export async function resolveSession(
  token: string | undefined | null,
): Promise<{ valid: boolean; payload?: SessionPayload; user?: User }> {
  const verification = verifySessionToken(token);
  if (!verification.valid || !verification.payload) {
    return { valid: false };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, verification.payload.userId))
    .limit(1);

  if (!user) {
    return { valid: false };
  }

  if (user.sessionVersion !== verification.payload.sessionVersion) {
    // Password was reset (or sessions were otherwise revoked) after this
    // token was issued — treat it as invalid even though the signature
    // and expiry both still check out.
    return { valid: false };
  }

  return { valid: true, payload: verification.payload, user };
}

/**
 * Invalidates every session currently issued for a user by bumping their
 * sessionVersion — any token signed before this call will fail
 * resolveSession's live check from now on, regardless of its expiry.
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
}


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
      })
      .returning();

    return newUser;
  } catch (err) {
    console.error("[Auth] Database bootstrap check warning:", err);
    return null;
  }
}

/**
 * Generates and stores a single-use verification or password reset token in the database.
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
 * Verifies and consumes a single-use token from the verificationTokens table.
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

  // Mark token as consumed
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, validRecord.id));

  return true;
}
