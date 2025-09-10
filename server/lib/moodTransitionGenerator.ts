// Enhanced Suno API integration for mood-based progressive song generation
import { z } from 'zod';
import { 
  generateMusicComplete, 
  type SunoGenerationRequest, 
  type SunoTrackResult 
} from './sunoServer';

// Mood characteristics schema for validation
export const MoodCharacteristicsSchema = z.object({
  valence: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  tension: z.number().min(0).max(100),
  bpm: z.object({
    min: z.number(),
    max: z.number()
  }),
  keyType: z.enum(['major', 'minor', 'modal', 'atonal']),
  dynamics: z.enum(['pp', 'p', 'mp', 'mf', 'f', 'ff']),
  primaryInstruments: z.array(z.string()),
  rhythmPattern: z.enum(['steady', 'syncopated', 'irregular', 'flowing', 'chaotic']),
  color: z.string(),
  gradient: z.array(z.string()),
  musicalDescriptors: z.array(z.string()),
  atmosphereKeywords: z.array(z.string())
});

export const MoodTransitionRequestSchema = z.object({
  userId: z.number(),
  fromMood: z.string(),
  toMood: z.string(),
  transitionProfile: z.object({
    sections: z.number().min(3).max(5),
    transitionStyle: z.enum(['gradual', 'stepped', 'wave', 'dramatic']),
    duration: z.number().min(120).max(400),
    crossfadePoints: z.array(z.number())
  }),
  customTitle: z.string().optional(),
  includeVocals: z.boolean().default(false),
  model: z.enum(['V3_5', 'V4_5', 'chirp-v3-5', 'chirp-v3-0']).optional()
});

export type MoodCharacteristics = z.infer<typeof MoodCharacteristicsSchema>;
export type MoodTransitionRequest = z.infer<typeof MoodTransitionRequestSchema>;

