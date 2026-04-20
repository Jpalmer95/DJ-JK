// MIDI Controller Support System
// Web MIDI API integration for mapping physical MIDI controllers to DJ application controls

// --- Interfaces ---

export interface MIDIMessage {
  type: 'noteon' | 'noteoff' | 'cc' | 'pitchbend' | 'program';
  channel: number;
  note?: number;
  controller?: number;
  value: number;
  timestamp: number;
}

export interface MIDIMapping {
  id: string;
  midiType: 'note' | 'cc' | 'pitchbend';
  midiChannel: number;
  midiNumber: number;  // note number or CC number
  action: string;      // e.g., 'deckA.play', 'pad.trigger.0', 'crossfader'
  label: string;       // Human-readable label
  minValue: number;    // For CC: map MIDI 0-127 to this range
  maxValue: number;
  isToggle: boolean;   // If true, noteon toggles. If false, noteon=on, noteoff=off
}

export interface ControllerPreset {
  name: string;
  manufacturer: string;
  model: string;
  mappings: MIDIMapping[];
}

export type MIDIActionHandler = (action: string, value: number) => void;

// --- Built-in Presets ---

export const PRESET_NOVATION_LAUNCHPAD_MINI: ControllerPreset = {
  name: 'Novation Launchpad Mini',
  manufacturer: 'Novation',
  model: 'Launchpad Mini',
  mappings: (() => {
    const mappings: MIDIMapping[] = [];
    // 8x8 grid mapped to pads (notes 0-7, 16-23, 32-39, 48-55, 64-71, 80-87, 96-103, 112-119)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const note = row * 16 + col;
        mappings.push({
          id: `launchpad_pad_${row}_${col}`,
          midiType: 'note',
          midiChannel: 0,
          midiNumber: note,
          action: `pad.trigger.${row * 8 + col}`,
          label: `Pad R${row + 1}C${col + 1}`,
          minValue: 0,
          maxValue: 127,
          isToggle: false
        });
      }
    }
    // Top row buttons (scene launch) - notes 104-111
    for (let i = 0; i < 8; i++) {
      mappings.push({
        id: `launchpad_scene_${i}`,
        midiType: 'note',
        midiChannel: 0,
        midiNumber: 104 + i,
        action: `scene.launch.${i}`,
        label: `Scene ${i + 1}`,
        minValue: 0,
        maxValue: 127,
        isToggle: false
      });
    }
    return mappings;
  })()
};

export const PRESET_AKAI_APC_MINI: ControllerPreset = {
  name: 'Akai APC Mini',
  manufacturer: 'Akai',
  model: 'APC Mini',
  mappings: (() => {
    const mappings: MIDIMapping[] = [];
    // 8x8 grid mapped to pads (notes 0-7, 16-23, 32-39, 48-55, 64-71, 80-87, 96-103, 112-119)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const note = row * 16 + col;
        mappings.push({
          id: `apc_pad_${row}_${col}`,
          midiType: 'note',
          midiChannel: 0,
          midiNumber: note,
          action: `pad.trigger.${row * 8 + col}`,
          label: `Pad R${row + 1}C${col + 1}`,
          minValue: 0,
          maxValue: 127,
          isToggle: false
        });
      }
    }
    // 9 vertical faders (CC 48-56)
    for (let i = 0; i < 9; i++) {
      mappings.push({
        id: `apc_fader_${i}`,
        midiType: 'cc',
        midiChannel: 0,
        midiNumber: 48 + i,
        action: i < 8 ? `track.${i}.volume` : 'master.volume',
        label: i < 8 ? `Track ${i + 1} Volume` : 'Master Volume',
        minValue: 0,
        maxValue: 1,
        isToggle: false
      });
    }
    // Bottom row scene buttons (CC 82-86)
    for (let i = 0; i < 5; i++) {
      mappings.push({
        id: `apc_scene_${i}`,
        midiType: 'cc',
        midiChannel: 0,
        midiNumber: 82 + i,
        action: `scene.launch.${i}`,
        label: `Scene ${i + 1}`,
        minValue: 0,
        maxValue: 127,
        isToggle: false
      });
    }
    // Track enable buttons (CC 64-71)
    for (let i = 0; i < 8; i++) {
      mappings.push({
        id: `apc_track_arm_${i}`,
        midiType: 'cc',
        midiChannel: 0,
        midiNumber: 64 + i,
        action: `track.${i}.arm`,
        label: `Track ${i + 1} Arm`,
        minValue: 0,
        maxValue: 127,
        isToggle: true
      });
    }
    return mappings;
  })()
};

