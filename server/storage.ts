import { 
  users, 
  soundLibraries, 
  soundSamples, 
  noteMappings, 
  recordings,
  type User, 
  type InsertUser, 
  type SoundLibrary, 
  type InsertSoundLibrary,
  type SoundSample,
  type InsertSoundSample,
  type NoteMapping,
  type InsertNoteMapping,
  type Recording,
  type InsertRecording 
} from "@shared/schema";
import { SharedRecording } from "./routes";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Shared recording methods
  getSharedRecording(id: string): Promise<SharedRecording | undefined>;
  saveSharedRecording(recording: SharedRecording): Promise<SharedRecording>;
  
  // Sound library methods
  createSoundLibrary(libraryData: InsertSoundLibrary): Promise<SoundLibrary>;
  getSoundLibraries(userId: number): Promise<SoundLibrary[]>;
  getSoundLibrary(id: number): Promise<SoundLibrary | undefined>;
  updateSoundLibrary(id: number, name: string): Promise<SoundLibrary | undefined>;
  deleteSoundLibrary(id: number): Promise<boolean>;
  
  // Sound sample methods
  createSoundSample(sampleData: InsertSoundSample): Promise<SoundSample>;
  getSoundSamples(libraryId: number): Promise<SoundSample[]>;
  getSoundSample(id: number): Promise<SoundSample | undefined>;
  updateSoundSample(id: number, updates: Partial<InsertSoundSample>): Promise<SoundSample | undefined>;
  deleteSoundSample(id: number): Promise<boolean>;
  
  // Note mapping methods
  createNoteMapping(mappingData: InsertNoteMapping): Promise<NoteMapping>;
  getNoteMappings(libraryId: number): Promise<NoteMapping[]>;
  getNoteMapping(libraryId: number, note: string): Promise<NoteMapping | undefined>;
  updateNoteMapping(id: number, sampleId: number): Promise<NoteMapping | undefined>;
  deleteNoteMapping(id: number): Promise<boolean>;
  
  // Recording methods
  createRecording(recordingData: InsertRecording): Promise<Recording>;
  getRecordings(userId?: number): Promise<Recording[]>;
  getRecording(id: number): Promise<Recording | undefined>;
  getRecordingByShareCode(shareCode: string): Promise<Recording | undefined>;
  updateRecording(id: number, updates: Partial<InsertRecording>): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sharedRecordings: Map<string, SharedRecording>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.sharedRecordings = new Map();
    this.currentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  // Shared recording methods
  async getSharedRecording(id: string): Promise<SharedRecording | undefined> {
    return this.sharedRecordings.get(id);
  }
  
  async saveSharedRecording(recording: SharedRecording): Promise<SharedRecording> {
    this.sharedRecordings.set(recording.id, recording);
    return recording;
  }
  
  // These methods are stubs since they're not used in MemStorage
  async createSoundLibrary(libraryData: InsertSoundLibrary): Promise<SoundLibrary> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async getSoundLibraries(userId: number): Promise<SoundLibrary[]> {
    return [];
  }
  
  async getSoundLibrary(id: number): Promise<SoundLibrary | undefined> {
    return undefined;
  }
  
  async updateSoundLibrary(id: number, name: string): Promise<SoundLibrary | undefined> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async deleteSoundLibrary(id: number): Promise<boolean> {
    return false;
  }
  
  async createSoundSample(sampleData: InsertSoundSample): Promise<SoundSample> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async getSoundSamples(libraryId: number): Promise<SoundSample[]> {
    return [];
  }
  
  async getSoundSample(id: number): Promise<SoundSample | undefined> {
    return undefined;
  }
  
  async updateSoundSample(id: number, updates: Partial<InsertSoundSample>): Promise<SoundSample | undefined> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async deleteSoundSample(id: number): Promise<boolean> {
    return false;
  }
  
  async createNoteMapping(mappingData: InsertNoteMapping): Promise<NoteMapping> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async getNoteMappings(libraryId: number): Promise<NoteMapping[]> {
    return [];
  }
  
  async getNoteMapping(libraryId: number, note: string): Promise<NoteMapping | undefined> {
    return undefined;
  }
  
  async updateNoteMapping(id: number, sampleId: number): Promise<NoteMapping | undefined> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async deleteNoteMapping(id: number): Promise<boolean> {
    return false;
  }
  
  async createRecording(recordingData: InsertRecording): Promise<Recording> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async getRecordings(userId?: number): Promise<Recording[]> {
    return [];
  }
  
  async getRecording(id: number): Promise<Recording | undefined> {
    return undefined;
  }
  
  async getRecordingByShareCode(shareCode: string): Promise<Recording | undefined> {
    return undefined;
  }
  
  async updateRecording(id: number, updates: Partial<InsertRecording>): Promise<Recording | undefined> {
    throw new Error("Method not implemented in MemStorage");
  }
  
  async deleteRecording(id: number): Promise<boolean> {
    return false;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Shared recording methods (temporary - using recordings table)
  async getSharedRecording(id: string): Promise<SharedRecording | undefined> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.shareCode, id));
      
    if (!recording) return undefined;
    
    return {
      id: recording.shareCode || id,
      recording: JSON.stringify(recording.data),
      createdAt: recording.createdAt
    };
  }
  
  async saveSharedRecording(recording: SharedRecording): Promise<SharedRecording> {
    const data = JSON.parse(recording.recording);
    const shareCode = recording.id;
    
    // Check if it already exists
    const existing = await this.getSharedRecording(shareCode);
    
    if (existing) {
      // Update existing
      await db
        .update(recordings)
        .set({
          data
        })
        .where(eq(recordings.shareCode, shareCode));
        
      return recording;
    } else {
      // Insert new
      const [newRecording] = await db
        .insert(recordings)
        .values({
          name: `Shared Recording ${shareCode}`,
          description: 'Shared via link',
          data,
          soundMode: data.soundMode || 'piano',
          beatPattern: data.beatPattern || 'none',
          isPublic: true,
          shareCode
        })
        .returning();
        
      return {
        id: shareCode,
        recording: recording.recording,
        createdAt: newRecording.createdAt
      };
    }
  }
  
  // Sound library methods
  async createSoundLibrary(libraryData: InsertSoundLibrary): Promise<SoundLibrary> {
    const [library] = await db
      .insert(soundLibraries)
      .values(libraryData)
      .returning();
    
    return library;
  }
  
  async getSoundLibraries(userId: number): Promise<SoundLibrary[]> {
    return db
      .select()
      .from(soundLibraries)
      .where(eq(soundLibraries.userId, userId))
      .orderBy(desc(soundLibraries.updatedAt));
  }
  
  async getSoundLibrary(id: number): Promise<SoundLibrary | undefined> {
    const [library] = await db
      .select()
      .from(soundLibraries)
      .where(eq(soundLibraries.id, id));
      
    return library;
  }
  
  async updateSoundLibrary(id: number, name: string): Promise<SoundLibrary | undefined> {
    const [updated] = await db
      .update(soundLibraries)
      .set({ 
        name,
        updatedAt: new Date()
      })
      .where(eq(soundLibraries.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteSoundLibrary(id: number): Promise<boolean> {
    // Delete associated mappings and samples first
    await db
      .delete(noteMappings)
      .where(eq(noteMappings.libraryId, id));
      
    await db
      .delete(soundSamples)
      .where(eq(soundSamples.libraryId, id));
      
    // Then delete the library
    try {
      await db
        .delete(soundLibraries)
        .where(eq(soundLibraries.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting sound library:", error);
      return false;
    }
  }
  
  // Sound sample methods
  async createSoundSample(sampleData: InsertSoundSample): Promise<SoundSample> {
    const [sample] = await db
      .insert(soundSamples)
      .values(sampleData)
      .returning();
      
    return sample;
  }
  
  async getSoundSamples(libraryId: number): Promise<SoundSample[]> {
    return db
      .select()
      .from(soundSamples)
      .where(eq(soundSamples.libraryId, libraryId))
      .orderBy(desc(soundSamples.lastUsedAt));
  }
  
  async getSoundSample(id: number): Promise<SoundSample | undefined> {
    const [sample] = await db
      .select()
      .from(soundSamples)
      .where(eq(soundSamples.id, id));
      
    return sample;
  }
  
  async updateSoundSample(id: number, updates: Partial<InsertSoundSample>): Promise<SoundSample | undefined> {
    const [updated] = await db
      .update(soundSamples)
      .set({ 
        ...updates,
        lastUsedAt: new Date()
      })
      .where(eq(soundSamples.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteSoundSample(id: number): Promise<boolean> {
    // Remove any note mappings that use this sample
    await db
      .delete(noteMappings)
      .where(eq(noteMappings.sampleId, id));
      
    // Then delete the sample
    try {
      await db
        .delete(soundSamples)
        .where(eq(soundSamples.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting sound sample:", error);
      return false;
    }
  }
  
  // Note mapping methods
  async createNoteMapping(mappingData: InsertNoteMapping): Promise<NoteMapping> {
    // First check if this note already has a mapping for this library
    const [existingMapping] = await db
      .select()
      .from(noteMappings)
      .where(
        and(
          eq(noteMappings.libraryId, mappingData.libraryId),
          eq(noteMappings.note, mappingData.note)
        )
      );
      
    if (existingMapping) {
      // Update the existing mapping
      const [updated] = await db
        .update(noteMappings)
        .set({ sampleId: mappingData.sampleId })
        .where(eq(noteMappings.id, existingMapping.id))
        .returning();
        
      return updated;
    } else {
      // Create a new mapping
      const [mapping] = await db
        .insert(noteMappings)
        .values(mappingData)
        .returning();
        
      return mapping;
    }
  }
  
  async getNoteMappings(libraryId: number): Promise<NoteMapping[]> {
    return db
      .select()
      .from(noteMappings)
      .where(eq(noteMappings.libraryId, libraryId));
  }
  
  async getNoteMapping(libraryId: number, note: string): Promise<NoteMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(noteMappings)
      .where(
        and(
          eq(noteMappings.libraryId, libraryId),
          eq(noteMappings.note, note)
        )
      );
      
    return mapping;
  }
  
  async updateNoteMapping(id: number, sampleId: number): Promise<NoteMapping | undefined> {
    const [updated] = await db
      .update(noteMappings)
      .set({ sampleId })
      .where(eq(noteMappings.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteNoteMapping(id: number): Promise<boolean> {
    try {
      await db
        .delete(noteMappings)
        .where(eq(noteMappings.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting note mapping:", error);
      return false;
    }
  }
  
  // Recording methods
  async createRecording(recordingData: InsertRecording): Promise<Recording> {
    // Generate a unique share code if not provided
    if (!recordingData.shareCode) {
      recordingData.shareCode = randomUUID().slice(0, 8);
    }
    
    const [recording] = await db
      .insert(recordings)
      .values(recordingData)
      .returning();
      
    return recording;
  }
  
  async getRecordings(userId?: number): Promise<Recording[]> {
    if (userId) {
      return db
        .select()
        .from(recordings)
        .where(eq(recordings.userId, userId))
        .orderBy(desc(recordings.createdAt));
    } else {
      return db
        .select()
        .from(recordings)
        .where(eq(recordings.isPublic, true))
        .orderBy(desc(recordings.createdAt));
    }
  }
  
  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id));
      
    return recording;
  }
  
  async getRecordingByShareCode(shareCode: string): Promise<Recording | undefined> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.shareCode, shareCode));
      
    return recording;
  }
  
  async updateRecording(id: number, updates: Partial<InsertRecording>): Promise<Recording | undefined> {
    const [updated] = await db
      .update(recordings)
      .set(updates)
      .where(eq(recordings.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteRecording(id: number): Promise<boolean> {
    try {
      await db
        .delete(recordings)
        .where(eq(recordings.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting recording:", error);
      return false;
    }
  }
}

// Use database storage
export const storage = new DatabaseStorage();
