import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, reactions } from "@/lib/schema";
import { isContributor, getClientId } from "@/lib/gate";
import { ok, fail, unauthorized, notFound, errorResponse } from "@/lib/http";
import { MAX_NAME_LEN } from "@/lib/constants";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LEN),
});

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/photos/[id]/reactions (gated)
 * Toggles this browser's heart on a photo. One heart per person is enforced by
 * the unique(photo_id, client_id) index (§5) plus this toggle logic.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    if (!(await isContributor())) return unauthorized();

    const clientId = await getClientId();
    if (!clientId) return fail("Missing client id", 400);

    const { id: photoId } = await params;
    const { name } = schema.parse(await request.json());

    const existing = await db
      .select({ id: reactions.id })
      .from(reactions)
      .where(
        and(eq(reactions.photoId, photoId), eq(reactions.clientId, clientId)),
      )
      .limit(1);

    let reacted: boolean;
    if (existing.length > 0) {
      await db
        .delete(reactions)
        .where(
          and(eq(reactions.photoId, photoId), eq(reactions.clientId, clientId)),
        );
      reacted = false;
    } else {
      const photo = await db
        .select({ id: photos.id })
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1);
      if (photo.length === 0) return notFound("Photo not found");

      await db
        .insert(reactions)
        .values({ photoId, clientId, name })
        .onConflictDoNothing();
      reacted = true;
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reactions)
      .where(eq(reactions.photoId, photoId));

    return ok({ reacted, hearts: count });
  } catch (error) {
    return errorResponse(error);
  }
}
