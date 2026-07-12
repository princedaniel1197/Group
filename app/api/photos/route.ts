import { z } from "zod";
import { getDb } from "@/lib/db";
import { photos } from "@/lib/schema";
import { ensureClientId } from "@/lib/gate";
import { enrich } from "@/lib/enrich";
import { listPhotos } from "@/lib/photos";
import { ok, fail, errorResponse } from "@/lib/http";
import {
  MAX_CAPTION_LEN,
  MAX_NAME_LEN,
  storageKeyFor,
  thumbKeyFor,
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflects the latest wall

/**
 * GET /api/photos (public)
 * Returns rows + presigned thumbnail URLs, heart/comment counts, and
 * per-viewer flags (reacted / owns). Never returns raw storage keys (§7).
 */
export async function GET() {
  try {
    return ok(await listPhotos());
  } catch (error) {
    return errorResponse(error);
  }
}

// photos/{uuid}/original.jpg — validate the client can't claim arbitrary keys.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ORIGINAL_KEY = new RegExp(`^photos/(${UUID})/original\\.jpg$`);

const postSchema = z.object({
  storageKey: z.string().regex(ORIGINAL_KEY),
  thumbKey: z.string(),
  caption: z.string().trim().max(MAX_CAPTION_LEN).nullish(),
  authorName: z.string().trim().min(1).max(MAX_NAME_LEN),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  takenAt: z.string().datetime().nullish(),
});

/**
 * POST /api/photos (gated)
 * Records a photo row after the client has uploaded both blobs to the bucket.
 */
export async function POST(request: Request) {
  try {
    const clientId = await ensureClientId();
    const body = postSchema.parse(await request.json());

    // Derive the photo id from its storage key and confirm the thumb matches.
    const photoId = body.storageKey.match(ORIGINAL_KEY)![1];
    if (body.thumbKey !== thumbKeyFor(photoId)) {
      return fail("thumbKey does not match storageKey", 400);
    }
    if (body.storageKey !== storageKeyFor(photoId)) {
      return fail("Invalid storageKey", 400);
    }

    const db = await getDb();
    const [row] = await db
      .insert(photos)
      .values({
        id: photoId,
        storageKey: body.storageKey,
        thumbKey: body.thumbKey,
        caption: body.caption ?? null,
        authorName: body.authorName,
        authorClientId: clientId,
        width: body.width,
        height: body.height,
        takenAt: body.takenAt ? new Date(body.takenAt) : null,
      })
      .returning({ id: photos.id });

    // Fire-and-forget enrichment (no-op in v1, §8).
    void enrich(row.id).catch((e) =>
      console.error("[keepsake] enrich failed:", e),
    );

    return ok({ id: row.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