export const PRESET_GENERIC_MIDI_KEYBOARD: ControllerPreset = {
  name: 'Generic MIDI Keyboard',
  manufacturer: 'Generic',
  model: 'MIDI Keyboard',
  mappings: (() => {
    const mappings: MIDIMapping[] = [];
    // 49 piano keys (notes 36-84)
    for (let i = 0; i < 49; i++) {
      const note = 36 + i;
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(note / 12) - 1;
      const noteName = noteNames[note % 12] + octave;
      mappings.push({
        id: `keyboard_note_${note}`,
        midiType: 'note',
        midiChannel: 0,
        midiNumber: note,
        action: `note.trigger.${note}`,
        label: `Key ${noteName}`,
        minValue: 0,
        maxValue: 127,
        isToggle: false
      });
    }
    // Mod wheel (CC 1)
    mappings.push({
      id: 'keyboard_modwheel',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 1,
      action: 'modwheel',
      label: 'Mod Wheel',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    });
    // Pitch bend
    mappings.push({
      id: 'keyboard_pitchbend',
      midiType: 'pitchbend',
      midiChannel: 0,
      midiNumber: 0,
      action: 'pitchbend',
      label: 'Pitch Bend',
      minValue: -1,
      maxValue: 1,
      isToggle: false
    });
    // Generic knobs (CC 10-17 mapped as 8 knobs)
    for (let i = 0; i < 8; i++) {
      mappings.push({
        id: `keyboard_knob_${i}`,
        midiType: 'cc',
        midiChannel: 0,
        midiNumber: 10 + i,
        action: `knob.${i}`,
        label: `Knob ${i + 1}`,
        minValue: 0,
        maxValue: 1,
        isToggle: false
      });
    }
    return mappings;
  })()
};

export const PRESET_GENERIC_DJ_CONTROLLER: ControllerPreset = {
  name: 'Generic DJ Controller',
  manufacturer: 'Generic',
  model: 'DJ Controller',
  mappings: [
    // Deck A controls
    {
      id: 'dj_deckA_play',
      midiType: 'note',
      midiChannel: 0,
      midiNumber: 0,
      action: 'deckA.play',
      label: 'Deck A Play/Pause',
      minValue: 0,
      maxValue: 1,
      isToggle: true
    },
    {
      id: 'dj_deckA_cue',
      midiType: 'note',
      midiChannel: 0,
      midiNumber: 1,
      action: 'deckA.cue',
      label: 'Deck A Cue',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckA_sync',
      midiType: 'note',
      midiChannel: 0,
      midiNumber: 2,
      action: 'deckA.sync',
      label: 'Deck A Sync',
      minValue: 0,
      maxValue: 1,
      isToggle: true
    },
    {
      id: 'dj_deckA_volume',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 0,
      action: 'deckA.volume',
      label: 'Deck A Volume',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckA_eq_high',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 1,
      action: 'deckA.eq.high',
      label: 'Deck A EQ High',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckA_eq_mid',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 2,
      action: 'deckA.eq.mid',
      label: 'Deck A EQ Mid',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckA_eq_low',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 3,
      action: 'deckA.eq.low',
      label: 'Deck A EQ Low',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckA_jog',
      midiType: 'pitchbend',
      midiChannel: 0,
      midiNumber: 0,
      action: 'deckA.jog',
      label: 'Deck A Jog Wheel',
      minValue: -1,
      maxValue: 1,
      isToggle: false
    },
    // Deck B controls
    {
      id: 'dj_deckB_play',
      midiType: 'note',
      midiChannel: 1,
      midiNumber: 0,
      action: 'deckB.play',
      label: 'Deck B Play/Pause',
      minValue: 0,
      maxValue: 1,
      isToggle: true
    },
    {
      id: 'dj_deckB_cue',
      midiType: 'note',
      midiChannel: 1,
      midiNumber: 1,
      action: 'deckB.cue',
      label: 'Deck B Cue',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckB_sync',
      midiType: 'note',
      midiChannel: 1,
      midiNumber: 2,
      action: 'deckB.sync',
      label: 'Deck B Sync',
      minValue: 0,
      maxValue: 1,
      isToggle: true
    },
    {
      id: 'dj_deckB_volume',
      midiType: 'cc',
      midiChannel: 1,
      midiNumber: 0,
      action: 'deckB.volume',
      label: 'Deck B Volume',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckB_eq_high',
      midiType: 'cc',
      midiChannel: 1,
      midiNumber: 1,
      action: 'deckB.eq.high',
      label: 'Deck B EQ High',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckB_eq_mid',
      midiType: 'cc',
      midiChannel: 1,
      midiNumber: 2,
      action: 'deckB.eq.mid',
      label: 'Deck B EQ Mid',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckB_eq_low',
      midiType: 'cc',
      midiChannel: 1,
      midiNumber: 3,
      action: 'deckB.eq.low',
      label: 'Deck B EQ Low',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_deckB_jog',
      midiType: 'pitchbend',
      midiChannel: 1,
      midiNumber: 0,
      action: 'deckB.jog',
      label: 'Deck B Jog Wheel',
      minValue: -1,
      maxValue: 1,
      isToggle: false
    },
    // Crossfader
    {
      id: 'dj_crossfader',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 31,
      action: 'crossfader',
      label: 'Crossfader',
      minValue: -1,
      maxValue: 1,
      isToggle: false
    },
    // Effects
    {
      id: 'dj_fx1_toggle',
      midiType: 'note',
      midiChannel: 0,
      midiNumber: 10,
      action: 'fx.1.toggle',
      label: 'FX 1 Toggle',
      minValue: 0,
      maxValue: 1,
      isToggle: true
    },
    {
      id: 'dj_fx1_wet',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 10,
      action: 'fx.1.wet',
      label: 'FX 1 Mix',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    },
    {
      id: 'dj_fx2_toggle',
      midiType: 'note',
      midiChannel: 0,
      midiNumber: 11,
      action: 'fx.2.toggle',
      label: 'FX 2 Toggle',
      minValue: 0,
      maxValue: 1,
      isToggle: true
    },
    {
      id: 'dj_fx2_wet',
      midiType: 'cc',
      midiChannel: 0,
      midiNumber: 11,
      action: 'fx.2.wet',
      label: 'FX 2 Mix',
      minValue: 0,
      maxValue: 1,
      isToggle: false
    }
  ]
};

