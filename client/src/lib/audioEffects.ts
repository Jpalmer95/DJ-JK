import { initAudioContext } from "./audio";

// Effect parameter interfaces
export interface EffectParameter {
  value: number;
  min: number;
  max: number;
  default: number;
  unit: string;
  name: string;
}

export interface EffectPreset {
  id: string;
  name: string;
  parameters: Record<string, number>;
  effectType: string;
}

// Base effect class that all effects inherit from
export abstract class BaseEffect {
  protected audioContext: AudioContext;
  protected inputNode: GainNode;
  protected outputNode: GainNode;
  protected wetGainNode: GainNode;
  protected dryGainNode: GainNode;
  protected wetMix: number = 1.0; // 0 = dry, 1 = wet
  protected bypass: boolean = false;
  public effectType: string;
  public id: string;
  public parameters: Record<string, EffectParameter> = {};

  constructor(id: string, effectType: string) {
    this.audioContext = initAudioContext();
    this.id = id;
    this.effectType = effectType;
    
    // Create input/output nodes for effect chaining
    this.inputNode = this.audioContext.createGain();
    this.outputNode = this.audioContext.createGain();
    
    // Create wet/dry mix nodes
    this.wetGainNode = this.audioContext.createGain();
    this.dryGainNode = this.audioContext.createGain();
    
    // Initially set to full wet signal
    this.updateWetDryMix();
    
    this.initializeEffect();
  }

  abstract initializeEffect(): void;
  
  // Connect this effect to another audio node
  connectTo(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }
  
  // Connect input source to this effect
  connectFrom(source: AudioNode): void {
    source.connect(this.inputNode);
  }
  
  // Set wet/dry mix (0 = dry, 1 = wet)
  setWetMix(wetMix: number): void {
    this.wetMix = Math.max(0, Math.min(1, wetMix));
    this.updateWetDryMix();
  }
  
  private updateWetDryMix(): void {
    this.wetGainNode.gain.value = this.wetMix;
    this.dryGainNode.gain.value = 1 - this.wetMix;
  }
  
  // Bypass/enable effect
  setBypass(bypass: boolean): void {
    this.bypass = bypass;
    if (bypass) {
      this.setWetMix(0); // Full dry when bypassed
    } else {
      this.setWetMix(this.wetMix); // Restore wet mix
    }
  }
  
  // Set parameter value with validation
  setParameter(name: string, value: number): void {
    if (this.parameters[name]) {
      const param = this.parameters[name];
      param.value = Math.max(param.min, Math.min(param.max, value));
      this.onParameterChange(name, param.value);
    }
  }
  
  // Get parameter value
  getParameter(name: string): number {
    return this.parameters[name]?.value || 0;
  }
  
  // Override in subclasses to handle parameter changes
  protected abstract onParameterChange(name: string, value: number): void;
  
  // Get current preset state
  getPreset(): EffectPreset {
    const parameters: Record<string, number> = {};
    Object.keys(this.parameters).forEach(key => {
      parameters[key] = this.parameters[key].value;
    });
    
    return {
      id: this.id,
      name: `${this.effectType} Preset`,
      parameters,
      effectType: this.effectType
    };
  }
  
  // Load preset state
  loadPreset(preset: EffectPreset): void {
    Object.keys(preset.parameters).forEach(key => {
      this.setParameter(key, preset.parameters[key]);
    });
  }
  
  // Cleanup
  destroy(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.wetGainNode.disconnect();
    this.dryGainNode.disconnect();
  }
}

// 3-Band EQ Effect
export class ThreeBandEQ extends BaseEffect {
  private lowFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private highFilter: BiquadFilterNode;
  private lowGain: GainNode;
  private midGain: GainNode;
  private highGain: GainNode;

  constructor(id: string = 'eq3') {
    super(id, 'ThreeBandEQ');
  }

