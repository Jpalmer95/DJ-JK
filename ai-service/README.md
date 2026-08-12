# DJ-JK AI Generation Service

Self-hosted FastAPI microservice that runs **open generative-audio models** on
the local rig (RTX 4070 Ti) and serves the web app's `LocalProvider`
(`client/src/lib/generation/localProvider.ts`).

This is the "local provider" half of the pluggable AI pipeline (MASTER_PLAN D2).
Running open models locally keeps generation free, private, and offline — the
cloud (Suno) path remains as a fallback for full songs with vocals.

## Models

| Kind   | Model                        | What it makes             |
|--------|------------------------------|---------------------------|
| `song` | `facebook/musicgen-small`    | Full songs / ambient beds |
| `sfx`  | `facebook/audiogen-medium`   | Sound effects             |

Swap in larger variants (`musicgen-medium`/`large`, `audiogen-large`) via env if
the rig has the VRAM — just change `DJ_AI_MODEL_SONG` / `DJ_AI_MODEL_SFX`.

## Run (on the rig)

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py            # → http://127.0.0.1:8701
```

Models download to `~/.cache/huggingface` on first use. For a LAN-visible
instance (e.g. the studio on another machine), run with `DJ_AI_HOST=0.0.0.0`.

## API

`GET /health`
```json
{ "status": "ok", "model": "facebook/musicgen-small", "kinds": ["sfx","song"], "device": "cuda" }
```

`POST /generate` — body:
```json
{ "kind": "sfx", "prompt": "dark riser with tape hiss", "duration": 2.5, "seed": 42 }
```
→
```json
{
  "id": "sfx-9f2c…",
  "kind": "sfx",
  "prompt": "dark riser with tape hiss",
  "audio_base64": "<wav bytes, base64>",
  "sample_rate": 32000,
  "duration": 2.5,
  "bpm": null,
  "key": null
}
```

## Env vars

| Var               | Default                    | Meaning                     |
|-------------------|----------------------------|-----------------------------|
| `DJ_AI_HOST`      | `127.0.0.1`                | Bind host                   |
| `DJ_AI_PORT`      | `8701`                     | Bind port                   |
| `DJ_AI_MODEL_SONG`| `facebook/musicgen-small`  | Song / bed model            |
| `DJ_AI_MODEL_SFX` | `facebook/audiogen-medium` | SFX model                   |
| `DJ_AI_DEVICE`    | auto (`cuda`/`mps`/`cpu`)  | Torch device                |

## Notes

- The client auto-detects this service via `GET /health` (1.5s timeout) and falls
  back to the procedural generator or Suno if it is unreachable — so the studio
  keeps working with or without the rig.
- Duration is capped at 30s per request; chain multiple segments for longer beds.
- Bind only to localhost unless you have intentionally exposed it on your LAN.
