"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Floating background-music toggle. Off by default (browsers block autoplay
 * with sound); one tap fetches the presigned audio URL, then plays it looped
 * and quiet as ambience. Toggles play/pause thereafter.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = useCallback(async () => {
    // Pause if already playing.
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    // First tap: create the element and load the source.
    if (!audioRef.current) {
      setLoading(true);
      try {
        const res = await fetch("/api/audio", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error("audio unavailable");
        const audio = new Audio(json.data.url);
        audio.loop = true;
        audio.volume = 0.45;
        audio.addEventListener("ended", () => setPlaying(false));
        audioRef.current = audio;
      } catch {
        setFailed(true);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setFailed(true);
    }
  }, [playing]);

  if (failed) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause music" : "Play music"}
      aria-pressed={playing}
      className="fixed right-5 bottom-5 z-[60] flex items-center gap-2 rounded-full border border-line bg-ink-raised/90 px-4 py-2 font-mono text-xs tracking-wide text-cream shadow-lg backdrop-blur-sm transition-colors hover:border-safelight-dim hover:text-safelight"
    >
      <span aria-hidden className={playing ? "text-safelight" : ""}>
        {loading ? "…" : playing ? "❚❚" : "♪"}
      </span>
      <span className="hidden sm:inline">
        {loading ? "loading" : playing ? "pause" : "play music"}
      </span>
    </button>
  );
}
