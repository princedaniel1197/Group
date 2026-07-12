import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/schema";
import { isContributor, getClientId } from "@/lib/gate";
import { deleteObjects } from "@/lib/s3";
import { ok, fail, unauthorized, forbidden, notFound, errorResponse } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/photos/[id] (gated, own only)
 * A contributor may delete a photo only if its authorClientId matches their
 * client_id (§6). Removes bucket objects first, then the row (cascade clears
 * reactions + comments).
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    if (!(await isContributor())) return unauthorized();

    const clientId = await getClientId();
    if (!clientId) return fail("Missing client id", 400);

    const { id: photoId } = await params;

    const [photo] = await db
      .select({
        id: photos.id,
        authorClientId: photos.authorClientId,
        storageKey: photos.storageKey,
        thumbKey: photos.thumbKey,
      })
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);

    if (!photo) return notFound("Photo not found");
    if (photo.authorClientId !== clientId) {
      return forbidden("You can only delete your own photos");
    }

    // Best-effort object cleanup, then delete the row (cascades to children).
    await deleteObjects([photo.storageKey, photo.thumbKey]);
    await db.delete(photos).where(eq(photos.id, photoId));

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
