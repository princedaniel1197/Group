/** Pure presentation helpers (safe on client and server). */

/** Deterministic small rotation in [-2, 2] degrees from a photo id (§9). */
export function rotationFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 401) / 100 - 2; // 0..4.00 shifted to -2..2
}

/** Mono date stamp: `'26 07 12 · name` (§9). */
export function dateStamp(iso: string, name: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `'${yy} ${mm} ${dd} · ${name}`;
}
