import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/schema";
import { presignGet, publicObjectUrl } from "@/lib/s3";
import { resolveDatabaseUrl } from "@/lib/db-url";
import { ok, notFound, errorResponse } from "@/lib/http";
import { TTL_ORIGINAL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/photos/[id]/original (public)
 * Returns a short-lived presigned GET URL for the full-size image (§7 View).
 */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id: photoId } = await params;

    // Preview mode: serve the locally-generated display image.
    if (process.env.KEEPSAKE_DEMO === "1" && !resolveDatabaseUrl()) {
      const m = photoId.match(/^demo-(\d+)$/);
      if (m) return ok({ url: `/demo/full/${m[1]}.jpg` });
    }

    const [photo] = await db
      .select({ storageKey: photos.storageKey })
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);

    if (!photo) return notFound("Photo not found");

    const url =
      publicObjectUrl(photo.storageKey) ??
      (await presignGet(photo.storageKey, TTL_ORIGINAL));
    return ok({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
