// ============================================================================
// DJ-JK — Cloud generation provider (Suno)
//
// Reuses the existing secure backend proxy (client/src/lib/sunoApi.ts →
// server /api/suno/*). Pay-per-use, account-based; the fallback when the local
// RTX rig is unavailable or the user wants full songs with vocals.
// ============================================================================

import { generateMusicComplete, isSunoAvailable } from "@/lib/sunoApi";
import type { GenerateRequest, GeneratedAsset, GenerationProvider, GenerationKind } from "./types";

function kindToMode(kind: GenerationKind): "sfx" | "song" {
  return kind;
}

export class SunoProvider implements GenerationProvider {
  id = "suno";
  name = "Suno (cloud)";
  priority = 10; // fallback — preferred only when local is unreachable

  supports(kind: GenerationKind): boolean {
    return kind === "song" || kind === "sfx";
  }

  async isAvailable(): Promise<boolean> {
    return isSunoAvailable();
  }

  async generate(req: GenerateRequest): Promise<GeneratedAsset> {
    const tracks = await generateMusicComplete({
      prompt: req.prompt,
      style: req.style,
      duration: req.durationSeconds,
      instrumental: req.instrumental ?? req.kind === "sfx",
      userId: 1, // backend proxy uses this; tunes can be relaxed later
    });

    const track = tracks[0];
    if (!track) {
      throw new Error("Suno returned no tracks.");
    }

    return {
      id: `suno-${Date.now()}`,
      kind: kindToMode(req.kind),
      prompt: track.prompt,
      audioUrl: track.audioUrl,
      duration: track.duration,
      bpm: track.bpm,
      key: track.key,
      provider: this.id,
      createdAt: Date.now(),
    };
  }
}
