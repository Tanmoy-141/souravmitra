import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env (local) or Vercel " +
      "project environment variables (production/preview) — see .env.example.",
  );
}

// Fallback DNS resolver for environments where local ISP DNS (e.g. JioFiber)
// blocks or refuses queries to neon.tech cloud endpoints
function getFetchOptions() {
  if (typeof window !== "undefined") return undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("node:dns");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Agent } = require("undici");

    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    const agent = new Agent({
      connect: {
        lookup: (
          hostname: string,
          opts: unknown,
          cb: (
            err: Error | null,
            address?: string | Array<{ address: string; family: number }>,
            family?: number,
          ) => void,
        ) => {
          const callback = typeof opts === "function" ? (opts as typeof cb) : cb;
          const options =
            typeof opts === "object" && opts !== null
              ? (opts as { all?: boolean })
              : {};

          resolver.resolve4(hostname, (err4: Error | null, addrs4: string[]) => {
            if (!err4 && addrs4 && addrs4.length > 0) {
              return options.all
                ? callback(null, addrs4.map((a: string) => ({ address: a, family: 4 })))
                : callback(null, addrs4[0], 4);
            }
            resolver.resolve6(hostname, (err6: Error | null, addrs6: string[]) => {
              if (!err6 && addrs6 && addrs6.length > 0) {
                return options.all
                  ? callback(null, addrs6.map((a: string) => ({ address: a, family: 6 })))
                  : callback(null, addrs6[0], 6);
              }
              dns.lookup(hostname, options, callback);
            });
          });
        },
      },
    });

    return { dispatcher: agent };
  } catch {
    return undefined;
  }
}

const fetchOptions = getFetchOptions();
const sql = neon(
  process.env.DATABASE_URL,
  fetchOptions ? { fetchOptions } : undefined,
);

export const db = drizzle(sql, { schema });