// --- MIDIControllerManager Class ---

interface LearnState {
  active: boolean;
  action: string;
  label: string;
}

interface ToggleState {
  [key: string]: boolean;  // mapping id -> current on/off state
}

export class MIDIControllerManager {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private mappings: MIDIMapping[] = [];
  private actionHandler: MIDIActionHandler | null = null;
  private listening: boolean = false;
  private learnState: LearnState = { active: false, action: '', label: '' };
  private toggleStates: ToggleState = {};
  private messageHandler: ((event: WebMidi.MIDIMessageEvent) => void) | null = null;
  private outputPort: WebMidi.MIDIOutput | null = null;
  private boundMIDIMessage: ((event: WebMidi.MIDIMessageEvent) => void) | null = null;

  // --- Initialization ---

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  async requestAccess(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Web MIDI API is not available in this browser.');
      return false;
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      console.log('MIDI access granted.');
      // Set up first output port if available
      const outputs = this.midiAccess.outputs.values();
      const firstOutput = outputs.next();
      if (!firstOutput.done) {
        this.outputPort = firstOutput.value;
      }
      return true;
    } catch (error) {
      console.error('Failed to request MIDI access:', error);
      return false;
    }
  }

  getConnectedDevices(): string[] {
    if (!this.midiAccess) return [];
    const devices: string[] = [];
    this.midiAccess.inputs.forEach((input) => {
      if (input.name) {
        devices.push(input.name);
      }
    });
    return devices;
  }

  // --- Mapping System ---

  loadPreset(preset: ControllerPreset): void {
    this.mappings = [...preset.mappings];
    this.toggleStates = {};
    console.log(`Loaded preset: ${preset.name} (${preset.manufacturer} ${preset.model})`);
  }

  addMapping(mapping: MIDIMapping): void {
    const existingIndex = this.mappings.findIndex(m => m.id === mapping.id);
    if (existingIndex >= 0) {
      this.mappings[existingIndex] = mapping;
    } else {
      this.mappings.push(mapping);
    }
  }

  removeMapping(id: string): void {
    this.mappings = this.mappings.filter(m => m.id !== id);
    delete this.toggleStates[id];
  }

  getMappings(): MIDIMapping[] {
    return [...this.mappings];
  }

  learnMapping(action: string, label: string): void {
    this.learnState = { active: true, action, label };
    console.log(`MIDI Learn mode: waiting for input to map "${label}" -> ${action}`);
  }

  cancelLearn(): void {
    this.learnState = { active: false, action: '', label: '' };
    console.log('MIDI Learn mode cancelled.');
  }

  clearAllMappings(): void {
    this.mappings = [];
    this.toggleStates = {};
  }

  // --- Message Handling ---

  startListening(): void {
    if (!this.midiAccess) {
      console.warn('MIDI access not available. Call requestAccess() first.');
      return;
    }
    if (this.listening) {
      console.warn('Already listening for MIDI messages.');
      return;
    }

    this.boundMIDIMessage = this.handleMIDIMessage.bind(this);
    this.midiAccess.inputs.forEach((input) => {
      input.onmidimessage = this.boundMIDIMessage;
    });

    // Also handle device connection/disconnection
    this.midiAccess.onstatechange = (event: WebMidi.MIDIConnectionEvent) => {
      const port = event.port;
      if (port && port.type === 'input' && port.state === 'connected') {
        const input = port as WebMidi.MIDIInput;
        if (this.listening && this.boundMIDIMessage) {
          input.onmidimessage = this.boundMIDIMessage;
        }
      }
    };

    this.listening = true;
    console.log('Started listening for MIDI messages.');
  }

  stopListening(): void {
    if (!this.midiAccess) return;
    this.midiAccess.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    this.listening = false;
    console.log('Stopped listening for MIDI messages.');
  }

  setActionHandler(handler: MIDIActionHandler): void {
    this.actionHandler = handler;
  }

  private handleMIDIMessage(event: WebMidi.MIDIMessageEvent): void {
    if (!event.data || event.data.length < 3) return;

    const status = event.data[0];
    const data1 = event.data[1];
    const data2 = event.data[2];

    const channel = status & 0x0F;
    const messageType = status >> 4;

    let parsedMessage: MIDIMessage | null = null;

    // Note On (0x9)
    if (messageType === 0x9) {
      if (data2 === 0) {
        // Velocity 0 = note off
        parsedMessage = {
          type: 'noteoff',
          channel,
          note: data1,
          value: 0,
          timestamp: event.timeStamp
        };
      } else {
        parsedMessage = {
          type: 'noteon',
          channel,
          note: data1,
          value: data2,
          timestamp: event.timeStamp
        };
      }
    }
    // Note Off (0x8)
    else if (messageType === 0x8) {
      parsedMessage = {
        type: 'noteoff',
        channel,
        note: data1,
        value: 0,
        timestamp: event.timeStamp
      };
    }
    // Control Change (0xB)
    else if (messageType === 0xB) {
      parsedMessage = {
        type: 'cc',
        channel,
        controller: data1,
        value: data2,
        timestamp: event.timeStamp
      };
    }
    // Pitch Bend (0xE)
    else if (messageType === 0xE) {
      const value = (data2 << 7) | data1;
      parsedMessage = {
        type: 'pitchbend',
        channel,
        value: value - 8192,  // Center at 0
        timestamp: event.timeStamp
      };
    }
    // Program Change (0xC)
    else if (messageType === 0xC) {
      parsedMessage = {
        type: 'program',
        channel,
        value: data1,
        timestamp: event.timeStamp
      };
    }

    if (!parsedMessage) return;

    // Handle MIDI learn
    if (this.learnState.active) {
      this.handleLearn(parsedMessage);
      return;
    }

    // Process mapping
    this.processMapping(parsedMessage);
  }

  private handleLearn(message: MIDIMessage): void {
    let midiType: 'note' | 'cc' | 'pitchbend';
    let midiNumber: number;

    if (message.type === 'noteon' || message.type === 'noteoff') {
      midiType = 'note';
      midiNumber = message.note!;
    } else if (message.type === 'cc') {
      midiType = 'cc';
      midiNumber = message.controller!;
    } else if (message.type === 'pitchbend') {
      midiType = 'pitchbend';
      midiNumber = 0;
    } else {
      console.log('Unhandled MIDI type for learn:', message.type);
      return;
    }

    const mapping: MIDIMapping = {
      id: `learned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      midiType,
      midiChannel: message.channel,
      midiNumber,
      action: this.learnState.action,
      label: this.learnState.label,
      minValue: midiType === 'pitchbend' ? -1 : 0,
      maxValue: midiType === 'pitchbend' ? 1 : (midiType === 'cc' ? 1 : 127),
      isToggle: midiType === 'note'
    };

    this.addMapping(mapping);
    console.log(`MIDI Learn: mapped ${midiType} ${midiNumber} (ch ${message.channel}) -> ${this.learnState.action}`);
    this.learnState = { active: false, action: '', label: '' };
  }

  private processMapping(message: MIDIMessage): void {
    for (const mapping of this.mappings) {
      if (mapping.midiChannel !== message.channel) continue;

      let matched = false;
      let rawValue = 0;

      if (mapping.midiType === 'note' && (message.type === 'noteon' || message.type === 'noteoff')) {
        if (mapping.midiNumber === message.note) {
          matched = true;
          rawValue = message.value;
        }
      } else if (mapping.midiType === 'cc' && message.type === 'cc') {
        if (mapping.midiNumber === message.controller) {
          matched = true;
          rawValue = message.value;
        }
      } else if (mapping.midiType === 'pitchbend' && message.type === 'pitchbend') {
        matched = true;
        rawValue = message.value;
      }

      if (!matched) continue;

      let value: number;

      if (mapping.midiType === 'pitchbend') {
        // Pitch bend: -8192 to 8191 -> minValue to maxValue
        value = mapping.minValue + ((rawValue + 8192) / 16383) * (mapping.maxValue - mapping.minValue);
      } else if (mapping.midiType === 'cc') {
        // CC: 0-127 -> minValue to maxValue
        value = mapping.minValue + (rawValue / 127) * (mapping.maxValue - mapping.minValue);
      } else {
        // Note
        if (mapping.isToggle && message.type === 'noteon') {
          // Toggle on noteon
          this.toggleStates[mapping.id] = !this.toggleStates[mapping.id];
          value = this.toggleStates[mapping.id] ? mapping.maxValue : mapping.minValue;
        } else if (mapping.isToggle) {
          // Ignore noteoff for toggle
          continue;
        } else {
          // Momentary: noteon = max, noteoff = min
          value = message.type === 'noteon' ? mapping.maxValue : mapping.minValue;
        }
      }

      if (this.actionHandler) {
        this.actionHandler(mapping.action, value);
      }
    }
  }

  // --- Output (LED Feedback) ---

  private getFirstOutput(): WebMidi.MIDIOutput | null {
    if (this.outputPort) return this.outputPort;
    if (!this.midiAccess) return null;

    const outputs = this.midiAccess.outputs.values();
    const first = outputs.next();
    if (!first.done) {
      this.outputPort = first.value;
      return first.value;
    }
    return null;
  }

  sendNoteOn(channel: number, note: number, velocity: number): void {
    const output = this.getFirstOutput();
    if (!output) {
      console.warn('No MIDI output available.');
      return;
    }
    // Status byte: 0x90 | channel, then note, velocity
    output.send([0x90 | (channel & 0x0F), note & 0x7F, Math.min(127, Math.max(0, velocity)) & 0x7F]);
  }

  sendCC(channel: number, controller: number, value: number): void {
    const output = this.getFirstOutput();
    if (!output) {
      console.warn('No MIDI output available.');
      return;
    }
    // Status byte: 0xB0 | channel, then CC number, value
    output.send([0xB0 | (channel & 0x0F), controller & 0x7F, Math.min(127, Math.max(0, value)) & 0x7F]);
  }

  // --- Persistence ---

  private static STORAGE_KEY = 'dj-jk-midi-mappings';

  saveMappingsToStorage(): void {
    try {
      const data = JSON.stringify(this.mappings);
      localStorage.setItem(MIDIControllerManager.STORAGE_KEY, data);
      console.log(`Saved ${this.mappings.length} mappings to localStorage.`);
    } catch (error) {
      console.error('Failed to save MIDI mappings to localStorage:', error);
    }
  }

  loadMappingsFromStorage(): void {
    try {
      const data = localStorage.getItem(MIDIControllerManager.STORAGE_KEY);
      if (data) {
        this.mappings = JSON.parse(data);
        console.log(`Loaded ${this.mappings.length} mappings from localStorage.`);
      } else {
        console.log('No saved MIDI mappings found in localStorage.');
      }
    } catch (error) {
      console.error('Failed to load MIDI mappings from localStorage:', error);
      this.mappings = [];
    }
  }

  // --- Utility ---

  getLearnState(): { active: boolean; action: string; label: string } {
    return { ...this.learnState };
  }

  isListening(): boolean {
    return this.listening;
  }

  hasAccess(): boolean {
    return this.midiAccess !== null;
  }

  getOutputPorts(): string[] {
    if (!this.midiAccess) return [];
    const ports: string[] = [];
    this.midiAccess.outputs.forEach((output) => {
      if (output.name) {
        ports.push(output.name);
      }
    });
    return ports;
  }

  setOutputPort(name: string): boolean {
    if (!this.midiAccess) return false;
    let found = false;
    this.midiAccess.outputs.forEach((output) => {
      if (output.name === name) {
        this.outputPort = output;
        found = true;
      }
    });
    return found;
  }
}
