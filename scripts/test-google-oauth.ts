import crypto from "crypto";
import {
  generateOAuthFlow,
  buildGoogleAuthUrl,
  packAndSignFlowCookie,
  verifyAndUnpackFlowCookie,
} from "../lib/google-auth";

async function runUnitTests() {
  console.log("==================================================================");
  console.log("  GOOGLE OAUTH UNIT & CRYPTOGRAPHY TEST SUITE                    ");
  console.log("==================================================================");

  const testSecret = "test_super_secret_auth_key_1234567890abcdef";

  // Test 1: Flow Generation & PKCE
  console.log("\n[TEST 1] PKCE, State, and Nonce Generation...");
  const flow = generateOAuthFlow();
  if (!flow.state || flow.state.length !== 64) {
    throw new Error(`State must be 64-char hex string, got: ${flow.state.length}`);
  }
  if (!flow.nonce || flow.nonce.length !== 64) {
    throw new Error(`Nonce must be 64-char hex string, got: ${flow.nonce.length}`);
  }
  if (!flow.codeVerifier || flow.codeVerifier.length < 32) {
    throw new Error("codeVerifier too short");
  }

  // Verify codeChallenge is valid SHA-256 base64url of codeVerifier
  const expectedChallenge = crypto
    .createHash("sha256")
    .update(flow.codeVerifier)
    .digest("base64url");
  if (flow.codeChallenge !== expectedChallenge) {
    throw new Error("codeChallenge does not match SHA-256 of codeVerifier");
  }
  console.log("  ✓ PKCE, state, and nonce cryptography verified.");

  // Test 2: Auth URL Construction
  console.log("\n[TEST 2] Google Authorization URL Construction...");
  process.env.GOOGLE_CLIENT_ID = "mock-client-id-12345.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret-999";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";

  const authUrlStr = buildGoogleAuthUrl(flow);
  const authUrl = new URL(authUrlStr);

  if (authUrl.origin !== "https://accounts.google.com") {
    throw new Error(`Invalid URL origin: ${authUrl.origin}`);
  }
  if (authUrl.searchParams.get("client_id") !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("client_id mismatch in auth URL");
  }
  if (authUrl.searchParams.get("redirect_uri") !== process.env.GOOGLE_REDIRECT_URI) {
    throw new Error("redirect_uri mismatch in auth URL");
  }
  if (authUrl.searchParams.get("state") !== flow.state) {
    throw new Error("state mismatch in auth URL");
  }
  if (authUrl.searchParams.get("code_challenge") !== flow.codeChallenge) {
    throw new Error("code_challenge mismatch in auth URL");
  }
  if (authUrl.searchParams.get("code_challenge_method") !== "S256") {
    throw new Error("code_challenge_method must be S256");
  }
  if (authUrl.searchParams.get("nonce") !== flow.nonce) {
    throw new Error("nonce mismatch in auth URL");
  }
  console.log("  ✓ Google Authorization URL query parameters verified.");

  // Test 3: Signed Cookie Packing, Verification, and Tampering
  console.log("\n[TEST 3] Signed Flow Cookie Tampering & Expiry...");
  const signedCookie = packAndSignFlowCookie(
    {
      state: flow.state,
      codeVerifier: flow.codeVerifier,
      nonce: flow.nonce,
    },
    testSecret,
  );

  const unpacked = verifyAndUnpackFlowCookie(signedCookie, testSecret);
  if (!unpacked) {
    throw new Error("Failed to unpack valid signed cookie");
  }
  if (unpacked.state !== flow.state || unpacked.nonce !== flow.nonce) {
    throw new Error("Unpacked cookie values do not match original flow data");
  }
  console.log("  ✓ Valid flow cookie successfully verified and unpacked.");

  // Tamper signature
  const tamperedSig = signedCookie.slice(0, -4) + "AAAA";
  const tamperedResult = verifyAndUnpackFlowCookie(tamperedSig, testSecret);
  if (tamperedResult !== null) {
    throw new Error("Tampered signature was accepted!");
  }
  console.log("  ✓ Tampered signature rejected cleanly.");

  // Tamper payload
  const parts = signedCookie.split(".");
  const tamperedPayload = "xyz" + parts[0].slice(3) + "." + parts[1];
  const tamperedPayloadResult = verifyAndUnpackFlowCookie(tamperedPayload, testSecret);
  if (tamperedPayloadResult !== null) {
    throw new Error("Tampered payload was accepted!");
  }
  console.log("  ✓ Tampered payload rejected cleanly.");

  // Expired cookie
  const expiredCookie = packAndSignFlowCookie(
    {
      state: flow.state,
      codeVerifier: flow.codeVerifier,
      nonce: flow.nonce,
    },
    testSecret,
    -1000, // already expired
  );
  const expiredResult = verifyAndUnpackFlowCookie(expiredCookie, testSecret);
  if (expiredResult !== null) {
    throw new Error("Expired cookie was accepted!");
  }
  console.log("  ✓ Expired cookie rejected cleanly.");

  console.log("\n==================================================================");
  console.log("  ALL UNIT & CRYPTOGRAPHY TESTS PASSED (8/8)                      ");
  console.log("==================================================================");
}

