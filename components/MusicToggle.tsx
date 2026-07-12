"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Background theme music. Tries to start on by default; browsers block
 * autoplay-with-sound, so if that's refused it starts on the visitor's first
 * interaction (tap / click / key / scroll). A floating button toggles it.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

    const removeInteractionListeners = () => {
      events.forEach((e) => window.removeEventListener(e, onFirstInteraction));
    };

    async function tryPlay() {
      const audio = audioRef.current;
      if (!audio) return false;
      try {
        await audio.play();
        if (!cancelled) setPlaying(true);
        return true;
      } catch {
        return false;
      }
    }

    async function onFirstInteraction() {
      const ok = await tryPlay();
      if (ok) removeInteractionListeners();
    }

    (async () => {
      try {
        const res = await fetch("/api/audio", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error("audio unavailable");
        if (cancelled) return;

        const audio = new Audio(json.data.url);
        audio.loop = true;
        audio.volume = 0.45;
        audio.preload = "auto";
        audioRef.current = audio;

        // Attempt to start immediately; fall back to first interaction.
        const started = await tryPlay();
        if (!started && !cancelled) {
          events.forEach((e) =>
            window.addEventListener(e, onFirstInteraction, { passive: true }),
          );
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      removeInteractionListeners();
      audioRef.current?.pause();
    };
  }, []);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        /* ignore */
      }
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
        {playing ? "❚❚" : "♪"}
      </span>
      <span className="hidden sm:inline">{playing ? "pause" : "play music"}</span>
    </button>
  );
}
