// ============================================================================
// DJ-JK — Generation pipeline entry point (Phase 2, D2)
//
// Registry of GenerationProviders + a facade (`generateSound`) + the universal
// ingest step (`ingestToSoundboard`) that lands any generated asset on a
// soundboard slot so it is immediately reusable as a one-shot, loop, background
// layer, or song snippet. This closes the generative loop described in the plan.
// ============================================================================

import type { GenerateRequest, GeneratedAsset, GenerationKind, GenerationProvider } from "./types";
import { LocalProvider } from "./localProvider";
import { SunoProvider } from "./cloudProvider";
import { soundboardStore, type SoundboardSlot } from "@/lib/db";

// --- Registry ---
const providers: GenerationProvider[] = [new LocalProvider(), new SunoProvider()];

export function getProviders(): GenerationProvider[] {
  return providers;
}

/** Resolve a provider by id, or auto-select the best available for `kind`. */
export async function resolveProvider(
  kind: GenerationKind,
  preferredId?: string,
): Promise<GenerationProvider> {
  if (preferredId) {
    const match = providers.find((p) => p.id === preferredId && p.supports(kind));
    if (match && (await match.isAvailable())) return match;
  }
  const available: GenerationProvider[] = [];
  for (const p of providers) {
    if (p.supports(kind) && (await p.isAvailable())) available.push(p);
  }
  if (available.length === 0) {
    // No reachable provider — still return the highest-priority one so callers
    // can surface a clear "provider unavailable" error with the right name.
    const any = providers.find((p) => p.supports(kind));
    if (any) return any;
    throw new Error("No generation provider supports this request type.");
  }
  available.sort((a, b) => a.priority - b.priority);
  return available[0];
}

/** Generate an SFX or song, returning the asset (not yet persisted). */
export async function generateSound(req: GenerateRequest, preferredProviderId?: string): Promise<GeneratedAsset> {
  const provider = await resolveProvider(req.kind, preferredProviderId);
  return provider.generate(req);
}

// --- Universal ingest: generated asset → soundboard slot (D5) ---
function categoryForAsset(asset: GeneratedAsset): string {
  return asset.kind === "song" ? "Custom" : "FX";
}

function colorForAsset(asset: GeneratedAsset): string {
  return asset.kind === "song" ? "#a78bfa" : "#f0abfc";
}

/** Turn a possibly-remote or object URL into a persistable data URL. */
async function assetToDataUrl(asset: GeneratedAsset): Promise<string> {
  if (asset.audioUrl.startsWith("data:")) return asset.audioUrl;
  try {
    const res = await fetch(asset.audioUrl);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Cross-origin / expired object URL — keep the remote URL (online only).
    return asset.audioUrl;
  }
}

/** Persist a generated asset as a soundboard slot (offline-capable). */
export async function ingestToSoundboard(asset: GeneratedAsset): Promise<SoundboardSlot> {
  const audioData = await assetToDataUrl(asset);
  const slot: SoundboardSlot = {
    id: asset.id,
    name: asset.prompt.slice(0, 24) || `${asset.kind === "song" ? "Song" : "SFX"} ${asset.id.slice(0, 4)}`,
    category: categoryForAsset(asset),
    color: colorForAsset(asset),
    audioData,
    source: "ai",
    createdAt: asset.createdAt,
    bpm: asset.bpm,
    key: asset.key,
    isSongLayer: asset.kind === "song",
  };
  await soundboardStore.add(slot);
  return slot;
}
