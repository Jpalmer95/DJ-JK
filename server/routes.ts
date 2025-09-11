import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  insertSoundLibrarySchema,
  insertSoundSampleSchema,
  insertNoteMappingSchema,
  insertRecordingSchema,
  insertDjTrackSchema,
  insertDjSetSchema,
  insertCuePointSchema,
  insertLoopSchema,
  insertMoodTransitionSchema,
  insertSessionEventSchema,
  insertEffectCategorySchema,
  insertEffectPresetSchema,
  insertEffectSettingSchema,
  insertEffectUsageStatsSchema,
  updateSoundLibrarySchema,
  updateSoundSampleSchema,
  updateNoteMappingSchema,
  updateRecordingSchema,
  updateDjTrackSchema,
  updateDjSetSchema,
  updateCuePointSchema,
  updateLoopSchema,
  updateMoodTransitionSchema,
  updateEffectCategorySchema,
  updateEffectPresetSchema,
  updateEffectSettingSchema
} from "@shared/schema";
import {
  generateMusic,
  checkGenerationStatus,
  generateMusicComplete,
  validateSunoConfig,
  getGenerationCredits,
  SunoGenerationRequestSchema,
  type SunoGenerationResponse,
  type SunoTrackResult,
  MUSIC_STYLES,
  SUNO_MODELS
} from "./lib/sunoServer";
import {
  MoodTransitionGenerator,
  MoodTransitionRequestSchema,
  validateMoodTransition,
  getMoodCharacteristics,
  getAllMoodNames,
  MOOD_DATABASE,
  type MoodTransitionRequest
} from "./lib/moodTransitionGenerator";

// Schema for the shared recording
const SharedRecordingSchema = z.object({
  id: z.string(),
  recording: z.string(), // base64 encoded recording data
  createdAt: z.date().optional(),
});

export type SharedRecording = z.infer<typeof SharedRecordingSchema>;

