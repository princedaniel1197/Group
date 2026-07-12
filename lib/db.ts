import dns from "node:dns";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./db-url";

// Supabase pooler hosts are IPv4; the *direct* host is IPv6-only. Prefer IPv4
// so a stray AAAA lookup can't black-hole a connection on serverless.
dns.setDefaultResultOrder("ipv4first");

function createClient() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL (or POSTGRES_URL) is not set");
  }

  const isInternal = url.includes(".railway.internal");
  const isServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  // Transaction poolers (Supavisor/PgBouncer) don't support prepared statements.
  const isPooler = /pooler\.supabase\.com|:6543|pgbouncer=true/.test(url);

  const sql = postgres(url, {
    ssl: isInternal ? false : "require",
    max: isServerless ? 1 : 10,
    prepare: !(isServerless || isPooler),
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return { sql, db: drizzle(sql, { schema }) };
}

type Client = ReturnType<typeof createClient>;
const globalForDb = globalThis as unknown as { keepsakeClient?: Client };

function preflightTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("db preflight timeout")), ms),
  );
}

/**
 * Return a healthy Drizzle client.
 *
 * Serverless instances suspend between invocations, and their cached TCP
 * connection to the pooler can die silently — the next query then hangs on a
 * dead socket until the function times out. We preflight a `select 1` against a
 * short timeout and recycle the client if it's stale (Supabase's recommended
 * fix for CONNECT_TIMEOUT / hanging queries on Vercel serverless).
 */
export async function getDb(): Promise<PostgresJsDatabase<typeof schema>> {
  // Up to 3 attempts: preflight a fresh/cached connection against a short
  // timeout; if it's stale or the connect stalls, discard and try again. This
  // survives both dead cached sockets and an intermittently bad pooler address.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!globalForDb.keepsakeClient) {
      globalForDb.keepsakeClient = createClient();
    }
    try {
      await Promise.race([
        globalForDb.keepsakeClient.sql`select 1`,
        preflightTimeout(3500),
      ]);
      return globalForDb.keepsakeClient.db;
    } catch {
      const stale = globalForDb.keepsakeClient;
      globalForDb.keepsakeClient = undefined;
      stale?.sql.end({ timeout: 1 }).catch(() => {});
    }
  }

  // Last resort — hand back a fresh client and let the query attempt run.
  globalForDb.keepsakeClient = createClient();
  return globalForDb.keepsakeClient.db;
}
