import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Changed from plaintext password to hash
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
  shareCode: text("share_code").unique(), // Now uses UUIDs via randomUUID() in storage
});

// DJ Tables with UUID primary keys
export const djTracks = pgTable("dj_tracks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  url: text("url").notNull(),
  duration: decimal("duration", { precision: 10, scale: 3 }).notNull(), // Duration in seconds
  bpm: integer("bpm"), // Beats per minute
  key: text("key"), // Musical key (e.g., "Am", "C#m")
  waveformData: json("waveform_data"), // JSON array of waveform peaks
  genre: text("genre"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const djSets = pgTable("dj_sets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  trackIds: text("track_ids").array().notNull().default([]), // Array of track UUIDs
  description: text("description"),
  duration: decimal("duration", { precision: 10, scale: 3 }), // Total duration in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cuePoints = pgTable("cue_points", {
  id: varchar("id", { length: 36 }).primaryKey(),
  trackId: varchar("track_id", { length: 36 }).references(() => djTracks.id).notNull(),
  name: text("name").notNull(),
  timePosition: decimal("time_position", { precision: 10, scale: 3 }).notNull(), // Time in seconds
  color: text("color").notNull().default("#ff0000"), // Hex color code
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loops = pgTable("loops", {
  id: varchar("id", { length: 36 }).primaryKey(),
  trackId: varchar("track_id", { length: 36 }).references(() => djTracks.id).notNull(),
  name: text("name").notNull(),
  startTime: decimal("start_time", { precision: 10, scale: 3 }).notNull(), // Start time in seconds
  endTime: decimal("end_time", { precision: 10, scale: 3 }).notNull(), // End time in seconds
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moodTransitions = pgTable("mood_transitions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  currentMood: text("current_mood").notNull(), // e.g., "energetic", "chill", "dark"
  desiredMood: text("desired_mood").notNull(),
  transitionType: text("transition_type").notNull(), // e.g., "fade", "cut", "scratch"
  generatedTrackId: varchar("generated_track_id", { length: 36 }).references(() => djTracks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionEvents = pgTable("session_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(), // UUID for the DJ session
  eventType: text("event_type").notNull(), // e.g., "track_start", "cue_triggered", "loop_enabled"
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: json("data").notNull(), // JSON object with event-specific data
});

// Schemas for insertion
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  passwordHash: true, // Changed from password to passwordHash
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

// DJ insert schemas - omit id for server-side UUID generation
export const insertDjTrackSchema = createInsertSchema(djTracks).omit({
  id: true,
  createdAt: true,
});

export const insertDjSetSchema = createInsertSchema(djSets).omit({
  id: true,
  createdAt: true,
});

export const insertCuePointSchema = createInsertSchema(cuePoints).omit({
  id: true,
  createdAt: true,
});

export const insertLoopSchema = createInsertSchema(loops).omit({
  id: true,
  createdAt: true,
});

export const insertMoodTransitionSchema = createInsertSchema(moodTransitions).omit({
  id: true,
  createdAt: true,
});

export const insertSessionEventSchema = createInsertSchema(sessionEvents).omit({
  id: true,
  timestamp: true,
});

// Update schemas for PATCH operations - only allow mutable fields
export const updateSoundLibrarySchema = createInsertSchema(soundLibraries).pick({
  name: true,
});

export const updateSoundSampleSchema = createInsertSchema(soundSamples).pick({
  name: true,
  description: true,
}).partial();

export const updateNoteMappingSchema = createInsertSchema(noteMappings).pick({
  sampleId: true,
});

export const updateRecordingSchema = createInsertSchema(recordings).pick({
  name: true,
  description: true,
  isPublic: true,
}).partial();

export const updateDjTrackSchema = createInsertSchema(djTracks).pick({
  title: true,
  artist: true,
  url: true,
  duration: true,
  bpm: true,
  key: true,
  waveformData: true,
  genre: true,
}).partial();

export const updateDjSetSchema = createInsertSchema(djSets).pick({
  name: true,
  trackIds: true,
  description: true,
  duration: true,
}).partial();

export const updateCuePointSchema = createInsertSchema(cuePoints).pick({
  name: true,
  timePosition: true,
  color: true,
}).partial();

export const updateLoopSchema = createInsertSchema(loops).pick({
  name: true,
  startTime: true,
  endTime: true,
  isActive: true,
}).partial();

export const updateMoodTransitionSchema = createInsertSchema(moodTransitions).pick({
  currentMood: true,
  desiredMood: true,
  transitionType: true,
  generatedTrackId: true,
}).partial();

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

// DJ type definitions
export type InsertDjTrack = z.infer<typeof insertDjTrackSchema>;
export type DjTrack = typeof djTracks.$inferSelect;

export type InsertDjSet = z.infer<typeof insertDjSetSchema>;
export type DjSet = typeof djSets.$inferSelect;

export type InsertCuePoint = z.infer<typeof insertCuePointSchema>;
export type CuePoint = typeof cuePoints.$inferSelect;

export type InsertLoop = z.infer<typeof insertLoopSchema>;
export type Loop = typeof loops.$inferSelect;

export type InsertMoodTransition = z.infer<typeof insertMoodTransitionSchema>;
export type MoodTransition = typeof moodTransitions.$inferSelect;

export type InsertSessionEvent = z.infer<typeof insertSessionEventSchema>;
export type SessionEvent = typeof sessionEvents.$inferSelect;

// Update type definitions
export type UpdateSoundLibrary = z.infer<typeof updateSoundLibrarySchema>;
export type UpdateSoundSample = z.infer<typeof updateSoundSampleSchema>;
export type UpdateNoteMapping = z.infer<typeof updateNoteMappingSchema>;
export type UpdateRecording = z.infer<typeof updateRecordingSchema>;
export type UpdateDjTrack = z.infer<typeof updateDjTrackSchema>;
export type UpdateDjSet = z.infer<typeof updateDjSetSchema>;
export type UpdateCuePoint = z.infer<typeof updateCuePointSchema>;
export type UpdateLoop = z.infer<typeof updateLoopSchema>;
export type UpdateMoodTransition = z.infer<typeof updateMoodTransitionSchema>;
