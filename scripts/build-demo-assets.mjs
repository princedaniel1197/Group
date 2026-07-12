// Generate local preview assets for the wall from ../pic + vid/photos.
//
// For each sorted photo it writes a thumbnail + a display image into
// public/demo/ and records a manifest. lib/demo.ts reads the manifest so the
// real darkroom wall renders these photos WITHOUT a database or bucket
// (KEEPSAKE_DEMO=1). Assets are gitignored — local preview only.

import { readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Group/keepsake/");
const sharp = require("sharp");

const SRC = resolve(process.cwd(), "../pic + vid/photos");
const OUT = resolve(process.cwd(), "public/demo");

// Parse the WhatsApp filename timestamp, e.g. "...2026-07-12 at 7.51.22 PM..."
function parseWhatsAppDate(name) {
  const m = name.match(/(\d{4})-(\d{2})-(\d{2}) at (\d{1,2})\.(\d{2})\.(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let [, y, mo, d, h, mi, s, ap] = m;
  h = Number(h);
  if (/pm/i.test(ap) && h !== 12) h += 12;
  if (/am/i.test(ap) && h === 12) h = 0;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), h, Number(mi), Number(s));
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`Source not found: ${SRC}`);
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "thumb"), { recursive: true });
  await mkdir(join(OUT, "full"), { recursive: true });

  const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  const manifest = [];

  let i = 0;
  for (const file of files) {
    i++;
    const n = String(i).padStart(3, "0");
    const src = join(SRC, file);

    await sharp(src).rotate().resize(700, 700, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72 }).toFile(join(OUT, "thumb", `${n}.jpg`));
    const full = await sharp(src).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer({ resolveWithObject: true });
    await writeFile(join(OUT, "full", `${n}.jpg`), full.data);

    manifest.push({
      n,
      w: full.info.width,
      h: full.info.height,
      takenAt: parseWhatsAppDate(file),
    });
    if (i % 25 === 0) console.log(`  ${i}/${files.length}`);
  }

  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifest.length} photos to public/demo/ (thumb + full + manifest.json)`);
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
