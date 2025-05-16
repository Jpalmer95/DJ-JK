import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const soundLibraries = pgTable("sound_libraries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const soundSamples = pgTable("sound_samples", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => soundLibraries.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  audioData: text("audio_data").notNull(), // Base64 encoded audio data
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

export const noteMappings = pgTable("note_mappings", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => soundLibraries.id).notNull(),
  note: text("note").notNull(), // e.g., "C3", "D4"
  sampleId: integer("sample_id").references(() => soundSamples.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure a note can only map to one sample within a library
    uniqueNotePerLibrary: uniqueIndex("unique_note_per_library").on(table.libraryId, table.note),
  };
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  data: json("data").notNull(), // JSON record of notes, timings, etc.
  soundMode: text("sound_mode").notNull(),
  beatPattern: text("beat_pattern").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  shareCode: text("share_code").unique(),
});

// Schemas for insertion
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSoundLibrarySchema = createInsertSchema(soundLibraries).pick({
  userId: true,
  name: true,
});

export const insertSoundSampleSchema = createInsertSchema(soundSamples).pick({
  libraryId: true,
  name: true,
  description: true,
  audioData: true,
  mimeType: true,
});

export const insertNoteMappingSchema = createInsertSchema(noteMappings).pick({
  libraryId: true,
  note: true,
  sampleId: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  userId: true,
  name: true,
  description: true,
  data: true,
  soundMode: true,
  beatPattern: true,
  isPublic: true,
  shareCode: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSoundLibrary = z.infer<typeof insertSoundLibrarySchema>;
export type SoundLibrary = typeof soundLibraries.$inferSelect;

export type InsertSoundSample = z.infer<typeof insertSoundSampleSchema>;
export type SoundSample = typeof soundSamples.$inferSelect;

export type InsertNoteMapping = z.infer<typeof insertNoteMappingSchema>;
export type NoteMapping = typeof noteMappings.$inferSelect;

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;
