"use client";

import { useState, useEffect } from "react";

const KEY = "keepsake_entered";

/**
 * Cinematic entry splash (OTT-style). Shows on each new browser session until
 * the visitor presses Enter, then fades away to reveal the album.
 */
export function IntroGate() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // One-shot: hide the splash if this session already entered. SSR can't read
    // sessionStorage, so this runs client-side only.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (sessionStorage.getItem(KEY)) setShow(false);
    } catch {
      // sessionStorage unavailable — just show the splash.
    }
  }, []);

  function enter() {
    setLeaving(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    window.setTimeout(() => setShow(false), 750);
  }

  if (!show) return null;

  return (
    <div
      className={`atmosphere fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink px-6 text-center transition-opacity duration-700 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <span
        aria-hidden
        className="intro-rise mb-6 inline-block h-3 w-3 rounded-full bg-safelight shadow-[0_0_28px_6px_var(--safelight)]"
      />
      <h1 className="intro-rise font-display text-5xl font-semibold tracking-tight text-cream sm:text-7xl">
        keepsake
      </h1>
      <p className="intro-rise-2 mt-4 max-w-md font-hand text-2xl text-cream-muted sm:text-3xl">
        a shared keepsake — every moment we kept.
      </p>
      <button
        type="button"
        onClick={enter}
        className="intro-rise-3 mt-10 rounded-full bg-safelight px-8 py-3 font-mono text-sm font-semibold tracking-widest text-ink uppercase transition-transform hover:scale-105"
      >
        enter
      </button>
      <p className="intro-rise-3 mt-4 font-mono text-[10px] tracking-widest text-cream-muted/60 uppercase">
        step inside
      </p>
    </div>
  );
}
