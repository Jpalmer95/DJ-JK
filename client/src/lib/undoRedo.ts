export interface UndoAction {
  id: string;
  description: string;
  timestamp: number;
  undo: () => void;
  redo: () => void;
}

export class UndoRedoManager {
  private history: UndoAction[] = [];
  private pointer: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  push(action: UndoAction): void {
    // Clear any redo history after current pointer
    if (this.pointer < this.history.length - 1) {
      this.history = this.history.slice(0, this.pointer + 1);
    }

    // Add the new action
    this.history.push(action);
    this.pointer++;

    // Trim history if it exceeds maxSize
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.pointer--;
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const action = this.history[this.pointer];
    action.undo();
    this.pointer--;
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.pointer++;
    const action = this.history[this.pointer];
    action.redo();
    return true;
  }

  canUndo(): boolean {
    return this.pointer >= 0;
  }

  canRedo(): boolean {
    return this.pointer < this.history.length - 1;
  }

  getUndoDescription(): string | null {
    if (!this.canUndo()) return null;
    return this.history[this.pointer].description;
  }

  getRedoDescription(): string | null {
    if (!this.canRedo()) return null;
    return this.history[this.pointer + 1].description;
  }

  clear(): void {
    this.history = [];
    this.pointer = -1;
  }

  getHistoryLength(): number {
    return this.history.length;
  }

  getHistory(): UndoAction[] {
    return [...this.history];
  }
}

// Singleton instance for convenience
export const undoRedoManager = new UndoRedoManager();
