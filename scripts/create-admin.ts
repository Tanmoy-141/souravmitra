import "dotenv/config";
import { eq, or } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { hashPassword } from "../lib/auth";

async function main() {
  const username = process.env.NEW_ADMIN_USERNAME?.trim().toLowerCase();
  const email = process.env.NEW_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.NEW_ADMIN_PASSWORD;

  if (!username || !email || !password) {
    throw new Error(
      "Set NEW_ADMIN_USERNAME, NEW_ADMIN_EMAIL, and NEW_ADMIN_PASSWORD.",
    );
  }

  if (password.length < 12) {
    throw new Error("Use a password of at least 12 characters.");
  }

  if (username.length > 64 || email.length > 255) {
    throw new Error("Username or email exceeds the allowed length.");
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    throw new Error(
      "Username may contain only lowercase letters, numbers, underscores, and hyphens.",
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  const [existing] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
    })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);

  if (existing) {
    throw new Error(
      "That username or email already exists. No account created.",
    );
  }

  const { hash, salt } = hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role: "admin",
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
    });

  console.log("Admin account created successfully:");
  console.log(created);
}

main().catch((error: unknown) => {
  console.error(
    "Could not create admin:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
