import { 
  users, 
  soundLibraries, 
  soundSamples, 
  noteMappings, 
  recordings,
  djTracks,
  djSets,
  cuePoints,
  loops,
  moodTransitions,
  sessionEvents,
  effectCategories,
  effectPresets,
  effectSettings,
  effectUsageStats,
  djSessions,
  automationEvents,
  sessionTracks,
  performanceMetrics,
  sessionShares,
  type User, 
  type InsertUser, 
  type SoundLibrary, 
  type InsertSoundLibrary,
  type SoundSample,
  type InsertSoundSample,
  type NoteMapping,
  type InsertNoteMapping,
  type Recording,
  type InsertRecording,
  type DjTrack,
  type InsertDjTrack,
  type DjSet,
  type InsertDjSet,
  type CuePoint,
  type InsertCuePoint,
  type Loop,
  type InsertLoop,
  type MoodTransition,
  type InsertMoodTransition,
  type SessionEvent,
  type InsertSessionEvent,
  type EffectCategory,
  type InsertEffectCategory,
  type EffectPreset,
  type InsertEffectPreset,
  type EffectSetting,
  type InsertEffectSetting,
  type EffectUsageStats,
  type InsertEffectUsageStats,
  type DjSession,
  type InsertDjSession,
  type AutomationEvent,
  type InsertAutomationEvent,
  type SessionTrack,
  type InsertSessionTrack,
  type PerformanceMetric,
  type InsertPerformanceMetric,
  type SessionShare,
  type InsertSessionShare
} from "@shared/schema";
import { SharedRecording } from "./routes";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
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
  
  // DJ Track methods
  createDjTrack(trackData: InsertDjTrack): Promise<DjTrack>;
  getDjTracks(userId: number): Promise<DjTrack[]>;
  getDjTrack(id: string): Promise<DjTrack | undefined>;
  updateDjTrack(id: string, updates: Partial<InsertDjTrack>): Promise<DjTrack | undefined>;
  deleteDjTrack(id: string): Promise<boolean>;
  
  // DJ Set methods
  createDjSet(setData: InsertDjSet): Promise<DjSet>;
  getDjSets(userId: number): Promise<DjSet[]>;
  getDjSet(id: string): Promise<DjSet | undefined>;
  updateDjSet(id: string, updates: Partial<InsertDjSet>): Promise<DjSet | undefined>;
  deleteDjSet(id: string): Promise<boolean>;
  
  // Cue Point methods
  createCuePoint(cueData: InsertCuePoint): Promise<CuePoint>;
  getCuePoints(trackId: string): Promise<CuePoint[]>;
  getCuePoint(id: string): Promise<CuePoint | undefined>;
  updateCuePoint(id: string, updates: Partial<InsertCuePoint>): Promise<CuePoint | undefined>;
  deleteCuePoint(id: string): Promise<boolean>;
  
  // Loop methods
  createLoop(loopData: InsertLoop): Promise<Loop>;
  getLoops(trackId: string): Promise<Loop[]>;
  getLoop(id: string): Promise<Loop | undefined>;
  updateLoop(id: string, updates: Partial<InsertLoop>): Promise<Loop | undefined>;
  deleteLoop(id: string): Promise<boolean>;
  
  // Mood Transition methods
  createMoodTransition(transitionData: InsertMoodTransition): Promise<MoodTransition>;
  getMoodTransitions(userId: number): Promise<MoodTransition[]>;
  getMoodTransition(id: string): Promise<MoodTransition | undefined>;
  updateMoodTransition(id: string, updates: Partial<InsertMoodTransition>): Promise<MoodTransition | undefined>;
  deleteMoodTransition(id: string): Promise<boolean>;
  
  // Session Event methods
  createSessionEvent(eventData: InsertSessionEvent): Promise<SessionEvent>;
  getSessionEvents(sessionId: string): Promise<SessionEvent[]>;
  getSessionEvent(id: string): Promise<SessionEvent | undefined>;
  deleteSessionEvent(id: string): Promise<boolean>;
  
  // Effect Category methods
  createEffectCategory(categoryData: InsertEffectCategory): Promise<EffectCategory>;
  getEffectCategories(): Promise<EffectCategory[]>;
  getEffectCategory(id: string): Promise<EffectCategory | undefined>;
  updateEffectCategory(id: string, updates: Partial<InsertEffectCategory>): Promise<EffectCategory | undefined>;
  deleteEffectCategory(id: string): Promise<boolean>;
  
  // Effect Preset methods
  createEffectPreset(presetData: InsertEffectPreset): Promise<EffectPreset>;
  getEffectPresets(userId: number): Promise<EffectPreset[]>;
  getEffectPresetsByCategory(categoryId: string): Promise<EffectPreset[]>;
  getEffectPreset(id: string): Promise<EffectPreset | undefined>;
  updateEffectPreset(id: string, updates: Partial<InsertEffectPreset>): Promise<EffectPreset | undefined>;
  deleteEffectPreset(id: string): Promise<boolean>;
  updateEffectPresetUsage(id: string): Promise<void>; // Increment use count and update lastUsedAt
  
  // Effect Setting methods
  createEffectSetting(settingData: InsertEffectSetting): Promise<EffectSetting>;
  getEffectSettings(userId: number): Promise<EffectSetting[]>;
  getEffectSettingByKey(userId: number, settingKey: string): Promise<EffectSetting | undefined>;
  updateEffectSetting(id: string, settingValue: any): Promise<EffectSetting | undefined>;
  deleteEffectSetting(id: string): Promise<boolean>;
  
  // Effect Usage Stats methods
  createEffectUsageStats(statsData: InsertEffectUsageStats): Promise<EffectUsageStats>;
  getEffectUsageStats(userId: number): Promise<EffectUsageStats[]>;
  getEffectUsageStatsByEffect(userId: number, effectType: string): Promise<EffectUsageStats[]>;
  
  // DJ Session methods
  createDjSession(sessionData: InsertDjSession): Promise<DjSession>;
  getDjSessions(userId: number): Promise<DjSession[]>;
  getDjSession(id: string): Promise<DjSession | undefined>;
  updateDjSession(id: string, updates: Partial<InsertDjSession>): Promise<DjSession | undefined>;
  deleteDjSession(id: string): Promise<boolean>;
  incrementDjSessionViews(id: string): Promise<void>;
  incrementDjSessionDownloads(id: string): Promise<void>;
  
  // Automation Event methods
  createAutomationEvent(eventData: InsertAutomationEvent): Promise<AutomationEvent>;
  getAutomationEvents(sessionId: string): Promise<AutomationEvent[]>;
  getAutomationEventsByTimeRange(sessionId: string, startTime: number, endTime: number): Promise<AutomationEvent[]>;
  deleteAutomationEventsBySession(sessionId: string): Promise<boolean>;
  
  // Session Track methods
  createSessionTrack(trackData: InsertSessionTrack): Promise<SessionTrack>;
  getSessionTracks(sessionId: string): Promise<SessionTrack[]>;
  getSessionTrack(id: string): Promise<SessionTrack | undefined>;
  updateSessionTrack(id: string, updates: Partial<InsertSessionTrack>): Promise<SessionTrack | undefined>;
  deleteSessionTrack(id: string): Promise<boolean>;
  
  // Performance Metric methods
  createPerformanceMetric(metricData: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getPerformanceMetrics(sessionId: string): Promise<PerformanceMetric[]>;
  getPerformanceMetricsByType(sessionId: string, metricType: string): Promise<PerformanceMetric[]>;
  deletePerformanceMetricsBySession(sessionId: string): Promise<boolean>;
  
  // Session Share methods
  createSessionShare(shareData: InsertSessionShare): Promise<SessionShare>;
  getSessionShares(sessionId: string): Promise<SessionShare[]>;
  getSessionShare(id: string): Promise<SessionShare | undefined>;
  getSessionShareByCode(shareCode: string): Promise<SessionShare | undefined>;
  updateSessionShare(id: string, updates: Partial<InsertSessionShare>): Promise<SessionShare | undefined>;
  deleteSessionShare(id: string): Promise<boolean>;
  incrementSessionShareAccess(shareCode: string): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sharedRecordings: Map<string, SharedRecording>;
  private djTracks: Map<string, DjTrack>;
  private djSets: Map<string, DjSet>;
  private cuePoints: Map<string, CuePoint>;
  private loops: Map<string, Loop>;
  private moodTransitions: Map<string, MoodTransition>;
  private sessionEvents: Map<string, SessionEvent>;
  private effectCategories: Map<string, EffectCategory>;
  private effectPresets: Map<string, EffectPreset>;
  private effectSettings: Map<string, EffectSetting>;
  private effectUsageStats: Map<string, EffectUsageStats>;
  private djSessions: Map<string, DjSession>;
  private automationEvents: Map<string, AutomationEvent>;
  private sessionTracks: Map<string, SessionTrack>;
  private performanceMetrics: Map<string, PerformanceMetric>;
  private sessionShares: Map<string, SessionShare>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.sharedRecordings = new Map();
    this.djTracks = new Map();
    this.djSets = new Map();
    this.cuePoints = new Map();
    this.loops = new Map();
    this.moodTransitions = new Map();
    this.sessionEvents = new Map();
    this.effectCategories = new Map();
    this.effectPresets = new Map();
    this.effectSettings = new Map();
    this.effectUsageStats = new Map();
    this.djSessions = new Map();
    this.automationEvents = new Map();
    this.sessionTracks = new Map();
    this.performanceMetrics = new Map();
    this.sessionShares = new Map();
    this.currentId = 1;
    
    // Initialize default effect categories
    this.initializeDefaultEffectCategories();
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
  
  // DJ Track methods
  async createDjTrack(trackData: InsertDjTrack): Promise<DjTrack> {
    const id = randomUUID();
    const track: DjTrack = {
      userId: trackData.userId,
      title: trackData.title,
      artist: trackData.artist,
      url: trackData.url,
      duration: trackData.duration,
      bpm: trackData.bpm ?? null,
      key: trackData.key ?? null,
      waveformData: trackData.waveformData ?? null,
      genre: trackData.genre ?? null,
      id,
      createdAt: new Date(),
    };
    this.djTracks.set(id, track);
    return track;
  }
  
  async getDjTracks(userId: number): Promise<DjTrack[]> {
    return Array.from(this.djTracks.values()).filter(track => track.userId === userId);
  }
  
  async getDjTrack(id: string): Promise<DjTrack | undefined> {
    return this.djTracks.get(id);
  }
  
  async updateDjTrack(id: string, updates: Partial<InsertDjTrack>): Promise<DjTrack | undefined> {
    const existing = this.djTracks.get(id);
    if (!existing) return undefined;
    
    // Only allow whitelisted fields to be updated
    const updated: DjTrack = {
      ...existing,
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.artist !== undefined && { artist: updates.artist }),
      ...(updates.url !== undefined && { url: updates.url }),
      ...(updates.duration !== undefined && { duration: updates.duration }),
      ...(updates.bpm !== undefined && { bpm: updates.bpm }),
      ...(updates.key !== undefined && { key: updates.key }),
      ...(updates.waveformData !== undefined && { waveformData: updates.waveformData }),
      ...(updates.genre !== undefined && { genre: updates.genre }),
    };
    this.djTracks.set(id, updated);
    return updated;
  }
  
  async deleteDjTrack(id: string): Promise<boolean> {
    if (!this.djTracks.has(id)) return false;
    
    // Cascading delete: remove associated cue points and loops
    const cuePointsToDelete = Array.from(this.cuePoints.values())
      .filter(cue => cue.trackId === id)
      .map(cue => cue.id);
    
    const loopsToDelete = Array.from(this.loops.values())
      .filter(loop => loop.trackId === id)
      .map(loop => loop.id);
    
    // Delete associated entities
    cuePointsToDelete.forEach(cueId => this.cuePoints.delete(cueId));
    loopsToDelete.forEach(loopId => this.loops.delete(loopId));
    
    // Remove track from any sets
    Array.from(this.djSets.entries()).forEach(([setId, set]) => {
      if (set.trackIds.includes(id)) {
        const updatedTrackIds = set.trackIds.filter((trackId: string) => trackId !== id);
        this.djSets.set(setId, { ...set, trackIds: updatedTrackIds });
      }
    });
    
    this.djTracks.delete(id);
    return true;
  }
  
  // DJ Set methods
  async createDjSet(setData: InsertDjSet): Promise<DjSet> {
    const id = randomUUID();
    const set: DjSet = {
      userId: setData.userId,
      name: setData.name,
      trackIds: setData.trackIds ?? [],
      description: setData.description ?? null,
      duration: setData.duration ?? null,
      id,
      createdAt: new Date(),
    };
    this.djSets.set(id, set);
    return set;
  }
  
  async getDjSets(userId: number): Promise<DjSet[]> {
    return Array.from(this.djSets.values()).filter(set => set.userId === userId);
  }
  
  async getDjSet(id: string): Promise<DjSet | undefined> {
    return this.djSets.get(id);
  }
  
  async updateDjSet(id: string, updates: Partial<InsertDjSet>): Promise<DjSet | undefined> {
    const existing = this.djSets.get(id);
    if (!existing) return undefined;
    
    // Only allow whitelisted fields to be updated
    const updated: DjSet = {
      ...existing,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.trackIds !== undefined && { trackIds: updates.trackIds }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.duration !== undefined && { duration: updates.duration }),
    };
    this.djSets.set(id, updated);
    return updated;
  }
  
  async deleteDjSet(id: string): Promise<boolean> {
    if (!this.djSets.has(id)) return false;
    
    this.djSets.delete(id);
    return true;
  }
  
  // Cue Point methods
  async createCuePoint(cueData: InsertCuePoint): Promise<CuePoint> {
    const id = randomUUID();
    const cuePoint: CuePoint = {
      trackId: cueData.trackId,
      name: cueData.name,
      timePosition: cueData.timePosition,
      color: cueData.color ?? "#ff0000",
      id,
      createdAt: new Date(),
    };
    this.cuePoints.set(id, cuePoint);
    return cuePoint;
  }
  
  async getCuePoints(trackId: string): Promise<CuePoint[]> {
    return Array.from(this.cuePoints.values()).filter(cue => cue.trackId === trackId);
  }
  
  async getCuePoint(id: string): Promise<CuePoint | undefined> {
    return this.cuePoints.get(id);
  }
  
  async updateCuePoint(id: string, updates: Partial<InsertCuePoint>): Promise<CuePoint | undefined> {
    const existing = this.cuePoints.get(id);
    if (!existing) return undefined;
    
    // Only allow whitelisted fields to be updated
    const updated: CuePoint = {
      ...existing,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.timePosition !== undefined && { timePosition: updates.timePosition }),
      ...(updates.color !== undefined && { color: updates.color }),
    };
    this.cuePoints.set(id, updated);
    return updated;
  }
  
  async deleteCuePoint(id: string): Promise<boolean> {
    if (!this.cuePoints.has(id)) return false;
    
    this.cuePoints.delete(id);
    return true;
  }
  
  // Loop methods
  async createLoop(loopData: InsertLoop): Promise<Loop> {
    const id = randomUUID();
    const loop: Loop = {
      trackId: loopData.trackId,
      name: loopData.name,
      startTime: loopData.startTime,
      endTime: loopData.endTime,
      isActive: loopData.isActive ?? false,
      id,
      createdAt: new Date(),
    };
    this.loops.set(id, loop);
    return loop;
  }
  
  async getLoops(trackId: string): Promise<Loop[]> {
    return Array.from(this.loops.values()).filter(loop => loop.trackId === trackId);
  }
  
  async getLoop(id: string): Promise<Loop | undefined> {
    return this.loops.get(id);
  }
  
  async updateLoop(id: string, updates: Partial<InsertLoop>): Promise<Loop | undefined> {
    const existing = this.loops.get(id);
    if (!existing) return undefined;
    
    // Only allow whitelisted fields to be updated
    const updated: Loop = {
      ...existing,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.startTime !== undefined && { startTime: updates.startTime }),
      ...(updates.endTime !== undefined && { endTime: updates.endTime }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
    };
    this.loops.set(id, updated);
    return updated;
  }
  
  async deleteLoop(id: string): Promise<boolean> {
    if (!this.loops.has(id)) return false;
    
    this.loops.delete(id);
    return true;
  }
  
  // Mood Transition methods
  async createMoodTransition(transitionData: InsertMoodTransition): Promise<MoodTransition> {
    const id = randomUUID();
    const transition: MoodTransition = {
      userId: transitionData.userId,
      currentMood: transitionData.currentMood,
      desiredMood: transitionData.desiredMood,
      transitionType: transitionData.transitionType,
      generatedTrackId: transitionData.generatedTrackId ?? null,
      id,
      createdAt: new Date(),
    };
    this.moodTransitions.set(id, transition);
    return transition;
  }
  
  async getMoodTransitions(userId: number): Promise<MoodTransition[]> {
    return Array.from(this.moodTransitions.values()).filter(transition => transition.userId === userId);
  }
  
  async getMoodTransition(id: string): Promise<MoodTransition | undefined> {
    return this.moodTransitions.get(id);
  }
  
  async updateMoodTransition(id: string, updates: Partial<InsertMoodTransition>): Promise<MoodTransition | undefined> {
    const existing = this.moodTransitions.get(id);
    if (!existing) return undefined;
    
    // Only allow whitelisted fields to be updated
    const updated: MoodTransition = {
      ...existing,
      ...(updates.currentMood !== undefined && { currentMood: updates.currentMood }),
      ...(updates.desiredMood !== undefined && { desiredMood: updates.desiredMood }),
      ...(updates.transitionType !== undefined && { transitionType: updates.transitionType }),
      ...(updates.generatedTrackId !== undefined && { generatedTrackId: updates.generatedTrackId }),
    };
    this.moodTransitions.set(id, updated);
    return updated;
  }
  
  async deleteMoodTransition(id: string): Promise<boolean> {
    if (!this.moodTransitions.has(id)) return false;
    
    this.moodTransitions.delete(id);
    return true;
  }
  
  // Session Event methods
  async createSessionEvent(eventData: InsertSessionEvent): Promise<SessionEvent> {
    const id = randomUUID();
    const event: SessionEvent = {
      ...eventData,
      id,
      timestamp: new Date(),
    };
    this.sessionEvents.set(id, event);
    return event;
  }
  
  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    return Array.from(this.sessionEvents.values()).filter(event => event.sessionId === sessionId);
  }
  
  async getSessionEvent(id: string): Promise<SessionEvent | undefined> {
    return this.sessionEvents.get(id);
  }
  
  async deleteSessionEvent(id: string): Promise<boolean> {
    if (!this.sessionEvents.has(id)) return false;
    
    this.sessionEvents.delete(id);
    return true;
  }

  // DJ Session methods
  async createDjSession(sessionData: InsertDjSession): Promise<DjSession> {
    const id = randomUUID();
    const session: DjSession = {
      userId: sessionData.userId,
      title: sessionData.title,
      description: sessionData.description ?? null,
      duration: sessionData.duration,
      audioUrl: sessionData.audioUrl ?? null,
      waveformData: sessionData.waveformData ?? null,
      status: sessionData.status ?? "completed",
      recordingQuality: sessionData.recordingQuality ?? "standard",
      trackCount: sessionData.trackCount ?? 0,
      totalTransitions: sessionData.totalTransitions ?? 0,
      avgBpm: sessionData.avgBpm ?? null,
      energyFlow: sessionData.energyFlow ?? null,
      tags: sessionData.tags ?? [],
      isPublic: sessionData.isPublic ?? false,
      shareCode: sessionData.shareCode ?? null,
      downloadCount: 0,
      viewCount: 0,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.djSessions.set(id, session);
    return session;
  }

  async getDjSessions(userId: number): Promise<DjSession[]> {
    return Array.from(this.djSessions.values()).filter(session => session.userId === userId);
  }

  async getDjSession(id: string): Promise<DjSession | undefined> {
    return this.djSessions.get(id);
  }

  async updateDjSession(id: string, updates: Partial<InsertDjSession>): Promise<DjSession | undefined> {
    const existing = this.djSessions.get(id);
    if (!existing) return undefined;

    const updated: DjSession = {
      ...existing,
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.audioUrl !== undefined && { audioUrl: updates.audioUrl }),
      ...(updates.waveformData !== undefined && { waveformData: updates.waveformData }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.recordingQuality !== undefined && { recordingQuality: updates.recordingQuality }),
      ...(updates.trackCount !== undefined && { trackCount: updates.trackCount }),
      ...(updates.totalTransitions !== undefined && { totalTransitions: updates.totalTransitions }),
      ...(updates.avgBpm !== undefined && { avgBpm: updates.avgBpm }),
      ...(updates.energyFlow !== undefined && { energyFlow: updates.energyFlow }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
      ...(updates.shareCode !== undefined && { shareCode: updates.shareCode }),
      updatedAt: new Date(),
    };
    this.djSessions.set(id, updated);
    return updated;
  }

  async deleteDjSession(id: string): Promise<boolean> {
    if (!this.djSessions.has(id)) return false;

    // Cascading delete: remove associated automation events, session tracks, metrics, and shares
    const automationEventsToDelete = Array.from(this.automationEvents.values())
      .filter(event => event.sessionId === id)
      .map(event => event.id);

    const sessionTracksToDelete = Array.from(this.sessionTracks.values())
      .filter(track => track.sessionId === id)
      .map(track => track.id);

    const metricsToDelete = Array.from(this.performanceMetrics.values())
      .filter(metric => metric.sessionId === id)
      .map(metric => metric.id);

    const sharesToDelete = Array.from(this.sessionShares.values())
      .filter(share => share.sessionId === id)
      .map(share => share.id);

    // Delete associated entities
    automationEventsToDelete.forEach(eventId => this.automationEvents.delete(eventId));
    sessionTracksToDelete.forEach(trackId => this.sessionTracks.delete(trackId));
    metricsToDelete.forEach(metricId => this.performanceMetrics.delete(metricId));
    sharesToDelete.forEach(shareId => this.sessionShares.delete(shareId));

    this.djSessions.delete(id);
    return true;
  }

  async incrementDjSessionViews(id: string): Promise<void> {
    const session = this.djSessions.get(id);
    if (session) {
      const updated = { ...session, viewCount: session.viewCount + 1 };
      this.djSessions.set(id, updated);
    }
  }

  async incrementDjSessionDownloads(id: string): Promise<void> {
    const session = this.djSessions.get(id);
    if (session) {
      const updated = { ...session, downloadCount: session.downloadCount + 1 };
      this.djSessions.set(id, updated);
    }
  }

  // Automation Event methods
  async createAutomationEvent(eventData: InsertAutomationEvent): Promise<AutomationEvent> {
    const id = randomUUID();
    const event: AutomationEvent = {
      sessionId: eventData.sessionId,
      timestamp: eventData.timestamp,
      eventType: eventData.eventType,
      parameter: eventData.parameter,
      deckId: eventData.deckId ?? null,
      value: eventData.value ?? null,
      stringValue: eventData.stringValue ?? null,
      metadata: eventData.metadata ?? null,
      id,
      createdAt: new Date(),
    };
    this.automationEvents.set(id, event);
    return event;
  }

  async getAutomationEvents(sessionId: string): Promise<AutomationEvent[]> {
    return Array.from(this.automationEvents.values())
      .filter(event => event.sessionId === sessionId)
      .sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp));
  }

  async getAutomationEventsByTimeRange(sessionId: string, startTime: number, endTime: number): Promise<AutomationEvent[]> {
    return Array.from(this.automationEvents.values())
      .filter(event => 
        event.sessionId === sessionId && 
        parseFloat(event.timestamp) >= startTime && 
        parseFloat(event.timestamp) <= endTime
      )
      .sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp));
  }

  async deleteAutomationEventsBySession(sessionId: string): Promise<boolean> {
    const eventsToDelete = Array.from(this.automationEvents.entries())
      .filter(([_, event]) => event.sessionId === sessionId);

    eventsToDelete.forEach(([eventId, _]) => this.automationEvents.delete(eventId));
    return eventsToDelete.length > 0;
  }

  // Session Track methods
  async createSessionTrack(trackData: InsertSessionTrack): Promise<SessionTrack> {
    const id = randomUUID();
    const track: SessionTrack = {
      sessionId: trackData.sessionId,
      trackId: trackData.trackId,
      deckId: trackData.deckId,
      playOrder: trackData.playOrder,
      startTime: trackData.startTime,
      endTime: trackData.endTime ?? null,
      playDuration: trackData.playDuration ?? null,
      transitionType: trackData.transitionType ?? null,
      transitionDuration: trackData.transitionDuration ?? null,
      avgPitch: trackData.avgPitch ?? null,
      cuePointsUsed: trackData.cuePointsUsed ?? null,
      loopsUsed: trackData.loopsUsed ?? null,
      effectsUsed: trackData.effectsUsed ?? null,
      keyLockEnabled: trackData.keyLockEnabled ?? false,
      syncEnabled: trackData.syncEnabled ?? false,
      id,
      createdAt: new Date(),
    };
    this.sessionTracks.set(id, track);
    return track;
  }

  async getSessionTracks(sessionId: string): Promise<SessionTrack[]> {
    return Array.from(this.sessionTracks.values())
      .filter(track => track.sessionId === sessionId)
      .sort((a, b) => a.playOrder - b.playOrder);
  }

  async getSessionTrack(id: string): Promise<SessionTrack | undefined> {
    return this.sessionTracks.get(id);
  }

  async updateSessionTrack(id: string, updates: Partial<InsertSessionTrack>): Promise<SessionTrack | undefined> {
    const existing = this.sessionTracks.get(id);
    if (!existing) return undefined;

    const updated: SessionTrack = {
      ...existing,
      ...(updates.endTime !== undefined && { endTime: updates.endTime }),
      ...(updates.playDuration !== undefined && { playDuration: updates.playDuration }),
      ...(updates.transitionType !== undefined && { transitionType: updates.transitionType }),
      ...(updates.transitionDuration !== undefined && { transitionDuration: updates.transitionDuration }),
      ...(updates.avgPitch !== undefined && { avgPitch: updates.avgPitch }),
      ...(updates.cuePointsUsed !== undefined && { cuePointsUsed: updates.cuePointsUsed }),
      ...(updates.loopsUsed !== undefined && { loopsUsed: updates.loopsUsed }),
      ...(updates.effectsUsed !== undefined && { effectsUsed: updates.effectsUsed }),
      ...(updates.keyLockEnabled !== undefined && { keyLockEnabled: updates.keyLockEnabled }),
      ...(updates.syncEnabled !== undefined && { syncEnabled: updates.syncEnabled }),
    };
    this.sessionTracks.set(id, updated);
    return updated;
  }

  async deleteSessionTrack(id: string): Promise<boolean> {
    if (!this.sessionTracks.has(id)) return false;
    
    this.sessionTracks.delete(id);
    return true;
  }

  // Performance Metric methods
  async createPerformanceMetric(metricData: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = randomUUID();
    const metric: PerformanceMetric = {
      sessionId: metricData.sessionId,
      metricType: metricData.metricType,
      score: metricData.score,
      timestamp: metricData.timestamp ?? null,
      details: metricData.details ?? null,
      suggestions: metricData.suggestions ?? [],
      id,
      createdAt: new Date(),
    };
    this.performanceMetrics.set(id, metric);
    return metric;
  }

  async getPerformanceMetrics(sessionId: string): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values())
      .filter(metric => metric.sessionId === sessionId)
      .sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return parseFloat(a.timestamp) - parseFloat(b.timestamp);
      });
  }

  async getPerformanceMetricsByType(sessionId: string, metricType: string): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values())
      .filter(metric => metric.sessionId === sessionId && metric.metricType === metricType)
      .sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return parseFloat(a.timestamp) - parseFloat(b.timestamp);
      });
  }

  async deletePerformanceMetricsBySession(sessionId: string): Promise<boolean> {
    const metricsToDelete = Array.from(this.performanceMetrics.entries())
      .filter(([_, metric]) => metric.sessionId === sessionId);

    metricsToDelete.forEach(([metricId, _]) => this.performanceMetrics.delete(metricId));
    return metricsToDelete.length > 0;
  }

  // Session Share methods
  async createSessionShare(shareData: InsertSessionShare): Promise<SessionShare> {
    const id = randomUUID();
    const share: SessionShare = {
      sessionId: shareData.sessionId,
      shareCode: shareData.shareCode,
      shareType: shareData.shareType,
      platform: shareData.platform ?? null,
      expiresAt: shareData.expiresAt ?? null,
      downloadEnabled: shareData.downloadEnabled ?? true,
      commentingEnabled: shareData.commentingEnabled ?? true,
      embedEnabled: shareData.embedEnabled ?? true,
      customMetadata: shareData.customMetadata ?? null,
      accessCount: 0,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessionShares.set(id, share);
    return share;
  }

  async getSessionShares(sessionId: string): Promise<SessionShare[]> {
    return Array.from(this.sessionShares.values()).filter(share => share.sessionId === sessionId);
  }

  async getSessionShare(id: string): Promise<SessionShare | undefined> {
    return this.sessionShares.get(id);
  }

  async getSessionShareByCode(shareCode: string): Promise<SessionShare | undefined> {
    return Array.from(this.sessionShares.values()).find(share => share.shareCode === shareCode);
  }

  async updateSessionShare(id: string, updates: Partial<InsertSessionShare>): Promise<SessionShare | undefined> {
    const existing = this.sessionShares.get(id);
    if (!existing) return undefined;

    const updated: SessionShare = {
      ...existing,
      ...(updates.shareType !== undefined && { shareType: updates.shareType }),
      ...(updates.platform !== undefined && { platform: updates.platform }),
      ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
      ...(updates.downloadEnabled !== undefined && { downloadEnabled: updates.downloadEnabled }),
      ...(updates.commentingEnabled !== undefined && { commentingEnabled: updates.commentingEnabled }),
      ...(updates.embedEnabled !== undefined && { embedEnabled: updates.embedEnabled }),
      ...(updates.customMetadata !== undefined && { customMetadata: updates.customMetadata }),
      updatedAt: new Date(),
    };
    this.sessionShares.set(id, updated);
    return updated;
  }

  async deleteSessionShare(id: string): Promise<boolean> {
    if (!this.sessionShares.has(id)) return false;
    
    this.sessionShares.delete(id);
    return true;
  }

  async incrementSessionShareAccess(shareCode: string): Promise<void> {
    const share = Array.from(this.sessionShares.values()).find(s => s.shareCode === shareCode);
    if (share) {
      const updated = { ...share, accessCount: share.accessCount + 1 };
      this.sessionShares.set(share.id, updated);
    }
  }

  private initializeDefaultEffectCategories(): void {
    const defaults: Array<{ name: string; description: string; color: string; isSystem: boolean }> = [
      { name: "Reverb", description: "Ambient space and depth", color: "#8b5cf6", isSystem: true },
      { name: "Delay", description: "Echo and rhythmic repeats", color: "#06b6d4", isSystem: true },
      { name: "Distortion", description: "Drive, saturation and grit", color: "#f43f5e", isSystem: true },
      { name: "Filter", description: "Frequency shaping (EQ, LP, HP)", color: "#f59e0b", isSystem: true },
      { name: "Modulation", description: "Chorus, flanger, phaser and tremolo", color: "#10b981", isSystem: true },
    ];
    for (const category of defaults) {
      const id = randomUUID();
      this.effectCategories.set(id, {
        id,
        name: category.name,
        description: category.description,
        color: category.color,
        isSystem: category.isSystem,
        createdAt: new Date(),
      });
    }
  }

  // Effect Category methods
  async createEffectCategory(categoryData: InsertEffectCategory): Promise<EffectCategory> {
    const id = randomUUID();
    const category: EffectCategory = {
      id,
      name: categoryData.name,
      description: categoryData.description ?? null,
      color: categoryData.color ?? "#6b7280",
      isSystem: categoryData.isSystem ?? false,
      createdAt: new Date(),
    };
    this.effectCategories.set(id, category);
    return category;
  }

  async getEffectCategories(): Promise<EffectCategory[]> {
    return Array.from(this.effectCategories.values());
  }

  async getEffectCategory(id: string): Promise<EffectCategory | undefined> {
    return this.effectCategories.get(id);
  }

  async updateEffectCategory(id: string, updates: Partial<InsertEffectCategory>): Promise<EffectCategory | undefined> {
    const existing = this.effectCategories.get(id);
    if (!existing) return undefined;

    const updated: EffectCategory = {
      ...existing,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.color !== undefined && { color: updates.color }),
      ...(updates.isSystem !== undefined && { isSystem: updates.isSystem }),
    };
    this.effectCategories.set(id, updated);
    return updated;
  }

  async deleteEffectCategory(id: string): Promise<boolean> {
    if (!this.effectCategories.has(id)) return false;
    this.effectCategories.delete(id);
    return true;
  }

  // Effect Preset methods
  async createEffectPreset(presetData: InsertEffectPreset): Promise<EffectPreset> {
    const id = randomUUID();
    const preset: EffectPreset = {
      id,
      userId: presetData.userId,
      categoryId: presetData.categoryId ?? null,
      name: presetData.name,
      description: presetData.description ?? null,
      effectsChain: presetData.effectsChain,
      tags: presetData.tags ?? [],
      isPublic: presetData.isPublic ?? false,
      isFavorite: presetData.isFavorite ?? false,
      useCount: 0,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.effectPresets.set(id, preset);
    return preset;
  }

  async getEffectPresets(userId: number): Promise<EffectPreset[]> {
    return Array.from(this.effectPresets.values())
      .filter(preset => preset.userId === userId)
      .sort((a, b) => {
        if (!a.lastUsedAt && !b.lastUsedAt) return 0;
        if (!a.lastUsedAt) return 1;
        if (!b.lastUsedAt) return -1;
        return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
      });
  }

  async getEffectPresetsByCategory(categoryId: string): Promise<EffectPreset[]> {
    return Array.from(this.effectPresets.values())
      .filter(preset => preset.categoryId === categoryId)
      .sort((a, b) => {
        if (!a.lastUsedAt && !b.lastUsedAt) return 0;
        if (!a.lastUsedAt) return 1;
        if (!b.lastUsedAt) return -1;
        return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
      });
  }

  async getEffectPreset(id: string): Promise<EffectPreset | undefined> {
    return this.effectPresets.get(id);
  }

  async updateEffectPreset(id: string, updates: Partial<InsertEffectPreset>): Promise<EffectPreset | undefined> {
    const existing = this.effectPresets.get(id);
    if (!existing) return undefined;

    const updated: EffectPreset = {
      ...existing,
      ...(updates.categoryId !== undefined && { categoryId: updates.categoryId }),
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.effectsChain !== undefined && { effectsChain: updates.effectsChain }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
      ...(updates.isFavorite !== undefined && { isFavorite: updates.isFavorite }),
      updatedAt: new Date(),
    };
    this.effectPresets.set(id, updated);
    return updated;
  }

  async deleteEffectPreset(id: string): Promise<boolean> {
    if (!this.effectPresets.has(id)) return false;
    this.effectPresets.delete(id);
    return true;
  }

  async updateEffectPresetUsage(id: string): Promise<void> {
    const preset = this.effectPresets.get(id);
    if (preset) {
      const updated = { ...preset, useCount: preset.useCount + 1, lastUsedAt: new Date() };
      this.effectPresets.set(id, updated);
    }
  }

  // Effect Setting methods
  async createEffectSetting(settingData: InsertEffectSetting): Promise<EffectSetting> {
    const id = randomUUID();
    const setting: EffectSetting = {
      id,
      userId: settingData.userId,
      settingKey: settingData.settingKey,
      settingValue: settingData.settingValue,
      category: settingData.category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.effectSettings.set(id, setting);
    return setting;
  }

  async getEffectSettings(userId: number): Promise<EffectSetting[]> {
    return Array.from(this.effectSettings.values()).filter(setting => setting.userId === userId);
  }

  async getEffectSettingByKey(userId: number, settingKey: string): Promise<EffectSetting | undefined> {
    return Array.from(this.effectSettings.values()).find(
      setting => setting.userId === userId && setting.settingKey === settingKey
    );
  }

  async updateEffectSetting(id: string, settingValue: any): Promise<EffectSetting | undefined> {
    const existing = this.effectSettings.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, settingValue, updatedAt: new Date() };
    this.effectSettings.set(id, updated);
    return updated;
  }

  async deleteEffectSetting(id: string): Promise<boolean> {
    if (!this.effectSettings.has(id)) return false;
    this.effectSettings.delete(id);
    return true;
  }

  // Effect Usage Stats methods
  async createEffectUsageStats(statsData: InsertEffectUsageStats): Promise<EffectUsageStats> {
    const id = randomUUID();
    const stats: EffectUsageStats = {
      id,
      userId: statsData.userId,
      effectType: statsData.effectType,
      parametersUsed: statsData.parametersUsed,
      sessionDuration: statsData.sessionDuration,
      trackId: statsData.trackId ?? null,
      sessionId: statsData.sessionId ?? null,
      timestamp: new Date(),
    };
    this.effectUsageStats.set(id, stats);
    return stats;
  }

  async getEffectUsageStats(userId: number): Promise<EffectUsageStats[]> {
    return Array.from(this.effectUsageStats.values())
      .filter(stats => stats.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getEffectUsageStatsByEffect(userId: number, effectType: string): Promise<EffectUsageStats[]> {
    return Array.from(this.effectUsageStats.values())
      .filter(stats => stats.userId === userId && stats.effectType === effectType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
  
  // DJ Track methods
  async createDjTrack(trackData: InsertDjTrack): Promise<DjTrack> {
    const id = randomUUID();
    
    const [track] = await db
      .insert(djTracks)
      .values({
        ...trackData,
        id
      })
      .returning();
      
    return track;
  }
  
  async getDjTracks(userId: number): Promise<DjTrack[]> {
    return db
      .select()
      .from(djTracks)
      .where(eq(djTracks.userId, userId))
      .orderBy(desc(djTracks.createdAt));
  }
  
  async getDjTrack(id: string): Promise<DjTrack | undefined> {
    const [track] = await db
      .select()
      .from(djTracks)
      .where(eq(djTracks.id, id));
      
    return track;
  }
  
  async updateDjTrack(id: string, updates: Partial<InsertDjTrack>): Promise<DjTrack | undefined> {
    const [updated] = await db
      .update(djTracks)
      .set(updates)
      .where(eq(djTracks.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteDjTrack(id: string): Promise<boolean> {
    // Delete related data first
    await db.delete(cuePoints).where(eq(cuePoints.trackId, id));
    await db.delete(loops).where(eq(loops.trackId, id));
    
    try {
      await db
        .delete(djTracks)
        .where(eq(djTracks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting DJ track:", error);
      return false;
    }
  }
  
  // DJ Set methods
  async createDjSet(setData: InsertDjSet): Promise<DjSet> {
    const id = randomUUID();
    
    const [djSet] = await db
      .insert(djSets)
      .values({
        ...setData,
        id
      })
      .returning();
      
    return djSet;
  }
  
  async getDjSets(userId: number): Promise<DjSet[]> {
    return db
      .select()
      .from(djSets)
      .where(eq(djSets.userId, userId))
      .orderBy(desc(djSets.createdAt));
  }
  
  async getDjSet(id: string): Promise<DjSet | undefined> {
    const [djSet] = await db
      .select()
      .from(djSets)
      .where(eq(djSets.id, id));
      
    return djSet;
  }
  
  async updateDjSet(id: string, updates: Partial<InsertDjSet>): Promise<DjSet | undefined> {
    const [updated] = await db
      .update(djSets)
      .set(updates)
      .where(eq(djSets.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteDjSet(id: string): Promise<boolean> {
    try {
      await db
        .delete(djSets)
        .where(eq(djSets.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting DJ set:", error);
      return false;
    }
  }

  // DJ Session methods
  async createDjSession(sessionData: InsertDjSession): Promise<DjSession> {
    const id = randomUUID();

    const [session] = await db
      .insert(djSessions)
      .values({
        ...sessionData,
        id
      })
      .returning();

    return session;
  }

  async getDjSessions(userId: number): Promise<DjSession[]> {
    return db
      .select()
      .from(djSessions)
      .where(eq(djSessions.userId, userId))
      .orderBy(desc(djSessions.createdAt));
  }

  async getDjSession(id: string): Promise<DjSession | undefined> {
    const [session] = await db
      .select()
      .from(djSessions)
      .where(eq(djSessions.id, id));

    return session;
  }

  async updateDjSession(id: string, updates: Partial<InsertDjSession>): Promise<DjSession | undefined> {
    const [updated] = await db
      .update(djSessions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(djSessions.id, id))
      .returning();

    return updated;
  }

  async deleteDjSession(id: string): Promise<boolean> {
    try {
      await db
        .delete(djSessions)
        .where(eq(djSessions.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting DJ session:", error);
      return false;
    }
  }

  async incrementDjSessionViews(id: string): Promise<void> {
    await db
      .update(djSessions)
      .set({
        viewCount: sql`${djSessions.viewCount} + 1`
      })
      .where(eq(djSessions.id, id));
  }

  async incrementDjSessionDownloads(id: string): Promise<void> {
    await db
      .update(djSessions)
      .set({
        downloadCount: sql`${djSessions.downloadCount} + 1`
      })
      .where(eq(djSessions.id, id));
  }

  // Automation Event methods
  async createAutomationEvent(eventData: InsertAutomationEvent): Promise<AutomationEvent> {
    const id = randomUUID();

    const [event] = await db
      .insert(automationEvents)
      .values({
        ...eventData,
        id
      })
      .returning();

    return event;
  }

  async getAutomationEvents(sessionId: string): Promise<AutomationEvent[]> {
    return db
      .select()
      .from(automationEvents)
      .where(eq(automationEvents.sessionId, sessionId))
      .orderBy(automationEvents.timestamp);
  }

  async getAutomationEventsByTimeRange(sessionId: string, startTime: number, endTime: number): Promise<AutomationEvent[]> {
    return db
      .select()
      .from(automationEvents)
      .where(and(
        eq(automationEvents.sessionId, sessionId),
        gte(automationEvents.timestamp, String(startTime)),
        lte(automationEvents.timestamp, String(endTime))
      ))
      .orderBy(automationEvents.timestamp);
  }

  async deleteAutomationEventsBySession(sessionId: string): Promise<boolean> {
    try {
      await db
        .delete(automationEvents)
        .where(eq(automationEvents.sessionId, sessionId));
      return true;
    } catch (error) {
      console.error("Error deleting automation events:", error);
      return false;
    }
  }

  // Session Track methods
  async createSessionTrack(trackData: InsertSessionTrack): Promise<SessionTrack> {
    const id = randomUUID();

    const [track] = await db
      .insert(sessionTracks)
      .values({
        ...trackData,
        id
      })
      .returning();

    return track;
  }

  async getSessionTracks(sessionId: string): Promise<SessionTrack[]> {
    return db
      .select()
      .from(sessionTracks)
      .where(eq(sessionTracks.sessionId, sessionId))
      .orderBy(sessionTracks.playOrder);
  }

  async getSessionTrack(id: string): Promise<SessionTrack | undefined> {
    const [track] = await db
      .select()
      .from(sessionTracks)
      .where(eq(sessionTracks.id, id));

    return track;
  }

  async updateSessionTrack(id: string, updates: Partial<InsertSessionTrack>): Promise<SessionTrack | undefined> {
    const [updated] = await db
      .update(sessionTracks)
      .set(updates)
      .where(eq(sessionTracks.id, id))
      .returning();

    return updated;
  }

  async deleteSessionTrack(id: string): Promise<boolean> {
    try {
      await db
        .delete(sessionTracks)
        .where(eq(sessionTracks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting session track:", error);
      return false;
    }
  }

  // Performance Metric methods
  async createPerformanceMetric(metricData: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = randomUUID();

    const [metric] = await db
      .insert(performanceMetrics)
      .values({
        ...metricData,
        id
      })
      .returning();

    return metric;
  }

  async getPerformanceMetrics(sessionId: string): Promise<PerformanceMetric[]> {
    return db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.sessionId, sessionId))
      .orderBy(performanceMetrics.timestamp);
  }

  async getPerformanceMetricsByType(sessionId: string, metricType: string): Promise<PerformanceMetric[]> {
    return db
      .select()
      .from(performanceMetrics)
      .where(and(
        eq(performanceMetrics.sessionId, sessionId),
        eq(performanceMetrics.metricType, metricType)
      ))
      .orderBy(performanceMetrics.timestamp);
  }

  async deletePerformanceMetricsBySession(sessionId: string): Promise<boolean> {
    try {
      await db
        .delete(performanceMetrics)
        .where(eq(performanceMetrics.sessionId, sessionId));
      return true;
    } catch (error) {
      console.error("Error deleting performance metrics:", error);
      return false;
    }
  }

  // Session Share methods
  async createSessionShare(shareData: InsertSessionShare): Promise<SessionShare> {
    const id = randomUUID();

    const [share] = await db
      .insert(sessionShares)
      .values({
        ...shareData,
        id
      })
      .returning();

    return share;
  }

  async getSessionShares(sessionId: string): Promise<SessionShare[]> {
    return db
      .select()
      .from(sessionShares)
      .where(eq(sessionShares.sessionId, sessionId))
      .orderBy(desc(sessionShares.createdAt));
  }

  async getSessionShare(id: string): Promise<SessionShare | undefined> {
    const [share] = await db
      .select()
      .from(sessionShares)
      .where(eq(sessionShares.id, id));

    return share;
  }

  async getSessionShareByCode(shareCode: string): Promise<SessionShare | undefined> {
    const [share] = await db
      .select()
      .from(sessionShares)
      .where(eq(sessionShares.shareCode, shareCode));

    return share;
  }

  async updateSessionShare(id: string, updates: Partial<InsertSessionShare>): Promise<SessionShare | undefined> {
    const [updated] = await db
      .update(sessionShares)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(sessionShares.id, id))
      .returning();

    return updated;
  }

  async deleteSessionShare(id: string): Promise<boolean> {
    try {
      await db
        .delete(sessionShares)
        .where(eq(sessionShares.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting session share:", error);
      return false;
    }
  }

  async incrementSessionShareAccess(shareCode: string): Promise<void> {
    await db
      .update(sessionShares)
      .set({
        accessCount: sql`${sessionShares.accessCount} + 1`
      })
      .where(eq(sessionShares.shareCode, shareCode));
  }

  // Cue Point methods
  async createCuePoint(cueData: InsertCuePoint): Promise<CuePoint> {
    const id = randomUUID();
    
    const [cuePoint] = await db
      .insert(cuePoints)
      .values({
        ...cueData,
        id
      })
      .returning();
      
    return cuePoint;
  }
  
  async getCuePoints(trackId: string): Promise<CuePoint[]> {
    return db
      .select()
      .from(cuePoints)
      .where(eq(cuePoints.trackId, trackId))
      .orderBy(desc(cuePoints.timePosition));
  }
  
  async getCuePoint(id: string): Promise<CuePoint | undefined> {
    const [cuePoint] = await db
      .select()
      .from(cuePoints)
      .where(eq(cuePoints.id, id));
      
    return cuePoint;
  }
  
  async updateCuePoint(id: string, updates: Partial<InsertCuePoint>): Promise<CuePoint | undefined> {
    const [updated] = await db
      .update(cuePoints)
      .set(updates)
      .where(eq(cuePoints.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteCuePoint(id: string): Promise<boolean> {
    try {
      await db
        .delete(cuePoints)
        .where(eq(cuePoints.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting cue point:", error);
      return false;
    }
  }
  
  // Loop methods
  async createLoop(loopData: InsertLoop): Promise<Loop> {
    const id = randomUUID();
    
    const [loop] = await db
      .insert(loops)
      .values({
        ...loopData,
        id
      })
      .returning();
      
    return loop;
  }
  
  async getLoops(trackId: string): Promise<Loop[]> {
    return db
      .select()
      .from(loops)
      .where(eq(loops.trackId, trackId))
      .orderBy(desc(loops.startTime));
  }
  
  async getLoop(id: string): Promise<Loop | undefined> {
    const [loop] = await db
      .select()
      .from(loops)
      .where(eq(loops.id, id));
      
    return loop;
  }
  
  async updateLoop(id: string, updates: Partial<InsertLoop>): Promise<Loop | undefined> {
    const [updated] = await db
      .update(loops)
      .set(updates)
      .where(eq(loops.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteLoop(id: string): Promise<boolean> {
    try {
      await db
        .delete(loops)
        .where(eq(loops.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting loop:", error);
      return false;
    }
  }
  
  // Mood Transition methods
  async createMoodTransition(transitionData: InsertMoodTransition): Promise<MoodTransition> {
    const id = randomUUID();
    
    const [transition] = await db
      .insert(moodTransitions)
      .values({
        ...transitionData,
        id
      })
      .returning();
      
    return transition;
  }
  
  async getMoodTransitions(userId: number): Promise<MoodTransition[]> {
    return db
      .select()
      .from(moodTransitions)
      .where(eq(moodTransitions.userId, userId))
      .orderBy(desc(moodTransitions.createdAt));
  }
  
  async getMoodTransition(id: string): Promise<MoodTransition | undefined> {
    const [transition] = await db
      .select()
      .from(moodTransitions)
      .where(eq(moodTransitions.id, id));
      
    return transition;
  }
  
  async updateMoodTransition(id: string, updates: Partial<InsertMoodTransition>): Promise<MoodTransition | undefined> {
    const [updated] = await db
      .update(moodTransitions)
      .set(updates)
      .where(eq(moodTransitions.id, id))
      .returning();
      
    return updated;
  }
  
  async deleteMoodTransition(id: string): Promise<boolean> {
    try {
      await db
        .delete(moodTransitions)
        .where(eq(moodTransitions.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting mood transition:", error);
      return false;
    }
  }
  
  // Session Event methods
  async createSessionEvent(eventData: InsertSessionEvent): Promise<SessionEvent> {
    const id = randomUUID();
    
    const [event] = await db
      .insert(sessionEvents)
      .values({
        ...eventData,
        id
      })
      .returning();
      
    return event;
  }
  
  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    return db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, sessionId))
      .orderBy(desc(sessionEvents.timestamp));
  }
  
  async getSessionEvent(id: string): Promise<SessionEvent | undefined> {
    const [event] = await db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.id, id));
      
    return event;
  }
  
  async deleteSessionEvent(id: string): Promise<boolean> {
    try {
      await db
        .delete(sessionEvents)
        .where(eq(sessionEvents.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting session event:", error);
      return false;
    }
  }
  
  // Effect Category methods
  async createEffectCategory(categoryData: InsertEffectCategory): Promise<EffectCategory> {
    const id = randomUUID();
    const [category] = await db
      .insert(effectCategories)
      .values({
        ...categoryData,
        id
      })
      .returning();
      
    return category;
  }
  
  async getEffectCategories(): Promise<EffectCategory[]> {
    return db.select().from(effectCategories);
  }
  
  async getEffectCategory(id: string): Promise<EffectCategory | undefined> {
    const [category] = await db
      .select()
      .from(effectCategories)
      .where(eq(effectCategories.id, id));
      
    return category;
  }
  
  async updateEffectCategory(id: string, updates: Partial<InsertEffectCategory>): Promise<EffectCategory | undefined> {
    const [category] = await db
      .update(effectCategories)
      .set(updates)
      .where(eq(effectCategories.id, id))
      .returning();
      
    return category;
  }
  
  async deleteEffectCategory(id: string): Promise<boolean> {
    try {
      await db
        .delete(effectCategories)
        .where(eq(effectCategories.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting effect category:", error);
      return false;
    }
  }
  
  // Effect Preset methods
  async createEffectPreset(presetData: InsertEffectPreset): Promise<EffectPreset> {
    const id = randomUUID();
    const [preset] = await db
      .insert(effectPresets)
      .values({
        ...presetData,
        id
      })
      .returning();
      
    return preset;
  }
  
  async getEffectPresets(userId: number): Promise<EffectPreset[]> {
    return db
      .select()
      .from(effectPresets)
      .where(eq(effectPresets.userId, userId))
      .orderBy(desc(effectPresets.lastUsedAt));
  }
  
  async getEffectPresetsByCategory(categoryId: string): Promise<EffectPreset[]> {
    return db
      .select()
      .from(effectPresets)
      .where(eq(effectPresets.categoryId, categoryId))
      .orderBy(desc(effectPresets.lastUsedAt));
  }
  
  async getEffectPreset(id: string): Promise<EffectPreset | undefined> {
    const [preset] = await db
      .select()
      .from(effectPresets)
      .where(eq(effectPresets.id, id));
      
    return preset;
  }
  
  async updateEffectPreset(id: string, updates: Partial<InsertEffectPreset>): Promise<EffectPreset | undefined> {
    const [preset] = await db
      .update(effectPresets)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(effectPresets.id, id))
      .returning();
      
    return preset;
  }
  
  async deleteEffectPreset(id: string): Promise<boolean> {
    try {
      await db
        .delete(effectPresets)
        .where(eq(effectPresets.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting effect preset:", error);
      return false;
    }
  }
  
  async updateEffectPresetUsage(id: string): Promise<void> {
    await db
      .update(effectPresets)
      .set({
        useCount: sql`${effectPresets.useCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(effectPresets.id, id));
  }
  
  // Effect Setting methods
  async createEffectSetting(settingData: InsertEffectSetting): Promise<EffectSetting> {
    const id = randomUUID();
    const [setting] = await db
      .insert(effectSettings)
      .values({
        ...settingData,
        id
      })
      .returning();
      
    return setting;
  }
  
  async getEffectSettings(userId: number): Promise<EffectSetting[]> {
    return db
      .select()
      .from(effectSettings)
      .where(eq(effectSettings.userId, userId));
  }
  
  async getEffectSettingByKey(userId: number, settingKey: string): Promise<EffectSetting | undefined> {
    const [setting] = await db
      .select()
      .from(effectSettings)
      .where(and(
        eq(effectSettings.userId, userId),
        eq(effectSettings.settingKey, settingKey)
      ));
      
    return setting;
  }
  
  async updateEffectSetting(id: string, settingValue: any): Promise<EffectSetting | undefined> {
    const [setting] = await db
      .update(effectSettings)
      .set({
        settingValue,
        updatedAt: new Date()
      })
      .where(eq(effectSettings.id, id))
      .returning();
      
    return setting;
  }
  
  async deleteEffectSetting(id: string): Promise<boolean> {
    try {
      await db
        .delete(effectSettings)
        .where(eq(effectSettings.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting effect setting:", error);
      return false;
    }
  }
  
  // Effect Usage Stats methods
  async createEffectUsageStats(statsData: InsertEffectUsageStats): Promise<EffectUsageStats> {
    const id = randomUUID();
    const [stats] = await db
      .insert(effectUsageStats)
      .values({
        ...statsData,
        id
      })
      .returning();
      
    return stats;
  }
  
  async getEffectUsageStats(userId: number): Promise<EffectUsageStats[]> {
    return db
      .select()
      .from(effectUsageStats)
      .where(eq(effectUsageStats.userId, userId))
      .orderBy(desc(effectUsageStats.timestamp));
  }
  
  async getEffectUsageStatsByEffect(userId: number, effectType: string): Promise<EffectUsageStats[]> {
    return db
      .select()
      .from(effectUsageStats)
      .where(and(
        eq(effectUsageStats.userId, userId),
        eq(effectUsageStats.effectType, effectType)
      ))
      .orderBy(desc(effectUsageStats.timestamp));
  }
}

// Use database storage
export const storage = new DatabaseStorage();
