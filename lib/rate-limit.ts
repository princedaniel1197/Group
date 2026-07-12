import "server-only";

/**
 * Tiny in-memory sliding-window rate limiter (§10).
 *
 * NOTE: state lives in this process, so limits reset on redeploy and are not
 * shared across instances. That's acceptable for v1's single Railway service.
 * Swap for Postgres/Redis if the app ever scales horizontally.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateResult {
  allowed: boolean;
  retryAfter: number; // seconds until the window resets
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (Railway sets x-forwarded-for). */
export function ipFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Opportunistic cleanup so the map can't grow unbounded.
export function sweepExpired(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
