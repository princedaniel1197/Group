"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useDisplayName } from "./useDisplayName";
import { processImage } from "@/lib/image";
import {
  presignUpload,
  putToBucket,
  createPhoto,
  ApiError,
} from "@/lib/api";
import { MAX_NAME_LEN, MAX_CAPTION_LEN } from "@/lib/constants";

interface ComposerProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  onAuthExpired: () => void;
}

const inputClass =
  "w-full rounded-md border border-line bg-ink px-3 py-2 text-cream placeholder:text-cream-muted/60 focus:border-safelight-dim";

/**
 * Composer — pick a file, produce a display image + thumbnail on a canvas
 * (strips EXIF/GPS), upload both straight to the bucket, then record the row.
 */
export function Composer({
  open,
  onClose,
  onUploaded,
  onAuthExpired,
}: ComposerProps) {
  const [name, setName] = useDisplayName();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the object URL when it changes or the composer unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function reset() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
    setStatus(null);
    setError(null);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  function close() {
    reset();
    onClose();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) return setError("Add a display name first.");
    if (!file) return setError("Pick a photo to pin.");

    setBusy(true);
    try {
      setStatus("developing the print…");
      const img = await processImage(file);

      setStatus("finding a spot on the wall…");
      const presign = await presignUpload({
        originalSize: img.display.size,
        thumbSize: img.thumb.size,
      });

      setStatus("pinning it up…");
      await Promise.all([
        putToBucket(presign.originalUrl, img.display),
        putToBucket(presign.thumbUrl, img.thumb),
      ]);

      await createPhoto({
        storageKey: presign.storageKey,
        thumbKey: presign.thumbKey,
        caption: caption.trim() || null,
        authorName: trimmedName,
        width: img.width,
        height: img.height,
        takenAt: img.takenAt ? img.takenAt.toISOString() : null,
      });

      setName(trimmedName);
      onUploaded();
      close();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't pin that photo — try again.",
        );
      }
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <Modal open={open} onClose={close} labelledBy="composer-title" size="lg">
      <h2
        id="composer-title"
        className="font-display text-2xl font-semibold text-cream"
      >
        Pin a new photo
      </h2>

      <form onSubmit={onSubmit} className="mt-5 grid gap-6 sm:grid-cols-2">
        {/* Left: preview */}
        <div className="order-2 sm:order-1">
          <div className="mx-auto max-w-xs -rotate-1 rounded-[3px] bg-print p-3 pb-5 shadow-[var(--shadow-print)]">
            <div className="flex aspect-4/5 items-center justify-center overflow-hidden rounded-[2px] bg-[#efe9dc]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-mono text-[11px] tracking-widest text-black/30 uppercase">
                  no photo yet
                </span>
              )}
            </div>
            <p className="mt-3 min-h-[1.75rem] text-center font-hand text-2xl text-black/70">
              {caption || " "}
            </p>
          </div>
        </div>

        {/* Right: fields */}
        <div className="order-1 space-y-4 sm:order-2">
          <div>
            <input
              ref={fileInputRef}
              id="composer-file"
              type="file"
              accept="image/*"
              onChange={onPick}
              className="block w-full text-sm text-cream-muted file:mr-3 file:rounded-full file:border file:border-line file:bg-ink file:px-4 file:py-2 file:font-mono file:text-xs file:text-cream hover:file:border-safelight-dim"
            />
            <p className="mt-1 font-mono text-[10px] tracking-wide text-cream-muted/70">
              re-encoded in your browser — location data is stripped.
            </p>
          </div>

          <div>
            <label
              htmlFor="composer-name"
              className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase"
            >
              your name
            </label>
            <input
              id="composer-name"
              type="text"
              value={name}
              maxLength={MAX_NAME_LEN}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mara"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="composer-caption"
              className="mb-1 block font-mono text-[11px] tracking-widest text-cream-muted uppercase"
            >
              caption <span className="normal-case">(optional)</span>
            </label>
            <textarea
              id="composer-caption"
              value={caption}
              maxLength={MAX_CAPTION_LEN}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="a few words…"
              className={inputClass}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            {status ? (
              <span
                aria-live="polite"
                className="mr-auto font-mono text-[11px] tracking-wide text-safelight"
              >
                {status}
              </span>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="rounded-full px-4 py-2 font-mono text-xs tracking-wide text-cream-muted hover:text-cream"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-safelight px-5 py-2 font-mono text-xs font-semibold tracking-wide text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "pinning…" : "pin it"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
