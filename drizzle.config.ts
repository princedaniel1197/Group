import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolveMigrationUrl } from "./lib/db-url";

// drizzle-kit runs outside Next, so load .env.local (fall back to .env) ourselves.
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * drizzle-kit config.
 * - `db:generate` reads `./lib/schema.ts` and writes SQL to `./drizzle` (offline).
 * - `db:migrate` / `db:push` connect using DATABASE_URL (needs live Railway creds).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveMigrationUrl() ?? "",
  },
  strict: true,
  verbose: true,
});
