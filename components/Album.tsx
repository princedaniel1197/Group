"use client";

import { useState, useCallback } from "react";
import { Wall } from "./Wall";
import { Lightbox } from "./Lightbox";
import { Composer } from "./Composer";
import { MusicToggle } from "./MusicToggle";
import { fetchPhotos } from "@/lib/api";
import type { PhotoDTO, PhotosListDTO } from "@/lib/types";

interface AlbumProps {
  initial: PhotosListDTO;
}

/**
 * Client orchestrator: holds the wall state and coordinates the composer and
 * lightbox. Contributing is open — no passphrase.
 */
export function Album({ initial }: AlbumProps) {
  const [photos, setPhotos] = useState<PhotoDTO[]>(initial.photos);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selected, setSelected] = useState<PhotoDTO | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPhotos();
      setPhotos(data.photos);
    } catch {
      // leave the current wall in place on a transient failure
    }
  }, []);

  const onPin = useCallback(() => setComposerOpen(true), []);

  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-10 pb-6 sm:px-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-safelight shadow-[0_0_14px_2px_var(--safelight)]"
          />
          <div>
            <h1 className="font-display text-3xl leading-none font-semibold tracking-tight text-cream sm:text-4xl">
              keepsake
            </h1>
            <p className="mt-1 font-mono text-[11px] tracking-widest text-cream-muted uppercase">
              a shared album, developed by hand
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPin}
          className="rounded-full border border-line bg-ink-raised px-5 py-2 font-mono text-xs tracking-wide text-cream transition-colors hover:border-safelight-dim hover:text-safelight"
        >
          pin a photo
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 sm:px-10">
        {photos.length === 0 ? (
          <EmptyState onPin={onPin} />
        ) : (
          <EventSections photos={photos} onOpen={setSelected} />
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
