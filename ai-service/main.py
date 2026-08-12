# ============================================================================
# DJ-JK AI Generation Service  (ai-service/)
#
# Self-hosted FastAPI microservice that runs open generative-audio models on
# the local rig (RTX 4070 Ti, 12 GB). Serves the client's `LocalProvider`
# (client/src/lib/generation/localProvider.ts).
#
# Modality coverage (all free, all local):
#   Songs / music beds : Meta MusicGen        (text-to-music, transformers)
#   SFX / one-shots    : Meta AudioGen        (text-to-sound-effects, transformers)
#                         -> swap to Stable Audio Open 1.5 for a permissive license
#   Stem separation    : Meta Demucs          (htdemucs — 4 stems, MIT)
#   BPM / key analysis : librosa              (CPU)
#
# Endpoints:
#   GET  /health      -> { status, model, kinds, device }
#   POST /generate    -> { id, kind, prompt, audio_base64 (wav), sample_rate, duration, bpm?, key? }
#   POST /separate    -> { id, stems: { vocals|drums|bass|other: base64-wav } }
#   POST /analyze     -> { bpm, duration, sample_rate }
#
# Run (on the rig):
#   cd ai-service && source .venv/bin/activate
#   uv pip install -r requirements.txt   # includes torch+CUDA
#   python main.py                       # default http://127.0.0.1:8701
#
# env overrides: DJ_AI_HOST, DJ_AI_PORT, DJ_AI_MODEL_SONG, DJ_AI_MODEL_SFX, DJ_AI_DEVICE
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
MODEL_SFX = os.environ.get("DJ_AI_MODEL_SFX", "stabilityai/stable-audio-open-1.0")
MODEL_STEMS = os.environ.get("DJ_AI_MODEL_STEMS", "htdemucs")
DEVICE = os.environ.get("DJ_AI_DEVICE", "")  # "", "cpu", "cuda", "mps"
PORT = int(os.environ.get("DJ_AI_PORT", "8701"))
HOST = os.environ.get("DJ_AI_HOST", "127.0.0.1")

app = FastAPI(title="DJ-JK AI Generation", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # LAN-only service; tighten if exposed publicly
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _pick_device() -> str:
    if DEVICE:
        return DEVICE
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _b64_to_wav_bytes(b64: str) -> bytes:
    try:
        return base64.b64decode(b64)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"invalid base64 audio: {exc}")


def _wav_to_base64(audio: np.ndarray, sample_rate: int) -> str:
    import soundfile as sf

    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16)
    if pcm.ndim == 1:
        pcm = np.expand_dims(pcm, axis=1)
    buf = io.BytesIO()
    sf.write(buf, pcm, sample_rate, format="WAV")
    return base64.b64encode(buf.getvalue()).decode("ascii")


# --------------------------------------------------------------------------
# Generation backends
# --------------------------------------------------------------------------
_gen_models: dict = {}


def _generate_song(req: "GenerateRequest"):
    device = _pick_device()
    key = "song"
    if key not in _gen_models:
        from transformers import AutoProcessor, MusicgenForConditionalGeneration

        processor = AutoProcessor.from_pretrained(MODEL_SONG)
        model = MusicgenForConditionalGeneration.from_pretrained(MODEL_SONG).to(device)
        if device == "cuda":
            model = model.half()
        model.eval()
        _gen_models[key] = (processor, model, device)
        print(f"[dj-ai] loaded song model on {device}")
    processor, model, device = _gen_models[key]

    sample_rate = _model_sample_rate(model)
    if req.seed is not None:
        torch.manual_seed(req.seed)
    duration = req.duration or 8.0
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
    if audio.dtype == np.float16:
        audio = audio.astype(np.float32)
    print(f"[dj-ai] song generated in {time.time()-started:.1f}s")
    return audio, sample_rate


def _generate_sfx(req: "GenerateRequest"):
    device = _pick_device()
    key = "sfx_sao"
    if key not in _gen_models:
        from stable_audio_tools import get_pretrained_model

        model, cfg = get_pretrained_model(MODEL_SFX)
        model = model.half().to(device)  # fp16 fits 12 GB
        model.eval()
        _gen_models[key] = (model, cfg, device)
        print(f"[dj-ai] loaded sfx model ({MODEL_SFX}) on {device}")
    model, cfg, device = _gen_models[key]
    from stable_audio_tools.inference.generation import generate_diffusion_cond

    sample_rate = int(cfg["sample_rate"])
    if req.seed is not None:
        torch.manual_seed(req.seed)
    duration = min(req.duration or 5.0, 30.0)
    sample_size = int(duration * sample_rate)
    conditioning = [{"prompt": req.prompt, "seconds_start": 0, "seconds_total": duration}]

    started = time.time()
    with torch.no_grad():
        latent = generate_diffusion_cond(
            model,
            conditioning=conditioning,
            sample_size=sample_size,
            sample_rate=sample_rate,
            device=device,
            steps=50,
            cfg_scale=7.0,
            seed=(req.seed if req.seed is not None else -1),
            sigma_min=0.3,
            sigma_max=500,
            sampler_type="dpmpp-3m-sde",
        )
    audio = latent.to(torch.float32).cpu().numpy()
    # output is (batch, channels, samples) -> (samples, channels) for WAV
    audio = audio[0].T if audio.ndim >= 3 else audio
    print(f"[dj-ai] sfx generated in {time.time()-started:.1f}s")
    return audio, sample_rate


