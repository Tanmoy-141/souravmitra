import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env (local) or Vercel " +
      "project environment variables (production/preview) — see .env.example.",
  );
}

// Neon's HTTP driver: no persistent connections to manage, works out of the
// box in Vercel's serverless/edge functions. Swap to the `neon-serverless`
// (WebSocket + pool) driver later only if you need transactions across
// multiple statements in a single request.
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
