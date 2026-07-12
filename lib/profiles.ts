import "server-only";
import { sql, eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { photos, profiles } from "./schema";
import { publicObjectUrl, presignGet } from "./s3";
import { TTL_THUMB } from "./constants";
import type { PhotoDTO } from "./types";
import type { Profile, Milestone } from "./schema";

export interface PersonSummary {
  name: string;
  photoCount: number;
  intro: string | null;
  dob: string | null;
}

/** All people who appear in photos or have a profile, most photos first. */
export async function listPeople(): Promise<PersonSummary[]> {
  const db = await getDb();
  const [counts, profs] = await Promise.all([
    db.execute<{ name: string; c: number }>(
      sql`select unnest(people) as name, count(*)::int as c from photos where people is not null group by 1`,
    ),
    db.select().from(profiles),
  ]);

  const countMap = new Map<string, number>();
  for (const r of counts as unknown as { name: string; c: number }[]) {
    countMap.set(r.name, Number(r.c));
  }
  const profMap = new Map(profs.map((p) => [p.name, p]));

  const names = new Set<string>([...countMap.keys(), ...profMap.keys()]);
  return [...names]
    .map((name) => ({
      name,
      photoCount: countMap.get(name) ?? 0,
      intro: profMap.get(name)?.intro ?? null,
      dob: profMap.get(name)?.dob ?? null,
    }))
    .sort((a, b) => b.photoCount - a.photoCount || a.name.localeCompare(b.name));
}

export async function getProfile(name: string): Promise<Profile | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.name, name))
    .limit(1);
  return row ?? null;
}

export async function getPersonPhotos(name: string): Promise<PhotoDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(photos)
    .where(sql`${name} = any(${photos.people})`)
    .orderBy(desc(photos.createdAt));

  return Promise.all(
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
      people: p.people,
      hearts: 0,
      comments: 0,
      viewerReacted: false,
      viewerOwns: false,
    })),
  );
}

export async function upsertProfile(
  name: string,
  data: { intro: string | null; dob: string | null; milestones: Milestone[] },
): Promise<Profile> {
  const db = await getDb();
  const [row] = await db
    .insert(profiles)
    .values({ name, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: profiles.name,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return row;
}