def _model_sample_rate(model) -> int:
    sr = 32000
    try:
        enc = getattr(model.config, "audio_encoder", None)
        if enc is not None:
            sr = int(getattr(enc, "sampling_rate", sr))
    except Exception:  # noqa: BLE001
        pass
    return sr


# --------------------------------------------------------------------------
# Lazy stem model loading (Demucs)
# --------------------------------------------------------------------------
_stem_model = None
_stem_sr = 44100

def _load_stem_model():
    global _stem_model
    if _stem_model is None:
        import demucs.pretrained  # noqa: F401  (triggers weight download)
        from demucs.pretrained import get_model

        device = _pick_device()
        _stem_model = get_model(MODEL_STEMS)
        _stem_model.to(device)
        _stem_model.eval()
        print(f"[dj-ai] loaded stem model {MODEL_STEMS} on {device}")
    return _stem_model


# --------------------------------------------------------------------------
# API: health
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
        kinds=["sfx", "song", "stems", "analyze"],
        device=_pick_device(),
    )


# --------------------------------------------------------------------------
# API: generate (sfx / song)
# --------------------------------------------------------------------------
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
        if req.kind == "song":
            audio, sample_rate = _generate_song(req)
        else:
            audio, sample_rate = _generate_sfx(req)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"generation failed: {exc}")

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


# --------------------------------------------------------------------------
# API: separate (Demucs stem separation)
# --------------------------------------------------------------------------
class SeparateRequest(BaseModel):
    audio_base64: str = Field(..., min_length=1)
    stems: list[str] | None = None  # subset of {drums,bass,other,vocals}; default all


class SeparateResponse(BaseModel):
    id: str
    stems: dict[str, str]  # stem -> base64 wav


@app.post("/separate", response_model=SeparateResponse)
async def separate(req: SeparateRequest) -> SeparateResponse:
    try:
        import soundfile as sf
        import torchaudio
        from demucs.apply import apply_model

        model = _load_stem_model()
        device = _pick_device()
        wav_bytes = _b64_to_wav_bytes(req.audio_base64)

        # Read via soundfile (supports BytesIO); convert to (channels, samples).
        data, sr = sf.read(io.BytesIO(wav_bytes), dtype="float32")  # (samples, channels)
        waveform = torch.from_numpy(data.T if data.ndim > 1 else data[None, :])
        # Demucs works at its own sample rate and needs stereo; upmix mono.
        if waveform.shape[0] == 1:
            waveform = waveform.repeat(2, 1)
        if sr != model.samplerate:
            waveform = torchaudio.functional.resample(waveform, sr, model.samplerate)
        waveform = waveform.unsqueeze(0).to(device)  # (batch, channels, samples)

        with torch.no_grad():
            sources = apply_model(model, waveform, device=device, shifts=1)
        # sources shape: (batch, n_sources, channels, samples)

        wanted = req.stems or list(model.sources)
        out: dict[str, str] = {}
        for idx, src_name in enumerate(model.sources):
            if src_name not in wanted:
                continue
            stem = sources[0, idx].float().cpu()  # (channels, samples)
            stem = stem.T  # soundfile WAV wants (frames, channels)
            out[src_name] = _wav_to_base64(stem.numpy(), model.samplerate)
        return SeparateResponse(id=f"stems-{uuid.uuid4().hex[:12]}", stems=out)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"separation failed: {exc}")


# --------------------------------------------------------------------------
# API: analyze (librosa — BPM, duration)
# --------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    audio_base64: str = Field(..., min_length=1)


class AnalyzeResponse(BaseModel):
    bpm: float | None = None
    duration: float
    sample_rate: int


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    try:
        import librosa

        wav_bytes = _b64_to_wav_bytes(req.audio_base64)
        y, sr = librosa.load(io.BytesIO(wav_bytes), sr=None, mono=True)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(np.atleast_1d(tempo)[0])
        return AnalyzeResponse(
            bpm=None if not np.isfinite(bpm) or bpm <= 0 else round(bpm, 2),
            duration=float(len(y) / sr),
            sample_rate=int(sr),
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"analysis failed: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
