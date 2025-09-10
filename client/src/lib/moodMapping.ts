// Mood-to-Music Mapping System for Therapeutic AI Generation
// Maps emotional states to musical parameters for progressive song generation

export interface MoodCharacteristics {
  // Basic emotional properties
  valence: number; // 0-100: negative to positive emotional tone
  energy: number; // 0-100: calm to energetic
  tension: number; // 0-100: relaxed to tense/anxious

  // Musical parameters
  bpm: { min: number; max: number }; // Beats per minute range
  keyType: 'major' | 'minor' | 'modal' | 'atonal'; // Tonal characteristics
  dynamics: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff'; // Volume/intensity
  
  // Instrumentation preferences
  primaryInstruments: string[]; // Main instruments for this mood
  rhythmPattern: 'steady' | 'syncopated' | 'irregular' | 'flowing' | 'chaotic';
  
  // Color and visual associations (for UI)
  color: string; // Primary color for mood visualization
  gradient: string[]; // Gradient colors for transitions
  
  // Descriptive elements for AI prompts
  musicalDescriptors: string[]; // Words to use in Suno prompts
  atmosphereKeywords: string[]; // Environmental/atmospheric descriptors
}

export interface MoodTransitionProfile {
  sections: number; // Number of transition sections (3-5)
  transitionStyle: 'gradual' | 'stepped' | 'wave' | 'dramatic';
  duration: number; // Total duration in seconds
  crossfadePoints: number[]; // Where to crossfade between sections (as percentages)
}

// Comprehensive mood database with scientific backing
export const MOOD_DATABASE: Record<string, MoodCharacteristics> = {
  // === NEGATIVE VALENCE MOODS ===
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

  angry: {
    valence: 10,
    energy: 95,
    tension: 90,
    bpm: { min: 160, max: 200 },
    keyType: 'minor',
    dynamics: 'ff',
    primaryInstruments: ['heavy drums', 'distorted guitar', 'brass stabs', 'aggressive bass'],
    rhythmPattern: 'syncopated',
    color: '#CC0000',
    gradient: ['#CC0000', '#AA0000', '#880000'],
    musicalDescriptors: ['aggressive', 'powerful', 'driving', 'forceful', 'intense'],
    atmosphereKeywords: ['fury', 'power', 'confrontation', 'rebellion', 'strength']
  },

  melancholic: {
    valence: 20,
    energy: 30,
    tension: 50,
    bpm: { min: 70, max: 90 },
    keyType: 'modal',
    dynamics: 'mp',
    primaryInstruments: ['acoustic guitar', 'violin', 'soft vocals', 'rain sounds'],
    rhythmPattern: 'flowing',
    color: '#6B4C8A',
    gradient: ['#6B4C8A', '#5A4077', '#493364'],
    musicalDescriptors: ['nostalgic', 'introspective', 'bittersweet', 'contemplative', 'wistful'],
    atmosphereKeywords: ['memory', 'longing', 'autumn', 'twilight', 'reflection']
  },

  // === NEUTRAL VALENCE MOODS ===
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
  },

  contemplative: {
    valence: 45,
    energy: 25,
    tension: 20,
    bpm: { min: 80, max: 100 },
    keyType: 'modal',
    dynamics: 'p',
    primaryInstruments: ['soft piano', 'ambient textures', 'distant bells', 'nature sounds'],
    rhythmPattern: 'flowing',
    color: '#5D6D7E',
    gradient: ['#5D6D7E', '#4A5D6B', '#375058'],
    musicalDescriptors: ['meditative', 'thoughtful', 'spacious', 'reflective', 'deep'],
    atmosphereKeywords: ['wisdom', 'depth', 'insight', 'understanding', 'clarity']
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

  // === POSITIVE VALENCE MOODS ===
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

  excited: {
    valence: 90,
    energy: 95,
    tension: 40,
    bpm: { min: 160, max: 190 },
    keyType: 'major',
    dynamics: 'ff',
    primaryInstruments: ['pounding drums', 'soaring synths', 'electric guitar', 'energetic brass'],
    rhythmPattern: 'syncopated',
    color: '#FF3D71',
    gradient: ['#FF3D71', '#E63462', '#CC2B53'],
    musicalDescriptors: ['exhilarating', 'explosive', 'triumphant', 'electrifying', 'euphoric'],
    atmosphereKeywords: ['excitement', 'thrill', 'adventure', 'celebration', 'breakthrough']
  },

  euphoric: {
    valence: 95,
    energy: 85,
    tension: 20,
    bpm: { min: 130, max: 150 },
    keyType: 'major',
    dynamics: 'f',
    primaryInstruments: ['ethereal synths', 'uplifting strings', 'celestial vocals', 'rhythmic bass'],
    rhythmPattern: 'flowing',
    color: '#BD10E0',
    gradient: ['#BD10E0', '#A20DCB', '#870AB6'],
    musicalDescriptors: ['transcendent', 'blissful', 'heavenly', 'ecstatic', 'radiant'],
    atmosphereKeywords: ['bliss', 'transcendence', 'pure joy', 'enlightenment', 'rapture']
  },

  creative: {
    valence: 75,
    energy: 70,
    tension: 35,
    bpm: { min: 110, max: 130 },
    keyType: 'modal',
    dynamics: 'mf',
    primaryInstruments: ['experimental synths', 'unconventional percussion', 'layered textures', 'found sounds'],
    rhythmPattern: 'irregular',
    color: '#9013FE',
    gradient: ['#9013FE', '#7B10E5', '#660DCC'],
    musicalDescriptors: ['innovative', 'experimental', 'colorful', 'imaginative', 'fluid'],
    atmosphereKeywords: ['inspiration', 'imagination', 'possibility', 'innovation', 'expression']
  },

  romantic: {
    valence: 80,
    energy: 40,
    tension: 20,
    bpm: { min: 80, max: 100 },
    keyType: 'major',
    dynamics: 'mp',
    primaryInstruments: ['warm strings', 'soft piano', 'gentle vocals', 'lush pads'],
    rhythmPattern: 'flowing',
    color: '#E91E63',
    gradient: ['#E91E63', '#D0185A', '#B71551'],
    musicalDescriptors: ['tender', 'intimate', 'warm', 'loving', 'passionate'],
    atmosphereKeywords: ['love', 'connection', 'intimacy', 'warmth', 'devotion']
  },

  nostalgic: {
    valence: 60,
    energy: 35,
    tension: 30,
    bpm: { min: 90, max: 110 },
    keyType: 'major',
    dynamics: 'mp',
    primaryInstruments: ['vintage piano', 'warm strings', 'vinyl crackle', 'distant vocals'],
    rhythmPattern: 'steady',
    color: '#795548',
    gradient: ['#795548', '#6D4C41', '#5D4037'],
    musicalDescriptors: ['vintage', 'warm', 'remembered', 'golden', 'timeless'],
    atmosphereKeywords: ['memory', 'past', 'golden age', 'reminiscence', 'cherished moments']
  }
};

