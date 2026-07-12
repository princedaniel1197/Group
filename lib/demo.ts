import "server-only";
import type { PhotoDTO, PhotosListDTO } from "./types";

/**
 * Demo seed for previewing the wall WITHOUT a database or bucket.
 *
 * Only used when `KEEPSAKE_DEMO=1` and no `DATABASE_URL` is set (see
 * lib/photos.ts). Thumbnails point at picsum.photos placeholders so the real
 * Print/Wall components render a populated wall. Never active in production
 * with a real database.
 */

interface Seed {
  w: number;
  h: number;
  caption: string | null;
  author: string;
  hearts: number;
  comments: number;
  daysAgo: number;
  top: string; // gradient top
  bot: string; // gradient bottom
  orb: string; // sun/moon color
  orbY: number; // 0..1 vertical position of the orb
}

const SEEDS: Seed[] = [
  { w: 1200, h: 820, caption: "low tide, before anyone woke up", author: "Mara", hearts: 5, comments: 2, daysAgo: 3, top: "#2b3f52", bot: "#d99b6a", orb: "#f2d7a8", orbY: 0.32 },
  { w: 900, h: 1200, caption: "he insisted on the hat", author: "Tomás", hearts: 8, comments: 4, daysAgo: 9, top: "#4a3428", bot: "#caa06a", orb: "#e9c79a", orbY: 0.28 },
  { w: 1000, h: 1000, caption: null, author: "Priya", hearts: 2, comments: 0, daysAgo: 14, top: "#39352e", bot: "#8f8672", orb: "#c7bda6", orbY: 0.4 },
  { w: 1200, h: 900, caption: "kitchen, 1am, third round of dumplings", author: "Mara", hearts: 11, comments: 6, daysAgo: 21, top: "#2a1e16", bot: "#b5722f", orb: "#eebd77", orbY: 0.22 },
  { w: 820, h: 1200, caption: "the long way home", author: "Jae", hearts: 3, comments: 1, daysAgo: 33, top: "#26304a", bot: "#b06a4a", orb: "#e2a884", orbY: 0.3 },
  { w: 1200, h: 800, caption: "found this roll in a drawer", author: "Tomás", hearts: 7, comments: 3, daysAgo: 52, top: "#4a4234", bot: "#cbb892", orb: "#e7dcbb", orbY: 0.36 },
  { w: 1000, h: 1250, caption: "she named the cat after a planet", author: "Priya", hearts: 6, comments: 2, daysAgo: 70, top: "#1c2233", bot: "#5a4a7a", orb: "#c9bce8", orbY: 0.25 },
  { w: 1200, h: 850, caption: null, author: "Jae", hearts: 1, comments: 0, daysAgo: 96, top: "#33403a", bot: "#9ab0a0", orb: "#d3e2d3", orbY: 0.38 },
];

/** A self-contained, photo-ish gradient as an SVG data URI (no network). */
function svgThumb(s: Seed, i: number): string {
  const cx = i % 2 === 0 ? s.w * 0.68 : s.w * 0.3;
  const cy = s.h * s.orbY;
  const r = Math.min(s.w, s.h) * 0.16;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s.w}' height='${s.h}'>
<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='${s.top}'/><stop offset='1' stop-color='${s.bot}'/>
</linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<circle cx='${cx.toFixed(0)}' cy='${cy.toFixed(0)}' r='${r.toFixed(0)}' fill='${s.orb}' opacity='0.55'/>
<rect x='0' y='${(s.h * 0.72).toFixed(0)}' width='100%' height='${(s.h * 0.28).toFixed(0)}' fill='#000' opacity='0.14'/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Fixed reference instant so dates are stable across renders (no Date.now()).
const NOW = Date.parse("2026-07-12T18:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

export function demoAlbum(): PhotosListDTO {
  const photos: PhotoDTO[] = SEEDS.map((s, i) => {
    const iso = new Date(NOW - s.daysAgo * DAY).toISOString();
    return {
      id: `demo-${i}-0000-0000-0000-000000000000`,
      thumbUrl: svgThumb(s, i),
      width: s.w,
      height: s.h,
      caption: s.caption,
      authorName: s.author,
      takenAt: iso,
      createdAt: iso,
      altText: null,
      tags: null,
      hearts: s.hearts,
      comments: s.comments,
      viewerReacted: false,
      viewerOwns: false,
    };
  });

  return { photos, viewer: { isContributor: false } };
}
