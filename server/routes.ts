import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { z } from "zod";
import {
  insertSoundLibrarySchema,
  insertSoundSampleSchema,
  insertNoteMappingSchema,
  insertRecordingSchema
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
      const id = Math.random().toString(36).substring(2, 10);
      
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
    const { name } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid library ID' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const library = await storage.updateSoundLibrary(id, name);
    
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
    
    const sample = await storage.updateSoundSample(id, updates);
    
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
    const { sampleId } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid mapping ID' });
    }
    
    if (!sampleId) {
      return res.status(400).json({ error: 'Sample ID is required' });
    }
    
    const mapping = await storage.updateNoteMapping(id, sampleId);
    
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
    
    const recording = await storage.updateRecording(id, updates);
    
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

  const httpServer = createServer(app);

  return httpServer;
}