// Transition calculation system
export class MoodTransitioner {
  static calculateTransitionPath(
    fromMood: string, 
    toMood: string, 
    profile: MoodTransitionProfile
  ): MoodCharacteristics[] {
    const start = MOOD_DATABASE[fromMood];
    const end = MOOD_DATABASE[toMood];
    
    if (!start || !end) {
      throw new Error(`Invalid mood: ${fromMood} or ${toMood}`);
    }

    const sections: MoodCharacteristics[] = [];
    const stepCount = profile.sections;

    for (let i = 0; i < stepCount; i++) {
      const progress = i / (stepCount - 1); // 0 to 1
      const easedProgress = this.applyTransitionEasing(progress, profile.transitionStyle);
      
      sections.push(this.interpolateMoods(start, end, easedProgress, i));
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
    progress: number,
    sectionIndex: number
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
      
      // Transition key types intelligently
      keyType: progress < 0.5 ? start.keyType : end.keyType,
      
      // Blend dynamics
      dynamics: this.blendDynamics(start.dynamics, end.dynamics, progress),
      
      // Mix instruments based on progress
      primaryInstruments: this.blendInstruments(start.primaryInstruments, end.primaryInstruments, progress),
      
      // Transition rhythm patterns
      rhythmPattern: progress < 0.3 ? start.rhythmPattern : 
                    progress > 0.7 ? end.rhythmPattern : 'flowing',
      
      // Interpolate colors
      color: this.interpolateColor(start.color, end.color, progress),
      gradient: this.interpolateGradient(start.gradient, end.gradient, progress),
      
      // Blend descriptors
      musicalDescriptors: this.blendDescriptors(start.musicalDescriptors, end.musicalDescriptors, progress),
      atmosphereKeywords: this.blendDescriptors(start.atmosphereKeywords, end.atmosphereKeywords, progress)
    };
  }

