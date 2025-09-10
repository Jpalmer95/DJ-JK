import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  generateMusicComplete, 
  validateSunoConfig, 
  MUSIC_STYLES, 
  SUNO_MODELS,
  type SunoGenerationRequest,
  type SunoGenerationResponse,
  type SunoTrackResult,
  type SunoGenerationServerResponse
} from '@/lib/sunoApi';
import { apiRequest } from '@/lib/queryClient';
import { Wand2, Music, Play, Download, Loader2, Settings, Volume2 } from 'lucide-react';

interface SunoGeneratorProps {
  onTrackGenerated?: (track: SunoTrackResult) => void;
  onLoadToDeck?: (track: SunoTrackResult, deckId: string) => void;
  userId?: number; // Optional userId prop - defaults to 1 for demo mode
}

export default function SunoGenerator({ onTrackGenerated, onLoadToDeck, userId = 1 }: SunoGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<SunoGenerationResponse | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<SunoTrackResult[]>([]);
  const [isSunoConfigured, setIsSunoConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Form state
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('Electronic');
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [model, setModel] = useState<'V3_5' | 'V4_5' | 'chirp-v3-5' | 'chirp-v3-0'>('V3_5');
  const [duration, setDuration] = useState(120); // seconds
  const [vocalGender, setVocalGender] = useState<'m' | 'f'>('m');
  const [styleWeight, setStyleWeight] = useState([65]);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState([65]);
  const [audioWeight, setAudioWeight] = useState([65]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if Suno is configured (async)
  useEffect(() => {
    validateSunoConfig().then((config) => {
      setIsSunoConfigured(config.isValid);
      setConfigError(config.error || null);
    }).catch((error) => {
      setIsSunoConfigured(false);
      setConfigError('Failed to validate configuration');
    });
  }, []);

  // Generate music mutation (using secure backend)
  const generateMutation = useMutation({
    mutationFn: async (request: SunoGenerationRequest): Promise<SunoTrackResult[]> => {
      // Use the secure backend generateMusic function which now handles everything
      return await generateMusicComplete(request);
    },
    onSuccess: async (tracks) => {
      setGenerationProgress(null);
      setGeneratedTracks(tracks);
      
      // Tracks are already saved by backend - just notify components
      for (const track of tracks) {
        onTrackGenerated?.(track);
      }
      
      // Invalidate tracks cache since backend saved them
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      
      toast({
        title: "Music Generated Successfully!",
        description: `Generated ${tracks.length} track(s) and saved to your library`,
      });
    },
    onError: (error) => {
      setGenerationProgress(null);
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your music",
        variant: "destructive",
      });
      return;
    }

    const request: SunoGenerationRequest = {
      prompt: prompt.trim(),
      title: title.trim() || undefined,
      style,
      lyrics: !isInstrumental && lyrics.trim() ? lyrics.trim() : undefined,
      instrumental: isInstrumental,
      customMode: true,
      model,
      vocalGender,
      styleWeight: styleWeight[0] / 100,
      weirdnessConstraint: weirdnessConstraint[0] / 100,
      audioWeight: audioWeight[0] / 100,
      userId, // Now uses prop value (default 1 for demo mode until auth system is implemented)
    };

    generateMutation.mutate(request);
  };

  const handlePlayPreview = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  const handleLoadToDeck = (track: SunoTrackResult, deckId: string) => {
    onLoadToDeck?.(track, deckId);
    toast({
      title: "Track Loaded",
      description: `"${track.title}" loaded to ${deckId}`,
    });
  };

  const getProgressText = () => {
    if (!generationProgress) return '';
    
    switch (generationProgress.status) {
      case 'pending':
        return 'Queuing generation...';
      case 'generating':
        return `Generating music... ${generationProgress.progress || 0}%`;
      case 'completed':
        return 'Generation complete!';
      case 'failed':
        return 'Generation failed';
      default:
        return 'Processing...';
    }
  };

  const resetForm = () => {
    setPrompt('');
    setTitle('');
    setStyle('Electronic');
    setLyrics('');
    setIsInstrumental(false);
    setModel('V3_5');
    setVocalGender('m');
    setStyleWeight([65]);
    setWeirdnessConstraint([65]);
    setAudioWeight([65]);
    setGeneratedTracks([]);
    setGenerationProgress(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Stop any playing audio when dialog closes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-open-suno-generator"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate AI Music
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Music className="w-5 h-5 mr-2" />
              Suno AI Music Generator
            </DialogTitle>
          </DialogHeader>

          {!isSunoConfigured && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="text-orange-800">
                  <strong>API Configuration Required:</strong> {configError}
                  <br />
                  <small>Please configure SUNO_API_KEY on the server (contact administrator).</small>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Music Generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Fields */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">Music Description *</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the music you want to generate (e.g., 'Upbeat electronic dance music with synth leads')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    data-testid="textarea-music-prompt"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Track Title</Label>
                    <Input
                      id="title"
                      placeholder="My AI Track"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      data-testid="input-track-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style">Style/Genre</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger data-testid="select-music-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSIC_STYLES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select value={model} onValueChange={(value) => setModel(value as typeof model)}>
                      <SelectTrigger data-testid="select-ai-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUNO_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vocal-gender">Vocal Gender</Label>
                    <Select value={vocalGender} onValueChange={(value) => setVocalGender(value as typeof vocalGender)} disabled={isInstrumental}>
                      <SelectTrigger data-testid="select-vocal-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">Male</SelectItem>
                        <SelectItem value="f">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Instrumental Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="instrumental"
                    checked={isInstrumental}
                    onCheckedChange={setIsInstrumental}
                    data-testid="switch-instrumental"
                  />
                  <Label htmlFor="instrumental">Instrumental (no vocals)</Label>
                </div>

                {/* Lyrics Input */}
                {!isInstrumental && (
                  <div className="space-y-2">
                    <Label htmlFor="lyrics">Custom Lyrics (optional)</Label>
                    <Textarea
                      id="lyrics"
                      placeholder="Enter custom lyrics or leave empty for AI-generated lyrics"
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      rows={4}
                      data-testid="textarea-custom-lyrics"
                    />
                  </div>
                )}

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full"
                    data-testid="button-toggle-advanced"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                  </Button>

                  {showAdvanced && (
                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                      <div className="space-y-2">
                        <Label>Style Weight: {styleWeight[0]}%</Label>
                        <Slider
                          value={styleWeight}
                          onValueChange={setStyleWeight}
                          max={100}
                          step={5}
                          className="w-full"
                          data-testid="slider-style-weight"
                        />
                        <small className="text-gray-600">How strongly to apply the selected style</small>
                      </div>

                      <div className="space-y-2">
                        <Label>Creativity: {weirdnessConstraint[0]}%</Label>
                        <Slider
                          value={weirdnessConstraint}
                          onValueChange={setWeirdnessConstraint}
                          max={100}
                          step={5}
                          className="w-full"
                          data-testid="slider-creativity"
                        />
                        <small className="text-gray-600">Higher values = more experimental/creative</small>
                      </div>

                      <div className="space-y-2">
                        <Label>Audio Quality: {audioWeight[0]}%</Label>
                        <Slider
                          value={audioWeight}
                          onValueChange={setAudioWeight}
                          max={100}
                          step={5}
                          className="w-full"
                          data-testid="slider-audio-quality"
                        />
                        <small className="text-gray-600">Audio processing quality vs generation speed</small>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generation Progress */}
                {generationProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{getProgressText()}</span>
                      {generationProgress.estimatedTime && (
                        <span className="text-sm text-gray-500">
                          ~{Math.ceil(generationProgress.estimatedTime / 60)}min
                        </span>
                      )}
                    </div>
                    <Progress 
                      value={generationProgress.progress || 0} 
                      className="w-full"
                      data-testid="progress-generation"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={!isSunoConfigured || generateMutation.isPending || !prompt.trim()}
                    className="flex-1"
                    data-testid="button-generate-music"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Music
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    data-testid="button-reset-form"
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generated Tracks */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedTracks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Generated tracks will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedTracks.map((track) => (
                      <Card key={track.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold" data-testid={`text-track-title-${track.id}`}>
                                {track.title}
                              </h4>
                              <p className="text-sm text-gray-600" data-testid={`text-track-artist-${track.id}`}>
                                by {track.artist}
                              </p>
                              {track.style && (
                                <p className="text-xs text-gray-500">Style: {track.style}</p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs">
                              {track.duration > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                                </span>
                              )}
                              {track.bpm && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {track.bpm} BPM
                                </span>
                              )}
                              {track.key && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  {track.key}
                                </span>
                              )}
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                {track.isInstrumental ? 'Instrumental' : 'Vocal'}
                              </span>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePlayPreview(track.audioUrl)}
                                data-testid={`button-preview-${track.id}`}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Preview
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoadToDeck(track, 'Deck A')}
                                data-testid={`button-load-deck-a-${track.id}`}
                              >
                                Load to Deck A
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoadToDeck(track, 'Deck B')}
                                data-testid={`button-load-deck-b-${track.id}`}
                              >
                                Load to Deck B
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(track.audioUrl, '_blank')}
                                data-testid={`button-download-${track.id}`}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hidden audio element for previews */}
          <audio ref={audioRef} />
        </DialogContent>
      </Dialog>
    </>
  );
}