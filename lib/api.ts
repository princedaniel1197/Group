import type {
  ApiResponse,
  PhotosListDTO,
  PresignDTO,
  CommentDTO,
  ReactionToggleDTO,
  ProfileDTO,
} from "./types";
import { ALLOWED_CONTENT_TYPE } from "./constants";

/**
 * Client-side API wrapper. Unwraps the `{ success, data }` envelope and throws
 * an Error (with `.status`) on failure. Safe to import from client components.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // fall through to status-based error
  }
  if (!res.ok || !json || json.success === false) {
    const message =
      json && json.success === false
        ? json.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return json.data;
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => unwrap<T>(res));
}

function putJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => unwrap<T>(res));
}

export function saveProfile(
  name: string,
  data: { intro: string | null; dob: string | null; milestones: { date: string; text: string }[] },
): Promise<ProfileDTO> {
  return putJson(`/api/profiles/${encodeURIComponent(name)}`, data);
}

export function saveSetting(
  key: string,
  value: string | null,
): Promise<{ value: string | null }> {
  return putJson(`/api/settings/${encodeURIComponent(key)}`, { value });
}

export function verifyPassphrase(passphrase: string): Promise<{ ok: true }> {
  return postJson("/api/gate", { passphrase });
}

export function fetchPhotos(): Promise<PhotosListDTO> {
  return fetch("/api/photos", { cache: "no-store" }).then((res) =>
    unwrap<PhotosListDTO>(res),
  );
}

export function presignUpload(input: {
  originalSize: number;
  thumbSize: number;
}): Promise<PresignDTO> {
  return postJson("/api/uploads/presign", {
    contentType: ALLOWED_CONTENT_TYPE,
    originalSize: input.originalSize,
    thumbSize: input.thumbSize,
  });
}

/** PUT a blob straight to the bucket via its presigned URL (§7 step 3). */
export async function putToBucket(url: string, blob: Blob): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": ALLOWED_CONTENT_TYPE },
    body: blob,
  });
  if (!res.ok) {
    throw new ApiError(`Upload failed (${res.status})`, res.status);
  }
}

export function createPhoto(input: {
  storageKey: string;
  thumbKey: string;
  caption: string | null;
  authorName: string;
  width: number;
  height: number;
  takenAt: string | null;
}): Promise<{ id: string }> {
  return postJson("/api/photos", input);
}

export function fetchOriginalUrl(photoId: string): Promise<{ url: string }> {
  return fetch(`/api/photos/${photoId}/original`, { cache: "no-store" }).then(
    (res) => unwrap<{ url: string }>(res),
  );
}

export function toggleReaction(
  photoId: string,
  name: string,
): Promise<ReactionToggleDTO> {
  return postJson(`/api/photos/${photoId}/reactions`, { name });
}

export function setPhotoEvent(
  photoId: string,
  event: string | null,
): Promise<{ event: string | null }> {
  return postJson(`/api/photos/${photoId}/event`, { event });
}

export function fetchComments(photoId: string): Promise<CommentDTO[]> {
  return fetch(`/api/photos/${photoId}/comments`, { cache: "no-store" }).then(
    (res) => unwrap<CommentDTO[]>(res),
  );
}

export function addComment(
  photoId: string,
  input: { authorName: string; body: string },
): Promise<CommentDTO> {
  return postJson(`/api/photos/${photoId}/comments`, input);
}

export async function deletePhoto(photoId: string): Promise<void> {
  const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
  await unwrap<{ ok: true }>(res);
}
