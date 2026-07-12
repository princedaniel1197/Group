/** Shared DTOs between API routes and client components. No secrets/keys here. */

export interface PhotoDTO {
  id: string;
  thumbUrl: string; // presigned GET (TTL ~1h)
  width: number;
  height: number;
  caption: string | null;
  authorName: string;
  takenAt: string | null; // ISO string
  createdAt: string; // ISO string
  altText: string | null;
  tags: string[] | null;
  event: string | null;
  people: string[] | null;
  hearts: number;
  comments: number;
  viewerReacted: boolean; // this browser has a heart on it
  viewerOwns: boolean; // this browser may delete it
}

export interface PhotosListDTO {
  photos: PhotoDTO[];
  viewer: { isContributor: boolean };
}

export interface CommentDTO {
  id: string;
  authorName: string;
  body: string;
  createdAt: string; // ISO string
}

export interface PresignDTO {
  photoId: string;
  storageKey: string;
  thumbKey: string;
  originalUrl: string;
  thumbUrl: string;
}

export interface ReactionToggleDTO {
  reacted: boolean;
  hearts: number;
}

export interface Milestone {
  date: string; // YYYY-MM or YYYY-MM-DD
  text: string;
}

export interface ProfileDTO {
  name: string;
  intro: string | null;
  dob: string | null;
  milestones: Milestone[];
}

/** API envelope (mirrors lib/http.ts). */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
