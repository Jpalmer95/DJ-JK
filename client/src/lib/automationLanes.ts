export interface AutomationPoint {
  time: number;      // Time in beats (not seconds, for tempo independence)
  value: number;     // Parameter value at this point
}

export interface AutomationLane {
  id: string;
  targetId: string;     // e.g., 'deckA.eq.lowGain', 'deckA.reverb.wetMix'
  targetLabel: string;  // Human-readable: "Deck A EQ Low"
  points: AutomationPoint[];
  enabled: boolean;
  color: string;
}

export interface AutomationClip {
  id: string;
  name: string;
  lanes: AutomationLane[];
  lengthBeats: number;  // Total length in beats
  loopStart: number;    // Loop start in beats
  loopEnd: number;      // Loop end in beats
  isLooping: boolean;
}

export type InterpolationMode = 'linear' | 'step' | 'smooth';

interface RecordingState {
  isRecording: boolean;
  bpm: number;
  startBeat: number;
  lastRecordedBeat: number;
  intervalBeats: number; // 1/16 beat = 0.0625
  pendingValues: Map<string, { value: number; beat: number }[]>;
}

interface PlaybackState {
  isPlaying: boolean;
  currentBeat: number;
  bpm: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class AutomationEngine {
  private lanes: Map<string, AutomationLane> = new Map();
  private clips: Map<string, AutomationClip> = new Map();
  private clipLaneMap: Map<string, string> = new Map(); // laneId -> clipId
  private recording: RecordingState;
  private playback: PlaybackState;
  private interpolationMode: InterpolationMode = 'linear';

  constructor() {
    this.recording = {
      isRecording: false,
      bpm: 120,
      startBeat: 0,
      lastRecordedBeat: -Infinity,
      intervalBeats: 0.0625, // 1/16 beat
      pendingValues: new Map(),
    };
    this.playback = {
      isPlaying: false,
      currentBeat: 0,
      bpm: 120,
    };
  }

  // =========================================================
  // Lane Management
  // =========================================================

  createLane(targetId: string, targetLabel: string, color: string): string {
    const id = generateId();
    const lane: AutomationLane = {
      id,
      targetId,
      targetLabel,
      points: [],
      enabled: true,
      color,
    };
    this.lanes.set(id, lane);
    return id;
  }

  deleteLane(laneId: string): void {
    this.lanes.delete(laneId);
    this.recording.pendingValues.delete(laneId);
    this.clipLaneMap.delete(laneId);
  }

  addPoint(laneId: string, time: number, value: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane) return;
    lane.points.push({ time, value });
    this.sortPoints(lane);
  }

