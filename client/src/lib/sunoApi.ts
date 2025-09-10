// Suno AI music generation API integration - Client-side (secure backend proxy only)
import { apiRequest } from '@/lib/queryClient';

// Request interface for client to server (includes userId)
export interface SunoGenerationRequest {
  prompt: string;
  style?: string;
  title?: string;
  lyrics?: string;
  instrumental?: boolean;
  customMode?: boolean;
  model?: 'V3_5' | 'V4_5' | 'chirp-v3-5' | 'chirp-v3-0';
  duration?: number;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  userId: number; // Required for server-side processing
}

export interface SunoGenerationResponse {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  title?: string;
  audioUrl?: string;
  streamUrl?: string;
  duration?: number;
  bpm?: number;
  key?: string;
  style?: string;
  lyrics?: string;
  error?: string;
  progress?: number;
  estimatedTime?: number;
}

export interface SunoTrackResult {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  duration: number;
  bpm?: number;
  key?: string;
  style?: string;
  lyrics?: string;
  isInstrumental: boolean;
  prompt: string;
}

export interface SunoGenerationServerResponse {
  success: boolean;
  tracks: any[]; // Database saved tracks
  originalTracks: SunoTrackResult[]; // Original Suno API response
}

export interface SunoConfigResponse {
  isValid: boolean;
  error?: string;
}

export interface SunoMetadataResponse {
  styles: string[];
  models: Array<{
    value: string;
    label: string;
    description: string;
  }>;
}

// Available music styles/genres (cached from server)
export const MUSIC_STYLES = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Folk', 'Blues',
  'Country', 'R&B', 'Reggae', 'Punk', 'Metal', 'Funk', 'House', 'Techno',
  'Trance', 'Dubstep', 'Ambient', 'Chill', 'Lo-fi', 'Trap', 'Drill', 'Afrobeat'
];

// Available models (cached from server)
export const SUNO_MODELS = [
  { value: 'V4_5', label: 'Suno v4.5 (Latest)', description: 'Richer vocals, greater variety, up to 8 minutes' },
  { value: 'V3_5', label: 'Suno v3.5 (Stable)', description: 'Stable model with good quality' },
  { value: 'chirp-v3-5', label: 'Chirp v3.5', description: 'High-fidelity, complex compositions' },
  { value: 'chirp-v3-0', label: 'Chirp v3.0', description: 'Simple, straightforward generation' },
];

class SunoApiError extends Error {
  constructor(message: string, public statusCode?: number, public details?: any) {
    super(message);
    this.name = 'SunoApiError';
  }
}

// Validate API configuration via backend
export async function validateSunoConfig(): Promise<SunoConfigResponse> {
  try {
    const response = await apiRequest('/api/suno/config');
    return response;
  } catch (error) {
    console.error('Error validating Suno config:', error);
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown configuration error' 
    };
  }
}

// Get metadata (styles and models) from backend
export async function getSunoMetadata(): Promise<SunoMetadataResponse> {
  try {
    const response = await apiRequest('/api/suno/metadata');
    return response;
  } catch (error) {
    console.error('Error fetching Suno metadata:', error);
    // Return cached data as fallback
    return {
      styles: MUSIC_STYLES,
      models: SUNO_MODELS,
    };
  }
}

// Generate music via secure backend proxy
export async function generateMusic(request: SunoGenerationRequest): Promise<SunoGenerationServerResponse> {
  try {
    console.log('Generating music via backend proxy:', request.prompt);
    
    const response = await apiRequest('/api/suno/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    return response;
  } catch (error) {
    console.error('Error generating music:', error);
    
    // Handle specific error types for better UX
    if (error instanceof Error) {
      if (error.message.includes('service not configured')) {
        throw new SunoApiError('Music generation service not configured. Please contact support.');
      }
      if (error.message.includes('credits') || error.message.includes('quota')) {
        throw new SunoApiError('Insufficient API credits. Please check your account.');
      }
      if (error.message.includes('rate limit')) {
        throw new SunoApiError('Too many requests. Please wait a moment and try again.');
      }
    }
    
    throw error instanceof SunoApiError ? error : new SunoApiError('Failed to generate music');
  }
}

// Check generation status via backend proxy (for polling-based implementations)
export async function checkGenerationStatus(generationId: string): Promise<SunoGenerationResponse> {
  try {
    const response = await apiRequest(`/api/suno/status/${generationId}`);
    return response;
  } catch (error) {
    console.error('Error checking generation status:', error);
    throw error instanceof SunoApiError ? error : new SunoApiError('Failed to check generation status');
  }
}

// Get available generation credits via backend
export async function getGenerationCredits(): Promise<{ credits: number | null; maxCredits: number | null }> {
  try {
    const response = await apiRequest('/api/suno/credits');
    return response;
  } catch (error) {
    console.warn('Credits endpoint not available:', error);
    return { credits: null, maxCredits: null };
  }
}

// Poll generation status until completion (not typically needed with current backend implementation)
export async function pollGenerationStatus(
  generationId: string,
  onProgress?: (response: SunoGenerationResponse) => void,
  maxAttempts: number = 60, // 5 minutes with 5-second intervals
  intervalMs: number = 5000
): Promise<SunoGenerationResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const status = await checkGenerationStatus(generationId);
      
      if (onProgress) {
        onProgress(status);
      }
      
      if (status.status === 'completed') {
        return status;
      }
      
      if (status.status === 'failed') {
        throw new SunoApiError(status.error || 'Generation failed');
      }
      
      attempts++;
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      if (error instanceof SunoApiError) {
        throw error;
      }
      
      // For network errors, wait and retry
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }
  
  throw new SunoApiError('Generation timeout - maximum attempts reached');
}

// Generate music and wait for completion (uses backend proxy)
export async function generateMusicComplete(
  request: SunoGenerationRequest,
  onProgress?: (response: SunoGenerationResponse) => void
): Promise<SunoTrackResult[]> {
  // The backend now handles the complete generation process
  const response = await generateMusic(request);
  
  if (!response.success || !response.originalTracks?.length) {
    throw new SunoApiError('Generation completed but no tracks received');
  }
  
  // Return the original tracks from Suno API
  return response.originalTracks;
}

// Convert Suno response to track result format (kept for compatibility)
function convertToTrackResult(response: SunoGenerationResponse, request: SunoGenerationRequest): SunoTrackResult {
  return {
    id: response.id,
    title: response.title || request.title || 'AI Generated Track',
    artist: 'Suno AI',
    audioUrl: response.audioUrl!,
    duration: response.duration || 0,
    bpm: response.bpm,
    key: response.key,
    style: response.style || request.style,
    lyrics: response.lyrics || request.lyrics,
    isInstrumental: request.instrumental ?? false,
    prompt: request.prompt,
  };
}

// Utility function to check if Suno is available
export async function isSunoAvailable(): Promise<boolean> {
  try {
    const config = await validateSunoConfig();
    return config.isValid;
  } catch (error) {
    console.warn('Suno availability check failed:', error);
    return false;
  }
}

// Export error class for component error handling
export { SunoApiError };