/**
 * Keyboard Shortcuts System for DJ Application
 * 
 * Provides a centralized keyboard shortcut management system with support for
 * modifier keys, categories, enable/disable per shortcut, and key rebinding.
 */

export interface ShortcutAction {
  key: string;           // e.g. 'Space', 'q', 'ArrowLeft'
  modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean };
  description: string;   // Human-readable description
  action: string;        // Action identifier for dispatching
  category: string;      // Grouping category
  enabled: boolean;
}

export type ShortcutHandler = () => void;

export class KeyboardShortcutManager {
  private shortcuts: Map<string, ShortcutAction>;
  private handlers: Map<string, ShortcutHandler>;
  private enabled: boolean;
  private keyHandler: ((e: KeyboardEvent) => void) | null;

  constructor() {
    this.shortcuts = new Map();
    this.handlers = new Map();
    this.enabled = true;
    this.keyHandler = null;
  }

  /**
   * Build a unique key string from key + modifiers for internal lookup
   */
  private buildKeyComboKey(key: string, modifiers?: ShortcutAction['modifiers']): string {
    const parts: string[] = [];
    if (modifiers?.ctrl) parts.push('ctrl');
    if (modifiers?.shift) parts.push('shift');
    if (modifiers?.alt) parts.push('alt');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Check if an element is an input/textarea that should capture keyboard input
   */
  private isInputFocused(): boolean {
    const tag = document.activeElement?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'contenteditable';
  }

  /**
   * Handle a keyboard event
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (this.isInputFocused()) return;

    const key = e.key;
    const modifiers: ShortcutAction['modifiers'] = {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    const comboKey = this.buildKeyComboKey(key, modifiers);

    const shortcut = this.shortcuts.get(comboKey);
    if (!shortcut || !shortcut.enabled) return;

    const handler = this.handlers.get(shortcut.action);
    if (!handler) return;

    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  /**
   * Register a shortcut with its handler
   */
  register(action: string, shortcut: Omit<ShortcutAction, 'action'>, handler: ShortcutHandler): void {
    const comboKey = this.buildKeyComboKey(shortcut.key, shortcut.modifiers);

    // Prevent duplicate combo keys (warn and skip)
    for (const [existingCombo, existingShortcut] of this.shortcuts) {
      if (existingCombo === comboKey && existingShortcut.action !== action) {
        console.warn(
          `KeyboardShortcutManager: Key combo "${comboKey}" already registered for action "${existingShortcut.action}". Skipping registration for "${action}".`
        );
        return;
      }
    }

    this.shortcuts.set(comboKey, { ...shortcut, action });
    this.handlers.set(action, handler);
  }

  /**
   * Unregister a shortcut by action
   */
  unregister(action: string): void {
    // Find and remove the shortcut by action name
    for (const [comboKey, shortcut] of this.shortcuts) {
      if (shortcut.action === action) {
        this.shortcuts.delete(comboKey);
        break;
      }
    }
    this.handlers.delete(action);
  }

  /**
   * Enable or disable all shortcuts globally
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Enable or disable a specific shortcut by action
   */
  setShortcutEnabled(action: string, enabled: boolean): void {
    for (const [, shortcut] of this.shortcuts) {
      if (shortcut.action === action) {
        shortcut.enabled = enabled;
        return;
      }
    }
  }

  /**
   * Start listening for keydown events on the document
   */
  startListening(): void {
    this.keyHandler = this.handleKeyDown;
    document.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Stop listening for keydown events
   */
  stopListening(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  /**
   * Get all registered shortcuts grouped by category
   */
  getShortcutsByCategory(): Record<string, ShortcutAction[]> {
    const result: Record<string, ShortcutAction[]> = {};
    for (const [, shortcut] of this.shortcuts) {
      if (!result[shortcut.category]) {
        result[shortcut.category] = [];
      }
      result[shortcut.category].push({ ...shortcut });
    }
    return result;
  }

  /**
   * Get the display string for a key combo (e.g., "Ctrl+Space")
   */
  getKeyCombo(shortcut: ShortcutAction): string {
    const parts: string[] = [];
    if (shortcut.modifiers?.ctrl) parts.push('Ctrl');
    if (shortcut.modifiers?.shift) parts.push('Shift');
    if (shortcut.modifiers?.alt) parts.push('Alt');

    // Format the key name nicely
    const keyName = shortcut.key === ' ' ? 'Space' : shortcut.key;
    parts.push(keyName.length === 1 ? keyName.toUpperCase() : keyName);

    return parts.join('+');
  }

  /**
   * Update a shortcut's key binding
   */
  updateBinding(action: string, newKey: string, newModifiers?: ShortcutAction['modifiers']): void {
    // Find existing shortcut
    let existingShortcut: ShortcutAction | undefined;
    let oldComboKey: string | undefined;

    for (const [comboKey, shortcut] of this.shortcuts) {
      if (shortcut.action === action) {
        existingShortcut = shortcut;
        oldComboKey = comboKey;
        break;
      }
    }

    if (!existingShortcut || !oldComboKey) {
      console.warn(`KeyboardShortcutManager: No shortcut found for action "${action}".`);
      return;
    }

    // Build new combo key
    const newComboKey = this.buildKeyComboKey(newKey, newModifiers);

    // Check for conflicts
    const conflictShortcut = this.shortcuts.get(newComboKey);
    if (conflictShortcut && conflictShortcut.action !== action) {
      console.warn(
        `KeyboardShortcutManager: Key combo "${newComboKey}" already used by action "${conflictShortcut.action}". Binding not updated.`
      );
      return;
    }

    // Remove old binding and add new one
    this.shortcuts.delete(oldComboKey);
    const updated: ShortcutAction = {
      ...existingShortcut,
      key: newKey,
      modifiers: newModifiers,
    };
    this.shortcuts.set(newComboKey, updated);
  }

  /**
   * Get all shortcuts as an array
   */
  getAllShortcuts(): ShortcutAction[] {
    return Array.from(this.shortcuts.values()).map(s => ({ ...s }));
  }
}

/**
 * Create and populate a KeyboardShortcutManager with default DJ shortcuts
 */
export function createDefaultShortcuts(
  handlers: Record<string, ShortcutHandler>
): KeyboardShortcutManager {
  const manager = new KeyboardShortcutManager();

  const defaults: Array<{ action: string; shortcut: Omit<ShortcutAction, 'action'> }> = [
    // Transport
    { action: 'transport.playPause', shortcut: { key: 'Space', description: 'Play/Pause active deck', category: 'Transport', enabled: true } },
    { action: 'transport.stop', shortcut: { key: 's', description: 'Stop active deck', category: 'Transport', enabled: true } },
    { action: 'transport.cue', shortcut: { key: 'n', description: 'Cue active deck', category: 'Transport', enabled: true } },

    // Deck A
    { action: 'deckA.playPause', shortcut: { key: 'q', description: 'Deck A: Play/Pause', category: 'Deck A', enabled: true } },
    { action: 'deckA.cue', shortcut: { key: 'w', description: 'Deck A: Cue', category: 'Deck A', enabled: true } },
    { action: 'deckA.loopToggle', shortcut: { key: 'e', description: 'Deck A: Loop Toggle', category: 'Deck A', enabled: true } },
    { action: 'deckA.hotCue1', shortcut: { key: 'r', description: 'Deck A: Hot Cue 1', category: 'Deck A', enabled: true } },
    { action: 'deckA.hotCue2', shortcut: { key: 't', description: 'Deck A: Hot Cue 2', category: 'Deck A', enabled: true } },
    { action: 'deckA.hotCue3', shortcut: { key: 'y', description: 'Deck A: Hot Cue 3', category: 'Deck A', enabled: true } },
    { action: 'deckA.hotCue4', shortcut: { key: 'u', description: 'Deck A: Hot Cue 4', category: 'Deck A', enabled: true } },

    // Deck B
    { action: 'deckB.playPause', shortcut: { key: 'i', description: 'Deck B: Play/Pause', category: 'Deck B', enabled: true } },
    { action: 'deckB.cue', shortcut: { key: 'o', description: 'Deck B: Cue', category: 'Deck B', enabled: true } },
    { action: 'deckB.loopToggle', shortcut: { key: 'p', description: 'Deck B: Loop Toggle', category: 'Deck B', enabled: true } },
    { action: 'deckB.hotCue1', shortcut: { key: 'h', description: 'Deck B: Hot Cue 1', category: 'Deck B', enabled: true } },
    { action: 'deckB.hotCue2', shortcut: { key: 'j', description: 'Deck B: Hot Cue 2', category: 'Deck B', enabled: true } },
    { action: 'deckB.hotCue3', shortcut: { key: 'k', description: 'Deck B: Hot Cue 3', category: 'Deck B', enabled: true } },
    { action: 'deckB.hotCue4', shortcut: { key: 'l', description: 'Deck B: Hot Cue 4', category: 'Deck B', enabled: true } },

    // Mixer
    { action: 'mixer.crossfaderLeft', shortcut: { key: 'ArrowLeft', description: 'Mixer: Crossfader Left', category: 'Mixer', enabled: true } },
    { action: 'mixer.crossfaderRight', shortcut: { key: 'ArrowRight', description: 'Mixer: Crossfader Right', category: 'Mixer', enabled: true } },
    { action: 'mixer.masterVolumeUp', shortcut: { key: 'ArrowUp', description: 'Mixer: Master Volume Up', category: 'Mixer', enabled: true } },
    { action: 'mixer.masterVolumeDown', shortcut: { key: 'ArrowDown', description: 'Mixer: Master Volume Down', category: 'Mixer', enabled: true } },

    // Pads
    { action: 'pads.pad1', shortcut: { key: 'a', description: 'Pad 1', category: 'Pads', enabled: true } },
    { action: 'pads.pad2', shortcut: { key: 's', description: 'Pad 2', category: 'Pads', enabled: true } },
    { action: 'pads.pad3', shortcut: { key: 'd', description: 'Pad 3', category: 'Pads', enabled: true } },
    { action: 'pads.pad4', shortcut: { key: 'f', description: 'Pad 4', category: 'Pads', enabled: true } },
    { action: 'pads.pad5', shortcut: { key: 'z', description: 'Pad 5', category: 'Pads', enabled: true } },
    { action: 'pads.pad6', shortcut: { key: 'x', description: 'Pad 6', category: 'Pads', enabled: true } },
    { action: 'pads.pad7', shortcut: { key: 'c', description: 'Pad 7', category: 'Pads', enabled: true } },
    { action: 'pads.pad8', shortcut: { key: 'v', description: 'Pad 8', category: 'Pads', enabled: true } },

    // General
    { action: 'general.toggleView', shortcut: { key: 'Tab', description: 'Toggle View', category: 'General', enabled: true } },
    { action: 'general.record', shortcut: { key: 'r', modifiers: { ctrl: true }, description: 'Record', category: 'General', enabled: true } },
    { action: 'general.saveSession', shortcut: { key: 's', modifiers: { ctrl: true }, description: 'Save Session', category: 'General', enabled: true } },
    { action: 'general.showHelp', shortcut: { key: '?', description: 'Show Help', category: 'General', enabled: true } },
  ];

  for (const { action, shortcut } of defaults) {
    const handler = handlers[action] || (() => {
      console.log(`No handler registered for action: ${action}`);
    });
    manager.register(action, shortcut, handler);
  }

  return manager;
}