  removePoint(laneId: string, pointIndex: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane || pointIndex < 0 || pointIndex >= lane.points.length) return;
    lane.points.splice(pointIndex, 1);
  }

  movePoint(laneId: string, pointIndex: number, newTime: number, newValue: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane || pointIndex < 0 || pointIndex >= lane.points.length) return;
    lane.points[pointIndex].time = newTime;
    lane.points[pointIndex].value = newValue;
    this.sortPoints(lane);
  }

  clearLane(laneId: string): void {
    const lane = this.lanes.get(laneId);
    if (!lane) return;
    lane.points = [];
  }

  enableLane(laneId: string, enabled: boolean): void {
    const lane = this.lanes.get(laneId);
    if (!lane) return;
    lane.enabled = enabled;
  }

  getLane(laneId: string): AutomationLane | undefined {
    return this.lanes.get(laneId);
  }

  getAllLanes(): AutomationLane[] {
    return Array.from(this.lanes.values());
  }

  getLanesByTarget(targetIdPrefix: string): AutomationLane[] {
    return Array.from(this.lanes.values()).filter(l =>
      l.targetId.startsWith(targetIdPrefix)
    );
  }

  // =========================================================
  // Interpolation
  // =========================================================

  setInterpolationMode(mode: InterpolationMode): void {
    this.interpolationMode = mode;
  }

  getInterpolationMode(): InterpolationMode {
    return this.interpolationMode;
  }

  getValueAtBeat(laneId: string, beat: number, mode?: InterpolationMode): number {
    const lane = this.lanes.get(laneId);
    if (!lane || lane.points.length === 0) return 0;
    if (!lane.enabled) {
      // Return value at first point if lane is disabled
      return lane.points[0].value;
    }

    const pts = lane.points;
    const interpMode = mode ?? this.interpolationMode;

    // Before first point
    if (beat <= pts[0].time) return pts[0].value;
    // After last point
    if (beat >= pts[pts.length - 1].time) return pts[pts.length - 1].value;

    // Find surrounding points
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (beat >= a.time && beat <= b.time) {
        const t = (beat - a.time) / (b.time - a.time);
        return this.interpolate(a.value, b.value, t, interpMode);
      }
    }

    return pts[pts.length - 1].value;
  }

  private interpolate(from: number, to: number, t: number, mode: InterpolationMode): number {
    switch (mode) {
      case 'step':
        return t < 1 ? from : to;
      case 'smooth': {
        // Cubic Hermite / smoothstep
        const st = t * t * (3 - 2 * t);
        return from + (to - from) * st;
      }
      case 'linear':
      default:
        return from + (to - from) * t;
    }
  }

  // =========================================================
  // Recording
  // =========================================================

  startRecording(bpm: number, currentBeat: number): void {
    this.recording.isRecording = true;
    this.recording.bpm = bpm;
    this.recording.startBeat = currentBeat;
    this.recording.lastRecordedBeat = -Infinity;
    this.recording.pendingValues.clear();
  }

  recordValue(targetId: string, value: number): void {
    if (!this.recording.isRecording) return;

    const beat = this.playback.currentBeat;
    const snapBeat = this.snapToInterval(beat, this.recording.intervalBeats);
    const relativeBeat = snapBeat - this.recording.startBeat;

    // Skip if we already recorded at this exact beat (avoid duplicates)
    if (Math.abs(relativeBeat - this.recording.lastRecordedBeat) < this.recording.intervalBeats * 0.5) {
      return;
    }

    this.recording.lastRecordedBeat = relativeBeat;

    // Find the lane for this targetId
    let targetLane = Array.from(this.lanes.values()).find(l => l.targetId === targetId);
    let laneId: string;

    if (targetLane) {
      laneId = targetLane.id;
    } else {
      // Auto-create lane if recording to a target without one
      laneId = this.createLane(targetId, targetId, '#00ffcc');
      targetLane = this.lanes.get(laneId)!;
    }

    // Add to pending values
    if (!this.recording.pendingValues.has(laneId)) {
      this.recording.pendingValues.set(laneId, []);
    }
    this.recording.pendingValues.get(laneId)!.push({ value, beat: relativeBeat });
  }

  stopRecording(): void {
    if (!this.recording.isRecording) return;

    // Commit pending values to actual lane points
    for (const [laneId, values] of this.recording.pendingValues) {
      const lane = this.lanes.get(laneId);
      if (!lane) continue;

      for (const v of values) {
        // Check if there's already a point at very close beat position
        const existingIdx = lane.points.findIndex(p =>
          Math.abs(p.time - v.beat) < this.recording.intervalBeats * 0.5
        );
        if (existingIdx >= 0) {
          lane.points[existingIdx].value = v.value;
        } else {
          lane.points.push({ time: v.beat, value: v.value });
        }
      }
      this.sortPoints(lane);
    }

    this.recording.isRecording = false;
    this.recording.pendingValues.clear();
  }

  isRecording(): boolean {
    return this.recording.isRecording;
  }

  private snapToInterval(beat: number, interval: number): number {
    return Math.round(beat / interval) * interval;
  }

  // =========================================================
  // Playback
  // =========================================================

  startPlayback(bpm: number): void {
    this.playback.isPlaying = true;
    this.playback.bpm = bpm;
    this.playback.currentBeat = 0;
  }

  stopPlayback(): void {
    this.playback.isPlaying = false;
  }

  setCurrentBeat(beat: number): void {
    this.playback.currentBeat = beat;
  }

  getPlaybackState(): { isPlaying: boolean; currentBeat: number } {
    return {
      isPlaying: this.playback.isPlaying,
      currentBeat: this.playback.currentBeat,
    };
  }

  // =========================================================
  // Editing Helpers
  // =========================================================

  quantizePoints(laneId: string, subdivision: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane) return;
    for (const pt of lane.points) {
      pt.time = Math.round(pt.time / subdivision) * subdivision;
    }
    this.sortPoints(lane);
  }

  smoothLane(laneId: string, factor: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane || lane.points.length < 3) return;

    const clampedFactor = clamp(factor, 0, 1);
    const original = lane.points.map(p => ({ ...p }));

    for (let i = 1; i < lane.points.length - 1; i++) {
      const prev = original[i - 1].value;
      const next = original[i + 1].value;
      const current = original[i].value;
      const avg = (prev + current + next) / 3;
      lane.points[i].value = current + (avg - current) * clampedFactor;
    }
  }

  scaleLane(laneId: string, factor: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane) return;
    for (const pt of lane.points) {
      pt.value *= factor;
    }
  }

  offsetLane(laneId: string, offset: number): void {
    const lane = this.lanes.get(laneId);
    if (!lane) return;
    for (const pt of lane.points) {
      pt.value += offset;
    }
  }

  duplicateLane(laneId: string): string {
    const lane = this.lanes.get(laneId);
    if (!lane) return '';

    const newId = this.createLane(
      lane.targetId,
      lane.targetLabel + ' (copy)',
      lane.color
    );
    const newLane = this.lanes.get(newId)!;
    newLane.points = lane.points.map(p => ({ ...p }));
    newLane.enabled = lane.enabled;
    return newId;
  }

  // =========================================================
  // Clip Management
  // =========================================================

  createClip(name: string, lengthBeats: number): string {
    const id = generateId();
    const clip: AutomationClip = {
      id,
      name,
      lanes: [],
      lengthBeats,
      loopStart: 0,
      loopEnd: lengthBeats,
      isLooping: false,
    };
    this.clips.set(id, clip);
    return id;
  }

  deleteClip(clipId: string): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;
    // Remove lane associations
    for (const lane of clip.lanes) {
      this.clipLaneMap.delete(lane.id);
      this.lanes.delete(lane.id);
    }
    this.clips.delete(clipId);
  }

  setLoop(clipId: string, loopStart: number, loopEnd: number): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;
    clip.loopStart = clamp(loopStart, 0, clip.lengthBeats);
    clip.loopEnd = clamp(loopEnd, loopStart, clip.lengthBeats);
    clip.isLooping = true;
  }

  addLaneToClip(clipId: string, laneId: string): void {
    const clip = this.clips.get(clipId);
    const lane = this.lanes.get(laneId);
    if (!clip || !lane) return;
    if (!clip.lanes.find(l => l.id === laneId)) {
      clip.lanes.push(lane);
    }
    this.clipLaneMap.set(laneId, clipId);
  }

  removeLaneFromClip(clipId: string, laneId: string): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;
    clip.lanes = clip.lanes.filter(l => l.id !== laneId);
    this.clipLaneMap.delete(laneId);
  }

  getClip(clipId: string): AutomationClip | undefined {
    return this.clips.get(clipId);
  }

  getAllClips(): AutomationClip[] {
    return Array.from(this.clips.values());
  }

  // =========================================================
  // Integration
  // =========================================================

  getActiveLanes(): AutomationLane[] {
    return Array.from(this.lanes.values()).filter(l => l.enabled);
  }

  getAllAutomationLanes(): AutomationLane[] {
    return Array.from(this.lanes.values());
  }

  // =========================================================
  // Utility
  // =========================================================

  private sortPoints(lane: AutomationLane): void {
    lane.points.sort((a, b) => a.time - b.time);
  }

  // Get all values for all active lanes at the current beat
  getCurrentValues(): Map<string, number> {
    const result = new Map<string, number>();
    for (const lane of this.lanes.values()) {
      if (!lane.enabled) continue;
      result.set(lane.targetId, this.getValueAtBeat(lane.id, this.playback.currentBeat));
    }
    return result;
  }

  // Export lane data as JSON
  exportLanes(): AutomationLane[] {
    return Array.from(this.lanes.values()).map(l => ({
      ...l,
      points: l.points.map(p => ({ ...p })),
    }));
  }

  // Import lane data from JSON
  importLanes(data: AutomationLane[]): void {
    for (const laneData of data) {
      this.lanes.set(laneData.id, {
        ...laneData,
        points: laneData.points.map(p => ({ ...p })),
      });
    }
  }

  // Clear everything
  clear(): void {
    this.lanes.clear();
    this.clips.clear();
    this.clipLaneMap.clear();
    this.recording.isRecording = false;
    this.recording.pendingValues.clear();
    this.playback.isPlaying = false;
    this.playback.currentBeat = 0;
  }
}

export default AutomationEngine;
