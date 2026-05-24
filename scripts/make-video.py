#!/usr/bin/env python3
"""
ELOT AI — TTS + ffmpeg video pipeline.

Reads artifacts/screenshots/SCRIPT.md and the matching PNGs, calls Google
Cloud Text-to-Speech for the VO of each scene, then uses ffmpeg to render
a Ken-Burns-style clip per screen and concatenates them into a single MP4.

Outputs:
  artifacts/video/audio/NN.mp3      per-scene audio
  artifacts/video/clips/NN.mp4      per-scene clip (image + audio)
  artifacts/video/elot-final.mp4    final stitched video

Stdlib only — no pip installs required.

Env vars:
  TTS_ENGINE         "gcp" (default, needs Cloud TTS API + billing) or
                     "say" (macOS built-in, free, lower quality)
  GCP_ACCESS_TOKEN   bearer token (set by make-video.sh wrapper, or
                     `gcloud auth print-access-token`)  [gcp engine only]
  GCP_PROJECT        billing project for the TTS call                [gcp]
  TTS_VOICE          gcp:   en-US-Neural2-D / en-US-Studio-M / etc.
                     say:   Samantha / Daniel / Karen / Tom
                     default: env-dependent
  TTS_SPEAKING_RATE  gcp:   float, default 0.95
                     say:   words/min, default 175
  TTS_PITCH          semitones, default -1.0  [gcp only]
  KEN_BURNS          "1" to apply slow zoom, "0" for static (default 1)
"""

from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS = ROOT / "artifacts" / "screenshots"
SCRIPT_MD = SCREENSHOTS / "SCRIPT.md"
OUT = ROOT / "artifacts" / "video"
AUDIO_DIR = OUT / "audio"
CLIPS_DIR = OUT / "clips"
FINAL = OUT / "elot-final.mp4"
CONCAT_LIST = OUT / "concat.txt"

# ---------------------------------------------------------------------------
# Config (from env)
# ---------------------------------------------------------------------------
TOKEN = os.environ.get("GCP_ACCESS_TOKEN", "").strip()
PROJECT = os.environ.get("GCP_PROJECT", "").strip()
# Auto-detect engine: if no GCP token is present, fall back to macOS `say`.
DEFAULT_ENGINE = "gcp" if TOKEN else "say"
ENGINE = os.environ.get("TTS_ENGINE", DEFAULT_ENGINE).strip().lower()
if ENGINE == "gcp":
    VOICE = os.environ.get("TTS_VOICE", "en-US-Neural2-D").strip()
    SPEAKING_RATE = float(os.environ.get("TTS_SPEAKING_RATE", "0.95"))
else:  # say
    VOICE = os.environ.get("TTS_VOICE", "Samantha").strip()
    SPEAKING_RATE = float(os.environ.get("TTS_SPEAKING_RATE", "175"))
PITCH = float(os.environ.get("TTS_PITCH", "-1.0"))
KEN_BURNS = os.environ.get("KEN_BURNS", "1") == "1"

# Output video specs
WIDTH = 1280
HEIGHT = 720
FPS = 30


# ---------------------------------------------------------------------------
# Script parsing
# ---------------------------------------------------------------------------
@dataclass
class Scene:
    num: int
    image: Path
    vo: str  # the full voiceover for the scene


SCENE_RE = re.compile(
    r"### Scene (\d+).*?`(\d+-[a-z0-9-]+\.png)`.*?\*\*VO:\*\*\n((?:>[^\n]*\n?)+)",
    re.DOTALL,
)


def _normalise_vo(block: str) -> str:
    """Turn a multiline `>` blockquote into a single clean sentence."""
    out: list[str] = []
    for raw in block.splitlines():
        line = raw.lstrip(">").strip()
        if not line:
            continue
        out.append(line)
    text = " ".join(out)
    # Bold-emphasis markers are for video captions, not for the voice.
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    # Collapse double spaces and tidy curly-quote whitespace artefacts.
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_scenes() -> list[Scene]:
    if not SCRIPT_MD.exists():
        sys.exit(f"missing {SCRIPT_MD} — run the screenshot spec first")
    raw = SCRIPT_MD.read_text(encoding="utf-8")
    scenes: list[Scene] = []
    for m in SCENE_RE.finditer(raw):
        num = int(m.group(1))
        image = SCREENSHOTS / m.group(2)
        if not image.exists():
            sys.exit(f"missing image {image}")
        vo = _normalise_vo(m.group(3))
        scenes.append(Scene(num=num, image=image, vo=vo))
    if not scenes:
        sys.exit("no scenes parsed from SCRIPT.md — check the format")
    return scenes


