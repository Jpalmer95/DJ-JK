# ============================================================================
# DJ-JK AI Generation Service  (ai-service/)
#
# Self-hosted FastAPI microservice that runs open generative-audio models on
# the local rig (RTX 4070 Ti). Serves the client's `LocalProvider`
# (client/src/lib/generation/localProvider.ts).
#
#   Songs: Meta MusicGen        (text-to-music, full songs / beds)
#   SFX  : Meta AudioGen        (text-to-sound-effects)
#
# Endpoints:
#   GET  /health     -> { status, model, kinds, device }
#   POST /generate   -> { id, kind, prompt, audio_base64 (wav), sample_rate,
#                         duration, bpm?, key? }
#
# Run (on the rig):
#   python -m venv .venv && source .venv/bin/activate
#   pip install -r requirements.txt
#   python main.py                 # default http://127.0.0.1:8701
#
# Models download on first use (HF hub). env overrides:
#   DJ_AI_PORT, DJ_AI_HOST, DJ_AI_MODEL_SONG, DJ_AI_MODEL_SFX, DJ_AI_DEVICE
# ============================================================================

from __future__ import annotations

import base64
import io
import os
import time
import uuid

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_SONG = os.environ.get("DJ_AI_MODEL_SONG", "facebook/musicgen-small")
MODEL_SFX = os.environ.get("DJ_AI_MODEL_SFX", "facebook/audiogen-medium")
DEVICE = os.environ.get("DJ_AI_DEVICE", "")  # "", "cpu", "cuda", "mps"
PORT = int(os.environ.get("DJ_AI_PORT", "8701"))
HOST = os.environ.get("DJ_AI_HOST", "127.0.0.1")

app = FastAPI(title="DJ-JK AI Generation", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # LAN-only service; tighten if exposed publicly
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Lazy model loading (first generate call triggers the download / load)
# --------------------------------------------------------------------------
_models: dict = {}

def _pick_device() -> str:
    if DEVICE:
        return DEVICE
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _load_model(kind: str) -> tuple:
    key = kind
    if key not in _models:
        from transformers import (
            AutoProcessor,
            AudioGenForConditionalGeneration,
            MusicgenForConditionalGeneration,
        )

        device = _pick_device()
        if kind == "song":
            processor = AutoProcessor.from_pretrained(MODEL_SONG)
            model = MusicgenForConditionalGeneration.from_pretrained(MODEL_SONG)
        else:
            processor = AutoProcessor.from_pretrained(MODEL_SFX)
            model = AudioGenForConditionalGeneration.from_pretrained(MODEL_SFX)

        model = model.to(device)
        if device == "cuda":
            model = model.half()  # fp16 on GPU for speed/memory
        model.eval()
        _models[key] = (processor, model, device)
        print(f"[dj-ai] loaded {kind} model on {device}")
    return _models[key]


def _wav_to_base64(audio: np.ndarray, sample_rate: int) -> str:
    import soundfile as sf

    # Normalize to int16 PCM
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16)
    if pcm.ndim == 1:
        pcm = np.expand_dims(pcm, axis=1)
    buf = io.BytesIO()
    sf.write(buf, pcm, sample_rate, format="WAV")
    return base64.b64encode(buf.getvalue()).decode("ascii")


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    model: str
    kinds: list[str]
    device: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model=MODEL_SONG,
        kinds=["sfx", "song"],
        device=_pick_device(),
    )


class GenerateRequest(BaseModel):
    kind: str = Field(..., pattern="^(sfx|song)$")
    prompt: str = Field(..., min_length=1)
    duration: float | None = Field(default=None, ge=1.0, le=30.0)
    bpm: int | None = None
    key: str | None = None
    seed: int | None = None


class GenerateResponse(BaseModel):
    id: str
    kind: str
    prompt: str
    audio_base64: str
    sample_rate: int
    duration: float
    bpm: int | None = None
    key: str | None = None


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    try:
        processor, model, device = _load_model(req.kind)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"model load failed: {exc}")

    sample_rate = 32000
    try:
        enc = getattr(model.config, "audio_encoder", None)
        if enc is not None:
            sample_rate = int(getattr(enc, "sampling_rate", sample_rate))
    except Exception:  # noqa: BLE001
        pass

    if req.seed is not None:
        torch.manual_seed(req.seed)

    duration = req.duration or 5.0
    max_new_tokens = int(duration * sample_rate / 320)  # ~320 samples/token

    inputs = processor(text=[req.prompt], padding=True, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    started = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            guidance_scale=3.0,
        )
    audio = outputs[0].cpu().numpy()
    audio = audio.squeeze(0) if audio.ndim > 1 else audio

    if device == "cuda" and audio.dtype == np.float16:
        audio = audio.astype(np.float32)

    return GenerateResponse(
        id=f"{req.kind}-{uuid.uuid4().hex[:12]}",
        kind=req.kind,
        prompt=req.prompt,
        audio_base64=_wav_to_base64(audio, sample_rate),
        sample_rate=sample_rate,
        duration=len(audio) / sample_rate,
        bpm=req.bpm,
        key=req.key,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
