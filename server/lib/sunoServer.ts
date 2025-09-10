// Server-side Suno AI music generation API integration
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Request/Response schemas for validation
export const SunoGenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  style: z.string().optional(),
  title: z.string().optional(),
  lyrics: z.string().optional(),
  instrumental: z.boolean().optional(),
  customMode: z.boolean().optional(),
  model: z.enum(['V3_5', 'V4_5', 'chirp-v3-5', 'chirp-v3-0']).optional(),
  duration: z.number().optional(),
  vocalGender: z.enum(['m', 'f']).optional(),
  styleWeight: z.number().min(0).max(1).optional(),
  weirdnessConstraint: z.number().min(0).max(1).optional(),
  audioWeight: z.number().min(0).max(1).optional(),
});

export const SunoGenerationResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  title: z.string().optional(),
  audioUrl: z.string().optional(),
  streamUrl: z.string().optional(),
  duration: z.number().optional(),
  bpm: z.number().optional(),
  key: z.string().optional(),
  style: z.string().optional(),
  lyrics: z.string().optional(),
  error: z.string().optional(),
  progress: z.number().optional(),
  estimatedTime: z.number().optional(),
});

export const SunoTrackResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  audioUrl: z.string(),
  duration: z.number(),
  bpm: z.number().optional(),
  key: z.string().optional(),
  style: z.string().optional(),
  lyrics: z.string().optional(),
  isInstrumental: z.boolean(),
  prompt: z.string(),
});

export type SunoGenerationRequest = z.infer<typeof SunoGenerationRequestSchema>;
export type SunoGenerationResponse = z.infer<typeof SunoGenerationResponseSchema>;
export type SunoTrackResult = z.infer<typeof SunoTrackResultSchema>;

// Available music styles/genres
export const MUSIC_STYLES = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Folk', 'Blues',
  'Country', 'R&B', 'Reggae', 'Punk', 'Metal', 'Funk', 'House', 'Techno',
  'Trance', 'Dubstep', 'Ambient', 'Chill', 'Lo-fi', 'Trap', 'Drill', 'Afrobeat'
];

// Available models
export const SUNO_MODELS = [
  { value: 'V4_5', label: 'Suno v4.5 (Latest)', description: 'Richer vocals, greater variety, up to 8 minutes' },
  { value: 'V3_5', label: 'Suno v3.5 (Stable)', description: 'Stable model with good quality' },
  { value: 'chirp-v3-5', label: 'Chirp v3.5', description: 'High-fidelity, complex compositions' },
  { value: 'chirp-v3-0', label: 'Chirp v3.0', description: 'Simple, straightforward generation' },
];

// Configuration for different Suno API providers
const SUNO_API_CONFIGS = {
  sunoapi_org: {
    baseUrl: 'https://api.sunoapi.org',
    generateEndpoint: '/api/v1/generate',
    statusEndpoint: '/api/v1/status',
  },
  sunoapi_com: {
    baseUrl: 'https://api.sunoapi.com',
    generateEndpoint: '/v1/suno/create',
    statusEndpoint: '/v1/suno/status',
  },
  aiml_api: {
    baseUrl: 'https://api.aimlapi.com',
    generateEndpoint: '/v1/suno/generate',
    statusEndpoint: '/v1/suno/status',
  }
};

// Default provider - can be configured via environment variable
const getApiConfig = () => {
  const provider = process.env.SUNO_PROVIDER || 'sunoapi_org';
  return SUNO_API_CONFIGS[provider as keyof typeof SUNO_API_CONFIGS] || SUNO_API_CONFIGS.sunoapi_org;
};

// Get API key from environment (SERVER-SIDE ONLY)
const getApiKey = (): string => {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error('Suno API key not configured. Please set SUNO_API_KEY environment variable on server.');
  }
  return apiKey;
};

class SunoApiError extends Error {
  constructor(message: string, public statusCode?: number, public details?: any) {
    super(message);
    this.name = 'SunoApiError';
  }
}

