import crypto from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq, and } from "drizzle-orm";
import { users, accounts, type User } from "@/db/schema";

export const GOOGLE_OAUTH_COOKIE_NAME = "oauth_flow_state";

export function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in the environment.");
  }
  return clientId;
}

export function getGoogleClientSecret(): string {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_SECRET is not configured in the environment.",
    );
  }
  return clientSecret;
}

export function getGoogleRedirectUri(): string {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (redirectUri) {
    return redirectUri;
  }
  // Safe local default for development
  return "http://localhost:3000/api/auth/google/callback";
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export interface OAuthFlowData {
  state: string;
  codeVerifier: string;
  nonce: string;
  exp: number;
}

/**
 * Generates cryptographic state, PKCE code verifier/challenge, and OIDC nonce.
 */
export function generateOAuthFlow(): {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
} {
  const state = crypto.randomBytes(32).toString("hex");
  const pkceEntropy = crypto.randomBytes(32).toString("base64url");
  // codeql[js/insufficient-password-hash] RFC 7636 PKCE specifies SHA-256 for code_challenge derivation from code_verifier, not password hashing.
  const codeChallenge = crypto
    .createHash("sha256")
    .update(pkceEntropy)
    .digest("base64url");
  const nonce = crypto.randomBytes(32).toString("hex");

  return { state, codeVerifier: pkceEntropy, codeChallenge, nonce };
}

/**
 * Builds the Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthUrl(flow: {
  state: string;
  codeChallenge: string;
  nonce: string;
}): string {
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    code_challenge: flow.codeChallenge,
    code_challenge_method: "S256",
    nonce: flow.nonce,
    access_type: "online",
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Serializes and signs the OAuth flow data with HMAC-SHA256 into a cookie string.
 */
export function packAndSignFlowCookie(
  data: Omit<OAuthFlowData, "exp">,
  signingKey: string,
  ttlMs = 10 * 60 * 1000,
): string {
  const exp = Date.now() + ttlMs;
  const payload: OAuthFlowData = { ...data, exp };
  const json = JSON.stringify(payload);
  const encodedPayload = Buffer.from(json).toString("base64url");

  // codeql[js/insufficient-password-hash] HMAC-SHA256 integrity signature for flow cookie verification, not password hashing.
  const hmac = crypto.createHmac("sha256", signingKey);
  hmac.update(encodedPayload);
  const signature = hmac.digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes the HMAC-signed flow cookie.
 */
export function verifyAndUnpackFlowCookie(
  rawCookie: string | undefined | null,
  signingKey: string,
): OAuthFlowData | null {
  if (!rawCookie || typeof rawCookie !== "string") {
    return null;
  }

  const parts = rawCookie.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  // codeql[js/insufficient-password-hash] HMAC-SHA256 integrity signature for flow cookie verification, not password hashing.
  const hmac = crypto.createHmac("sha256", signingKey);
  hmac.update(encodedPayload);
  const expectedSignature = hmac.digest("base64url");

  const sigBuffer = Buffer.from(signature, "utf8");
  const expBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    sigBuffer.length !== expBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expBuffer)
  ) {
    return null;
  }

  try {
    const rawJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed: OAuthFlowData = JSON.parse(rawJson);

    if (
      !parsed.state ||
      !parsed.codeVerifier ||
      !parsed.nonce ||
      !parsed.exp ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Exchanges authorization code and PKCE code_verifier for Google tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<{ id_token: string; access_token?: string }> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleRedirectUri();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to exchange authorization code: ${response.status} ${errorText}`,
    );
  }

  const tokenData = await response.json();
  if (!tokenData.id_token || typeof tokenData.id_token !== "string") {
    throw new Error("Google token response did not contain an id_token.");
  }

  return tokenData;
}

// Cached Google JWKS client
let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getGoogleJwks() {
  if (!googleJwks) {
    googleJwks = createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs"),
    );
  }
  return googleJwks;
}

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Cryptographically verifies Google ID Token signature and claims against Google's JWKS.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<GoogleIdTokenClaims> {
  const clientId = getGoogleClientId();
  const jwks = getGoogleJwks();

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("ID token is missing a valid 'sub' subject claim.");
  }

  if (!payload.email || typeof payload.email !== "string") {
    throw new Error("ID token is missing a valid 'email' claim.");
  }

  if (payload.nonce !== expectedNonce) {
    throw new Error("ID token nonce does not match the session nonce.");
  }

  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

export type ResolveLoginResult =
  | { success: true; user: User }
  | {
      success: false;
      code: "UNVERIFIED_EMAIL" | "UNAUTHORIZED" | "ACCOUNT_CONFLICT";
      message: string;
    };

/**
 * Pure database account resolver:
 * Matches existing accounts by Google `sub` (providerAccountId),
 * or links pre-existing user by verified email on first sign-in.
 * Never inserts new users.
 */
export async function resolveGoogleLogin(claims: {
  sub: string;
  email: string;
  emailVerified: boolean;
}): Promise<ResolveLoginResult> {
  if (!claims.emailVerified) {
    return {
      success: false,
      code: "UNVERIFIED_EMAIL",
      message: "Google email address is not verified.",
    };
  }

  const { db } = await import("@/db");
  const normalizedEmail = claims.email.trim().toLowerCase();

  // 1. Check if Google sub is already linked in accounts table
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "google"),
        eq(accounts.providerAccountId, claims.sub),
      ),
    )
    .limit(1);

  if (existingAccount) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingAccount.userId))
      .limit(1);

    if (user) {
      return { success: true, user };
    }
  }

  // 2. Not linked by sub yet: check if pre-provisioned user exists by email
  const [userByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!userByEmail) {
    // Closed-access policy: Do NOT auto-register unknown Google accounts
    return {
      success: false,
      code: "UNAUTHORIZED",
      message: "This Google account is not authorized to access the CMS.",
    };
  }

  // 3. Link this Google sub to the existing user
  try {
    await db.insert(accounts).values({
      userId: userByEmail.id,
      provider: "google",
      providerAccountId: claims.sub,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    return { success: true, user: userByEmail };
  } catch (error: unknown) {
    // Catch PostgreSQL unique violation (code 23505) in case of simultaneous first sign-ins
    const isUniqueViolation =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505";

    if (isUniqueViolation) {
      const [raceAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, "google"),
            eq(accounts.providerAccountId, claims.sub),
          ),
        )
        .limit(1);

      if (raceAccount && raceAccount.userId === userByEmail.id) {
        return { success: true, user: userByEmail };
      }

      return {
        success: false,
        code: "ACCOUNT_CONFLICT",
        message: "This Google identity is already linked to another account.",
      };
    }

    throw error;
  }
}