  initializeEffect(): void {
    // Create filters
    this.lowFilter = this.audioContext.createBiquadFilter();
    this.midFilter = this.audioContext.createBiquadFilter();
    this.highFilter = this.audioContext.createBiquadFilter();
    
    // Create gain nodes for each band
    this.lowGain = this.audioContext.createGain();
    this.midGain = this.audioContext.createGain();
    this.highGain = this.audioContext.createGain();
    
    // Configure filters
    this.lowFilter.type = 'lowshelf';
    this.lowFilter.frequency.value = 320;
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 0.5;
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 3200;
    
    // Connect audio graph: input -> filters -> gains -> output
    this.inputNode.connect(this.lowFilter);
    this.inputNode.connect(this.midFilter);
    this.inputNode.connect(this.highFilter);
    
    this.lowFilter.connect(this.lowGain);
    this.midFilter.connect(this.midGain);
    this.highFilter.connect(this.highGain);
    
    this.lowGain.connect(this.wetGainNode);
    this.midGain.connect(this.wetGainNode);
    this.highGain.connect(this.wetGainNode);
    
    // Direct connection for dry signal
    this.inputNode.connect(this.dryGainNode);
    
    // Mix wet and dry to output
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    // Define parameters
    this.parameters = {
      lowGain: { value: 0, min: -30, max: 15, default: 0, unit: 'dB', name: 'Low Gain' },
      midGain: { value: 0, min: -30, max: 15, default: 0, unit: 'dB', name: 'Mid Gain' },
      highGain: { value: 0, min: -30, max: 15, default: 0, unit: 'dB', name: 'High Gain' },
      lowKill: { value: 0, min: 0, max: 1, default: 0, unit: '', name: 'Low Kill' },
      midKill: { value: 0, min: 0, max: 1, default: 0, unit: '', name: 'Mid Kill' },
      highKill: { value: 0, min: 0, max: 1, default: 0, unit: '', name: 'High Kill' }
    };
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'lowGain':
        this.lowFilter.gain.value = value;
        break;
      case 'midGain':
        this.midFilter.gain.value = value;
        break;
      case 'highGain':
        this.highFilter.gain.value = value;
        break;
      case 'lowKill':
        this.lowGain.gain.value = value === 1 ? 0 : 1;
        break;
      case 'midKill':
        this.midGain.gain.value = value === 1 ? 0 : 1;
        break;
      case 'highKill':
        this.highGain.gain.value = value === 1 ? 0 : 1;
        break;
    }
  }
}

// High/Low Pass Filter Effect
export class Filter extends BaseEffect {
  private filterNode: BiquadFilterNode;

  constructor(id: string = 'filter') {
    super(id, 'Filter');
  }

  initializeEffect(): void {
    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 20000; // Start with no filtering
    this.filterNode.Q.value = 1;
    
    // Connect audio graph
    this.inputNode.connect(this.filterNode);
    this.filterNode.connect(this.wetGainNode);
    this.inputNode.connect(this.dryGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    this.parameters = {
      frequency: { value: 20000, min: 20, max: 20000, default: 20000, unit: 'Hz', name: 'Frequency' },
      resonance: { value: 1, min: 0.1, max: 20, default: 1, unit: 'Q', name: 'Resonance' },
      type: { value: 0, min: 0, max: 1, default: 0, unit: '', name: 'Type' } // 0 = lowpass, 1 = highpass
    };
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'frequency':
        this.filterNode.frequency.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
        break;
      case 'resonance':
        this.filterNode.Q.value = value;
        break;
      case 'type':
        this.filterNode.type = value === 0 ? 'lowpass' : 'highpass';
        break;
    }
  }
}

// Reverb Effect using ConvolverNode
export class Reverb extends BaseEffect {
  private convolverNode: ConvolverNode;
  private reverbBuffer: AudioBuffer | null = null;

  constructor(id: string = 'reverb') {
    super(id, 'Reverb');
  }

