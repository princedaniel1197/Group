"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/api";
import type { Milestone } from "@/lib/types";

interface Props {
  name: string;
  intro: string | null;
  dob: string | null;
  milestones: Milestone[];
}

const inputClass =
  "w-full rounded-md border border-line bg-ink px-3 py-2 text-cream placeholder:text-cream-muted/60 focus:border-safelight-dim";

export function ProfileEditor({ name, intro, dob, milestones }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [introV, setIntroV] = useState(intro ?? "");
  const [dobV, setDobV] = useState(dob ?? "");
  const [ms, setMs] = useState<Milestone[]>(milestones ?? []);
  const [busy, setBusy] = useState(false);

  function addMilestone() {
    setMs((prev) => [...prev, { date: "", text: "" }]);
  }
  function updateMilestone(i: number, patch: Partial<Milestone>) {
    setMs((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function removeMilestone(i: number) {
    setMs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      await saveProfile(name, {
        intro: introV.trim() || null,
        dob: dobV.trim() || null,
        milestones: ms.filter((m) => m.text.trim()),
      });
      setOpen(false);
      router.refresh();
    } catch {
      // keep the form open on failure
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-line bg-ink-raised px-4 py-1.5 font-mono text-xs tracking-wide text-cream-muted transition-colors hover:border-safelight-dim hover:text-safelight"
      >
        edit profile
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-ink-raised p-5">
      <div>
        <label className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase">
          intro
        </label>
        <textarea
          value={introV}
          maxLength={1000}
          rows={3}
          onChange={(e) => setIntroV(e.target.value)}
          placeholder="a line or two about them…"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase">
          date of birth
        </label>
        <input
          type="date"
          value={dobV}
          onChange={(e) => setDobV(e.target.value)}
          className={`${inputClass} [color-scheme:dark]`}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="font-mono text-[11px] tracking-widest text-cream-muted uppercase">
            milestones
          </label>
          <button
            type="button"
            onClick={addMilestone}
            className="font-mono text-[11px] text-safelight hover:opacity-80"
          >
            + add
          </button>
        </div>
        <div className="space-y-2">
          {ms.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="month"
                value={m.date}
                onChange={(e) => updateMilestone(i, { date: e.target.value })}
                className={`${inputClass} w-36 [color-scheme:dark]`}
              />
              <input
                type="text"
                value={m.text}
                maxLength={200}
                onChange={(e) => updateMilestone(i, { text: e.target.value })}
                placeholder="graduated, started a business…"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeMilestone(i)}
                aria-label="Remove milestone"
                className="px-2 font-mono text-cream-muted hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2 font-mono text-xs tracking-wide text-cream-muted hover:text-cream"
        >
          cancel
        </button>
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
  );
}
