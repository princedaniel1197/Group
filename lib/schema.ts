import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  unique,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * keepsake data model (spec §5).
 *
 * No `users` table — a contributor is identified by a display name plus a
 * browser-generated `client_id` (random UUID in a cookie). That pair is enough
 * to scope "delete your own photo" and "one heart per person".
 */

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull(), // photos/{id}/original.jpg
    thumbKey: text("thumb_key").notNull(), // photos/{id}/thumb.jpg
    caption: text("caption"),
    authorName: text("author_name").notNull(),
    authorClientId: text("author_client_id").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }), // from EXIF if available
    altText: text("alt_text"), // filled by enrichment later (§8)
    tags: text("tags").array(), // filled by enrichment later (§8)
    event: text("event"), // which occasion this photo is from (single event)
    people: text("people").array(), // who's in the photo (face recognition)
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("photos_created_at_idx").on(t.createdAt)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    photoId: uuid("photo_id")
      .references(() => photos.id, { onDelete: "cascade" })
      .notNull(),
    clientId: text("client_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // one heart per person per photo
  (t) => [unique("reactions_one_each").on(t.photoId, t.clientId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    photoId: uuid("photo_id")
      .references(() => photos.id, { onDelete: "cascade" })
      .notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("comments_photo_id_idx").on(t.photoId)],
);

export interface Milestone {
  date: string; // YYYY-MM or YYYY-MM-DD
  text: string;
}

// Per-person profile for the personal pages.
export const profiles = pgTable("profiles", {
  name: text("name").primaryKey(),
  intro: text("intro"),
  dob: text("dob"), // YYYY-MM-DD
  milestones: jsonb("milestones").$type<Milestone[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Profile = typeof profiles.$inferSelect;

// Simple key/value site settings (e.g. the group's Spotify playlist URL).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Inferred row types for use across the app.
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
