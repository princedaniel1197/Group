"use client";

import { useMemo, useState } from "react";
import { Wall } from "./Wall";
import { Lightbox } from "./Lightbox";
import { useRouter } from "next/navigation";
import type { PhotoDTO } from "@/lib/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CalendarView({ photos }: { photos: PhotoDTO[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<PhotoDTO | null>(null);
  const [day, setDay] = useState<string | null>(null);

  // Group photos by YYYY-MM-DD.
  const byDay = useMemo(() => {
    const m = new Map<string, PhotoDTO[]>();
    for (const p of photos) {
      const k = dayKey(p.takenAt ?? p.createdAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  }, [photos]);

  // Months present (YYYY-M), most recent first.
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const k of byDay.keys()) {
      const [y, mo] = k.split("-");
      set.add(`${y}-${mo}`);
    }
    return [...set].sort().reverse();
  }, [byDay]);

  const dayPhotos = day ? (byDay.get(day) ?? []) : [];

  return (
    <div>
      <div className="grid gap-8 sm:grid-cols-2">
        {months.map((ym) => {
          const [y, mo] = ym.split("-").map(Number);
          const first = new Date(y, mo - 1, 1);
          const daysInMonth = new Date(y, mo, 0).getDate();
          const lead = first.getDay();
          const cells: (string | null)[] = [];
          for (let i = 0; i < lead; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++)
            cells.push(`${y}-${pad(mo)}-${pad(d)}`);

          return (
            <div key={ym} className="rounded-lg border border-line bg-ink-raised/40 p-4">
              <h3 className="mb-3 font-display text-lg text-cream">
                {first.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((w, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] text-cream-muted/60"
                  >
                    {w}
                  </span>
                ))}
                {cells.map((k, i) => {
                  if (!k) return <span key={i} />;
                  const list = byDay.get(k);
                  const n = Number(k.split("-")[2]);
                  if (!list) {
                    return (
                      <span
                        key={i}
                        className="py-1.5 font-mono text-[11px] text-cream-muted/30"
                      >
                        {n}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDay(day === k ? null : k)}
                      style={{ backgroundImage: `url(${list[0].thumbUrl})` }}
                      className={`relative aspect-square overflow-hidden rounded bg-cover bg-center font-mono text-[11px] font-semibold text-cream ring-1 transition-all ${
                        day === k ? "ring-2 ring-safelight" : "ring-line hover:ring-safelight-dim"
                      }`}
                    >
                      <span className="absolute inset-0 bg-black/40" />
                      <span className="absolute top-0.5 left-1">{n}</span>
                      <span className="absolute right-1 bottom-0.5 text-safelight">
                        {list.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {day ? (
        <section className="mt-10">
          <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2">
            <h3 className="font-display text-2xl font-semibold text-cream">
              {new Date(day).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <span className="font-mono text-[11px] tracking-widest text-cream-muted uppercase">
              {dayPhotos.length} {dayPhotos.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          <Wall photos={dayPhotos} onOpen={setSelected} />
        </section>
      ) : (
        <p className="mt-8 font-hand text-2xl text-cream-muted">
          tap a day to see its photos.
        </p>
      )}

      <Lightbox
        key={selected?.id ?? "none"}
        photo={selected}
        onClose={() => setSelected(null)}
        onRequireGate={() => {}}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}
