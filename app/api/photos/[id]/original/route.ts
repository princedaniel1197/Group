import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/schema";
import { presignGet } from "@/lib/s3";
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
    const [photo] = await db
      .select({ storageKey: photos.storageKey })
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);

    if (!photo) return notFound("Photo not found");

    const url = await presignGet(photo.storageKey, TTL_ORIGINAL);
    return ok({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