  initializeEffect(): void {
    this.convolverNode = this.audioContext.createConvolver();
    
    // Generate artificial reverb impulse response
    this.generateReverbImpulse('hall');
    
    // Connect audio graph
    this.inputNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    this.inputNode.connect(this.dryGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    this.parameters = {
      roomSize: { value: 0.5, min: 0.1, max: 1.0, default: 0.5, unit: '', name: 'Room Size' },
      decay: { value: 0.5, min: 0.1, max: 1.0, default: 0.5, unit: '', name: 'Decay' },
      wetMix: { value: 0.3, min: 0, max: 1, default: 0.3, unit: '', name: 'Wet Mix' },
      type: { value: 0, min: 0, max: 2, default: 0, unit: '', name: 'Type' } // 0=hall, 1=room, 2=plate
    };
    
    // Set initial wet mix
    this.setWetMix(0.3);
  }

  private generateReverbImpulse(type: string): void {
    const duration = this.getParameter('roomSize') * 3 + 1; // 1-4 seconds
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    const decay = this.getParameter('decay') || 0.5;
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const n = length - i;
        let sample = (Math.random() * 2 - 1) * Math.pow(n / length, decay * 3);
        
        // Apply different characteristics based on type
        switch (type) {
          case 'hall':
            sample *= Math.sin(i / length * Math.PI); // Natural hall decay
            break;
          case 'room':
            sample *= Math.exp(-i / length * 2); // Quick room decay
            break;
          case 'plate':
            sample *= Math.cos(i / length * Math.PI * 2) * 0.5 + 0.5; // Metallic plate sound
            break;
        }
        
        channelData[i] = sample;
      }
    }
    
    this.convolverNode.buffer = impulse;
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'roomSize':
      case 'decay':
      case 'type':
        // Regenerate impulse when these parameters change
        const types = ['hall', 'room', 'plate'];
        this.generateReverbImpulse(types[Math.floor(this.getParameter('type'))] || 'hall');
        break;
      case 'wetMix':
        this.setWetMix(value);
        break;
    }
  }
}

// Delay Effect
export class Delay extends BaseEffect {
  private delayNode: DelayNode;
  private feedbackNode: GainNode;
  private delayGainNode: GainNode;

  constructor(id: string = 'delay') {
    super(id, 'Delay');
  }

  initializeEffect(): void {
    // Create delay line (max 1 second)
    this.delayNode = this.audioContext.createDelay(1.0);
    this.feedbackNode = this.audioContext.createGain();
    this.delayGainNode = this.audioContext.createGain();
    
    // Connect feedback loop: input -> delay -> feedback -> delay
    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.delayGainNode);
    this.delayGainNode.connect(this.wetGainNode);
    
    // Direct signal
    this.inputNode.connect(this.dryGainNode);
    
    // Mix to output
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    this.parameters = {
      time: { value: 0.25, min: 0.01, max: 1.0, default: 0.25, unit: 's', name: 'Delay Time' },
      feedback: { value: 0.3, min: 0, max: 0.95, default: 0.3, unit: '', name: 'Feedback' },
      wetMix: { value: 0.3, min: 0, max: 1, default: 0.3, unit: '', name: 'Wet Mix' },
      sync: { value: 0, min: 0, max: 1, default: 0, unit: '', name: 'BPM Sync' }
    };
    
    this.setWetMix(0.3);
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'time':
        this.delayNode.delayTime.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
        break;
      case 'feedback':
        this.feedbackNode.gain.value = value;
        break;
      case 'wetMix':
        this.setWetMix(value);
        break;
    }
  }
  
  // Set delay time based on BPM (for beat-synced delays)
  setBPMTime(bpm: number, subdivision: number = 1): void {
    const beatTime = 60 / bpm;
    const delayTime = beatTime / subdivision;
    this.setParameter('time', Math.min(delayTime, 1.0));
  }
}

// Distortion Effect
export class Distortion extends BaseEffect {
  private waveShaperNode: WaveShaperNode;
  private preGainNode: GainNode;
  private postGainNode: GainNode;

  constructor(id: string = 'distortion') {
    super(id, 'Distortion');
  }

