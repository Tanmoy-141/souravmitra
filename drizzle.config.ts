import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in your " +
      "Neon connection string before running any drizzle-kit command.",
  );
}

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  driver: "pg", // Note: 'driver' was used in older versions, 'dialect' is newer
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
};