  private static blendDynamics(start: string, end: string, progress: number): any {
    const dynamics = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
    const startIndex = dynamics.indexOf(start);
    const endIndex = dynamics.indexOf(end);
    const currentIndex = Math.round(startIndex + (endIndex - startIndex) * progress);
    return dynamics[Math.max(0, Math.min(dynamics.length - 1, currentIndex))];
  }

  private static blendInstruments(start: string[], end: string[], progress: number): string[] {
    if (progress < 0.3) return start;
    if (progress > 0.7) return end;
    
    // Mix instruments during middle transition
    const mixed = [...start.slice(0, 2), ...end.slice(0, 2)];
    return Array.from(new Set(mixed)); // Remove duplicates
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
    // Simple hex color interpolation
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
}

// Utility functions for generating Suno prompts
export class MoodPromptGenerator {
  static generateProgressivePrompts(transitionPath: MoodCharacteristics[]): string[] {
    return transitionPath.map((section, index) => {
      const isFirst = index === 0;
      const isLast = index === transitionPath.length - 1;
      
      const tempo = `${section.bpm.min}-${section.bpm.max} BPM`;
      const mood = section.musicalDescriptors.slice(0, 3).join(', ');
      const atmosphere = section.atmosphereKeywords.slice(0, 2).join(' and ');
      const instruments = section.primaryInstruments.slice(0, 2).join(' and ');
      const key = section.keyType === 'major' ? 'uplifting' : 
                 section.keyType === 'minor' ? 'melancholic' : 
                 'atmospheric';

      let prompt = `${key} ${mood} music with ${instruments}, ${tempo}, evoking ${atmosphere}`;
      
      if (isFirst) {
        prompt += ', beginning of an emotional journey';
      } else if (isLast) {
        prompt += ', reaching emotional resolution';
      } else {
        prompt += ', transitioning between emotional states';
      }

      return prompt;
    });
  }

  static generateTransitionLyrics(fromMood: string, toMood: string, sectionCount: number): string[] {
    // Generate simple, therapeutic lyrics for each section
    const themes = {
      stressed: ['pressure building', 'overwhelmed', 'need to breathe'],
      anxious: ['racing thoughts', 'uncertainty', 'seeking calm'],
      sad: ['feeling heavy', 'tears falling', 'healing slowly'],
      calm: ['breathing deeply', 'peace within', 'gentle stillness'],
      happy: ['light returning', 'joy rising', 'heart singing'],
      energetic: ['power flowing', 'strength growing', 'moving forward'],
    };

    const startThemes = themes[fromMood] || ['beginning this journey'];
    const endThemes = themes[toMood] || ['finding my way'];

    const lyrics: string[] = [];
    
    for (let i = 0; i < sectionCount; i++) {
      const progress = i / (sectionCount - 1);
      if (progress < 0.5) {
        lyrics.push(`[Verse ${i + 1}]\n${startThemes[i % startThemes.length]}\nFinding my way through\nStep by step I move`);
      } else {
        lyrics.push(`[Verse ${i + 1}]\n${endThemes[i % endThemes.length]}\nTransformation comes\nI am becoming new`);
      }
    }

    return lyrics;
  }
}

// Predefined transition profiles
export const TRANSITION_PROFILES = {
  gentle: {
    sections: 3,
    transitionStyle: 'gradual' as const,
    duration: 180, // 3 minutes
    crossfadePoints: [30, 70]
  },
  
  therapeutic: {
    sections: 4,
    transitionStyle: 'wave' as const,
    duration: 240, // 4 minutes  
    crossfadePoints: [25, 50, 75]
  },
  
  dramatic: {
    sections: 3,
    transitionStyle: 'dramatic' as const,
    duration: 150, // 2.5 minutes
    crossfadePoints: [40, 80]
  },
  
  experimental: {
    sections: 5,
    transitionStyle: 'stepped' as const,
    duration: 300, // 5 minutes
    crossfadePoints: [20, 40, 60, 80]
  }
};

// Export all mood names for UI components
export const MOOD_NAMES = Object.keys(MOOD_DATABASE);

// Helper function to get mood color for UI
export const getMoodColor = (moodName: string): string => {
  return MOOD_DATABASE[moodName]?.color || '#888888';
};

// Helper function to validate mood transition
export const isValidTransition = (fromMood: string, toMood: string): boolean => {
  return MOOD_NAMES.includes(fromMood) && MOOD_NAMES.includes(toMood) && fromMood !== toMood;
};