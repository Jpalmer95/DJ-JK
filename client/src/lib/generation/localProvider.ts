// ============================================================================
// DJ-JK — Local generation provider
//
// Talks to the self-hosted Python microservice (ai-service/ in this repo) that
// runs open models (MusicGen / AudioGen) on the local RTX 4070 Ti rig. Works on
// the LAN / localhost. Falls back gracefully when unreachable (offline / no rig).
// ============================================================================

import type { GenerateRequest, GeneratedAsset, GenerationProvider, GenerationKind } from "./types";

export const LOCAL_AI_DEFAULT_BASE = "http://127.0.0.1:8701";

export interface LocalAiConfig {
  baseUrl?: string;
}

interface LocalHealth {
  status: string;
  model: string;
  kinds: GenerationKind[];
}

interface LocalGenerateResponse {
  id: string;
  kind: GenerationKind;
  prompt: string;
  /** base64-encoded WAV bytes. */
  audio_base64: string;
  sample_rate: number;
  duration: number;
  bpm?: number;
  key?: string;
}

function base64ToBlob(b64: string, mime = "audio/wav"): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export class LocalProvider implements GenerationProvider {
  id = "local";
  name = "Local (RTX rig)";
  priority = 0; // preferred when the service is reachable
  private baseUrl: string;

  constructor(config: LocalAiConfig = {}) {
    this.baseUrl = config.baseUrl ?? LOCAL_AI_DEFAULT_BASE;
  }

  supports(kind: GenerationKind): boolean {
    return kind === "sfx" || kind === "song";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${this.baseUrl}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return false;
      const body = (await res.json()) as LocalHealth;
      return body.status === "ok";
    } catch {
      return false;
    }
  }

  async generate(req: GenerateRequest): Promise<GeneratedAsset> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: req.kind,
        prompt: req.prompt,
        duration: req.durationSeconds,
        bpm: req.bpm,
        key: req.key,
        seed: req.seed,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new Error(`Local AI generation failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as LocalGenerateResponse;
    const audioUrl = URL.createObjectURL(base64ToBlob(data.audio_base64));

    return {
      id: data.id,
      kind: data.kind,
      prompt: data.prompt,
      audioUrl,
      duration: data.duration,
      bpm: data.bpm,
      key: data.key,
      provider: this.id,
      createdAt: Date.now(),
    };
  }
}
