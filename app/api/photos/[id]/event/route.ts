import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { photos } from "@/lib/schema";
import { ok, notFound, errorResponse } from "@/lib/http";
import { MAX_EVENT_LEN } from "@/lib/events";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  event: z.string().trim().max(MAX_EVENT_LEN).nullable(),
});

/**
 * POST /api/photos/[id]/event (gated)
 * Sets (or clears, with null/empty) which event a photo belongs to.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id: photoId } = await params;
    const { event } = schema.parse(await request.json());
    const value = event && event.length > 0 ? event : null;

    const db = await getDb();
    const res = await db
      .update(photos)
      .set({ event: value })
      .where(eq(photos.id, photoId))
      .returning({ id: photos.id });

    if (res.length === 0) return notFound("Photo not found");
    return ok({ event: value });
  } catch (error) {
    return errorResponse(error);
  }
}
