import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isContributor, getClientId } from "@/lib/gate";
import { presignPut } from "@/lib/s3";
import { ok, unauthorized, tooMany, errorResponse } from "@/lib/http";
import { checkRateLimit, ipFrom } from "@/lib/rate-limit";
import {
  ALLOWED_CONTENT_TYPE,
  MAX_ORIGINAL_BYTES,
  MAX_THUMB_BYTES,
  TTL_UPLOAD,
  storageKeyFor,
  thumbKeyFor,
} from "@/lib/constants";

export const runtime = "nodejs";

const bodySchema = z.object({
  contentType: z.literal(ALLOWED_CONTENT_TYPE),
  originalSize: z.number().int().positive().max(MAX_ORIGINAL_BYTES),
  thumbSize: z.number().int().positive().max(MAX_THUMB_BYTES),
});

/**
 * POST /api/uploads/presign (gated)
 * Returns presigned PUT URLs for a new photo's original + thumbnail (§7).
 * The binary never touches this server — the client PUTs straight to the bucket.
 */
export async function POST(request: Request) {
  try {
    if (!(await isContributor())) return unauthorized();

    const clientId = await getClientId();
    const rl = checkRateLimit(
      `presign:${clientId ?? ipFrom(request)}`,
      30,
      5 * 60 * 1000,
    );
    if (!rl.allowed) return tooMany(rl.retryAfter);

    const body = bodySchema.parse(await request.json());

    const photoId = randomUUID();
    const storageKey = storageKeyFor(photoId);
    const thumbKey = thumbKeyFor(photoId);

    const [originalUrl, thumbUrl] = await Promise.all([
      presignPut(storageKey, body.contentType, TTL_UPLOAD),
      presignPut(thumbKey, body.contentType, TTL_UPLOAD),
    ]);

    return ok({ photoId, storageKey, thumbKey, originalUrl, thumbUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