  initializeEffect(): void {
    this.waveShaperNode = this.audioContext.createWaveShaper();
    this.preGainNode = this.audioContext.createGain();
    this.postGainNode = this.audioContext.createGain();
    
    // Generate distortion curve
    this.generateDistortionCurve(50);
    
    // Connect audio graph
    this.inputNode.connect(this.preGainNode);
    this.preGainNode.connect(this.waveShaperNode);
    this.waveShaperNode.connect(this.postGainNode);
    this.postGainNode.connect(this.wetGainNode);
    this.inputNode.connect(this.dryGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    this.parameters = {
      drive: { value: 50, min: 1, max: 100, default: 50, unit: '', name: 'Drive' },
      tone: { value: 0, min: -10, max: 10, default: 0, unit: 'dB', name: 'Tone' },
      wetMix: { value: 0.5, min: 0, max: 1, default: 0.5, unit: '', name: 'Wet Mix' }
    };
    
    this.setWetMix(0.5);
  }

  private generateDistortionCurve(amount: number): void {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    this.waveShaperNode.curve = curve;
    this.waveShaperNode.oversample = '4x';
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'drive':
        this.generateDistortionCurve(value);
        this.preGainNode.gain.value = 1 + (value / 100);
        break;
      case 'tone':
        this.postGainNode.gain.value = Math.pow(10, value / 20); // dB to linear
        break;
      case 'wetMix':
        this.setWetMix(value);
        break;
    }
  }
}

// Phaser Effect
export class Phaser extends BaseEffect {
  private allpassFilters: BiquadFilterNode[] = [];
  private lfoGainNode: GainNode;
  private lfo: OscillatorNode;
  private feedbackNode: GainNode;

  constructor(id: string = 'phaser') {
    super(id, 'Phaser');
  }

  initializeEffect(): void {
    // Create 6 allpass filters for phasing
    for (let i = 0; i < 6; i++) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 350 + (i * 200);
      this.allpassFilters.push(filter);
    }
    
    // Create LFO for modulation
    this.lfo = this.audioContext.createOscillator();
    this.lfoGainNode = this.audioContext.createGain();
    this.feedbackNode = this.audioContext.createGain();
    
    // Connect filters in series
    this.inputNode.connect(this.allpassFilters[0]);
    for (let i = 0; i < this.allpassFilters.length - 1; i++) {
      this.allpassFilters[i].connect(this.allpassFilters[i + 1]);
    }
    
    // Connect LFO to filter frequencies
    this.lfo.connect(this.lfoGainNode);
    for (const filter of this.allpassFilters) {
      this.lfoGainNode.connect(filter.frequency);
    }
    
    // Connect output with feedback
    this.allpassFilters[this.allpassFilters.length - 1].connect(this.feedbackNode);
    this.feedbackNode.connect(this.inputNode);
    this.allpassFilters[this.allpassFilters.length - 1].connect(this.wetGainNode);
    
    this.inputNode.connect(this.dryGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    // Start LFO
    this.lfo.start();
    
    this.parameters = {
      rate: { value: 0.5, min: 0.1, max: 10, default: 0.5, unit: 'Hz', name: 'Rate' },
      depth: { value: 100, min: 0, max: 200, default: 100, unit: 'Hz', name: 'Depth' },
      feedback: { value: 0.3, min: 0, max: 0.9, default: 0.3, unit: '', name: 'Feedback' },
      wetMix: { value: 0.5, min: 0, max: 1, default: 0.5, unit: '', name: 'Wet Mix' },
      sync: { value: 0, min: 0, max: 1, default: 0, unit: '', name: 'BPM Sync' }
    };
    
    this.setWetMix(0.5);
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'rate':
        this.lfo.frequency.value = value;
        break;
      case 'depth':
        this.lfoGainNode.gain.value = value;
        break;
      case 'feedback':
        this.feedbackNode.gain.value = value;
        break;
      case 'wetMix':
        this.setWetMix(value);
        break;
    }
  }
}

// Flanger Effect
export class Flanger extends BaseEffect {
  private delayNode: DelayNode;
  private lfo: OscillatorNode;
  private lfoGainNode: GainNode;
  private feedbackNode: GainNode;

  constructor(id: string = 'flanger') {
    super(id, 'Flanger');
  }

  initializeEffect(): void {
    this.delayNode = this.audioContext.createDelay(0.02); // 20ms max delay
    this.lfo = this.audioContext.createOscillator();
    this.lfoGainNode = this.audioContext.createGain();
    this.feedbackNode = this.audioContext.createGain();
    
    // Connect LFO to delay time
    this.lfo.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);
    
