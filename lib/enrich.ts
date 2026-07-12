import "server-only";

/**
 * Enrichment hook (spec §8). OFF in v1 — this is a no-op.
 *
 * It is called fire-and-forget from `POST /api/photos` so the wiring exists.
 * To turn it on later: read the thumb from the bucket, ask a vision-capable
 * Anthropic model for one-sentence alt-text + 3–6 lowercase tags as strict
 * JSON, then update the row's `altText` / `tags`. Move to a background worker
 * (Railway cron / small service) if upload latency ever matters.
 */
export async function enrich(photoId: string): Promise<void> {
  // no-op in v1; `photoId` is intentionally unused until enrichment is enabled.
  void photoId;
}
