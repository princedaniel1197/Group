/** Shared constants (limits, keys, TTLs). Safe to import anywhere. */

// Only JPEG is accepted — the canvas pipeline (§7) always re-encodes to JPEG,
// which is also what strips EXIF/GPS.
export const ALLOWED_CONTENT_TYPE = "image/jpeg";

// Upload size ceilings (bytes), validated at presign time (§10).
export const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024; // ~12 MB display image
export const MAX_THUMB_BYTES = 1 * 1024 * 1024; //  ~1 MB thumbnail

// Client-side canvas targets (§7).
export const DISPLAY_MAX_EDGE = 2560;
export const DISPLAY_QUALITY = 0.9;
export const THUMB_MAX_EDGE = 600;
export const THUMB_QUALITY = 0.8;

// Presigned URL TTLs in seconds (§10).
export const TTL_UPLOAD = 5 * 60; // PUT for upload
export const TTL_THUMB = 60 * 60; // GET thumbnail (cacheable)
export const TTL_ORIGINAL = 15 * 60; // GET original (lightbox)

// Field limits.
export const MAX_CAPTION_LEN = 280;
export const MAX_NAME_LEN = 40;
export const MAX_COMMENT_LEN = 1000;

// Cookie names.
export const COOKIE_CONTRIBUTOR = "keepsake_contributor";
export const COOKIE_CLIENT_ID = "keepsake_client_id";

// Contributor cookie lifetime (seconds) — 30 days (§6).
export const CONTRIBUTOR_MAX_AGE = 30 * 24 * 60 * 60;
// Client id is long-lived so "one heart per person" and "delete own" persist.
export const CLIENT_ID_MAX_AGE = 365 * 24 * 60 * 60;

/** Object keys for a photo id (§5). */
export function storageKeyFor(photoId: string): string {
  return `photos/${photoId}/original.jpg`;
}
export function thumbKeyFor(photoId: string): string {
  return `photos/${photoId}/thumb.jpg`;
}
