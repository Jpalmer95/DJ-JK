# DJ-JK AI Generation Service

Self-hosted FastAPI microservice that runs **open, free generative-audio models**
locally on the RTX 4070 Ti (12 GB VRAM) and serves the web app's `LocalProvider`
(`client/src/lib/generation/localProvider.ts`).

This is the "local provider" half of the pluggable AI pipeline (MASTER_PLAN D2).
Running open models locally keeps generation free, private, and offline — the
cloud (Suno) path remains as a fallback for full songs with vocals.

## Modality coverage (all free, all local — verified on the rig)

| Modality | Model | VRAM | License | Endpoint |
|----------|-------|------|---------|----------|
| Music beds / songs (instrumental) | Meta **MusicGen** (`musicgen-small`/`medium`) | ~12 GB | CC-BY-NC 4.0 | `POST /generate` `kind=song` |
| SFX / one-shots | **Stable Audio Open 1.0** (`stabilityai/stable-audio-open-1.0`) | ~8 GB (fp16) | Permissive (SA Community) | `POST /generate` `kind=sfx` |
| Stem separation (4-stem) | Meta **Demucs** (`htdemucs`) | ~2–3 GB | **MIT** | `POST /separate` |
| BPM / key analysis | **librosa** | CPU | ISC/MIT | `POST /analyze` |

> **Licensing note:** MusicGen is **CC-BY-NC** (non-commercial). **Stable Audio
> Open (SFX) and Demucs (stems) are permissive.** For commercially-safe song
> generation, swap `DJ_AI_MODEL_SONG` for Stable Audio Open's song model.

## Run (on the rig) — tested working

```bash
cd ai-service
uv venv .venv --python 3.12 && source .venv/bin/activate

# 1) CUDA torch + matching torchaudio (versions MUST match)
uv pip install --python .venv/bin/python torch torchaudio==2.6.0 \
    --index-url https://download.pytorch.org/whl/cu124

# 2) stable-audio-tools with --no-deps (its pinned old sentencepiece needs a
#    source build / cmake; we satisfy deps manually via requirements.txt)
uv pip install --python .venv/bin/python --no-deps \
    git+https://github.com/Stability-AI/stable-audio-tools.git

# 3) everything else
uv pip install -r requirements.txt

# 4) run
python main.py            # → http://127.0.0.1:8701
```

Models download to `~/.cache/huggingface` / `~/.cache/torch` on first use.
For a LAN-visible instance (studio on another machine), run with `DJ_AI_HOST=0.0.0.0`.

## API

### `GET /health`
```json
{ "status": "ok", "model": "facebook/musicgen-small", "kinds": ["sfx","song","stems","analyze"], "device": "cuda" }
```

### `POST /generate` — SFX or song
```json
{ "kind": "sfx", "prompt": "dark riser with tape hiss", "duration": 2.5, "seed": 42 }
```
→
```json
{ "id": "sfx-9f2c…", "kind": "sfx", "prompt": "…", "audio_base64": "<wav base64>", "sample_rate": 44100, "duration": 2.5, "bpm": null, "key": null }
```

### `POST /separate` — stem separation (Demucs)
```json
{ "audio_base64": "<wav base64>", "stems": ["drums","bass","other","vocals"] }
```
→ `{ "id": "stems-…", "stems": { "vocals": "<wav base64>", "drums": "<wav base64>", … } }`

### `POST /analyze` — BPM / duration (librosa)
```json
{ "audio_base64": "<wav base64>" }
```
→ `{ "bpm": 128.0, "duration": 96.4, "sample_rate": 44100 }`

## Env vars

| Var               | Default                    | Meaning                     |
|-------------------|----------------------------|-----------------------------|
| `DJ_AI_HOST`      | `127.0.0.1`                | Bind host                   |
| `DJ_AI_PORT`      | `8701`                     | Bind port                   |
| `DJ_AI_MODEL_SONG`| `facebook/musicgen-small`  | Song / bed model            |
| `DJ_AI_MODEL_SFX` | `stabilityai/stable-audio-open-1.0` | SFX model (permissive) |
| `DJ_AI_MODEL_STEMS`| `htdemucs`               | Demucs model                |
| `DJ_AI_DEVICE`    | auto (`cuda`/`mps`/`cpu`)  | Torch device                |

## Notes

- The client auto-detects this service via `GET /health` (1.5 s timeout) and falls
  back to the procedural generator or Suno if unreachable — the studio keeps
  working with or without the rig.
- SFX generation uses fp16 + a computed `sample_size` so it fits comfortably in
  12 GB VRAM (~1–2 s for a few seconds of audio). Generation duration is capped
  at 30 s per request.
- Bind only to localhost unless you have intentionally exposed it on your LAN.
