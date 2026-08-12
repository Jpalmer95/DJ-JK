// ============================================================================
// DJ-JK — Generative AI provider contract (Phase 2, D2)
//
// A pluggable generation provider interface. Anything that can produce an audio
// asset (local self-hosted models, cloud Suno proxy, future providers) implements
// this. Output always lands on a soundboard slot (universal reuse) via
// `ingestToSoundboard` in index.ts.
// ============================================================================

export type GenerationKind = "sfx" | "song";

export interface GenerateRequest {
  kind: GenerationKind;
  prompt: string;
  /** SFX duration in seconds (clamped by provider). */
  durationSeconds?: number;
  bpm?: number;
  /** Musical key, e.g. "A minor". */
  key?: string;
  style?: string;
  instrumental?: boolean;
  seed?: number;
}

export interface GeneratedAsset {
  id: string;
  kind: GenerationKind;
  prompt: string;
  /** Absolute http(s) URL or `data:` URL. Playable by <audio> / Howler. */
  audioUrl: string;
  duration: number;
  bpm?: number;
  key?: string;
  provider: string;
  createdAt: number;
}

export interface GenerationProvider {
  id: string;
  name: string;
  /** Lower = preferred when auto-selecting the default provider. */
  priority: number;
  supports(kind: GenerationKind): boolean;
  /** True if this provider is configured / reachable right now. */
  isAvailable(): Promise<boolean>;
  generate(req: GenerateRequest): Promise<GeneratedAsset>;
}
