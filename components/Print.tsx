"use client";

import { rotationFor, dateStamp } from "@/lib/format";
import type { PhotoDTO } from "@/lib/types";

interface PrintProps {
  photo: PhotoDTO;
  onOpen: (photo: PhotoDTO) => void;
}

/**
 * A single framed print (§9): white paper, soft long shadow, a small stable
 * rotation by id hash, handwritten caption, mono amber date stamp, lift on hover.
 * Uses the presigned thumbnail directly from the bucket (no app-proxied image).
 */
export function Print({ photo, onOpen }: PrintProps) {
  const rotation = rotationFor(photo.id);
  const stamp = dateStamp(photo.takenAt ?? photo.createdAt, photo.authorName);
  const ratio = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 4 / 5;

  return (
    <div className="mb-6 break-inside-avoid">
      <button
        type="button"
        onClick={() => onOpen(photo)}
        style={{ ["--rot" as string]: `${rotation}deg` }}
        className="group block w-full rotate-[var(--rot)] transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1 hover:rotate-0 focus-visible:-translate-y-1 focus-visible:rotate-0"
        aria-label={
          photo.caption
            ? `Open photo: ${photo.caption}`
            : `Open photo by ${photo.authorName}`
        }
      >
        <div className="rounded-[3px] bg-print p-2.5 pb-4 shadow-[var(--shadow-print)] transition-shadow duration-300 group-hover:shadow-[0_28px_50px_-20px_rgba(0,0,0,0.8)]">
          <div className="overflow-hidden rounded-[2px] bg-[#e7e0d2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl}
              alt={photo.altText ?? photo.caption ?? `Photo by ${photo.authorName}`}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              style={{ aspectRatio: String(ratio) }}
              className="w-full object-cover"
            />
          </div>

          {photo.caption ? (
            <p className="mt-2 px-1 text-center font-hand text-2xl leading-tight text-black/75">
              {photo.caption}
            </p>
          ) : null}

          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] tracking-wide text-safelight-dim">
              {stamp}
            </span>
            {photo.hearts > 0 ? (
              <span className="font-mono text-[10px] text-black/40">
                ♥ {photo.hearts}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}
