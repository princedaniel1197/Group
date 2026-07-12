import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { listPeople } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await listPeople();

  return (
    <div className="atmosphere relative flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 sm:px-10">
        <h2 className="mb-6 font-display text-2xl font-semibold text-cream sm:text-3xl">
          the group
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {people.map((p) => (
            <Link
              key={p.name}
              href={`/people/${encodeURIComponent(p.name)}`}
              className="group rounded-lg border border-line bg-ink-raised p-4 transition-colors hover:border-safelight-dim"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-safelight/15 font-display text-lg font-semibold text-safelight">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-cream group-hover:text-safelight">
                    {p.name}
                  </p>
                  <p className="font-mono text-[10px] tracking-widest text-cream-muted uppercase">
                    {p.photoCount} {p.photoCount === 1 ? "photo" : "photos"}
                  </p>
                </div>
              </div>
              {p.intro ? (
                <p className="mt-3 line-clamp-2 text-sm text-cream-muted">
                  {p.intro}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
