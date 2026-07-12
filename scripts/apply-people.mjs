// Write face-recognition results (who's in each photo) into photos.people.
// Reads ../face-id-tool/identification.json + scripts/.import-state.json.
//   node --env-file=.env.local scripts/apply-people.mjs

import { readFile } from "node:fs/promises";
import postgres from "postgres";

const STATE = "scripts/.import-state.json";
const IDENT = "../face-id-tool/identification.json";

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
  const ident = JSON.parse(await readFile(IDENT, "utf8"));

  const sql = postgres(dbUrl, { ssl: "require", max: 1 });
  let tagged = 0;
  let withPeople = 0;
  for (const entry of ident) {
    const id = nToId[+entry.n];
    if (!id) continue;
    const names = (entry.people || []).map((p) => p.name);
    await sql`update photos set people = ${names.length ? names : null} where id = ${id}`;
    tagged++;
    if (names.length) withPeople++;
  }
  await sql.end();
  console.log(`Updated ${tagged} photos; ${withPeople} have at least one person.`);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