async function runDatabaseTests() {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    console.log("\n[NOTE] TEST_DATABASE_URL not set — skipping live DB integration tests.");
    console.log("To run DB tests against Neon test branch: TEST_DATABASE_URL=... npx tsx scripts/test-google-oauth.ts");
    return;
  }

  console.log("\n==================================================================");
  console.log("  GOOGLE OAUTH DATABASE INTEGRATION TEST SUITE (Neon Test Branch)  ");
  console.log("==================================================================");

  // Set DATABASE_URL to TEST_DATABASE_URL before loading db
  process.env.DATABASE_URL = testDbUrl;
  const { db } = await import("../db");
  const { users, accounts } = await import("../db/schema");
  const { eq, and } = await import("drizzle-orm");
  const { resolveGoogleLogin } = await import("../lib/google-auth");
  const { createSessionToken, resolveSession, revokeAllSessionsForUser } = await import("../lib/auth");

  const testEmail = `test_oauth_${Date.now()}@example.com`;
  const testSub = `google_sub_${Date.now()}`;

  try {
    // DB Test 1: Unverified email rejected
    console.log("\n[DB TEST 1] Unverified Email Rejection...");
    const unverifiedResult = await resolveGoogleLogin({
      sub: testSub,
      email: testEmail,
      emailVerified: false,
    });
    if (unverifiedResult.success || unverifiedResult.code !== "UNVERIFIED_EMAIL") {
      throw new Error(`Expected UNVERIFIED_EMAIL, got: ${JSON.stringify(unverifiedResult)}`);
    }
    console.log("  ✓ Unverified Google email rejected.");

    // DB Test 2: Unknown email rejected (Closed access)
    console.log("\n[DB TEST 2] Unknown Unauthorized Email Rejection (No User Creation)...");
    const unauthorizedResult = await resolveGoogleLogin({
      sub: testSub,
      email: testEmail,
      emailVerified: true,
    });
    if (unauthorizedResult.success || unauthorizedResult.code !== "UNAUTHORIZED") {
      throw new Error(`Expected UNAUTHORIZED, got: ${JSON.stringify(unauthorizedResult)}`);
    }

    const [shouldNotExist] = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
    if (shouldNotExist) {
      throw new Error("SECURITY FAILURE: Unknown Google email created a new user!");
    }
    console.log("  ✓ Unauthorized Google email rejected and no account created.");

    // DB Test 3: Pre-provisioned user links Google sub on first login
    console.log("\n[DB TEST 3] First-Time Account Linking for Pre-Provisioned User...");
    const [createdUser] = await db.insert(users).values({
      username: `test_user_${Date.now()}`,
      email: testEmail,
      role: "admin",
      passwordHash: null,
      passwordSalt: null,
    }).returning();

    const linkResult = await resolveGoogleLogin({
      sub: testSub,
      email: testEmail,
      emailVerified: true,
    });
    if (!linkResult.success || linkResult.user.id !== createdUser.id) {
      throw new Error("Failed to link pre-existing user on first login");
    }

    const [linkedAccount] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, testSub)))
      .limit(1);

    if (!linkedAccount || linkedAccount.userId !== createdUser.id) {
      throw new Error("Linked account not found in accounts table");
    }
    if (linkedAccount.accessToken !== null || linkedAccount.refreshToken !== null) {
      throw new Error("Google access/refresh tokens should not be stored");
    }
    console.log("  ✓ First-time Google login successfully linked sub to pre-provisioned user.");

    // DB Test 4: Subsequent login finds by sub
    console.log("\n[DB TEST 4] Subsequent Sign-In Lookup by Sub...");
    const subResult = await resolveGoogleLogin({
      sub: testSub,
      email: "different_email_ignored@gmail.com", // should match by sub first
      emailVerified: true,
    });
    if (!subResult.success || subResult.user.id !== createdUser.id) {
      throw new Error("Subsequent login by sub failed");
    }

    const allLinkedAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, testSub)));
    if (allLinkedAccounts.length !== 1) {
      throw new Error("Duplicate accounts created for same sub");
    }
    console.log("  ✓ Subsequent login matched by sub without duplicating accounts.");

    // DB Test 5: Session Token & Revocation
    console.log("\n[DB TEST 5] CMS Session Token Issuance & Revocation...");
    process.env.AUTH_SECRET = "test_super_secret_auth_key_1234567890abcdef";
    const sessionToken = createSessionToken(linkResult.user);
    const resolvedBefore = await resolveSession(sessionToken);
    if (!resolvedBefore.valid || !resolvedBefore.user) {
      throw new Error("Issued session token failed initial resolution");
    }
    console.log("  ✓ Valid HMAC session token verified.");

    await revokeAllSessionsForUser(createdUser.id);
    const resolvedAfter = await resolveSession(sessionToken);
    if (resolvedAfter.valid) {
      throw new Error("Session token was still valid after sessionVersion increment!");
    }
    console.log("  ✓ Session token revoked successfully when sessionVersion incremented.");

    console.log("\n==================================================================");
    console.log("  ALL DATABASE INTEGRATION TESTS PASSED (5/5)                     ");
    console.log("==================================================================");
  } finally {
    // Cleanup test data
    console.log("\nCleaning up test records...");
    await db.delete(accounts).where(eq(accounts.providerAccountId, testSub));
    await db.delete(users).where(eq(users.email, testEmail));
    console.log("Cleanup complete.");
  }
}

async function main() {
  await runUnitTests();
  await runDatabaseTests();
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
