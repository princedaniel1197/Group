/**
 * Resolve the Postgres connection string, accepting the names that the
 * Supabase/Vercel integration injects (`POSTGRES_URL*`) as well as our own
 * `DATABASE_URL`. Plain module (no `server-only`) so drizzle.config.ts and
 * scripts can import it too.
 */

/** Runtime connection — prefer a pooled URL (safe on serverless). */
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    undefined
  );
}

/** Migrations/DDL — prefer a direct (non-pooling) URL when available. */
export function resolveMigrationUrl(): string | undefined {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    undefined
  );
}
