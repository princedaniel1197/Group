import Link from "next/link";
import type { ReactNode } from "react";

/** Shared header: wordmark (home) + nav + optional right-side action. */
export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-8 pb-5 sm:px-10">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-safelight shadow-[0_0_14px_2px_var(--safelight)]"
          />
          <h1 className="font-display text-2xl leading-none font-semibold tracking-tight text-cream sm:text-3xl">
            keepsake
          </h1>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[11px] tracking-widest text-cream-muted uppercase">
          <Link href="/people" className="transition-colors hover:text-safelight">
            people
          </Link>
          <Link href="/calendar" className="transition-colors hover:text-safelight">
            calendar
          </Link>
          <Link href="/music" className="transition-colors hover:text-safelight">
            music
          </Link>
        </nav>
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
