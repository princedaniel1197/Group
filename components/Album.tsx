"use client";

import { useState, useCallback, useMemo } from "react";
import { Wall } from "./Wall";
import { Lightbox } from "./Lightbox";
import { Composer } from "./Composer";
import { MusicToggle } from "./MusicToggle";
import { SiteHeader } from "./SiteHeader";
import { fetchPhotos } from "@/lib/api";
import type { PhotoDTO, PhotosListDTO } from "@/lib/types";

interface AlbumProps {
  initial: PhotosListDTO;
}

const personChip = (active: boolean) =>
  `rounded-full px-3 py-1 font-mono text-[11px] tracking-wide transition-colors ${
    active
      ? "bg-safelight text-ink"
      : "bg-ink-raised text-cream-muted ring-1 ring-line hover:text-cream"
  }`;

type Arrange = "newest" | "oldest" | "shuffle";

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arrangePhotos(photos: PhotoDTO[], mode: Arrange, seed: number): PhotoDTO[] {
  const arr = photos.slice();
  const t = (p: PhotoDTO) => new Date(p.createdAt).getTime();
  if (mode === "oldest") arr.sort((a, b) => t(a) - t(b));
  else if (mode === "newest") arr.sort((a, b) => t(b) - t(a));
  else {
    const rnd = mulberry32(seed);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

/**
 * Client orchestrator: holds the wall state and coordinates the composer and
 * lightbox. Contributing is open — no passphrase.
 */
export function Album({ initial }: AlbumProps) {
  const [photos, setPhotos] = useState<PhotoDTO[]>(initial.photos);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selected, setSelected] = useState<PhotoDTO | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [arrange, setArrange] = useState<Arrange>("newest");
  const [seed, setSeed] = useState(1);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPhotos();
      setPhotos(data.photos);
    } catch {
      // leave the current wall in place on a transient failure
    }
  }, []);

  const onPin = useCallback(() => setComposerOpen(true), []);

  // People (with counts), most-photographed first.
  const peopleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of photos) for (const name of p.people ?? []) m.set(name, (m.get(name) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [photos]);

  const arranged = useMemo(
    () => arrangePhotos(photos, arrange, seed),
    [photos, arrange, seed],
  );
  const shown = person
    ? arranged.filter((p) => p.people?.includes(person))
    : arranged;

  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col">
      <SiteHeader
        action={
          <button
            type="button"
            onClick={onPin}
            className="rounded-full border border-line bg-ink-raised px-5 py-2 font-mono text-xs tracking-wide text-cream transition-colors hover:border-safelight-dim hover:text-safelight"
          >
            pin a photo
          </button>
        }
      />

      {peopleCounts.length > 0 ? (
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
          <div className="flex flex-wrap items-center gap-1.5 pb-5">
            <span className="mr-1 font-mono text-[10px] tracking-widest text-cream-muted uppercase">
              people
            </span>
            {peopleCounts.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setPerson(person === name ? null : name)}
                className={personChip(person === name)}
              >
                {name} <span className="opacity-60">{count}</span>
              </button>
            ))}
            {person ? (
              <button
                type="button"
                onClick={() => setPerson(null)}
                className="ml-1 rounded-full px-2 py-1 font-mono text-[11px] text-cream-muted hover:text-safelight"
              >
                show all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {photos.length > 1 ? (
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
          <div className="flex items-center justify-end gap-1.5 pb-3">
            <span className="mr-1 font-mono text-[10px] tracking-widest text-cream-muted uppercase">
              arrange
            </span>
            {(["newest", "oldest", "shuffle"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setArrange(mode);
                  if (mode === "shuffle") setSeed((s) => s + 1);
                }}
                className={personChip(arrange === mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 sm:px-10">
        {photos.length === 0 ? (
          <EmptyState onPin={onPin} />
        ) : person ? (
          <section>
            <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2">
              <h2 className="font-display text-2xl font-semibold text-cream sm:text-3xl">
                Photos of {person}
              </h2>
              <span className="font-mono text-[11px] tracking-widest text-cream-muted uppercase">
                {shown.length} {shown.length === 1 ? "photo" : "photos"}
              </span>
            </div>
            <Wall photos={shown} onOpen={setSelected} />
          </section>
        ) : (
          <EventSections photos={arranged} onOpen={setSelected} />
        )}
      </main>

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onUploaded={refresh}
        onAuthExpired={() => setComposerOpen(false)}
      />
      <MusicToggle />

      <Lightbox
        key={selected?.id ?? "none"}
        photo={selected}
        onClose={() => setSelected(null)}
        onRequireGate={() => {}}
        onChanged={refresh}
      />
    </div>
  );
}

interface EventGroup {
  event: string; // "" = unsorted
  list: PhotoDTO[];
  earliest: number;
}

function groupByEvent(photos: PhotoDTO[]): EventGroup[] {
  const map = new Map<string, PhotoDTO[]>();
  for (const p of photos) {
    const key = p.event ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  const groups: EventGroup[] = [...map.entries()].map(([event, list]) => ({
    event,
    list,
    earliest: Math.min(
      ...list.map((p) => new Date(p.takenAt ?? p.createdAt).getTime()),
    ),
  }));
  // Tagged events chronological (by earliest photo); Unsorted last.
  groups.sort((a, b) => {
    if (a.event === "") return 1;
    if (b.event === "") return -1;
    return a.earliest - b.earliest;
  });
  return groups;
}

function EventSections({
  photos,
  onOpen,
}: {
  photos: PhotoDTO[];
  onOpen: (p: PhotoDTO) => void;
}) {
  const groups = groupByEvent(photos);

  // No events tagged yet → plain wall.
  if (groups.length === 1 && groups[0].event === "") {
    return <Wall photos={photos} onOpen={onOpen} />;
  }

  return (
    <div className="space-y-16">
      {groups.map((g) => (
        <section key={g.event || "__unsorted"}>
          <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2">
            <h2 className="font-display text-2xl font-semibold text-cream sm:text-3xl">
              {g.event || "Unsorted"}
            </h2>
            <span className="font-mono text-[11px] tracking-widest text-cream-muted uppercase">
              {g.list.length} {g.list.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          <Wall photos={g.list} onOpen={onOpen} />
        </section>
      ))}
    </div>
  );
}

function EmptyState({ onPin }: { onPin: () => void }) {
  return (
    <div className="flex min-h-[52vh] items-center justify-center">
      <div className="w-full max-w-sm -rotate-1">
        <button
          type="button"
          onClick={onPin}
          className="block w-full rounded-[3px] bg-print p-3 pb-5 text-left shadow-[var(--shadow-print)] transition-transform hover:-translate-y-1 hover:rotate-0"
        >
          <div className="flex aspect-4/5 items-center justify-center rounded-[2px] border border-dashed border-black/15 bg-[#efe9dc]">
            <span className="font-mono text-[11px] tracking-widest text-black/30 uppercase">
              no exposures yet
            </span>
          </div>
          <p className="mt-3 text-center font-hand text-2xl text-black/70">
            the album&rsquo;s still blank — pin the first photo.
          </p>
        </button>
      </div>
    </div>
  );
}