// Make authenticated request to Suno API (SERVER-SIDE ONLY)
async function makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const config = getApiConfig();
  const apiKey = getApiKey();
  
  const url = `${config.baseUrl}${endpoint}`;
  
  console.log(`Making Suno API request to: ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DJ-App-Server/1.0',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`Suno API error ${response.status}:`, data);
    throw new SunoApiError(
      data.message || `API request failed: ${response.status}`,
      response.status,
      data
    );
  }
  
  return data;
}

// Generate music using Suno AI (SERVER-SIDE ONLY)
export async function generateMusic(request: SunoGenerationRequest): Promise<SunoGenerationResponse> {
  try {
    const config = getApiConfig();
    
    // Prepare the request payload based on the API provider
    const payload = {
      prompt: request.prompt,
      style: request.style || 'Electronic',
      title: request.title,
      customMode: request.customMode ?? true,
      instrumental: request.instrumental ?? false,
      model: request.model || 'V3_5',
      vocalGender: request.vocalGender || 'm',
      styleWeight: request.styleWeight ?? 0.65,
      weirdnessConstraint: request.weirdnessConstraint ?? 0.65,
      audioWeight: request.audioWeight ?? 0.65,
      ...(request.lyrics && !request.instrumental && { lyrics: request.lyrics }),
    };
    
    console.log('Generating music with payload:', payload);
    
    const response = await makeApiRequest(config.generateEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    // Handle different response formats from different providers
    const result: SunoGenerationResponse = {
      id: response.id || response.job_id || randomUUID(),
      status: mapResponseStatus(response.status || response.state),
      title: response.title || request.title,
      audioUrl: response.audio_url || response.audioUrl,
      streamUrl: response.stream_url || response.streamUrl,
      duration: response.duration,
      bpm: response.bpm,
      key: response.key,
      style: response.style || request.style,
      lyrics: response.lyrics || request.lyrics,
      progress: response.progress || 0,
      estimatedTime: response.estimated_time || response.estimatedTime || 120, // Default 2 minutes
    };
    
    return result;
  } catch (error) {
    console.error('Error generating music:', error);
    throw error instanceof SunoApiError ? error : new SunoApiError('Failed to generate music');
  }
}

// Check generation status (SERVER-SIDE ONLY)
export async function checkGenerationStatus(generationId: string): Promise<SunoGenerationResponse> {
  try {
    const config = getApiConfig();
    const response = await makeApiRequest(`${config.statusEndpoint}/${generationId}`);
    
    return {
      id: generationId,
      status: mapResponseStatus(response.status || response.state),
      title: response.title,
      audioUrl: response.audio_url || response.audioUrl,
      streamUrl: response.stream_url || response.streamUrl,
      duration: response.duration,
      bpm: response.bpm,
      key: response.key,
      style: response.style,
      lyrics: response.lyrics,
      progress: response.progress || 0,
      estimatedTime: response.estimated_time || response.estimatedTime,
      error: response.error,
    };
  } catch (error) {
    console.error('Error checking generation status:', error);
    throw error instanceof SunoApiError ? error : new SunoApiError('Failed to check generation status');
  }
}

// Map different API response statuses to our standard format
function mapResponseStatus(apiStatus: string): SunoGenerationResponse['status'] {
  switch (apiStatus?.toLowerCase()) {
    case 'pending':
    case 'queued':
    case 'submitted':
      return 'pending';
    case 'generating':
    case 'processing':
    case 'running':
      return 'generating';
    case 'completed':
    case 'finished':
    case 'success':
      return 'completed';
    case 'failed':
    case 'error':
      return 'failed';
    default:
      return 'pending';
  }
}

// Poll generation status until completion (SERVER-SIDE ONLY)
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

// Generate music and wait for completion (SERVER-SIDE ONLY)
export async function generateMusicComplete(
  request: SunoGenerationRequest,
  onProgress?: (response: SunoGenerationResponse) => void
): Promise<SunoTrackResult[]> {
  // Start generation
  const initialResponse = await generateMusic(request);
  
  // If already completed (unlikely but possible), return immediately
  if (initialResponse.status === 'completed' && initialResponse.audioUrl) {
    return [convertToTrackResult(initialResponse, request)];
  }
  
  // Poll for completion
  const finalResponse = await pollGenerationStatus(initialResponse.id, onProgress);
  
  if (!finalResponse.audioUrl) {
    throw new SunoApiError('Generation completed but no audio URL received');
  }
  
  // Suno typically generates 1 track per request
  return [convertToTrackResult(finalResponse, request)];
}

// Convert Suno response to track result format
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

// Validate API configuration (SERVER-SIDE ONLY)
export function validateSunoConfig(): { isValid: boolean; error?: string } {
  try {
    getApiKey();
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown configuration error' 
    };
  }
}

// Get available generation credits (if supported by API)
export async function getGenerationCredits(): Promise<{ credits: number; maxCredits: number } | null> {
  try {
    const config = getApiConfig();
    const creditsEndpoint = `${config.baseUrl}/api/v1/credits`;
    
    try {
      const response = await makeApiRequest(creditsEndpoint);
      return {
        credits: response.credits || response.remaining_credits || 0,
        maxCredits: response.max_credits || response.total_credits || 0,
      };
    } catch (error) {
      // If credits endpoint doesn't exist, return null (not all providers support this)
      return null;
    }
  } catch (error) {
    console.error('Error fetching generation credits:', error);
    return null;
  }
}