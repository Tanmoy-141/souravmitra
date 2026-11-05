import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { NextRequest } from "next/server";

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory fallback / cache for fast local evaluation when DB is unavailable
const memoryMap = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  identifier: string,
  { limit, windowMs }: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTimeEpoch = now + windowMs;
  const resetDate = new Date(resetTimeEpoch);

  try {
    // Atomic PostgreSQL upsert to prevent TOCTOU race conditions:
    // If the key is new, inserts count = 1.
    // If the key exists, checks if the window expired (resetAt <= NOW()):
    //   - If expired, resets count = 1 and assigns new resetAt.
    //   - If active window, increments count atomically and preserves existing resetAt.
    const [record] = await db
      .insert(rateLimits)
      .values({
        key: identifier,
        count: 1,
        resetAt: resetDate,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE
            WHEN ${rateLimits.resetAt} <= NOW() THEN 1
            ELSE ${rateLimits.count} + 1
          END`,
          resetAt: sql`CASE
            WHEN ${rateLimits.resetAt} <= NOW() THEN ${resetDate}
            ELSE ${rateLimits.resetAt}
          END`,
          updatedAt: new Date(),
        },
      })
      .returning({
        count: rateLimits.count,
        resetAt: rateLimits.resetAt,
      });

    const currentCount = record?.count ?? 1;
    const currentResetAt = record?.resetAt
      ? new Date(record.resetAt).getTime()
      : resetTimeEpoch;
    const isAllowed = currentCount <= limit;

    return {
      success: isAllowed,
      limit,
      remaining: Math.max(0, limit - currentCount),
      reset: Math.ceil(currentResetAt / 1000),
    };
  } catch (err) {
    console.warn(
      "[RateLimit] Database rate limit query failed; using in-memory fallback:",
      err,
    );

    // Prune stale entries if memoryMap is growing to prevent memory leaks
    if (memoryMap.size > 2000) {
      for (const [k, v] of memoryMap.entries()) {
        if (now > v.resetTime) {
          memoryMap.delete(k);
        }
      }
    }

    // Graceful fallback to memory tracking if DB is temporarily unreachable
    const record = memoryMap.get(identifier);
    if (!record || now > record.resetTime) {
      memoryMap.set(identifier, { count: 1, resetTime: resetTimeEpoch });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.ceil(resetTimeEpoch / 1000),
      };
    }

    if (record.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil(record.resetTime / 1000),
      };
    }

    record.count += 1;
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - record.count),
      reset: Math.ceil(record.resetTime / 1000),
    };
  }
}
