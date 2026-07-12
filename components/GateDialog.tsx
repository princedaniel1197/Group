"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useDisplayName } from "./useDisplayName";
import { verifyPassphrase, ApiError } from "@/lib/api";
import { MAX_NAME_LEN } from "@/lib/constants";

interface GateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-md border border-line bg-ink px-3 py-2 text-cream placeholder:text-cream-muted/60 focus:border-safelight-dim";

/**
 * GateDialog — passphrase + display name (§6). On success, the server sets the
 * signed contributor cookie; we persist the name locally and resume the action.
 */
export function GateDialog({ open, onClose, onSuccess }: GateDialogProps) {
  const [name, setName] = useDisplayName();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Pick a display name so friends know who posted.");
      return;
    }
    if (!passphrase) {
      setError("Enter the passphrase.");
      return;
    }

    setBusy(true);
    try {
      await verifyPassphrase(passphrase);
      setName(trimmedName);
      setPassphrase("");
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "That passphrase isn't right."
          : "Couldn't verify — try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="gate-title">
      <h2
        id="gate-title"
        className="font-display text-2xl font-semibold text-cream"
      >
        Step into the darkroom
      </h2>
      <p className="mt-1 text-sm text-cream-muted">
        Enter the shared passphrase to post, and pick a name for your prints.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="gate-name"
            className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase"
          >
            display name
          </label>
          <input
            id="gate-name"
            type="text"
            value={name}
            maxLength={MAX_NAME_LEN}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mara"
            autoComplete="nickname"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="gate-pass"
            className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase"
          >
            passphrase
          </label>
          <input
            id="gate-pass"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="shared secret"
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-mono text-xs tracking-wide text-cream-muted hover:text-cream"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-safelight px-5 py-2 font-mono text-xs font-semibold tracking-wide text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "checking…" : "enter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
