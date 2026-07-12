// Tag photos with events by their number (001-141 from the similarity contact
// sheet). Maps number -> live DB row via scripts/.import-state.json.
//
// Fill GROUPINGS with what the user provides, then run:
//   node --env-file=.env.local scripts/apply-events.mjs
// Add --clear to wipe all event tags first.

import { readFile } from "node:fs/promises";
import postgres from "postgres";

const STATE = "scripts/.import-state.json";

// EDIT THIS: photo numbers (from the contact sheet) -> event name.
// Ranges and singles, comma-separated: "1-20, 45, 47-50".
const GROUPINGS = {
  // "Goa Trip": "1-20, 45",
  // "Farewell": "21-35",
};

function parseSpec(spec) {
  const nums = new Set();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      for (let n = +m[1]; n <= +m[2]; n++) nums.add(n);
    } else if (/^\d+$/.test(part)) {
      nums.add(+part);
    } else {
      throw new Error(`bad range part: "${part}"`);
    }
  }
  return [...nums];
}

async function main() {
  const dbUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error("Missing DATABASE_URL (or POSTGRES_URL)");

  const state = JSON.parse(await readFile(STATE, "utf8"));
  const nToId = {};
  for (const [k, id] of Object.entries(state)) {
    const m = k.match(/^(\d{3})__/);
    if (m) nToId[+m[1]] = id;
  }

  const sql = postgres(dbUrl, { ssl: "require", max: 1 });

  if (process.argv.includes("--clear")) {
    await sql`update photos set event = null`;
    console.log("cleared all event tags");
  }

  let total = 0;
  const seen = new Set();
  for (const [event, spec] of Object.entries(GROUPINGS)) {
    const ns = parseSpec(spec);
    const ids = [];
    for (const n of ns) {
      const id = nToId[n];
      if (!id) {
        console.log(`  ! no photo #${n}`);
        continue;
      }
      if (seen.has(n)) console.log(`  ! #${n} already tagged (last wins)`);
      seen.add(n);
      ids.push(id);
    }
    if (ids.length) await sql`update photos set event = ${event} where id in ${sql(ids)}`;
    total += ids.length;
    console.log(`  ${event}: ${ids.length} photos`);
  }

  const [{ n: untagged }] = await sql`select count(*)::int n from photos where event is null`;
  await sql.end();
  console.log(`\nDone. Tagged ${total} photos. ${untagged} still untagged.`);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
