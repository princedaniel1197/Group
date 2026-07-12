import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./schema";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}
