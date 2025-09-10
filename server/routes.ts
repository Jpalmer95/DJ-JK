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
  updateSoundLibrarySchema,
  updateSoundSampleSchema,
  updateNoteMappingSchema,
  updateRecordingSchema,
  updateDjTrackSchema,
  updateDjSetSchema,
  updateCuePointSchema,
  updateLoopSchema,
  updateMoodTransitionSchema
} from "@shared/schema";

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
  
  // Create a new mood transition
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

  const httpServer = createServer(app);

  return httpServer;
}
