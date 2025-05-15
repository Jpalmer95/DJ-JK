import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { z } from "zod";

// Schema for the shared recording
const SharedRecordingSchema = z.object({
  id: z.string(),
  recording: z.string(), // base64 encoded recording data
  createdAt: z.date().optional(),
});

export type SharedRecording = z.infer<typeof SharedRecordingSchema>;

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

  const httpServer = createServer(app);

  return httpServer;
}
