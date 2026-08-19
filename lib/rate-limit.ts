type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const trackers = new Map<string, RateLimitRecord>();

// Periodically clean expired keys to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of trackers.entries()) {
      if (now > record.resetTime) {
        trackers.delete(key);
      }
    }
  }, 60_000);
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  { limit, windowMs }: RateLimitConfig,
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = trackers.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    trackers.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(resetTime / 1000),
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
