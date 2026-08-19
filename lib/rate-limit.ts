import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

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

// In-memory fallback / cache for fast local evaluation
const memoryMap = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  identifier: string,
  { limit, windowMs }: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTimeEpoch = now + windowMs;
  const resetDate = new Date(resetTimeEpoch);

  try {
    const existing = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, identifier))
      .limit(1);

    if (existing.length === 0 || now > existing[0].resetAt.getTime()) {
      // Initialize or reset counter
      await db
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
            count: 1,
            resetAt: resetDate,
            updatedAt: new Date(),
          },
        });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.ceil(resetTimeEpoch / 1000),
      };
    }

    const current = existing[0];
    if (current.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil(current.resetAt.getTime() / 1000),
      };
    }

    const nextCount = current.count + 1;
    await db
      .update(rateLimits)
      .set({
        count: nextCount,
        updatedAt: new Date(),
      })
      .where(eq(rateLimits.key, identifier));

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - nextCount),
      reset: Math.ceil(current.resetAt.getTime() / 1000),
    };
  } catch {
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
      remaining: limit - record.count,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }
}