// Middleware to handle errors
const errorHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get a shared recording by ID
  app.get('/api/share/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const recording = await storage.getSharedRecording(id);
      
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }
      
      res.json(recording);
    } catch (error) {
      console.error('Error fetching shared recording:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Save a recording to share
  app.post('/api/share', async (req, res) => {
    try {
      const recordingData = req.body.recording;
      
      if (!recordingData) {
        return res.status(400).json({ error: 'Recording data is required' });
      }
      
      // Generate a unique ID for the recording
      const id = randomUUID();
      
      // Save the recording
      const savedRecording = await storage.saveSharedRecording({
        id,
        recording: recordingData,
        createdAt: new Date(),
      });
      
      res.status(201).json({ 
        id: savedRecording.id,
        shareUrl: `${req.protocol}://${req.get('host')}/share/${id}`
      });
    } catch (error) {
      console.error('Error saving shared recording:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // ===== SOUND LIBRARY ROUTES =====
  
  // Create a new sound library
  app.post('/api/libraries', errorHandler(async (req, res) => {
    const data = req.body;
    
    // Validate the request body
    const result = insertSoundLibrarySchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid library data', details: result.error });
    }
    
    // Create the library
    const library = await storage.createSoundLibrary(data);
    
    res.status(201).json(library);
  }));
  
  // Get all libraries for a user
  app.get('/api/libraries', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const libraries = await storage.getSoundLibraries(userId);
    
    res.json(libraries);
  }));
  
  // Get a specific library
  app.get('/api/libraries/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid library ID' });
    }
    
    const library = await storage.getSoundLibrary(id);
    
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }
    
    res.json(library);
  }));
  
  // Update a library
  app.patch('/api/libraries/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    const updates = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid library ID' });
    }
    
    // Validate the request body using update schema
    const result = updateSoundLibrarySchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const library = await storage.updateSoundLibrary(id, result.data.name);
    
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }
    
    res.json(library);
  }));
  
  // Delete a library
  app.delete('/api/libraries/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid library ID' });
    }
    
    const success = await storage.deleteSoundLibrary(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Library not found' });
    }
    
    res.status(204).end();
  }));
  
  // ===== SOUND SAMPLE ROUTES =====
  
  // Create a new sound sample
  app.post('/api/samples', errorHandler(async (req, res) => {
    const data = req.body;
    
    // Validate the request body
    const result = insertSoundSampleSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid sample data', details: result.error });
    }
    
    // Create the sample
    const sample = await storage.createSoundSample(data);
    
    res.status(201).json(sample);
  }));
  
  // Get all samples for a library
  app.get('/api/samples', errorHandler(async (req, res) => {
    const libraryId = Number(req.query.libraryId);
    
    if (!libraryId) {
      return res.status(400).json({ error: 'Library ID is required' });
    }
    
    const samples = await storage.getSoundSamples(libraryId);
    
    res.json(samples);
  }));
  
  // Get a specific sample
  app.get('/api/samples/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sample ID' });
    }
    
    const sample = await storage.getSoundSample(id);
    
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found' });
    }
    
    res.json(sample);
  }));
  
  // Update a sample
  app.patch('/api/samples/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    const updates = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sample ID' });
    }
    
    // Validate the request body using update schema
    const result = updateSoundSampleSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const sample = await storage.updateSoundSample(id, result.data);
    
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found' });
    }
    
    res.json(sample);
  }));
  
  // Delete a sample
  app.delete('/api/samples/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sample ID' });
    }
    
    const success = await storage.deleteSoundSample(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Sample not found' });
    }
    
    res.status(204).end();
  }));
  
  // ===== NOTE MAPPING ROUTES =====
  
  // Create a new note mapping
  app.post('/api/mappings', errorHandler(async (req, res) => {
    const data = req.body;
    
    // Validate the request body
    const result = insertNoteMappingSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid mapping data', details: result.error });
    }
    
    // Create the mapping
    const mapping = await storage.createNoteMapping(data);
    
    res.status(201).json(mapping);
  }));
  
  // Get all mappings for a library
  app.get('/api/mappings', errorHandler(async (req, res) => {
    const libraryId = Number(req.query.libraryId);
    
    if (!libraryId) {
      return res.status(400).json({ error: 'Library ID is required' });
    }
    
    const mappings = await storage.getNoteMappings(libraryId);
    
    res.json(mappings);
  }));
  
  // Get a specific note mapping
  app.get('/api/mappings/:libraryId/:note', errorHandler(async (req, res) => {
    const libraryId = Number(req.params.libraryId);
    const note = req.params.note;
    
    if (isNaN(libraryId)) {
      return res.status(400).json({ error: 'Invalid library ID' });
    }
    
    const mapping = await storage.getNoteMapping(libraryId, note);
    
    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json(mapping);
  }));
  
  // Update a note mapping
  app.patch('/api/mappings/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    const updates = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid mapping ID' });
    }
    
    // Validate the request body using update schema
    const result = updateNoteMappingSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const mapping = await storage.updateNoteMapping(id, result.data.sampleId);
    
    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json(mapping);
  }));
  
  // Delete a note mapping
  app.delete('/api/mappings/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid mapping ID' });
    }
    
    const success = await storage.deleteNoteMapping(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.status(204).end();
  }));
  
  // ===== RECORDING ROUTES =====
  
  // Create a new recording
  app.post('/api/recordings', errorHandler(async (req, res) => {
    const data = req.body;
    
    // Validate the request body
    const result = insertRecordingSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid recording data', details: result.error });
    }
    
    // Create the recording
    const recording = await storage.createRecording(data);
    
    res.status(201).json(recording);
  }));
  
  // Get all recordings for a user
  app.get('/api/recordings', errorHandler(async (req, res) => {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    
    const recordings = await storage.getRecordings(userId);
    
    res.json(recordings);
  }));
  
  // Get a specific recording
  app.get('/api/recordings/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid recording ID' });
    }
    
    const recording = await storage.getRecording(id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  }));
  
  // Get a recording by share code
  app.get('/api/recordings/by-code/:shareCode', errorHandler(async (req, res) => {
    const shareCode = req.params.shareCode;
    
    const recording = await storage.getRecordingByShareCode(shareCode);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  }));
  
  // Update a recording
  app.patch('/api/recordings/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    const updates = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid recording ID' });
    }
    
    // Validate the request body using update schema
    const result = updateRecordingSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const recording = await storage.updateRecording(id, result.data);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  }));
  
  // Delete a recording
  app.delete('/api/recordings/:id', errorHandler(async (req, res) => {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid recording ID' });
    }
    
    const success = await storage.deleteRecording(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.status(204).end();
  }));

  // ===== DJ TRACK ROUTES =====
  
  // Create a new DJ track
  app.post('/api/tracks', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertDjTrackSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid track data', details: result.error });
    }
    
    const track = await storage.createDjTrack(data);
    res.status(201).json(track);
  }));
  
  // Get all tracks for a user
  app.get('/api/tracks', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const tracks = await storage.getDjTracks(userId);
    res.json(tracks);
  }));
  
  // Get a specific track
  app.get('/api/tracks/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const track = await storage.getDjTrack(id);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    res.json(track);
  }));
  
  // Update a track
  app.patch('/api/tracks/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    // Validate the request body using update schema
    const result = updateDjTrackSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    // Check if track exists and belongs to user (basic scoping)
    const existingTrack = await storage.getDjTrack(id);
    if (!existingTrack) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    const track = await storage.updateDjTrack(id, result.data);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    res.json(track);
  }));
  
  // Delete a track
  app.delete('/api/tracks/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteDjTrack(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    res.status(204).end();
  }));

  // ===== SUNO AI MUSIC GENERATION ROUTES =====
  
  // Check Suno API configuration
  app.get('/api/suno/config', errorHandler(async (req, res) => {
    const config = validateSunoConfig();
    res.json(config);
  }));
  
  // Get available music styles and models
  app.get('/api/suno/metadata', errorHandler(async (req, res) => {
    res.json({
      styles: MUSIC_STYLES,
      models: SUNO_MODELS,
    });
  }));
  
  // Generate music via Suno AI (Server-side proxy)
  app.post('/api/suno/generate', errorHandler(async (req, res) => {
    const userId = Number(req.body.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Validate the Suno request
    const result = SunoGenerationRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid generation request', 
        details: result.error.errors 
      });
    }
    
    try {
      // Generate music using server-side API
      const tracks = await generateMusicComplete(result.data, (progress) => {
        // TODO: In a real implementation, we could use WebSockets to send progress updates
        console.log('Generation progress:', progress);
      });
      
      // Save generated tracks to database
      const savedTracks = [];
      for (const track of tracks) {
        try {
          // Prepare track data with proper types for database
          const trackData = {
            userId,
            title: track.title,
            artist: track.artist,
            url: track.audioUrl,
            duration: track.duration.toString(), // Database expects decimal as string format
            bpm: track.bpm || null,
            key: track.key || null,
            genre: track.style || null,
            waveformData: null, // Will be generated when loaded
          };
          
          const savedTrack = await storage.createDjTrack(trackData);
          savedTracks.push(savedTrack);
        } catch (error) {
          console.error('Error saving track to database:', error);
          // Continue with other tracks even if one fails
        }
      }
      
      res.status(201).json({
        success: true,
        tracks: savedTracks,
        originalTracks: tracks, // Include original Suno response for immediate use
      });
    } catch (error) {
      console.error('Error generating music:', error);
      
      if (error instanceof Error && error.message.includes('API key')) {
        return res.status(503).json({ 
          error: 'Music generation service not configured', 
          details: 'Please configure SUNO_API_KEY on server'
        });
      }
      
      return res.status(500).json({ 
        error: 'Music generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));
  
  // Check generation status (for polling-based implementations)
  app.get('/api/suno/status/:id', errorHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Generation ID is required' });
    }
    
    try {
      const status = await checkGenerationStatus(id);
      res.json(status);
    } catch (error) {
      console.error('Error checking generation status:', error);
      return res.status(500).json({ 
        error: 'Failed to check generation status', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));
  
  // Get generation credits (if supported by API)
  app.get('/api/suno/credits', errorHandler(async (req, res) => {
    try {
      const credits = await getGenerationCredits();
      res.json(credits || { credits: null, maxCredits: null });
    } catch (error) {
      console.error('Error fetching generation credits:', error);
      res.json({ credits: null, maxCredits: null });
    }
  }));

  // ===== DJ SET ROUTES =====
  
  // Create a new DJ set
  app.post('/api/sets', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertDjSetSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid set data', details: result.error });
    }
    
    const set = await storage.createDjSet(data);
    res.status(201).json(set);
  }));
  
  // Get all sets for a user
  app.get('/api/sets', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const sets = await storage.getDjSets(userId);
    res.json(sets);
  }));
  
  // Get a specific set
  app.get('/api/sets/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const set = await storage.getDjSet(id);
    
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
    res.json(set);
  }));
  
  // Update a set
  app.patch('/api/sets/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    // Validate the request body using update schema
    const result = updateDjSetSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    // Check if set exists and belongs to user (basic scoping)
    const existingSet = await storage.getDjSet(id);
    if (!existingSet) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
    const set = await storage.updateDjSet(id, result.data);
    
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
    res.json(set);
  }));
  
  // Delete a set
  app.delete('/api/sets/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteDjSet(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
    res.status(204).end();
  }));

  // ===== CUE POINT ROUTES =====
  
  // Create a new cue point
  app.post('/api/cuepoints', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertCuePointSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid cue point data', details: result.error });
    }
    
    const cuePoint = await storage.createCuePoint(data);
    res.status(201).json(cuePoint);
  }));
  
  // Get all cue points for a track
  app.get('/api/cuepoints', errorHandler(async (req, res) => {
    const trackId = req.query.trackId as string;
    
    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }
    
    const cuePoints = await storage.getCuePoints(trackId);
    res.json(cuePoints);
  }));
  
  // Get a specific cue point
  app.get('/api/cuepoints/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const cuePoint = await storage.getCuePoint(id);
    
    if (!cuePoint) {
      return res.status(404).json({ error: 'Cue point not found' });
    }
    
    res.json(cuePoint);
  }));
  
  // Update a cue point
  app.patch('/api/cuepoints/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    // Validate the request body using update schema
    const result = updateCuePointSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const cuePoint = await storage.updateCuePoint(id, result.data);
    
    if (!cuePoint) {
      return res.status(404).json({ error: 'Cue point not found' });
    }
    
    res.json(cuePoint);
  }));
  
  // Delete a cue point
  app.delete('/api/cuepoints/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteCuePoint(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Cue point not found' });
    }
    
    res.status(204).end();
  }));

  // ===== LOOP ROUTES =====
  
  // Create a new loop
  app.post('/api/loops', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertLoopSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid loop data', details: result.error });
    }
    
    const loop = await storage.createLoop(data);
    res.status(201).json(loop);
  }));
  
  // Get all loops for a track
  app.get('/api/loops', errorHandler(async (req, res) => {
    const trackId = req.query.trackId as string;
    
    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }
    
    const loops = await storage.getLoops(trackId);
    res.json(loops);
  }));
  
  // Get a specific loop
  app.get('/api/loops/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const loop = await storage.getLoop(id);
    
    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }
    
    res.json(loop);
  }));
  
  // Update a loop
  app.patch('/api/loops/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    // Validate the request body using update schema
    const result = updateLoopSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const loop = await storage.updateLoop(id, result.data);
    
    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }
    
    res.json(loop);
  }));
  
  // Delete a loop
  app.delete('/api/loops/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteLoop(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Loop not found' });
    }
    
    res.status(204).end();
  }));

  // ===== MOOD TRANSITION ROUTES =====
  
  // Generate progressive mood transition music
  app.post('/api/mood-transitions/generate', errorHandler(async (req, res) => {
    const userId = Number(req.body.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Validate the mood transition request
    const result = MoodTransitionRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid mood transition request', 
        details: result.error.errors 
      });
    }
    
    const request = result.data;
    
    // Validate mood transition is possible
    if (!validateMoodTransition(request.fromMood, request.toMood)) {
      return res.status(400).json({ 
        error: 'Invalid mood transition',
        details: `Cannot transition from ${request.fromMood} to ${request.toMood}`
      });
    }
    
    try {
      console.log(`Generating progressive mood transition: ${request.fromMood} → ${request.toMood}`);
      
      // Generate progressive transition tracks
      const tracks = await MoodTransitionGenerator.generateProgressiveTransition(request);
      
      // Save generated tracks to database
      const savedTracks = [];
      for (const track of tracks) {
        try {
          const trackData = {
            userId,
            title: track.title,
            artist: track.artist,
            url: track.audioUrl,
            duration: track.duration.toString(),
            bpm: track.bpm || null,
            key: track.key || null,
            genre: track.style || 'Mood Transition',
            waveformData: null,
          };
          
          const savedTrack = await storage.createDjTrack(trackData);
          savedTracks.push(savedTrack);
        } catch (error) {
          console.error('Error saving mood transition track:', error);
        }
      }
      
      // Save mood transition record
      try {
        const transitionRecord = {
          userId,
          currentMood: request.fromMood,
          desiredMood: request.toMood,
          transitionType: request.transitionProfile.transitionStyle,
          generatedTrackId: savedTracks[0]?.id || null
        };
        
        await storage.createMoodTransition(transitionRecord);
      } catch (error) {
        console.warn('Failed to save mood transition record:', error);
      }
      
      res.status(201).json({
        success: true,
        tracks: savedTracks,
        originalTracks: tracks,
        transition: {
          from: request.fromMood,
          to: request.toMood,
          sections: request.transitionProfile.sections,
          duration: request.transitionProfile.duration
        }
      });
      
    } catch (error) {
      console.error('Error generating mood transition:', error);
      
      if (error instanceof Error && error.message.includes('API key')) {
        return res.status(503).json({ 
          error: 'Music generation service not configured', 
          details: 'Please configure SUNO_API_KEY on server'
        });
      }
      
      return res.status(500).json({ 
        error: 'Mood transition generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));
  
  // Get mood database and characteristics
  app.get('/api/mood-transitions/moods', errorHandler(async (req, res) => {
    res.json({
      moods: getAllMoodNames(),
      characteristics: MOOD_DATABASE
    });
  }));
  
  // Get characteristics for a specific mood
  app.get('/api/mood-transitions/moods/:mood', errorHandler(async (req, res) => {
    const { mood } = req.params;
    const characteristics = getMoodCharacteristics(mood);
    
    if (!characteristics) {
      return res.status(404).json({ error: 'Mood not found' });
    }
    
    res.json({
      mood,
      characteristics
    });
  }));
  
  // Create a new mood transition record
  app.post('/api/mood-transitions', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertMoodTransitionSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid mood transition data', details: result.error });
    }
    
    const transition = await storage.createMoodTransition(data);
    res.status(201).json(transition);
  }));

  // Legacy endpoint for backward compatibility
  app.post('/api/moods', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertMoodTransitionSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid mood transition data', details: result.error });
    }
    
    const transition = await storage.createMoodTransition(data);
    res.status(201).json(transition);
  }));
  
  // Get all mood transitions for a user
  app.get('/api/mood-transitions', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const transitions = await storage.getMoodTransitions(userId);
    res.json(transitions);
  }));

  // Legacy endpoint for backward compatibility
  app.get('/api/moods', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const transitions = await storage.getMoodTransitions(userId);
    res.json(transitions);
  }));
  
  // Get a specific mood transition
  app.get('/api/moods/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const transition = await storage.getMoodTransition(id);
    
    if (!transition) {
      return res.status(404).json({ error: 'Mood transition not found' });
    }
    
    res.json(transition);
  }));
  
  // Update a mood transition
  app.patch('/api/moods/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    // Validate the request body using update schema
    const result = updateMoodTransitionSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    // Check if transition exists and belongs to user (basic scoping)
    const existingTransition = await storage.getMoodTransition(id);
    if (!existingTransition) {
      return res.status(404).json({ error: 'Mood transition not found' });
    }
    
    const transition = await storage.updateMoodTransition(id, result.data);
    
    if (!transition) {
      return res.status(404).json({ error: 'Mood transition not found' });
    }
    
    res.json(transition);
  }));
  
  // Delete a mood transition
  app.delete('/api/moods/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteMoodTransition(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Mood transition not found' });
    }
    
    res.status(204).end();
  }));

  // ===== SESSION EVENT ROUTES =====
  
  // Create a new session event
  app.post('/api/events', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertSessionEventSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid session event data', details: result.error });
    }
    
    const event = await storage.createSessionEvent(data);
    res.status(201).json(event);
  }));
  
  // Get all events for a session
  app.get('/api/events', errorHandler(async (req, res) => {
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const events = await storage.getSessionEvents(sessionId);
    res.json(events);
  }));
  
  // Get a specific event
  app.get('/api/events/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const event = await storage.getSessionEvent(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Session event not found' });
    }
    
    res.json(event);
  }));
  
  // Delete a session event
  app.delete('/api/events/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteSessionEvent(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Session event not found' });
    }
    
    res.status(204).end();
  }));
  
  // ===== EFFECT CATEGORY ROUTES =====
  
  // Create a new effect category
  app.post('/api/effect-categories', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertEffectCategorySchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid effect category data', details: result.error });
    }
    
    const category = await storage.createEffectCategory(data);
    res.status(201).json(category);
  }));
  
  // Get all effect categories
  app.get('/api/effect-categories', errorHandler(async (req, res) => {
    const categories = await storage.getEffectCategories();
    res.json(categories);
  }));
  
  // Get a specific effect category
  app.get('/api/effect-categories/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const category = await storage.getEffectCategory(id);
    
    if (!category) {
      return res.status(404).json({ error: 'Effect category not found' });
    }
    
    res.json(category);
  }));
  
  // Update an effect category
  app.patch('/api/effect-categories/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    const result = updateEffectCategorySchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const category = await storage.updateEffectCategory(id, result.data);
    
    if (!category) {
      return res.status(404).json({ error: 'Effect category not found' });
    }
    
    res.json(category);
  }));
  
  // Delete an effect category
  app.delete('/api/effect-categories/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteEffectCategory(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Effect category not found' });
    }
    
    res.status(204).end();
  }));
  
  // ===== EFFECT PRESET ROUTES =====
  
  // Create a new effect preset
  app.post('/api/effect-presets', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertEffectPresetSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid effect preset data', details: result.error });
    }
    
    const preset = await storage.createEffectPreset(data);
    res.status(201).json(preset);
  }));
  
  // Get all effect presets for a user
  app.get('/api/effect-presets', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    const categoryId = req.query.categoryId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    let presets;
    if (categoryId) {
      presets = await storage.getEffectPresetsByCategory(categoryId);
    } else {
      presets = await storage.getEffectPresets(userId);
    }
    
    res.json(presets);
  }));
  
  // Get a specific effect preset
  app.get('/api/effect-presets/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const preset = await storage.getEffectPreset(id);
    
    if (!preset) {
      return res.status(404).json({ error: 'Effect preset not found' });
    }
    
    res.json(preset);
  }));
  
  // Update an effect preset
  app.patch('/api/effect-presets/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    const result = updateEffectPresetSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const preset = await storage.updateEffectPreset(id, result.data);
    
    if (!preset) {
      return res.status(404).json({ error: 'Effect preset not found' });
    }
    
    res.json(preset);
  }));
  
  // Delete an effect preset
  app.delete('/api/effect-presets/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteEffectPreset(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Effect preset not found' });
    }
    
    res.status(204).end();
  }));
  
  // Update preset usage (increment use count)
  app.post('/api/effect-presets/:id/use', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    await storage.updateEffectPresetUsage(id);
    res.status(200).json({ success: true });
  }));
  
  // ===== EFFECT SETTING ROUTES =====
  
  // Create a new effect setting
  app.post('/api/effect-settings', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertEffectSettingSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid effect setting data', details: result.error });
    }
    
    const setting = await storage.createEffectSetting(data);
    res.status(201).json(setting);
  }));
  
  // Get all effect settings for a user
  app.get('/api/effect-settings', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    const settingKey = req.query.settingKey as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    let settings;
    if (settingKey) {
      const setting = await storage.getEffectSettingByKey(userId, settingKey);
      settings = setting ? [setting] : [];
    } else {
      settings = await storage.getEffectSettings(userId);
    }
    
    res.json(settings);
  }));
  
  // Update an effect setting
  app.patch('/api/effect-settings/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const { settingValue } = req.body;
    
    if (settingValue === undefined) {
      return res.status(400).json({ error: 'Setting value is required' });
    }
    
    const setting = await storage.updateEffectSetting(id, settingValue);
    
    if (!setting) {
      return res.status(404).json({ error: 'Effect setting not found' });
    }
    
    res.json(setting);
  }));
  
  // Delete an effect setting
  app.delete('/api/effect-settings/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteEffectSetting(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Effect setting not found' });
    }
    
    res.status(204).end();
  }));
  
  // ===== EFFECT USAGE STATS ROUTES =====
  
  // Create a new effect usage record
  app.post('/api/effect-usage-stats', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertEffectUsageStatsSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid effect usage stats data', details: result.error });
    }
    
    const stats = await storage.createEffectUsageStats(data);
    res.status(201).json(stats);
  }));
  
  // Get effect usage stats for a user
  app.get('/api/effect-usage-stats', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    const effectType = req.query.effectType as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    let stats;
    if (effectType) {
      stats = await storage.getEffectUsageStatsByEffect(userId, effectType);
    } else {
      stats = await storage.getEffectUsageStats(userId);
    }
    
    res.json(stats);
  }));

  // ===== DJ SESSION RECORDING ROUTES =====
  
  // Create a new DJ session
  app.post('/api/sessions', errorHandler(async (req, res) => {
    const data = req.body;
    
    const result = insertDjSessionSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid session data', details: result.error });
    }
    
    const session = await storage.createDjSession(data);
    res.status(201).json(session);
  }));
  
  // Get all sessions for a user
  app.get('/api/sessions', errorHandler(async (req, res) => {
    const userId = Number(req.query.userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const sessions = await storage.getDjSessions(userId);
    res.json(sessions);
  }));
  
  // Get a specific session
  app.get('/api/sessions/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const session = await storage.getDjSession(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  }));
  
  // Update a session
  app.patch('/api/sessions/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    
    const result = updateDjSessionSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const session = await storage.updateDjSession(id, result.data);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  }));
  
  // Delete a session
  app.delete('/api/sessions/:id', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    const success = await storage.deleteDjSession(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.status(204).end();
  }));
  
  // Increment session views
  app.post('/api/sessions/:id/view', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    await storage.incrementDjSessionViews(id);
    res.status(200).json({ message: 'View count incremented' });
  }));
  
  // Increment session downloads
  app.post('/api/sessions/:id/download', errorHandler(async (req, res) => {
    const id = req.params.id;
    
    await storage.incrementDjSessionDownloads(id);
    res.status(200).json({ message: 'Download count incremented' });
  }));

  // ===== AUTOMATION EVENT ROUTES =====
  
  // Create automation events (bulk)
  app.post('/api/sessions/:sessionId/automation', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const { events } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events array is required' });
    }
    
    const createdEvents = [];
    
    for (const eventData of events) {
      const result = insertAutomationEventSchema.safeParse({ ...eventData, sessionId });
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid automation event data', details: result.error });
      }
      
      const event = await storage.createAutomationEvent(result.data);
      createdEvents.push(event);
    }
    
    res.status(201).json(createdEvents);
  }));
  
  // Get automation events for a session
  app.get('/api/sessions/:sessionId/automation', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const startTime = req.query.startTime ? Number(req.query.startTime) : undefined;
    const endTime = req.query.endTime ? Number(req.query.endTime) : undefined;
    
    let events;
    if (startTime !== undefined && endTime !== undefined) {
      events = await storage.getAutomationEventsByTimeRange(sessionId, startTime, endTime);
    } else {
      events = await storage.getAutomationEvents(sessionId);
    }
    
    res.json(events);
  }));
  
  // Delete all automation events for a session
  app.delete('/api/sessions/:sessionId/automation', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    
    const success = await storage.deleteAutomationEventsBySession(sessionId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found or no events to delete' });
    }
    
    res.status(204).end();
  }));

  // ===== SESSION TRACK ROUTES =====
  
  // Create a session track
  app.post('/api/sessions/:sessionId/tracks', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const data = { ...req.body, sessionId };
    
    const result = insertSessionTrackSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid session track data', details: result.error });
    }
    
    const track = await storage.createSessionTrack(result.data);
    res.status(201).json(track);
  }));
  
  // Get tracks for a session
  app.get('/api/sessions/:sessionId/tracks', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    
    const tracks = await storage.getSessionTracks(sessionId);
    res.json(tracks);
  }));
  
  // Get a specific session track
  app.get('/api/sessions/:sessionId/tracks/:trackId', errorHandler(async (req, res) => {
    const trackId = req.params.trackId;
    
    const track = await storage.getSessionTrack(trackId);
    
    if (!track) {
      return res.status(404).json({ error: 'Session track not found' });
    }
    
    res.json(track);
  }));
  
  // Update a session track
  app.patch('/api/sessions/:sessionId/tracks/:trackId', errorHandler(async (req, res) => {
    const trackId = req.params.trackId;
    const updates = req.body;
    
    const result = updateSessionTrackSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const track = await storage.updateSessionTrack(trackId, result.data);
    
    if (!track) {
      return res.status(404).json({ error: 'Session track not found' });
    }
    
    res.json(track);
  }));
  
  // Delete a session track
  app.delete('/api/sessions/:sessionId/tracks/:trackId', errorHandler(async (req, res) => {
    const trackId = req.params.trackId;
    
    const success = await storage.deleteSessionTrack(trackId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session track not found' });
    }
    
    res.status(204).end();
  }));

  // ===== PERFORMANCE METRIC ROUTES =====
  
  // Create a performance metric
  app.post('/api/sessions/:sessionId/metrics', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const data = { ...req.body, sessionId };
    
    const result = insertPerformanceMetricSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid performance metric data', details: result.error });
    }
    
    const metric = await storage.createPerformanceMetric(result.data);
    res.status(201).json(metric);
  }));
  
  // Get performance metrics for a session
  app.get('/api/sessions/:sessionId/metrics', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const metricType = req.query.metricType as string;
    
    let metrics;
    if (metricType) {
      metrics = await storage.getPerformanceMetricsByType(sessionId, metricType);
    } else {
      metrics = await storage.getPerformanceMetrics(sessionId);
    }
    
    res.json(metrics);
  }));
  
  // Delete all performance metrics for a session
  app.delete('/api/sessions/:sessionId/metrics', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    
    const success = await storage.deletePerformanceMetricsBySession(sessionId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found or no metrics to delete' });
    }
    
    res.status(204).end();
  }));

  // ===== SESSION SHARE ROUTES =====
  
  // Create a session share
  app.post('/api/sessions/:sessionId/share', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const data = { ...req.body, sessionId };
    
    const result = insertSessionShareSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid session share data', details: result.error });
    }
    
    const share = await storage.createSessionShare(result.data);
    res.status(201).json(share);
  }));
  
  // Get shares for a session
  app.get('/api/sessions/:sessionId/share', errorHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    
    const shares = await storage.getSessionShares(sessionId);
    res.json(shares);
  }));
  
  // Get a specific session share by ID
  app.get('/api/sessions/:sessionId/share/:shareId', errorHandler(async (req, res) => {
    const shareId = req.params.shareId;
    
    const share = await storage.getSessionShare(shareId);
    
    if (!share) {
      return res.status(404).json({ error: 'Session share not found' });
    }
    
    res.json(share);
  }));
  
  // Get a session share by share code (public access)
  app.get('/api/share/:shareCode', errorHandler(async (req, res) => {
    const shareCode = req.params.shareCode;
    
    const share = await storage.getSessionShareByCode(shareCode);
    
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }
    
    // Increment access count
    await storage.incrementSessionShareAccess(shareCode);
    
    res.json(share);
  }));
  
  // Update a session share
  app.patch('/api/sessions/:sessionId/share/:shareId', errorHandler(async (req, res) => {
    const shareId = req.params.shareId;
    const updates = req.body;
    
    const result = updateSessionShareSchema.safeParse(updates);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid update data', details: result.error });
    }
    
    const share = await storage.updateSessionShare(shareId, result.data);
    
    if (!share) {
      return res.status(404).json({ error: 'Session share not found' });
    }
    
    res.json(share);
  }));
  
  // Delete a session share
  app.delete('/api/sessions/:sessionId/share/:shareId', errorHandler(async (req, res) => {
    const shareId = req.params.shareId;
    
    const success = await storage.deleteSessionShare(shareId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session share not found' });
    }
    
    res.status(204).end();
  }));

  const httpServer = createServer(app);

  return httpServer;
}