# ---------------------------------------------------------------------------
# Text-to-Speech — two engines, same output: an MP3 at out_path.
# ---------------------------------------------------------------------------
def synthesize_gcp(text: str, out_path: Path) -> None:
    """Render `text` to MP3 via Cloud TTS REST API."""
    if not TOKEN:
        sys.exit(
            "GCP_ACCESS_TOKEN not set — run via scripts/make-video.sh "
            "or `export GCP_ACCESS_TOKEN=$(gcloud auth print-access-token)`",
        )
    body = {
        "input": {"text": text},
        "voice": {
            "languageCode": VOICE.rsplit("-", 2)[0] if VOICE.count("-") >= 2 else "en-US",
            "name": VOICE,
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": SPEAKING_RATE,
            "pitch": PITCH,
            "sampleRateHertz": 24000,
            "effectsProfileId": ["headphone-class-device"],
        },
    }
    req = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json; charset=utf-8",
            **({"x-goog-user-project": PROJECT} if PROJECT else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")
        sys.exit(f"TTS HTTP {e.code}: {body_txt}")
    audio_b64 = payload.get("audioContent")
    if not audio_b64:
        sys.exit(f"TTS response missing audioContent: {payload}")
    out_path.write_bytes(base64.b64decode(audio_b64))


def synthesize_say(text: str, out_path: Path) -> None:
    """Render `text` to MP3 via macOS `say` + ffmpeg AIFF→MP3."""
    aiff = out_path.with_suffix(".aiff")
    subprocess.run(
        [
            "say",
            "-v",
            VOICE,
            "-r",
            str(int(SPEAKING_RATE)),
            "-o",
            str(aiff),
            text,
        ],
        check=True,
    )
    # Convert AIFF → MP3 so the rest of the pipeline doesn't need to care.
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(aiff),
            "-c:a",
            "libmp3lame",
            "-b:a",
            "192k",
            "-ar",
            "24000",
            str(out_path),
        ],
        check=True,
    )
    aiff.unlink(missing_ok=True)


def synthesize(text: str, out_path: Path) -> None:
    if ENGINE == "gcp":
        synthesize_gcp(text, out_path)
    elif ENGINE == "say":
        synthesize_say(text, out_path)
    else:
        sys.exit(f"unknown TTS_ENGINE: {ENGINE!r} (expected 'gcp' or 'say')")


# ---------------------------------------------------------------------------
# ffmpeg helpers
# ---------------------------------------------------------------------------
def probe_duration(audio: Path) -> float:
    """Return audio duration in seconds via ffprobe."""
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(audio),
        ],
        text=True,
    )
    return float(out.strip())


def render_clip(scene: Scene, audio: Path, duration: float, out: Path) -> None:
    """Render one scene's clip: image looped under audio, optional zoom."""
    # Ken-Burns zoom: scale image up 2x, then zoom from 1.0 → 1.08 over the
    # whole audio duration. The 2x upscale avoids zoompan's jitter.
    frames = max(1, int(duration * FPS))
    if KEN_BURNS:
        vf = (
            f"scale={WIDTH * 2}:{HEIGHT * 2},"
            f"zoompan=z='min(zoom+0.0008,1.08)':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS},"
            "format=yuv420p"
        )
    else:
        vf = f"scale={WIDTH}:{HEIGHT},fps={FPS},format=yuv420p"

    # Pad audio with 0.3s of silence at the end so the cut doesn't clip a word.
    af = "apad=pad_dur=0.3"

    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-loop",
        "1",
        "-i",
        str(scene.image),
        "-i",
        str(audio),
        "-vf",
        vf,
        "-af",
        af,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-tune",
        "stillimage",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-pix_fmt",
        "yuv420p",
        "-shortest",
        "-t",
        f"{duration + 0.3:.3f}",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def concat_clips(clips: list[Path], out: Path) -> None:
    """Concat per-scene MP4s into the final video.

    Re-encodes (rather than `-c copy`) because each clip can have slightly
    different audio frame boundaries, and a fresh encode + a fade-in/out on
    the bookends gives us a polished result.
    """
    # Build a temp concat list.
    CONCAT_LIST.write_text(
        "".join(f"file '{c.as_posix()}'\n" for c in clips),
        encoding="utf-8",
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(CONCAT_LIST),
        # 0.4s fade-in at start, 0.6s fade-out at end (offsets computed below).
        "-vf",
        "fade=t=in:st=0:d=0.4",
        "-af",
        "afade=t=in:st=0:d=0.4",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out),
    ]
    subprocess.run(cmd, check=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def fmt_size(p: Path) -> str:
    if not p.exists():
        return "(missing)"
    n = p.stat().st_size
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)

    scenes = load_scenes()
    print(f"[make-video] parsed {len(scenes)} scenes from SCRIPT.md")
    print(f"[make-video] engine = {ENGINE}  voice = {VOICE}  rate = {SPEAKING_RATE}")
    print(f"[make-video] output = {FINAL.relative_to(ROOT)}\n")

    # 1. TTS
    print("──[1/3] Text-to-Speech ─────────────────────────────────")
    audio_paths: dict[int, Path] = {}
    for s in scenes:
        out_audio = AUDIO_DIR / f"{s.num:02d}.mp3"
        if out_audio.exists() and os.environ.get("RECACHE_TTS") != "1":
            print(f"  · {out_audio.name} (cached)")
        else:
            print(f"  · {out_audio.name}  ({len(s.vo)} chars)")
            synthesize(s.vo, out_audio)
        audio_paths[s.num] = out_audio

    # 2. Per-scene clips
    print("\n──[2/3] Render per-scene clips ────────────────────────")
    clip_paths: list[Path] = []
    for s in scenes:
        out_clip = CLIPS_DIR / f"{s.num:02d}.mp4"
        a = audio_paths[s.num]
        dur = probe_duration(a)
        print(f"  · {out_clip.name}  audio={dur:>5.2f}s  ken-burns={KEN_BURNS}")
        render_clip(s, a, dur, out_clip)
        clip_paths.append(out_clip)

    # 3. Concat
    print("\n──[3/3] Concatenate + finalise ────────────────────────")
    concat_clips(clip_paths, FINAL)

    total = sum(probe_duration(p) for p in clip_paths)
    print(f"\n[make-video] done — {fmt_size(FINAL)},  ~{total:.1f}s runtime")
    print(f"[make-video] file  → {FINAL}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
