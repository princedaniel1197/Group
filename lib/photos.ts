import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { resolveDatabaseUrl } from "./db-url";
import { photos, reactions, comments } from "./schema";
import { isContributor, getClientId } from "./gate";
import { presignGet, publicObjectUrl } from "./s3";
import { TTL_THUMB } from "./constants";
import type { PhotoDTO, PhotosListDTO } from "./types";

/**
 * Build the gallery-wall payload: photo rows + presigned thumbnail URLs,
 * heart/comment counts, and per-viewer flags. Shared by the server page
 * (initial SSR) and GET /api/photos (client refresh). Never leaks storage keys.
 */
export async function listPhotos(): Promise<PhotosListDTO> {
  // Not configured yet (first boot / preview): show an empty album instead of
  // crashing. Real DB errors while configured still propagate.
  if (!resolveDatabaseUrl()) {
    if (process.env.KEEPSAKE_DEMO === "1") {
      const { demoAlbum } = await import("./demo");
      return demoAlbum();
    }
    return { photos: [], viewer: { isContributor: false } };
  }

  const db = await getDb();
  const [rows, viewerIsContributor, clientId] = await Promise.all([
    db.select().from(photos).orderBy(desc(photos.createdAt)),
    isContributor(),
    getClientId(),
  ]);

  const [heartRows, commentRows] = await Promise.all([
    db
      .select({ photoId: reactions.photoId, count: sql<number>`count(*)::int` })
      .from(reactions)
      .groupBy(reactions.photoId),
    db
      .select({ photoId: comments.photoId, count: sql<number>`count(*)::int` })
      .from(comments)
      .groupBy(comments.photoId),
  ]);

  const heartsByPhoto = new Map(heartRows.map((r) => [r.photoId, r.count]));
  const commentsByPhoto = new Map(commentRows.map((r) => [r.photoId, r.count]));

  let reactedSet = new Set<string>();
  if (clientId) {
    const mine = await db
      .select({ photoId: reactions.photoId })
      .from(reactions)
      .where(eq(reactions.clientId, clientId));
    reactedSet = new Set(mine.map((r) => r.photoId));
  }

  const dtos: PhotoDTO[] = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      thumbUrl: publicObjectUrl(p.thumbKey) ?? (await presignGet(p.thumbKey, TTL_THUMB)),
      width: p.width,
      height: p.height,
      caption: p.caption,
      authorName: p.authorName,
      takenAt: p.takenAt ? p.takenAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      altText: p.altText,
      tags: p.tags,
      event: p.event,
      hearts: heartsByPhoto.get(p.id) ?? 0,
      comments: commentsByPhoto.get(p.id) ?? 0,
      viewerReacted: reactedSet.has(p.id),
      viewerOwns: clientId != null && p.authorClientId === clientId,
    })),
  );

  return { photos: dtos, viewer: { isContributor: viewerIsContributor } };
}
