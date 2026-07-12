import { presignGet, publicObjectUrl } from "@/lib/s3";
import { ok, errorResponse } from "@/lib/http";
import { AUDIO_KEY, TTL_AUDIO } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/audio (public)
 * Returns a presigned GET URL for the album's background theme song, served
 * directly from the private bucket (never committed to the repo).
 */
export async function GET() {
  try {
    const url =
      publicObjectUrl(AUDIO_KEY) ?? (await presignGet(AUDIO_KEY, TTL_AUDIO));
    return ok({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
