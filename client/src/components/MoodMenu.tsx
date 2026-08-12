import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MOOD_DATABASE, 
  MOOD_NAMES, 
  MoodTransitioner, 
  MoodPromptGenerator, 
  TRANSITION_PROFILES,
  getMoodColor,
  isValidTransition,
  type MoodCharacteristics,
  type MoodTransitionProfile 
} from '@/lib/moodMapping';
import { 
  generateMusicComplete,
  type SunoGenerationRequest,
  type SunoTrackResult 
} from '@/lib/sunoApi';
import { apiRequest } from '@/lib/queryClient';
import { 
  Heart, 
  Brain, 
  Zap, 
  Waves, 
  Target, 
  Loader2, 
  Play, 
  Palette,
  TrendingUp,
  ArrowRight,
  Music2,
  Sparkles
} from 'lucide-react';

interface MoodMenuProps {
  onTrackGenerated?: (track: SunoTrackResult) => void;
  onLoadToDeck?: (track: SunoTrackResult, deckId: string) => void;
  userId?: number;
}

// Beautiful mood grid component
function MoodGrid({ 
  selectedMood, 
  onMoodSelect, 
  title, 
  className = "" 
}: { 
  selectedMood: string | null; 
  onMoodSelect: (mood: string) => void; 
  title: string; 
  className?: string; 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto">
        {MOOD_NAMES.map((mood) => {
          const moodData = MOOD_DATABASE[mood];
          const isSelected = selectedMood === mood;
          
          return (
            <button
              key={mood}
              onClick={() => onMoodSelect(mood)}
              className={`
                relative p-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105
                ${isSelected 
                  ? 'border-purple-500 shadow-lg shadow-purple-200 ring-2 ring-purple-200' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              style={{ 
                backgroundColor: isSelected ? `${moodData.color}20` : 'white',
                borderColor: isSelected ? moodData.color : undefined
              }}
              data-testid={`mood-${mood}`}
            >
              {/* Mood color indicator */}
              <div 
                className="w-full h-1 rounded-full mb-2"
                style={{ backgroundColor: moodData.color }}
              />
              
              {/* Mood name */}
              <div className="text-sm font-medium capitalize text-gray-800 mb-1">
                {mood}
              </div>
              
              {/* Quick indicators */}
              <div className="flex justify-between text-xs text-gray-600">
                <span className="flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  {Math.round(moodData.valence)}
                </span>
                <span className="flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  {Math.round(moodData.energy)}
                </span>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <Target className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Transition visualization component
function TransitionVisualization({ 
  fromMood, 
  toMood, 
  profile 
}: { 
  fromMood: string | null; 
  toMood: string | null; 
  profile: MoodTransitionProfile; 
}) {
  if (!fromMood || !toMood) {
    return (
      <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Select moods to preview transition</p>
      </div>
    );
  }

  try {
    const transitionPath = MoodTransitioner.calculateTransitionPath(fromMood, toMood, profile);
    
    return (
      <div className="space-y-4">
        {/* Transition path visualization */}
        <div className="relative h-16 bg-gradient-to-r rounded-lg overflow-hidden">
          {transitionPath.map((section, index) => (
            <div
              key={index}
              className="absolute inset-y-0 flex items-center justify-center text-white text-xs font-medium"
              style={{
                backgroundColor: section.color,
                left: `${(index / transitionPath.length) * 100}%`,
                width: `${100 / transitionPath.length}%`,
              }}
            >
              {index + 1}
            </div>
          ))}
          
          {/* Arrow overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <ArrowRight className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>
        
        {/* Transition details */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600">Duration</div>
            <div className="text-lg font-bold text-gray-800">
              {Math.floor(profile.duration / 60)}:{String(profile.duration % 60).padStart(2, '0')}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600">Sections</div>
            <div className="text-lg font-bold text-gray-800">{profile.sections}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-600">Style</div>
            <div className="text-lg font-bold text-gray-800 capitalize">{profile.transitionStyle}</div>
          </div>
        </div>
        
        {/* Mood characteristics progression */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600">Emotional Journey</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-500">Valence (Positivity)</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-400 to-green-400 transition-all duration-500"
                  style={{ width: `${MOOD_DATABASE[fromMood].valence}%` }}
                />
              </div>
              <div className="text-right mt-1">→</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-400 to-green-400 transition-all duration-500"
                  style={{ width: `${MOOD_DATABASE[toMood].valence}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="text-gray-500">Energy</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${MOOD_DATABASE[fromMood].energy}%` }}
                />
              </div>
              <div className="text-right mt-1">→</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${MOOD_DATABASE[toMood].energy}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="text-gray-500">Tension</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-500"
                  style={{ width: `${MOOD_DATABASE[fromMood].tension}%` }}
                />
              </div>
              <div className="text-right mt-1">→</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-500"
                  style={{ width: `${MOOD_DATABASE[toMood].tension}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="h-24 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <p className="text-red-600 text-sm">Error calculating transition path</p>
      </div>
    );
  }
}

export default function MoodMenu({ onTrackGenerated, onLoadToDeck, userId = 1 }: MoodMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [desiredMood, setDesiredMood] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<keyof typeof TRANSITION_PROFILES>('therapeutic');
  const [customDuration, setCustomDuration] = useState([240]); // 4 minutes default
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedTracks, setGeneratedTracks] = useState<SunoTrackResult[]>([]);
  const [currentSection, setCurrentSection] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current transition profile with custom duration
  const getTransitionProfile = (): MoodTransitionProfile => {
    const base = TRANSITION_PROFILES[selectedProfile];
    return {
      ...base,
      duration: customDuration[0]
    };
  };

  // Generate mood transition music
  const generateTransition = useMutation({
    mutationFn: async (): Promise<SunoTrackResult[]> => {
      if (!currentMood || !desiredMood) {
        throw new Error('Both current and desired moods must be selected');
      }

      if (!isValidTransition(currentMood, desiredMood)) {
        throw new Error('Invalid mood transition selected');
      }

      setIsGenerating(true);
      setGenerationProgress(0);
      setCurrentSection(0);

      const profile = getTransitionProfile();
      const transitionPath = MoodTransitioner.calculateTransitionPath(currentMood, desiredMood, profile);
      const progressivePrompts = MoodPromptGenerator.generateProgressivePrompts(transitionPath);
      const progressiveLyrics = MoodPromptGenerator.generateTransitionLyrics(currentMood, desiredMood, profile.sections);

      const allTracks: SunoTrackResult[] = [];
      
      // Generate each section progressively
      for (let i = 0; i < progressivePrompts.length; i++) {
        setCurrentSection(i + 1);
        setGenerationProgress((i / progressivePrompts.length) * 100);

        const sectionData = transitionPath[i];
        const avgBpm = (sectionData.bpm.min + sectionData.bpm.max) / 2;
        
        const request: SunoGenerationRequest = {
          prompt: progressivePrompts[i],
          title: `${currentMood.charAt(0).toUpperCase() + currentMood.slice(1)} → ${desiredMood.charAt(0).toUpperCase() + desiredMood.slice(1)} (Section ${i + 1})`,
          style: sectionData.musicalDescriptors[0] || 'Electronic',
          lyrics: progressiveLyrics[i],
          instrumental: false,
          customMode: true,
          model: 'V4_5',
          duration: profile.duration / profile.sections,
          styleWeight: 0.8,
          weirdnessConstraint: 0.6,
          audioWeight: 0.9,
          userId
        };

        try {
          const sectionTracks = await generateMusicComplete(request);
          allTracks.push(...sectionTracks);
        } catch (error) {
          console.error(`Error generating section ${i + 1}:`, error);
          // Continue with next section even if one fails
        }
      }

      setGenerationProgress(100);
      
      // Save mood transition to database
      try {
        await apiRequest('/api/mood-transitions', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            currentMood,
            desiredMood,
            transitionType: selectedProfile,
            generatedTrackId: allTracks[0]?.id || null
          })
        });
      } catch (error) {
        console.warn('Failed to save mood transition:', error);
      }

      return allTracks;
    },
    onSuccess: (tracks) => {
      setIsGenerating(false);
      setGeneratedTracks(tracks);
      
      // Notify parent components
      tracks.forEach(track => onTrackGenerated?.(track));
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mood-transitions'] });
      
      toast({
        title: "Mood Transition Generated!",
        description: `Created ${tracks.length} progressive tracks for your emotional journey from ${currentMood} to ${desiredMood}`,
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      console.error('Mood transition generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!currentMood || !desiredMood) {
      toast({
        title: "Moods Required",
        description: "Please select both your current mood and desired mood",
        variant: "destructive",
      });
      return;
    }

    generateTransition.mutate();
  };

  const handleLoadToDeck = (track: SunoTrackResult, deckId: string) => {
    onLoadToDeck?.(track, deckId);
    toast({
      title: "Track Loaded",
      description: `"${track.title}" loaded to ${deckId}`,
    });
  };

  const resetForm = () => {
    setCurrentMood(null);
    setDesiredMood(null);
    setSelectedProfile('therapeutic');
    setCustomDuration([240]);
    setGeneratedTracks([]);
    setIsGenerating(false);
    setGenerationProgress(0);
    setCurrentSection(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
          data-testid="button-open-mood-menu"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Mood Transition
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Brain className="w-6 h-6 mr-3 text-purple-600" />
            Therapeutic Mood Transition
            <Badge className="ml-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
              AI-Powered Emotional Journey
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mood Selection Panel */}
          <Card className="border-2 border-purple-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Palette className="w-5 h-5 mr-2 text-purple-600" />
                Select Your Emotional Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Mood Selection */}
              <MoodGrid
                selectedMood={currentMood}
                onMoodSelect={setCurrentMood}
                title="How are you feeling right now?"
                className="pb-4 border-b border-gray-100"
              />
              
              {/* Desired Mood Selection */}
              <MoodGrid
                selectedMood={desiredMood}
                onMoodSelect={setDesiredMood}
                title="Where would you like to be emotionally?"
              />
              
              {/* Transition Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <Label className="text-base font-medium text-gray-800">Transition Settings</Label>
                
                {/* Transition Profile */}
                <div className="space-y-2">
                  <Label htmlFor="profile">Transition Style</Label>
                  <Select value={selectedProfile} onValueChange={(value) => setSelectedProfile(value as keyof typeof TRANSITION_PROFILES)}>
                    <SelectTrigger data-testid="select-transition-profile">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gentle">Gentle - Slow, soothing transition</SelectItem>
                      <SelectItem value="therapeutic">Therapeutic - Balanced emotional flow</SelectItem>
                      <SelectItem value="dramatic">Dramatic - Bold emotional shift</SelectItem>
                      <SelectItem value="experimental">Experimental - Creative journey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Duration Control */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Duration: {Math.floor(customDuration[0] / 60)}:{String(customDuration[0] % 60).padStart(2, '0')}</Label>
                  </div>
                  <Slider
                    value={customDuration}
                    onValueChange={setCustomDuration}
                    min={120}
                    max={400}
                    step={30}
                    className="w-full"
                    data-testid="slider-duration"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>2 min</span>
                    <span>6:40</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview & Generation Panel */}
          <div className="space-y-6">
            {/* Transition Preview */}
            <Card className="border-2 border-blue-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Transition Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransitionVisualization 
                  fromMood={currentMood} 
                  toMood={desiredMood} 
                  profile={getTransitionProfile()} 
                />
              </CardContent>
            </Card>

            {/* Generation Progress */}
            {isGenerating && (
              <Card className="border-2 border-green-100">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin text-green-600" />
                        <span className="font-medium">Generating Section {currentSection} of {getTransitionProfile().sections}</span>
                      </div>
                      <span className="text-sm text-gray-500">{Math.round(generationProgress)}%</span>
                    </div>
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-600">
                      Creating your personalized emotional journey... This may take a few minutes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Tracks */}
            <Card className="border-2 border-purple-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Music2 className="w-5 h-5 mr-2 text-purple-600" />
                  Your Journey Tracks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedTracks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Music2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Your personalized transition tracks will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedTracks.map((track, index) => (
                      <Card key={track.id} className="border border-gray-200">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-800" data-testid={`text-track-title-${track.id}`}>
                                  {track.title}
                                </h4>
                                <p className="text-sm text-gray-600">Section {index + 1} of emotional journey</p>
                                {track.style && (
                                  <p className="text-xs text-gray-500">Style: {track.style}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-pink-50">
                                #{index + 1}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs">
                              {track.duration > 0 && (
                                <Badge variant="outline" className="bg-blue-50">
                                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                                </Badge>
                              )}
                              {track.bpm && (
                                <Badge variant="outline" className="bg-green-50">
                                  {track.bpm} BPM
                                </Badge>
                              )}
                              {track.key && (
                                <Badge variant="outline" className="bg-purple-50">
                                  {track.key}
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleGenerate}
                disabled={!currentMood || !desiredMood || isGenerating}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-generate-transition"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Journey...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Transition
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={resetForm}
                data-testid="button-reset-mood-form"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}