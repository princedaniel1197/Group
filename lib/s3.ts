import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

/**
 * S3-compatible client for the Railway Bucket.
 * `forcePathStyle: true` is required for non-AWS S3 endpoints (spec §2).
 */

const globalForS3 = globalThis as unknown as { keepsakeS3?: S3Client };

function client(): S3Client {
  if (globalForS3.keepsakeS3) return globalForS3.keepsakeS3;
  const s3 = new S3Client({
    endpoint: env.s3Endpoint,
    region: env.s3Region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey,
    },
  });
  if (process.env.NODE_ENV !== "production") globalForS3.keepsakeS3 = s3;
  return s3;
}

/**
 * Public CDN URL for an object, when the bucket is public and
 * STORAGE_PUBLIC_URL is set (e.g. Supabase's CDN-backed public path). Returns
 * null when not configured — callers then fall back to a presigned URL.
 * Public objects are cached at the edge, which is far faster than origin
 * presigned fetches for the gallery wall.
 */
export function publicObjectUrl(key: string): string | null {
  const base = process.env.STORAGE_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${key}`;
}

/** Presigned PUT URL for a direct browser upload (§7 step 2). */
export function presignPut(
  key: string,
  contentType: string,
  expiresIn: number,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn });
}

/** Presigned GET URL for viewing a private object (§7 View). */
export function presignGet(key: string, expiresIn: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.s3Bucket, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn });
}

/** Delete a photo's objects when the row is deleted (§6 delete rule). */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await client().send(
    new DeleteObjectsCommand({
      Bucket: env.s3Bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
