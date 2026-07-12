import "server-only";
import { resolveDatabaseUrl } from "./db-url";

/**
 * Server-only environment access. Importing this from a client component is a
 * build error (via `server-only`), which keeps secrets out of the bundle (§10).
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    const url = resolveDatabaseUrl();
    if (!url) throw new Error("Missing DATABASE_URL (or POSTGRES_URL)");
    return url;
  },
  get s3Endpoint(): string {
    return requireEnv("S3_ENDPOINT");
  },
  get s3Region(): string {
    return requireEnv("S3_REGION");
  },
  get s3Bucket(): string {
    return requireEnv("S3_BUCKET");
  },
  get s3AccessKeyId(): string {
    return requireEnv("S3_ACCESS_KEY_ID");
  },
  get s3SecretAccessKey(): string {
    return requireEnv("S3_SECRET_ACCESS_KEY");
  },
  get contributorPassphrase(): string {
    return requireEnv("CONTRIBUTOR_PASSPHRASE");
  },
  get cookieSecret(): string {
    return requireEnv("COOKIE_SECRET");
  },
};
