# Suno AI Music Generation Setup

This guide explains how to set up the Suno AI integration for generating music directly in your DJ application.

## API Key Setup (Server-Side Only)

**SECURITY WARNING**: Never use client-side environment variables for API keys. All Suno API integration is handled server-side for security.

### Using Replit Secrets (Recommended)

1. Go to your Replit project settings
2. Navigate to the "Secrets" tab
3. Add a new secret with the key: `SUNO_API_KEY` (Note: NO VITE_ prefix)
4. Set the value to your Suno API key

### Environment Variables

Add the following to your server environment:
```bash
SUNO_API_KEY=your_suno_api_key_here
SUNO_PROVIDER=sunoapi_org  # Optional: sunoapi_org, sunoapi_com, or aiml_api
```

**IMPORTANT**: Never use `VITE_SUNO_API_KEY` - this would expose your API key in the browser!

## Getting a Suno API Key

### Official API Providers

1. **SunoAPI.org** (Recommended)
   - Visit: https://sunoapi.org/
   - Sign up for an account
   - Purchase credits for API usage
   - Get your Bearer token from the dashboard

2. **SunoAPI.com** 
   - Visit: https://sunoapi.com/
   - Sign up and get API access
   - Alternative provider with similar functionality

3. **AI/ML API** 
   - Visit: https://aimlapi.com/suno-ai-api
   - Use their Suno integration with models like chirp-v3-5

### Unofficial Methods

For unofficial access, you can extract your session cookie from suno.com:

1. Go to https://suno.com/create in your browser
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Copy the `Cookie` header value
5. Use as `SUNO_API_KEY` (server-side only)

**SECURITY NOTE**: Always keep API keys/cookies server-side. Unofficial methods may have limitations and reliability issues.

## API Configuration

The server-side integration supports multiple providers. You can configure which one to use with:

```bash
SUNO_PROVIDER=sunoapi_org  # Default
# or
SUNO_PROVIDER=sunoapi_com
# or  
SUNO_PROVIDER=aiml_api
```

## Features Available

### Music Generation
- **Text Prompts**: Describe the music you want (e.g., "Upbeat electronic dance music with heavy bass")
- **Styles**: Choose from 24+ genres including Pop, Rock, Electronic, Hip Hop, Jazz, Classical, etc.
- **Models**: Select from V4.5 (latest), V3.5 (stable), chirp-v3-5 (high-fidelity), chirp-v3-0 (simple)
- **Vocals**: Choose male/female vocals or instrumental-only
- **Custom Lyrics**: Provide your own lyrics or let AI generate them

### Advanced Settings
- **Style Weight**: How strongly to apply the selected genre (0-100%)
- **Creativity**: Control how experimental the generation is (0-100%)
- **Audio Quality**: Balance between quality and generation speed (0-100%)

### DJ Integration
- **Direct Loading**: Generated tracks can be loaded directly into Deck A or Deck B
- **Library Saving**: Tracks are automatically saved to your DJ library
- **Metadata**: BPM, key, and style information preserved
- **Waveform Visualization**: Generated tracks work with the existing waveform display

## Usage

1. Open your DJ application
2. Click the "Generate AI Music" button in the header
3. Enter a description of the music you want
4. Adjust style, model, and other settings
5. Click "Generate Music"
6. Wait for generation to complete (typically 1-3 minutes)
7. Preview the track and load it into a deck

## Pricing

API usage typically costs:
- **SunoAPI.org**: ~$0.10-0.20 per generation
- **SunoAPI.com**: Similar pricing structure
- **AI/ML API**: $0.144 per generation

Each generation usually produces 1-2 tracks.

## Architecture

### Secure Server-Side Integration

The Suno integration now uses a secure architecture:

- **Server-Side API Proxy**: All Suno API calls are made from the server
- **No Client-Side Keys**: API keys never leave the server environment
- **CORS Compliance**: Server-to-server calls avoid CORS issues
- **Database Integration**: Generated tracks are automatically saved
- **Error Handling**: Proper error mapping and user feedback

### API Endpoints

The following server endpoints are available:

- `GET /api/suno/config` - Check API configuration status
- `GET /api/suno/metadata` - Get available styles and models
- `POST /api/suno/generate` - Generate music (includes userId)
- `GET /api/suno/status/:id` - Check generation status
- `GET /api/suno/credits` - Check remaining credits

## Troubleshooting

### "Music generation service not configured" Error
- Make sure `SUNO_API_KEY` is set in your server secrets/environment (NO VITE_ prefix)
- Restart your Replit application after adding the key
- Check server logs for configuration validation errors

### Generation Timeout
- Check your API key validity in server logs
- Try a different provider if one is failing
- Ensure you have sufficient credits
- Check server network connectivity

### Audio Playback Issues
- Generated tracks are hosted externally - ensure your browser allows external audio
- All generation happens server-side, so no CORS issues with the API
- Check network connectivity to audio URLs

## Technical Details

The secure integration includes:
- **Server-Side Proxy**: All API calls proxied through secure backend
- **Multiple Provider Support**: Fallback between different Suno API services
- **Automatic Database Storage**: Generated tracks saved automatically
- **Error Handling**: Comprehensive error messages and retry logic
- **Type Safety**: Full TypeScript support with Zod validation
- **Security**: No API keys or secrets exposed to client-side
- **CORS Compliance**: Server-to-server calls avoid browser limitations

## Support

For issues with:
- **API Integration**: Check this documentation and browser console
- **API Keys**: Contact your chosen provider's support
- **Generation Quality**: Experiment with different prompts and settings