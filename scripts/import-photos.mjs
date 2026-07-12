// Bulk-import a local folder of photos into keepsake's bucket + database.
//
// Server-side mirror of the browser upload pipeline (lib/image.ts + §7):
//   - read EXIF DateTimeOriginal, then re-encode (which strips EXIF/GPS)
//   - produce a display JPEG (<=2560px, q90) and a thumbnail (<=600px, q80)
//   - PUT both straight to the bucket, then insert the photos row
//
// Idempotent: a state file (scripts/.import-state.json) records imported
// files by name+size, so re-running skips them. Needs live DATABASE_URL + S3_*.
//
// Usage:
//   npm run import:photos                      # imports ../pic + vid/photos
//   npm run import:photos -- --dir "path" --author "The group" --dry-run

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import exifr from "exifr";
import sharp from "sharp";

config({ path: ".env.local" });
config({ path: ".env" });

// Mirrors lib/constants.ts
const DISPLAY_MAX_EDGE = 2560;
const DISPLAY_QUALITY = 90;
const THUMB_MAX_EDGE = 600;
const THUMB_QUALITY = 80;
const CONTENT_TYPE = "image/jpeg";
const AUTHOR_CLIENT_ID = "bulk-import";
const STATE_FILE = "scripts/.import-state.json";

function parseArgs(argv) {
  const args = { dir: "../pic + vid/photos", author: "The group", dryRun: false, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") args.dir = argv[++i];
    else if (a === "--author") args.author = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]) || 4;
  }
  return args;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

async function readTakenAt(path) {
  try {
    const data = await exifr.parse(path, { pick: ["DateTimeOriginal"] });
    const v = data?.DateTimeOriginal;
    return v instanceof Date && !Number.isNaN(v.getTime()) ? v : null;
  } catch {
    return null;
  }
}

async function encode(path, maxEdge, quality) {
  const out = await sharp(path)
    .rotate() // bake EXIF orientation, then drop it
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality }) // sharp drops metadata by default -> EXIF/GPS stripped
    .toBuffer({ resolveWithObject: true });
  return { buffer: out.data, width: out.info.width, height: out.info.height };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(process.cwd(), args.dir);
  if (!existsSync(dir)) throw new Error(`Photos directory not found: ${dir}`);

  // Live infra is only needed for a real run; --dry-run just exercises the
  // image pipeline so it can be validated without a bucket or database.
  let s3 = null;
  let bucket = null;
  let sql = null;
  if (!args.dryRun) {
    bucket = requireEnv("S3_BUCKET");
    const dbUrl = requireEnv("DATABASE_URL");
    s3 = new S3Client({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: requireEnv("S3_REGION"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
    const isInternal = dbUrl.includes(".railway.internal");
    sql = postgres(dbUrl, { ssl: isInternal ? false : "require", max: 4 });
  }

  const state = existsSync(STATE_FILE)
    ? JSON.parse(await readFile(STATE_FILE, "utf8"))
    : {};

  const files = (await readdir(dir))
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort();

  console.log(`Found ${files.length} image(s) in ${dir}`);
  if (args.dryRun) console.log("(dry run — no uploads or inserts)\n");

  let imported = 0, skipped = 0, failed = 0;

  async function importOne(file) {
    const path = join(dir, file);
    const size = (await stat(path)).size;
    const key = `${basename(file)}:${size}`;
    if (state[key]) { skipped++; return; }

    try {
      const takenAt = await readTakenAt(path);
      const [display, thumb] = await Promise.all([
        encode(path, DISPLAY_MAX_EDGE, DISPLAY_QUALITY),
        encode(path, THUMB_MAX_EDGE, THUMB_QUALITY),
      ]);

      const id = randomUUID();
      const storageKey = `photos/${id}/original.jpg`;
      const thumbKey = `photos/${id}/thumb.jpg`;

      if (!args.dryRun) {
        await Promise.all([
          s3.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: display.buffer, ContentType: CONTENT_TYPE })),
          s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: thumb.buffer, ContentType: CONTENT_TYPE })),
        ]);
        await sql`
          INSERT INTO photos (id, storage_key, thumb_key, caption, author_name, author_client_id, width, height, taken_at)
          VALUES (${id}, ${storageKey}, ${thumbKey}, ${null}, ${args.author}, ${AUTHOR_CLIENT_ID}, ${display.width}, ${display.height}, ${takenAt})
        `;
        state[key] = id;
        await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
      }

      imported++;
      console.log(`  ✓ ${file}  (${display.width}×${display.height})`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${file}: ${e.message}`);
    }
  }

  // Simple bounded-concurrency worker pool.
  const queue = [...files];
  await Promise.all(
    Array.from({ length: args.concurrency }, async () => {
      while (queue.length) await importOne(queue.shift());
    }),
  );

  if (sql) await sql.end({ timeout: 5 });
  console.log(`\nDone. imported ${imported}, skipped ${skipped}, failed ${failed}.`);
}

main().catch((e) => {
  console.error("\nImport failed:", e.message);
  process.exit(1);
});