// Comprehensive mood database with musical characteristics
export const MOOD_DATABASE: Record<string, MoodCharacteristics> = {
  stressed: {
    valence: 20,
    energy: 80,
    tension: 95,
    bpm: { min: 140, max: 180 },
    keyType: 'atonal',
    dynamics: 'ff',
    primaryInstruments: ['distorted synths', 'aggressive drums', 'discordant strings'],
    rhythmPattern: 'chaotic',
    color: '#FF4444',
    gradient: ['#FF4444', '#CC2222', '#991111'],
    musicalDescriptors: ['frantic', 'dissonant', 'overwhelming', 'intense', 'chaotic'],
    atmosphereKeywords: ['pressure', 'urgent', 'overwhelming', 'tense', 'demanding']
  },
  anxious: {
    valence: 25,
    energy: 70,
    tension: 90,
    bpm: { min: 120, max: 160 },
    keyType: 'minor',
    dynamics: 'f',
    primaryInstruments: ['trembling strings', 'staccato piano', 'nervous percussion'],
    rhythmPattern: 'irregular',
    color: '#FF8800',
    gradient: ['#FF8800', '#DD6600', '#BB4400'],
    musicalDescriptors: ['restless', 'trembling', 'uncertain', 'agitated', 'worried'],
    atmosphereKeywords: ['anticipation', 'worry', 'unease', 'nervousness', 'apprehension']
  },
  sad: {
    valence: 15,
    energy: 25,
    tension: 40,
    bpm: { min: 60, max: 80 },
    keyType: 'minor',
    dynamics: 'p',
    primaryInstruments: ['solo piano', 'cello', 'soft strings', 'ambient pads'],
    rhythmPattern: 'flowing',
    color: '#4466BB',
    gradient: ['#4466BB', '#335599', '#224477'],
    musicalDescriptors: ['melancholic', 'sorrowful', 'gentle', 'wistful', 'tender'],
    atmosphereKeywords: ['longing', 'loss', 'reflection', 'solitude', 'bittersweet']
  },
  calm: {
    valence: 70,
    energy: 20,
    tension: 10,
    bpm: { min: 60, max: 80 },
    keyType: 'major',
    dynamics: 'pp',
    primaryInstruments: ['soft pads', 'gentle bells', 'nature sounds', 'flowing water'],
    rhythmPattern: 'flowing',
    color: '#7ED321',
    gradient: ['#7ED321', '#6BB91D', '#589F19'],
    musicalDescriptors: ['peaceful', 'serene', 'gentle', 'soothing', 'tranquil'],
    atmosphereKeywords: ['peace', 'serenity', 'stillness', 'harmony', 'balance']
  },
  happy: {
    valence: 85,
    energy: 75,
    tension: 15,
    bpm: { min: 120, max: 140 },
    keyType: 'major',
    dynamics: 'f',
    primaryInstruments: ['bright piano', 'uplifting strings', 'cheerful brass', 'light percussion'],
    rhythmPattern: 'steady',
    color: '#F5A623',
    gradient: ['#F5A623', '#D4921E', '#B37E19'],
    musicalDescriptors: ['joyful', 'bright', 'uplifting', 'cheerful', 'optimistic'],
    atmosphereKeywords: ['joy', 'celebration', 'sunshine', 'warmth', 'positivity']
  },
  energetic: {
    valence: 80,
    energy: 90,
    tension: 25,
    bpm: { min: 140, max: 170 },
    keyType: 'major',
    dynamics: 'f',
    primaryInstruments: ['driving synths', 'powerful drums', 'electric guitar', 'bass'],
    rhythmPattern: 'syncopated',
    color: '#FF6B35',
    gradient: ['#FF6B35', '#E55A2B', '#CC4921'],
    musicalDescriptors: ['powerful', 'driving', 'dynamic', 'vigorous', 'intense'],
    atmosphereKeywords: ['energy', 'power', 'movement', 'action', 'vitality']
  },
  focused: {
    valence: 60,
    energy: 65,
    tension: 20,
    bpm: { min: 120, max: 140 },
    keyType: 'major',
    dynamics: 'mf',
    primaryInstruments: ['rhythmic synths', 'steady bass', 'minimal percussion', 'ambient textures'],
    rhythmPattern: 'steady',
    color: '#4A90E2',
    gradient: ['#4A90E2', '#3A7BC8', '#2A66AE'],
    musicalDescriptors: ['clear', 'precise', 'driving', 'determined', 'purposeful'],
    atmosphereKeywords: ['concentration', 'clarity', 'precision', 'achievement', 'flow']
  },
  neutral: {
    valence: 50,
    energy: 50,
    tension: 30,
    bpm: { min: 100, max: 120 },
    keyType: 'major',
    dynamics: 'mf',
    primaryInstruments: ['acoustic piano', 'light percussion', 'soft pads', 'clean guitar'],
    rhythmPattern: 'steady',
    color: '#888888',
    gradient: ['#888888', '#777777', '#666666'],
    musicalDescriptors: ['balanced', 'steady', 'even', 'comfortable', 'stable'],
    atmosphereKeywords: ['balance', 'stability', 'presence', 'grounding', 'centering']
  }
};

// Progressive song generation for mood transitions
export class MoodTransitionGenerator {
  