    // Connect audio signal
    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.wetGainNode);
    
    this.inputNode.connect(this.dryGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    // Start LFO
    this.lfo.start();
    
    this.parameters = {
      rate: { value: 0.3, min: 0.1, max: 5, default: 0.3, unit: 'Hz', name: 'Rate' },
      depth: { value: 0.005, min: 0.001, max: 0.01, default: 0.005, unit: 's', name: 'Depth' },
      feedback: { value: 0.4, min: 0, max: 0.9, default: 0.4, unit: '', name: 'Feedback' },
      wetMix: { value: 0.5, min: 0, max: 1, default: 0.5, unit: '', name: 'Wet Mix' }
    };
    
    this.setWetMix(0.5);
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'rate':
        this.lfo.frequency.value = value;
        break;
      case 'depth':
        this.lfoGainNode.gain.value = value;
        break;
      case 'feedback':
        this.feedbackNode.gain.value = value;
        break;
      case 'wetMix':
        this.setWetMix(value);
        break;
    }
  }
}

// Bitcrusher Effect
export class Bitcrusher extends BaseEffect {
  private scriptProcessor: ScriptProcessorNode;
  private sampleReduction: number = 1;
  private bitDepth: number = 16;

  constructor(id: string = 'bitcrusher') {
    super(id, 'Bitcrusher');
  }

  initializeEffect(): void {
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;
      
      for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);
        
        let step = Math.pow(1 / 2, this.bitDepth);
        let sampleCounter = 0;
        let holdSample = 0;
        
        for (let sample = 0; sample < inputBuffer.length; sample++) {
          if (sampleCounter % this.sampleReduction === 0) {
            holdSample = step * Math.floor(inputData[sample] / step + 0.5);
          }
          outputData[sample] = holdSample;
          sampleCounter++;
        }
      }
    };
    
    // Connect audio graph
    this.inputNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.wetGainNode);
    this.inputNode.connect(this.dryGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);
    
    this.parameters = {
      bitDepth: { value: 16, min: 1, max: 16, default: 16, unit: 'bits', name: 'Bit Depth' },
      sampleRate: { value: 1, min: 1, max: 50, default: 1, unit: '', name: 'Sample Rate Reduction' },
      wetMix: { value: 0.5, min: 0, max: 1, default: 0.5, unit: '', name: 'Wet Mix' }
    };
    
    this.setWetMix(0.5);
  }

  protected onParameterChange(name: string, value: number): void {
    switch (name) {
      case 'bitDepth':
        this.bitDepth = Math.floor(value);
        break;
      case 'sampleRate':
        this.sampleReduction = Math.floor(value);
        break;
      case 'wetMix':
        this.setWetMix(value);
        break;
    }
  }
}

// Effects Chain Manager
export class EffectsChain {
  private effects: BaseEffect[] = [];
  private inputNode: GainNode;
  private outputNode: GainNode;
  private audioContext: AudioContext;
  private masterBypass: boolean = false;

  constructor() {
    this.audioContext = initAudioContext();
    this.inputNode = this.audioContext.createGain();
    this.outputNode = this.audioContext.createGain();
    
    // Initially connect input to output (no effects)
    this.updateConnections();
  }

  // Add effect to chain
  addEffect(effect: BaseEffect): void {
    this.effects.push(effect);
    this.updateConnections();
  }

  // Remove effect from chain
  removeEffect(effectId: string): void {
    this.effects = this.effects.filter(effect => effect.id !== effectId);
    this.updateConnections();
  }

  // Reorder effects in chain
  reorderEffect(effectId: string, newIndex: number): void {
    const effectIndex = this.effects.findIndex(effect => effect.id === effectId);
    if (effectIndex !== -1) {
      const effect = this.effects.splice(effectIndex, 1)[0];
      this.effects.splice(newIndex, 0, effect);
      this.updateConnections();
    }
  }

