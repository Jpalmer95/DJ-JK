export interface SavedEffectPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: Record<string, number>;
  chainConfig?: EffectChainConfig[];
  dateCreated: number;
  isBuiltIn: boolean;
}

export interface EffectChainConfig {
  effectType: string;
  parameters: Record<string, number>;
  wetMix: number;
  bypassed: boolean;
}

const STORAGE_KEY = 'dj_effect_presets';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function createBuiltInPresets(): SavedEffectPreset[] {
  const now = Date.now();

  return [
    // Reverb Presets
    {
      id: 'builtin-reverb-hall',
      name: 'Hall',
      category: 'reverb',
      description: 'Large concert hall reverb with long tail',
      parameters: { roomSize: 0.85, dampening: 0.5, wetMix: 0.35, preDelay: 0.04 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-reverb-room',
      name: 'Room',
      category: 'reverb',
      description: 'Small room reverb, natural feel',
      parameters: { roomSize: 0.4, dampening: 0.6, wetMix: 0.25, preDelay: 0.01 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-reverb-plate',
      name: 'Plate',
      category: 'reverb',
      description: 'Classic plate reverb, bright and smooth',
      parameters: { roomSize: 0.6, dampening: 0.3, wetMix: 0.3, preDelay: 0.02 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-reverb-cathedral',
      name: 'Cathedral',
      category: 'reverb',
      description: 'Massive cathedral space with very long decay',
      parameters: { roomSize: 0.95, dampening: 0.4, wetMix: 0.4, preDelay: 0.06 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-reverb-spring',
      name: 'Spring',
      category: 'reverb',
      description: 'Vintage spring reverb with character',
      parameters: { roomSize: 0.3, dampening: 0.2, wetMix: 0.3, preDelay: 0.005 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-reverb-chamber',
      name: 'Chamber',
      category: 'reverb',
      description: 'Echo chamber reverb, dense reflections',
      parameters: { roomSize: 0.7, dampening: 0.55, wetMix: 0.32, preDelay: 0.03 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // Delay Presets
    {
      id: 'builtin-delay-slapback',
      name: 'Slapback',
      category: 'delay',
      description: 'Quick single echo, classic rockabilly style',
      parameters: { time: 0.12, feedback: 0.15, wetMix: 0.3, filter: 0.7 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-delay-pingpong',
      name: 'Ping Pong',
      category: 'delay',
      description: 'Stereo ping pong delay bouncing left and right',
      parameters: { time: 0.375, feedback: 0.45, wetMix: 0.4, filter: 0.5, stereo: 1 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-delay-tapeecho',
      name: 'Tape Echo',
      category: 'delay',
      description: 'Warm tape echo with saturation and wow/flutter',
      parameters: { time: 0.45, feedback: 0.55, wetMix: 0.35, filter: 0.35, saturation: 0.4 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-delay-ambientwash',
      name: 'Ambient Wash',
      category: 'delay',
      description: 'Long atmospheric delay for ambient textures',
      parameters: { time: 0.75, feedback: 0.7, wetMix: 0.5, filter: 0.25 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-delay-dub',
      name: 'Dub',
      category: 'delay',
      description: 'Classic dub delay with heavy feedback',
      parameters: { time: 0.5625, feedback: 0.75, wetMix: 0.55, filter: 0.4 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // Filter Presets
    {
      id: 'builtin-filter-lowsweep',
      name: 'Low Sweep',
      category: 'filter',
      description: 'Slow low-pass filter sweep for builds',
      parameters: { frequency: 0.1, resonance: 0.6, filterType: 0, rate: 0.15 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-filter-highpassdj',
      name: 'High Pass DJ',
      category: 'filter',
      description: 'High pass filter for DJ-style breakdowns',
      parameters: { frequency: 0.5, resonance: 0.3, filterType: 1 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-filter-resonantwah',
      name: 'Resonant Wah',
      category: 'filter',
      description: 'High resonance filter sweep creating wah effect',
      parameters: { frequency: 0.3, resonance: 0.85, filterType: 2, rate: 0.4 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // Distortion Presets
    {
      id: 'builtin-distortion-warmsaturation',
      name: 'Warm Saturation',
      category: 'distortion',
      description: 'Gentle tube-style warmth and saturation',
      parameters: { drive: 0.3, tone: 0.6, mix: 0.4, output: 0.9 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-distortion-hardclip',
      name: 'Hard Clip',
      category: 'distortion',
      description: 'Aggressive hard clipping distortion',
      parameters: { drive: 0.75, tone: 0.5, mix: 0.6, output: 0.8 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-distortion-fuzz',
      name: 'Fuzz',
      category: 'distortion',
      description: 'Thick fuzzy distortion with sustain',
      parameters: { drive: 0.9, tone: 0.4, mix: 0.7, output: 0.75 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-distortion-bitcrush',
      name: 'Bit Crush',
      category: 'distortion',
      description: 'Lo-fi bit crushing and sample rate reduction',
      parameters: { bitDepth: 4, sampleRate: 0.2, mix: 0.5, output: 0.85 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // Phaser Presets
    {
      id: 'builtin-phaser-slowswirl',
      name: 'Slow Swirl',
      category: 'phaser',
      description: 'Slow sweeping phaser for pads and synths',
      parameters: { rate: 0.15, depth: 0.6, feedback: 0.3, stages: 4 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-phaser-fastphase',
      name: 'Fast Phase',
      category: 'phaser',
      description: 'Quick phaser for funky textures',
      parameters: { rate: 0.7, depth: 0.8, feedback: 0.5, stages: 6 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-phaser-jet',
      name: 'Jet',
      category: 'phaser',
      description: 'Classic jet phaser sound with high feedback',
      parameters: { rate: 0.45, depth: 0.9, feedback: 0.75, stages: 8 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // Flanger Presets
    {
      id: 'builtin-flanger-subtle',
      name: 'Subtle',
      category: 'flanger',
      description: 'Gentle flanger for subtle movement',
      parameters: { rate: 0.2, depth: 0.3, feedback: 0.2, delay: 0.003 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-flanger-jet',
      name: 'Jet',
      category: 'flanger',
      description: 'Classic jet flanger sweep',
      parameters: { rate: 0.35, depth: 0.8, feedback: 0.6, delay: 0.005 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-flanger-metallic',
      name: 'Metallic',
      category: 'flanger',
      description: 'Harsh metallic flanger with high feedback',
      parameters: { rate: 0.5, depth: 0.7, feedback: 0.85, delay: 0.002 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // StutterGate Presets
    {
      id: 'builtin-stuttergate-1_8',
      name: '1/8 Notes',
      category: 'stuttergate',
      description: 'Eighth note stutter gate pattern',
      parameters: { rate: 0.25, depth: 1, mix: 1, pattern: 0 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-stuttergate-1_16',
      name: '1/16 Notes',
      category: 'stuttergate',
      description: 'Sixteenth note stutter gate pattern',
      parameters: { rate: 0.5, depth: 1, mix: 1, pattern: 1 },
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-stuttergate-triplet',
      name: 'Triplet',
      category: 'stuttergate',
      description: 'Triplet stutter gate pattern',
      parameters: { rate: 0.375, depth: 1, mix: 1, pattern: 2 },
      dateCreated: now,
      isBuiltIn: true,
    },

    // Master Chain Presets
    {
      id: 'builtin-master-club',
      name: 'Club Master',
      category: 'master',
      description: 'Loud club-ready master with punch and presence',
      parameters: { inputGain: 0, compressorThreshold: -6, compressorRatio: 4, eqLow: 2, eqMid: 0, eqHigh: 1.5, limiterCeiling: -0.3, outputGain: 0 },
      chainConfig: [
        { effectType: 'eq', parameters: { low: 2, mid: 0, high: 1.5, lowFreq: 100, highFreq: 8000 }, wetMix: 1, bypassed: false },
        { effectType: 'compressor', parameters: { threshold: -6, ratio: 4, attack: 0.01, release: 0.1 }, wetMix: 1, bypassed: false },
        { effectType: 'limiter', parameters: { ceiling: -0.3, release: 0.05 }, wetMix: 1, bypassed: false },
      ],
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-master-warm',
      name: 'Warm Master',
      category: 'master',
      description: 'Warm, smooth master with gentle compression',
      parameters: { inputGain: 0, compressorThreshold: -10, compressorRatio: 2.5, eqLow: 1.5, eqMid: -0.5, eqHigh: -1, limiterCeiling: -1, outputGain: 0 },
      chainConfig: [
        { effectType: 'eq', parameters: { low: 1.5, mid: -0.5, high: -1, lowFreq: 80, highFreq: 10000 }, wetMix: 1, bypassed: false },
        { effectType: 'compressor', parameters: { threshold: -10, ratio: 2.5, attack: 0.03, release: 0.2 }, wetMix: 1, bypassed: false },
        { effectType: 'limiter', parameters: { ceiling: -1, release: 0.08 }, wetMix: 1, bypassed: false },
      ],
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-master-clean',
      name: 'Clean Master',
      category: 'master',
      description: 'Transparent, clean master with minimal processing',
      parameters: { inputGain: 0, compressorThreshold: -14, compressorRatio: 2, eqLow: 0, eqMid: 0, eqHigh: 0, limiterCeiling: -0.5, outputGain: 0 },
      chainConfig: [
        { effectType: 'eq', parameters: { low: 0, mid: 0, high: 0, lowFreq: 80, highFreq: 12000 }, wetMix: 1, bypassed: false },
        { effectType: 'compressor', parameters: { threshold: -14, ratio: 2, attack: 0.05, release: 0.3 }, wetMix: 1, bypassed: false },
        { effectType: 'limiter', parameters: { ceiling: -0.5, release: 0.1 }, wetMix: 1, bypassed: false },
      ],
      dateCreated: now,
      isBuiltIn: true,
    },
    {
      id: 'builtin-master-lofi',
      name: 'Lo-Fi Master',
      category: 'master',
      description: 'Vintage lo-fi master with saturation and roll-off',
      parameters: { inputGain: 0, compressorThreshold: -8, compressorRatio: 3, eqLow: -2, eqMid: 1, eqHigh: -4, limiterCeiling: -1.5, outputGain: 0 },
      chainConfig: [
        { effectType: 'eq', parameters: { low: -2, mid: 1, high: -4, lowFreq: 60, highFreq: 6000 }, wetMix: 1, bypassed: false },
        { effectType: 'saturation', parameters: { drive: 0.25, tone: 0.3 }, wetMix: 0.4, bypassed: false },
        { effectType: 'compressor', parameters: { threshold: -8, ratio: 3, attack: 0.005, release: 0.15 }, wetMix: 1, bypassed: false },
        { effectType: 'limiter', parameters: { ceiling: -1.5, release: 0.06 }, wetMix: 1, bypassed: false },
      ],
      dateCreated: now,
      isBuiltIn: true,
    },
  ];
}

export class EffectPresetManager {
  private builtInPresets: SavedEffectPreset[];
  private customPresets: SavedEffectPreset[];

  constructor() {
    this.builtInPresets = createBuiltInPresets();
    this.customPresets = this.loadCustomPresetsFromStorage();
  }

  private loadCustomPresetsFromStorage(): SavedEffectPreset[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load custom presets from localStorage:', e);
    }
    return [];
  }

  private saveCustomPresetsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customPresets));
    } catch (e) {
      console.warn('Failed to save custom presets to localStorage:', e);
    }
  }

  savePreset(
    name: string,
    category: string,
    parameters: Record<string, number>,
    chainConfig?: EffectChainConfig[]
  ): string {
    const preset: SavedEffectPreset = {
      id: generateId(),
      name,
      category,
      description: `Custom ${category} preset`,
      parameters,
      chainConfig,
      dateCreated: Date.now(),
      isBuiltIn: false,
    };

    this.customPresets.push(preset);
    this.saveCustomPresetsToStorage();
    return preset.id;
  }

  loadPreset(id: string): SavedEffectPreset | null {
    const builtIn = this.builtInPresets.find(p => p.id === id);
    if (builtIn) return { ...builtIn };

    const custom = this.customPresets.find(p => p.id === id);
    if (custom) return { ...custom };

    return null;
  }

  deletePreset(id: string): void {
    const index = this.customPresets.findIndex(p => p.id === id);
    if (index !== -1) {
      this.customPresets.splice(index, 1);
      this.saveCustomPresetsToStorage();
    }
  }

  getAllPresets(): SavedEffectPreset[] {
    return [
      ...this.builtInPresets.map(p => ({ ...p })),
      ...this.customPresets.map(p => ({ ...p })),
    ];
  }

  getPresetsByCategory(category: string): SavedEffectPreset[] {
    return this.getAllPresets().filter(p => p.category === category);
  }

  getBuiltInPresets(): SavedEffectPreset[] {
    return this.builtInPresets.map(p => ({ ...p }));
  }

  getCustomPresets(): SavedEffectPreset[] {
    return this.customPresets.map(p => ({ ...p }));
  }

  exportPreset(id: string): string {
    const preset = this.loadPreset(id);
    if (!preset) throw new Error(`Preset not found: ${id}`);

    // Export without the built-in flag so it imports as custom
    const exportData = { ...preset, isBuiltIn: false };
    return JSON.stringify(exportData, null, 2);
  }

  importPreset(json: string): string {
    try {
      const preset = JSON.parse(json) as SavedEffectPreset;

      // Validate required fields
      if (!preset.name || !preset.category || !preset.parameters) {
        throw new Error('Invalid preset format');
      }

      // Generate new ID and mark as custom
      const imported: SavedEffectPreset = {
        ...preset,
        id: generateId(),
        name: `${preset.name} (Imported)`,
        dateCreated: Date.now(),
        isBuiltIn: false,
      };

      this.customPresets.push(imported);
      this.saveCustomPresetsToStorage();
      return imported.id;
    } catch (e) {
      throw new Error(`Failed to import preset: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance for convenience
export const effectPresetManager = new EffectPresetManager();
