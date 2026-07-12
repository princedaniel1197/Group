import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos, comments } from "@/lib/schema";
import { isContributor, getClientId } from "@/lib/gate";
import {
  ok,
  unauthorized,
  notFound,
  tooMany,
  errorResponse,
} from "@/lib/http";
import { checkRateLimit, ipFrom } from "@/lib/rate-limit";
import { MAX_NAME_LEN, MAX_COMMENT_LEN } from "@/lib/constants";
import type { CommentDTO } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/photos/[id]/comments (public) — oldest first. */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id: photoId } = await params;
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.photoId, photoId))
      .orderBy(asc(comments.createdAt));

    const dtos: CommentDTO[] = rows.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    }));
    return ok(dtos);
  } catch (error) {
    return errorResponse(error);
  }
}

const postSchema = z.object({
  authorName: z.string().trim().min(1).max(MAX_NAME_LEN),
  body: z.string().trim().min(1).max(MAX_COMMENT_LEN),
});

/** POST /api/photos/[id]/comments (gated) — add a comment. */
export async function POST(request: Request, { params }: Ctx) {
  try {
    if (!(await isContributor())) return unauthorized();

    const clientId = await getClientId();
    const rl = checkRateLimit(
      `comment:${clientId ?? ipFrom(request)}`,
      20,
      5 * 60 * 1000,
    );
    if (!rl.allowed) return tooMany(rl.retryAfter);

    const { id: photoId } = await params;
    const input = postSchema.parse(await request.json());

    const photo = await db
      .select({ id: photos.id })
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);
    if (photo.length === 0) return notFound("Photo not found");

    const [row] = await db
      .insert(comments)
      .values({
        photoId,
        authorName: input.authorName,
        body: input.body,
      })
      .returning();

    const dto: CommentDTO = {
      id: row.id,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
    return ok(dto, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
