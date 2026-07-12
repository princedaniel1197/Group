"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useDisplayName } from "./useDisplayName";
import { dateStamp } from "@/lib/format";
import {
  fetchOriginalUrl,
  fetchComments,
  addComment,
  toggleReaction,
  deletePhoto,
  ApiError,
} from "@/lib/api";
import { MAX_COMMENT_LEN } from "@/lib/constants";
import type { PhotoDTO, CommentDTO } from "@/lib/types";

interface LightboxProps {
  photo: PhotoDTO | null;
  onClose: () => void;
  onRequireGate: () => void; // called when a gated action needs the passphrase
  onChanged: () => void; // refresh the wall (hearts/comments/delete)
}

/**
 * Lightbox (§9) — large bordered print, caption, meta row with heart +
 * comments + (own) delete. Requests the presigned original on open.
 */
export function Lightbox({
  photo,
  onClose,
  onRequireGate,
  onChanged,
}: LightboxProps) {
  const [name, setName] = useDisplayName();
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [commentBody, setCommentBody] = useState("");
  // Seeded from the incoming photo; the parent remounts via `key` per photo,
  // so lazy initializers reset these cleanly without a sync effect.
  const [hearts, setHearts] = useState(photo?.hearts ?? 0);
  const [reacted, setReacted] = useState(photo?.viewerReacted ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoId = photo?.id ?? null;

  // Load original URL + comments when a photo opens.
  useEffect(() => {
    if (!photoId) return;
    let cancelled = false;
    fetchOriginalUrl(photoId)
      .then((r) => !cancelled && setOriginalUrl(r.url))
      .catch(() => {});
    fetchComments(photoId)
      .then((c) => !cancelled && setComments(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  const onHeart = useCallback(async () => {
    if (!photo) return;
    setError(null);
    const who = name.trim() || "friend";
    try {
      const res = await toggleReaction(photo.id, who);
      setHearts(res.hearts);
      setReacted(res.reacted);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onRequireGate();
      else setError("Couldn't update your heart.");
    }
  }, [photo, name, onChanged, onRequireGate]);

  async function onAddComment(e: FormEvent) {
    e.preventDefault();
    if (!photo) return;
    setError(null);
    const who = name.trim();
    const body = commentBody.trim();
    if (!who) return setError("Add your name to comment.");
    if (!body) return;

    setBusy(true);
    try {
      const created = await addComment(photo.id, { authorName: who, body });
      setName(who);
      setComments((prev) => [...prev, created]);
      setCommentBody("");
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onRequireGate();
      else setError("Couldn't post that comment.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!photo) return;
    if (!window.confirm("Delete this photo for everyone? This can't be undone."))
      return;
    setBusy(true);
    setError(null);
    try {
      await deletePhoto(photo.id);
      onChanged();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onRequireGate();
      else setError("Couldn't delete that photo.");
    } finally {
      setBusy(false);
    }
  }

  if (!photo) return null;
  const stamp = dateStamp(photo.takenAt ?? photo.createdAt, photo.authorName);

  return (
    <Modal open={true} onClose={onClose} labelledBy="lightbox-title" size="lg">
      <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr]">
        {/* The print */}
        <div className="rounded-[3px] bg-print p-3 pb-5 shadow-[var(--shadow-print)]">
          <div className="overflow-hidden rounded-[2px] bg-[#e7e0d2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl ?? photo.thumbUrl}
              alt={
                photo.altText ?? photo.caption ?? `Photo by ${photo.authorName}`
              }
              className="max-h-[60vh] w-full object-contain"
            />
          </div>
          {photo.caption ? (
            <p className="mt-3 text-center font-hand text-3xl leading-tight text-black/75">
              {photo.caption}
            </p>
          ) : null}
          <p className="mt-2 text-center font-mono text-[11px] tracking-wide text-safelight-dim">
            {stamp}
          </p>
        </div>

        {/* Meta + comments */}
        <div className="flex min-h-0 flex-col">
          <h2 id="lightbox-title" className="sr-only">
            Photo by {photo.authorName}
          </h2>

          <div className="flex items-center gap-4 border-b border-line pb-3">
            <button
              type="button"
              onClick={onHeart}
              aria-pressed={reacted}
              className={`flex items-center gap-1.5 font-mono text-sm transition-colors ${
                reacted ? "text-safelight" : "text-cream-muted hover:text-cream"
              }`}
            >
              <span aria-hidden>{reacted ? "♥" : "♡"}</span>
              {hearts}
            </button>
            <span className="font-mono text-sm text-cream-muted">
              💬 {comments.length}
            </span>
            {photo.viewerOwns ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="ml-auto font-mono text-xs tracking-wide text-red-300/80 hover:text-red-300 disabled:opacity-50"
              >
                delete
              </button>
            ) : null}
          </div>

          <ul className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <li className="font-hand text-xl text-cream-muted/70">
                no notes yet…
              </li>
            ) : (
              comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-mono text-[11px] tracking-wide text-safelight-dim">
                    {c.authorName}
                  </span>
                  <p className="text-cream/90">{c.body}</p>
                </li>
              ))
            )}
          </ul>

          {error ? (
            <p role="alert" className="mt-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <form onSubmit={onAddComment} className="mt-3 border-t border-line pt-3">
            <textarea
              value={commentBody}
              maxLength={MAX_COMMENT_LEN}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={2}
              placeholder="leave a note…"
              className="w-full rounded-md border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream-muted/60 focus:border-safelight-dim"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={busy || !commentBody.trim()}
                className="rounded-full bg-ink px-4 py-1.5 font-mono text-xs tracking-wide text-cream ring-1 ring-line hover:ring-safelight-dim disabled:opacity-50"
              >
                post note
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
