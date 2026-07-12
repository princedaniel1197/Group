import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle client over postgres-js.
 *
 * The client is created LAZILY (on first query), not at import time — otherwise
 * `next build`'s page-data collection would import route modules and immediately
 * require DATABASE_URL, which isn't present at build. A Proxy defers creation
 * while keeping the `db.select(...)` call sites unchanged.
 *
 * The instance is cached on `globalThis` so Next's dev HMR doesn't open a new
 * pool on every reload (which would exhaust Postgres connections).
 */

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Railway's private network (`*.railway.internal`) does not offer TLS;
  // the public proxy requires it. Pick automatically.
  const isInternal = url.includes(".railway.internal");

  const client = postgres(url, {
    ssl: isInternal ? false : "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createClient>;

const globalForDb = globalThis as unknown as { keepsakeDb?: Db };

function getDb(): Db {
  if (!globalForDb.keepsakeDb) {
    globalForDb.keepsakeDb = createClient();
  }
  return globalForDb.keepsakeDb;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as Db;
