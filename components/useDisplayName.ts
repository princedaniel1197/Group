"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "keepsake_name";
const EVENT = "keepsake-name-change";

/**
 * Display name lives in the browser (localStorage) — it is not a secret (§6).
 *
 * Backed by useSyncExternalStore so it is SSR-safe (server snapshot is "") and
 * stays in sync across tabs and components. Returns [name, setName].
 */

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function getSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

export function useDisplayName(): readonly [string, (v: string) => void] {
  const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setName = useCallback((value: string) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // localStorage unavailable (private mode) — ignore persistence failure.
    }
    // Notify this tab's subscribers (the `storage` event only fires cross-tab).
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [name, setName] as const;
}