  static async generateProgressiveTransition(request: MoodTransitionRequest): Promise<SunoTrackResult[]> {
    const { fromMood, toMood, transitionProfile, userId, customTitle, includeVocals, model } = request;
    
    // Validate moods exist
    if (!MOOD_DATABASE[fromMood] || !MOOD_DATABASE[toMood]) {
      throw new Error(`Invalid mood specified: ${fromMood} or ${toMood}`);
    }
    
    // Calculate transition path
    const transitionPath = this.calculateTransitionPath(fromMood, toMood, transitionProfile);
    
    // Generate prompts for each section
    const progressivePrompts = this.generateProgressivePrompts(transitionPath, fromMood, toMood);
    
    // Generate lyrics if requested
    const progressiveLyrics = includeVocals ? 
      this.generateTransitionLyrics(fromMood, toMood, transitionProfile.sections) : 
      undefined;
    
    const generatedTracks: SunoTrackResult[] = [];
    const sectionDuration = transitionProfile.duration / transitionProfile.sections;
    
    // Generate each section progressively
    for (let i = 0; i < progressivePrompts.length; i++) {
      console.log(`Generating mood transition section ${i + 1}/${progressivePrompts.length}`);
      
      const sectionData = transitionPath[i];
      const avgBpm = (sectionData.bpm.min + sectionData.bpm.max) / 2;
      
      const sectionRequest: SunoGenerationRequest = {
        prompt: progressivePrompts[i],
        title: customTitle ? 
          `${customTitle} - Section ${i + 1}` : 
          `${fromMood.charAt(0).toUpperCase() + fromMood.slice(1)} → ${toMood.charAt(0).toUpperCase() + toMood.slice(1)} (Part ${i + 1})`,
        style: this.mapToSunoStyle(sectionData.musicalDescriptors[0] || 'Electronic'),
        lyrics: progressiveLyrics?.[i],
        instrumental: !includeVocals,
        customMode: true,
        model: model || 'V4_5',
        duration: sectionDuration,
        styleWeight: this.calculateStyleWeight(sectionData),
        weirdnessConstraint: this.calculateCreativity(sectionData),
        audioWeight: 0.9, // Always use high audio quality for mood transitions
      };
      
      try {
        const sectionTracks = await generateMusicComplete(sectionRequest);
        
        // Add metadata specific to mood transitions
        const enhancedTracks = sectionTracks.map(track => ({
          ...track,
          // Add mood transition metadata
          moodSection: i + 1,
          fromMood,
          toMood,
          emotionalValence: sectionData.valence,
          energyLevel: sectionData.energy,
          tensionLevel: sectionData.tension,
          recommendedBpm: Math.round(avgBpm),
        }));
        
        generatedTracks.push(...enhancedTracks);
        
        // Brief pause between generations to avoid rate limits
        if (i < progressivePrompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Error generating section ${i + 1}:`, error);
        // Continue with next section rather than failing completely
        // In a production system, we might want to retry or use fallback generation
      }
    }
    
    if (generatedTracks.length === 0) {
      throw new Error('Failed to generate any mood transition tracks');
    }
    
    console.log(`Successfully generated ${generatedTracks.length} mood transition tracks`);
    return generatedTracks;
  }
  
  private static calculateTransitionPath(
    fromMood: string, 
    toMood: string, 
    profile: MoodTransitionRequest['transitionProfile']
  ): MoodCharacteristics[] {
    const start = MOOD_DATABASE[fromMood];
    const end = MOOD_DATABASE[toMood];
    
    const sections: MoodCharacteristics[] = [];
    const stepCount = profile.sections;
    
    for (let i = 0; i < stepCount; i++) {
      const progress = i / (stepCount - 1); // 0 to 1
      const easedProgress = this.applyTransitionEasing(progress, profile.transitionStyle);
      
      sections.push(this.interpolateMoods(start, end, easedProgress));
    }
    
    return sections;
  }
  
  private static applyTransitionEasing(progress: number, style: string): number {
    switch (style) {
      case 'gradual':
        return progress * progress; // Quadratic easing
      case 'stepped':
        return Math.floor(progress * 3) / 3; // Step function
      case 'wave':
        return 0.5 + 0.5 * Math.sin((progress - 0.5) * Math.PI); // Sine wave
      case 'dramatic':
        return progress < 0.5 ? 0.1 : 0.9; // Sharp transition
      default:
        return progress; // Linear
    }
  }
  
  private static interpolateMoods(
    start: MoodCharacteristics, 
    end: MoodCharacteristics, 
    progress: number
  ): MoodCharacteristics {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    
    return {
      valence: lerp(start.valence, end.valence, progress),
      energy: lerp(start.energy, end.energy, progress),
      tension: lerp(start.tension, end.tension, progress),
      
      bpm: {
        min: Math.round(lerp(start.bpm.min, end.bpm.min, progress)),
        max: Math.round(lerp(start.bpm.max, end.bpm.max, progress))
      },
      
      keyType: progress < 0.5 ? start.keyType : end.keyType,
      dynamics: this.blendDynamics(start.dynamics, end.dynamics, progress),
      
      primaryInstruments: this.blendInstruments(start.primaryInstruments, end.primaryInstruments, progress),
      rhythmPattern: progress < 0.3 ? start.rhythmPattern : 
                    progress > 0.7 ? end.rhythmPattern : 'flowing',
      
      color: this.interpolateColor(start.color, end.color, progress),
      gradient: this.interpolateGradient(start.gradient, end.gradient, progress),
      
      musicalDescriptors: this.blendDescriptors(start.musicalDescriptors, end.musicalDescriptors, progress),
      atmosphereKeywords: this.blendDescriptors(start.atmosphereKeywords, end.atmosphereKeywords, progress)
    };
  }
  
  private static generateProgressivePrompts(
    transitionPath: MoodCharacteristics[], 
    fromMood: string, 
    toMood: string
  ): string[] {
    return transitionPath.map((section, index) => {
      const isFirst = index === 0;
      const isLast = index === transitionPath.length - 1;
      
      const tempo = `${section.bpm.min}-${section.bpm.max} BPM`;
      const mood = section.musicalDescriptors.slice(0, 3).join(', ');
      const atmosphere = section.atmosphereKeywords.slice(0, 2).join(' and ');
      const instruments = section.primaryInstruments.slice(0, 2).join(' and ');
      const key = section.keyType === 'major' ? 'uplifting' : 
                 section.keyType === 'minor' ? 'melancholic' : 'atmospheric';
      
      let prompt = `${key} ${mood} music with ${instruments}, ${tempo}, evoking ${atmosphere}`;
      
      if (isFirst) {
        prompt += `, beginning of an emotional journey from ${fromMood}`;
      } else if (isLast) {
        prompt += `, reaching emotional resolution at ${toMood}`;
      } else {
        prompt += ', transitioning between emotional states, therapeutic and healing';
      }
      
      return prompt;
    });
  }
  
  private static generateTransitionLyrics(fromMood: string, toMood: string, sectionCount: number): string[] {
    // Therapeutic lyrics themes for different moods
    const themes = {
      stressed: ['pressure building', 'overwhelmed mind', 'need to breathe'],
      anxious: ['racing thoughts', 'uncertainty fades', 'seeking calm'],
      sad: ['feeling heavy', 'tears are healing', 'light returns slowly'],
      calm: ['breathing deeply', 'peace within', 'gentle stillness'],
      happy: ['light returning', 'joy rises up', 'heart is singing'],
      energetic: ['power flowing', 'strength growing', 'moving forward'],
      focused: ['clarity comes', 'mind is sharp', 'purpose clear'],
      neutral: ['finding balance', 'steady ground', 'centered being']
    };
    
    const startThemes = themes[fromMood] || ['beginning this journey'];
    const endThemes = themes[toMood] || ['finding my way'];
    
    const lyrics: string[] = [];
    
    for (let i = 0; i < sectionCount; i++) {
      const progress = i / (sectionCount - 1);
      
      if (progress < 0.33) {
        // Starting phase - acknowledge current state
        lyrics.push(`[Verse ${i + 1}]\n${startThemes[i % startThemes.length]}\nI feel this deeply\nBut change is coming\nStep by step I move`);
      } else if (progress < 0.66) {
        // Transition phase - movement and change
        lyrics.push(`[Verse ${i + 1}]\nTransformation flows\nOld patterns releasing\nNew feelings emerging\nI am becoming free`);
      } else {
        // Resolution phase - reaching desired state
        lyrics.push(`[Verse ${i + 1}]\n${endThemes[i % endThemes.length]}\nI have arrived here\nFeeling renewed\nThis is who I am`);
      }
    }
    
    return lyrics;
  }
  
  // Utility methods for mood blending
  private static blendDynamics(start: string, end: string, progress: number): MoodCharacteristics['dynamics'] {
    const dynamics = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
    const startIndex = dynamics.indexOf(start);
    const endIndex = dynamics.indexOf(end);
    const currentIndex = Math.round(startIndex + (endIndex - startIndex) * progress);
    return dynamics[Math.max(0, Math.min(dynamics.length - 1, currentIndex))] as MoodCharacteristics['dynamics'];
  }
  
  private static blendInstruments(start: string[], end: string[], progress: number): string[] {
    if (progress < 0.3) return start;
    if (progress > 0.7) return end;
    
    const mixed = [...start.slice(0, 2), ...end.slice(0, 2)];
    return Array.from(new Set(mixed));
  }
  
  private static blendDescriptors(start: string[], end: string[], progress: number): string[] {
    const startCount = Math.round((1 - progress) * 3);
    const endCount = Math.round(progress * 3);
    
    return [
      ...start.slice(0, startCount),
      ...end.slice(0, endCount)
    ];
  }
  
  private static interpolateColor(start: string, end: string, progress: number): string {
    const startR = parseInt(start.slice(1, 3), 16);
    const startG = parseInt(start.slice(3, 5), 16);
    const startB = parseInt(start.slice(5, 7), 16);
    
    const endR = parseInt(end.slice(1, 3), 16);
    const endG = parseInt(end.slice(3, 5), 16);
    const endB = parseInt(end.slice(5, 7), 16);
    
    const r = Math.round(startR + (endR - startR) * progress);
    const g = Math.round(startG + (endG - startG) * progress);
    const b = Math.round(startB + (endB - startB) * progress);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  private static interpolateGradient(start: string[], end: string[], progress: number): string[] {
    return start.map((startColor, index) => {
      const endColor = end[index] || end[end.length - 1];
      return this.interpolateColor(startColor, endColor, progress);
    });
  }
  
  private static mapToSunoStyle(descriptor: string): string {
    const styleMap: Record<string, string> = {
      'frantic': 'Electronic',
      'dissonant': 'Experimental',
      'overwhelming': 'Industrial',
      'restless': 'Ambient',
      'trembling': 'Classical',
      'melancholic': 'Folk',
      'sorrowful': 'Blues',
      'peaceful': 'Ambient',
      'serene': 'Chill',
      'joyful': 'Pop',
      'bright': 'Electronic',
      'powerful': 'Rock',
      'driving': 'Electronic',
      'clear': 'Minimal',
      'precise': 'Techno',
      'balanced': 'Ambient'
    };
    
    return styleMap[descriptor] || 'Electronic';
  }
  
  private static calculateStyleWeight(section: MoodCharacteristics): number {
    // Higher tension = stronger style adherence
    return 0.5 + (section.tension / 100) * 0.4;
  }
  
  private static calculateCreativity(section: MoodCharacteristics): number {
    // Higher energy = more creative/experimental
    return 0.3 + (section.energy / 100) * 0.5;
  }
}

// Mood transition validation and utilities
export function validateMoodTransition(fromMood: string, toMood: string): boolean {
  return MOOD_DATABASE[fromMood] && MOOD_DATABASE[toMood] && fromMood !== toMood;
}

export function getMoodCharacteristics(moodName: string): MoodCharacteristics | null {
  return MOOD_DATABASE[moodName] || null;
}

export function getAllMoodNames(): string[] {
  return Object.keys(MOOD_DATABASE);
}