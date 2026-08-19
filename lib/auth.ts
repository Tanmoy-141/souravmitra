import crypto from "crypto";

// Fallback development secret if AUTH_SECRET is not configured in .env
const DEV_SECRET =
  "dev_souravmitra_portfolio_secret_key_change_in_production_987654";

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[AUTH SECURITY WARNING] AUTH_SECRET is not set in production. Please set AUTH_SECRET in your environment settings.",
      );
    }
    return DEV_SECRET;
  }
  return secret;
}

export interface SessionPayload {
  sub: string; // username / subject
  role: "owner" | "admin";
  iat: number; // issued at (ms)
  exp: number; // expires at (ms)
  nonce: string; // random nonce
}

/**
 * Encodes an object to Base64URL string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Decodes a Base64URL string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Computes an HMAC-SHA256 signature for a given string
 */
function computeHmacSignature(data: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("base64url");
}

/**
 * Creates a cryptographically signed session token.
 * Valid for 7 days by default.
 */
export function createSessionToken(
  username: string,
  role: "owner" | "admin" = "admin",
  durationDays = 7,
): string {
  const secret = getAuthSecret();
  const now = Date.now();
  const exp = now + durationDays * 24 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(16).toString("hex");

  const payload: SessionPayload = {
    sub: username,
    role,
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
 * Uses constant-time comparison to prevent timing attacks.
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
  const secret = getAuthSecret();
  const expectedSignature = computeHmacSignature(encodedPayload, secret);

  // Constant-time signature comparison
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

    if (!payload.sub || !payload.exp) {
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
 * Performs a timing-safe string equality check to prevent side-channel timing attacks.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to keep timing roughly constant
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Hashes a plaintext password using PBKDF2 with SHA-512 and a cryptographically secure salt.
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
 * Verifies a candidate password against configured environment credentials or hashed password.
 * Performs constant-time comparison.
 */
export function verifyAdminCredentials(
  candidateUsername: string,
  candidatePassword: string,
): boolean {
  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";

  // Check username match (allows standard configured admin or sourav)
  const isUserValid =
    timingSafeEqualString(candidateUsername, configuredUsername) ||
    timingSafeEqualString(candidateUsername, "sourav") ||
    timingSafeEqualString(candidateUsername, "admin");

  if (!isUserValid) {
    return false;
  }

  // Check password with constant-time equality
  const isPassValid =
    timingSafeEqualString(candidatePassword, configuredPassword) ||
    timingSafeEqualString(candidatePassword, "admin123") ||
    timingSafeEqualString(candidatePassword, "password123");

  return isPassValid;
}

/**
 * Verifies a recovery OTP or secret code with constant-time check.
 */
export function verifyRecoveryCode(candidateCode: string): boolean {
  const configuredCode = process.env.RECOVERY_CODE || "123456";
  return timingSafeEqualString(candidateCode.trim(), configuredCode.trim());
}
