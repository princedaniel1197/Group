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

  // On serverless (Vercel), each function instance is its own process, so a big
  // pool per instance would exhaust Postgres. Keep 1 connection and disable
  // prepared statements for transaction-mode poolers (PgBouncer/Neon/Supabase).
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  const client = postgres(url, {
    ssl: isInternal ? false : "require",
    max: isServerless ? 1 : 10,
    prepare: !isServerless,
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