  // Update all connections in the effects chain
  private updateConnections(): void {
    // Disconnect all existing connections
    this.inputNode.disconnect();
    this.effects.forEach(effect => {
      effect.inputNode.disconnect();
      effect.outputNode.disconnect();
    });

    if (this.effects.length === 0 || this.masterBypass) {
      // No effects or bypassed - direct connection
      this.inputNode.connect(this.outputNode);
    } else {
      // Connect effects in series
      this.inputNode.connect(this.effects[0].inputNode);
      
      for (let i = 0; i < this.effects.length - 1; i++) {
        this.effects[i].connectTo(this.effects[i + 1].inputNode);
      }
      
      this.effects[this.effects.length - 1].connectTo(this.outputNode);
    }
  }

  // Connect this effects chain to an audio node
  connectTo(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  // Connect an audio source to this effects chain
  connectFrom(source: AudioNode): void {
    source.connect(this.inputNode);
  }

  // Get effect by ID
  getEffect(effectId: string): BaseEffect | undefined {
    return this.effects.find(effect => effect.id === effectId);
  }

  // Get all effects
  getEffects(): BaseEffect[] {
    return [...this.effects];
  }

  // Master bypass for entire chain
  setMasterBypass(bypass: boolean): void {
    this.masterBypass = bypass;
    this.updateConnections();
  }

  // Save all effect presets
  savePresets(): EffectPreset[] {
    return this.effects.map(effect => effect.getPreset());
  }

  // Load effect presets
  loadPresets(presets: EffectPreset[]): void {
    presets.forEach(preset => {
      const effect = this.getEffect(preset.id);
      if (effect) {
        effect.loadPreset(preset);
      }
    });
  }
  
  // Get effects configuration for database storage
  getEffectsConfig(): any[] {
    return this.effects.map(effect => ({
      id: effect.id,
      type: effect.effectType,
      parameters: Object.keys(effect.parameters).reduce((acc, key) => {
        acc[key] = effect.parameters[key].value;
        return acc;
      }, {} as Record<string, number>),
      wetMix: effect.getParameter('wetMix') || 1.0,
      bypass: false // Add bypass state when it's implemented
    }));
  }
  
  // Load effects configuration from database format
  loadEffectsConfig(config: any[]): void {
    if (!Array.isArray(config)) {
      console.warn('Invalid effects config format');
      return;
    }
    
    config.forEach(effectConfig => {
      if (!effectConfig.id || !effectConfig.type || !effectConfig.parameters) {
        console.warn('Invalid effect config:', effectConfig);
        return;
      }
      
      // Find existing effect or create new one
      let effect = this.getEffect(effectConfig.id);
      if (!effect) {
        try {
          effect = EffectFactory.createEffect(effectConfig.type, effectConfig.id);
          this.addEffect(effect);
        } catch (error) {
          console.error('Failed to create effect:', effectConfig.type, error);
          return;
        }
      }
      
      // Apply parameters
      Object.keys(effectConfig.parameters).forEach(paramName => {
        if (effect!.parameters[paramName]) {
          effect!.setParameter(paramName, effectConfig.parameters[paramName]);
        }
      });
      
      // Apply wet mix if specified
      if (typeof effectConfig.wetMix === 'number') {
        effect.setWetMix(effectConfig.wetMix);
      }
      
      // Apply bypass state if specified
      if (typeof effectConfig.bypass === 'boolean') {
        effect.setBypass(effectConfig.bypass);
      }
    });
  }

  // Cleanup
  destroy(): void {
    this.effects.forEach(effect => effect.destroy());
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}

// Factory for creating effects
export class EffectFactory {
  static createEffect(type: string, id?: string): BaseEffect {
    switch (type) {
      case 'ThreeBandEQ':
        return new ThreeBandEQ(id);
      case 'Filter':
        return new Filter(id);
      case 'Reverb':
        return new Reverb(id);
      case 'Delay':
        return new Delay(id);
      case 'Distortion':
        return new Distortion(id);
      case 'Phaser':
        return new Phaser(id);
      case 'Flanger':
        return new Flanger(id);
      case 'Bitcrusher':
        return new Bitcrusher(id);
      default:
        throw new Error(`Unknown effect type: ${type}`);
    }
  }
  
  static getAvailableEffects(): string[] {
    return [
      'ThreeBandEQ',
      'Filter', 
      'Reverb',
      'Delay',
      'Distortion',
      'Phaser',
      'Flanger',
      'Bitcrusher'
    ];
  }
}