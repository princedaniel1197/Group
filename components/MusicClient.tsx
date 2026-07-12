"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSetting } from "@/lib/api";

function playlistEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/playlist\/([A-Za-z0-9]+)/);
  return m
    ? `https://open.spotify.com/embed/playlist/${m[1]}?utm_source=generator&theme=0`
    : null;
}

const inputClass =
  "w-full rounded-md border border-line bg-ink px-3 py-2 text-cream placeholder:text-cream-muted/60 focus:border-safelight-dim";

export function MusicClient({
  playlist,
  jam,
}: {
  playlist: string | null;
  jam: string | null;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [pl, setPl] = useState(playlist ?? "");
  const [jm, setJm] = useState(jam ?? "");
  const [busy, setBusy] = useState(false);
  const embed = playlistEmbed(playlist);

  async function save() {
    setBusy(true);
    try {
      await Promise.all([
        saveSetting("spotify_playlist", pl.trim() || null),
        saveSetting("spotify_jam", jm.trim() || null),
      ]);
      setEdit(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {embed ? (
        <iframe
          title="Group playlist"
          src={embed}
          width="100%"
          height={480}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="rounded-xl border border-line"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-ink-raised/40 p-10 text-center">
          <p className="font-hand text-2xl text-cream-muted">
            no playlist yet — add the group&rsquo;s Spotify playlist below.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {jam ? (
          <a
            href={jam}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-safelight px-5 py-2 font-mono text-xs font-semibold tracking-widest text-ink uppercase transition-opacity hover:opacity-90"
          >
            join the jam ↗
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setEdit((v) => !v)}
          className="rounded-full border border-line bg-ink-raised px-4 py-2 font-mono text-xs tracking-wide text-cream-muted transition-colors hover:border-safelight-dim hover:text-safelight"
        >
          {edit ? "close" : "edit links"}
        </button>
      </div>

      {edit ? (
        <div className="space-y-4 rounded-lg border border-line bg-ink-raised p-5">
          <div>
            <label className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase">
              Spotify playlist link
            </label>
            <input
              value={pl}
              onChange={(e) => setPl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase">
              Spotify Jam link <span className="normal-case">(optional)</span>
            </label>
            <input
              value={jm}
              onChange={(e) => setJm(e.target.value)}
              placeholder="https://spotify.link/…"
              className={inputClass}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-safelight px-5 py-2 font-mono text-xs font-semibold tracking-wide text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "saving…" : "save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
