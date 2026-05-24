#!/usr/bin/env python3
"""
ELOT AI — Veo 2 image-to-video pipeline (tight 36-second cut).

Takes a hand-picked subset of the marketing screenshots, animates each one
via Vertex AI's Veo 2 image-to-video model (subtle camera motion only),
narrates each scene with macOS `say`, and stitches the result into a
single ~36-second 1280x720 MP4.

Why a separate script from make-video.py?
  - Different shot list (6 scenes, not 18)
  - Different visual engine (real motion via Veo vs static Ken-Burns)
  - Different cost profile (~$6-10 vs $0.10)
  - Different orchestration (async LRO polling per scene)

Env vars:
  GCP_PROJECT        default: `gcloud config get-value project`
  VEO_MODEL          default: veo-2.0-generate-001
                     other:   veo-3.0-generate-preview, etc.
  VEO_DURATION       seconds per clip, default 6  (Veo 2: 5-8)
  VEO_ASPECT         default: 16:9
  TTS_VOICE          macOS say voice; default: Daniel
  TTS_SPEAKING_RATE  words/min; default: 168
  POLL_INTERVAL_SEC  default: 8
  POLL_MAX_ITER      default: 60   (max ~8 min per clip)
  DRY_RUN            "1" to skip Veo + use existing clips (debug)

Output:
  artifacts/video/veo/NN-clip.mp4   Veo-generated motion clip
  artifacts/video/veo/NN-vo.mp3     per-scene voiceover
  artifacts/video/veo/NN-mux.mp4    muxed clip
  artifacts/video/elot-veo.mp4      final concatenated video
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS = ROOT / "artifacts" / "screenshots"
OUT_DIR = ROOT / "artifacts" / "video"
VEO_DIR = OUT_DIR / "veo"
FINAL = OUT_DIR / "elot-veo.mp4"

PROJECT = os.environ.get("GCP_PROJECT") or subprocess.check_output(
    ["gcloud", "config", "get-value", "project"], text=True
).strip()
LOCATION = os.environ.get("VEO_LOCATION", "us-central1")
MODEL = os.environ.get("VEO_MODEL", "veo-3.1-generate-001")
DURATION = int(os.environ.get("VEO_DURATION", "6"))
ASPECT = os.environ.get("VEO_ASPECT", "16:9")
TTS_VOICE = os.environ.get("TTS_VOICE", "Daniel")
TTS_RATE = int(os.environ.get("TTS_SPEAKING_RATE", "168"))
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SEC", "8"))
POLL_MAX = int(os.environ.get("POLL_MAX_ITER", "60"))
DRY_RUN = os.environ.get("DRY_RUN") == "1"

# ---------------------------------------------------------------------------
# Tight 6-scene cut. Motion prompts are deliberately understated — Veo will
# add cinematic motion on its own; if we ask for "dramatic" we get artifacts.
# Goal: ~14-22 words per VO so each scene fits inside ~6 seconds of speech.
# ---------------------------------------------------------------------------
@dataclass
class Scene:
    n: int
    image: str   # filename inside artifacts/screenshots/
    motion: str  # Veo prompt — describe motion only, never new content
    vo: str      # voiceover text


SCENES: list[Scene] = [
    Scene(
        n=1,
        image="01-landing.png",
        motion=(
            "very subtle slow camera push-in toward the hero headline, "
            "1.0 to 1.04 zoom, no parallax, UI stays sharp and readable"
        ),
        vo="Hiring takes ninety days. Onboarding burns out managers. "
           "ELOT AI rolls it into one AI-powered platform.",
    ),
    Scene(
        n=2,
        image="07-onboarding-os-hr.png",
        motion=(
            "gentle horizontal camera pan from left to right across the "
            "dashboard, very small movement, dashboard text remains crisp"
        ),
        vo="Every active onboarding, every owner, every risk signal — "
           "one screen. No spreadsheets.",
    ),
    Scene(
        n=3,
        image="09-instance-detail.png",
        motion=(
            "soft slow zoom toward the centre of the dashboard, "
            "1.0 to 1.05, smooth and barely perceptible"
        ),
        vo="AI watches every new-hire timeline and flags drift before "
           "it costs you the quarter.",
    ),
    Scene(
        n=4,
        image="13-learner-timeline.png",
        motion=(
            "gentle vertical camera tilt downward along the timeline, "
            "subtle parallax, no jitter, UI stays sharp"
        ),
        vo="Day one — new hires see their plan, their team, and an AI "
           "mentor that knows your company.",
    ),
    Scene(
        n=5,
        image="15-course-builder.png",
        motion=(
            "soft slow camera push-in, very subtle, "
            "with a faint warm bokeh at the edges"
        ),
        vo="Paste any policy. Sixty seconds later you have an "
           "interactive course with scenarios and a quiz.",
    ),
    Scene(
        n=6,
        image="18-admin-dashboard.png",
        motion=(
            "slow zoom out from the dashboard ending slightly wider, "
            "very gentle, ends as a clean wide shot"
        ),
        vo="Real numbers. Real outcomes. This is ELOT AI.",
    ),
]


# ---------------------------------------------------------------------------
# gcloud auth + REST helpers
# ---------------------------------------------------------------------------
def token() -> str:
    return subprocess.check_output(
        ["gcloud", "auth", "print-access-token"], text=True
    ).strip()


def base_url() -> str:
    return (
        f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
        f"projects/{PROJECT}/locations/{LOCATION}/publishers/google/"
        f"models/{MODEL}"
    )


class QuotaExceeded(Exception):
    """Veo returned 429. Caller may retry with backoff."""


def post_json(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token()}",
            "x-goog-user-project": PROJECT,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", errors="replace")
        if e.code == 429:
            raise QuotaExceeded(txt)
        sys.exit(f"\nHTTP {e.code} from {url}\n{txt}\n")


# ---------------------------------------------------------------------------
# Veo: submit + poll
# ---------------------------------------------------------------------------
def submit_veo(scene: Scene) -> str:
    """Submit one image-to-video job; return the operation name."""
    img = SCREENSHOTS / scene.image
    if not img.exists():
        sys.exit(f"missing screenshot: {img}")
    b64 = base64.b64encode(img.read_bytes()).decode("ascii")
    body = {
        "instances": [
            {
                "prompt": scene.motion,
                "image": {
                    "bytesBase64Encoded": b64,
                    "mimeType": "image/png",
                },
            }
        ],
        "parameters": {
            "aspectRatio": ASPECT,
            "durationSeconds": DURATION,
            "sampleCount": 1,
            "personGeneration": "allow_adult",
            # Veo 3+ generates audio by default. We're laying our own
            # voiceover on top in the mux step, so disabling audio here
            # both saves cost and avoids competing tracks.
            "generateAudio": False,
        },
    }
    resp = post_json(f"{base_url()}:predictLongRunning", body)
    op = resp.get("name")
    if not op:
        sys.exit(f"no operation name in submit response: {resp}")
    return op


def poll_veo(op: str) -> dict:
    """Block until the operation is done; return the final response payload."""
    for i in range(1, POLL_MAX + 1):
        resp = post_json(
            f"{base_url()}:fetchPredictOperation",
            {"operationName": op},
        )
        if resp.get("done"):
            if "error" in resp:
                sys.exit(f"Veo operation failed: {resp['error']}")
            return resp.get("response", {})
        print(f"    · polling [{i}/{POLL_MAX}] …", flush=True)
        time.sleep(POLL_INTERVAL)
    sys.exit("Veo poll timed out")


def decode_veo_video(response: dict, out_path: Path) -> None:
    """Veo returns either inline bytes or a GCS URI. Handle both."""
    videos = response.get("videos") or []
    if not videos:
        # Some Veo flavours return under 'predictions'.
        videos = response.get("predictions") or []
    if not videos:
        sys.exit(f"no videos in Veo response: {json.dumps(response)[:500]}")
    vid = videos[0]
    if "bytesBase64Encoded" in vid:
        out_path.write_bytes(base64.b64decode(vid["bytesBase64Encoded"]))
        return
    if "gcsUri" in vid:
        # Fall back to gsutil for GCS-staged output.
        subprocess.run(
            ["gcloud", "storage", "cp", vid["gcsUri"], str(out_path)],
            check=True,
        )
        return
    sys.exit(f"unknown video shape in Veo response: {list(vid.keys())}")


# ---------------------------------------------------------------------------
# TTS via macOS say
# ---------------------------------------------------------------------------
def say_to_mp3(text: str, out_path: Path) -> None:
    aiff = out_path.with_suffix(".aiff")
    subprocess.run(
        ["say", "-v", TTS_VOICE, "-r", str(TTS_RATE), "-o", str(aiff), text],
        check=True,
    )
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


# ---------------------------------------------------------------------------
# ffmpeg mux + concat
# ---------------------------------------------------------------------------
def probe_duration(p: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(p),
        ],
        text=True,
    )
    return float(out.strip())


def mux(video: Path, audio: Path, out: Path) -> None:
    """Combine a Veo MP4 + an MP3 voiceover, matching the longer's duration."""
    v_dur = probe_duration(video)
    a_dur = probe_duration(audio)
    target = max(v_dur, a_dur) + 0.15
    # Pad whichever is shorter so neither cuts off.
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-i",
        str(video),
        "-i",
        str(audio),
        "-filter_complex",
        # Re-encode + freeze last frame if video is shorter, pad silence if
        # audio is shorter.
        f"[0:v]tpad=stop_mode=clone:stop_duration={max(0, a_dur - v_dur + 0.2):.3f},"
        f"scale=1280:720,fps=30,setsar=1[v];"
        f"[1:a]apad=pad_dur=0.3[a]",
        "-map",
        "[v]",
        "-map",
        "[a]",
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
        "-t",
        f"{target:.3f}",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def concat_mp4s(clips: list[Path], out: Path) -> None:
    listfile = VEO_DIR / "concat.txt"
    listfile.write_text(
        "".join(f"file '{c.as_posix()}'\n" for c in clips), encoding="utf-8"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(listfile),
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
        ],
        check=True,
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    VEO_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[veo] project = {PROJECT}")
    print(f"[veo] model   = {MODEL}  duration={DURATION}s  aspect={ASPECT}")
    print(f"[veo] voice   = {TTS_VOICE} @ {TTS_RATE} wpm")
    print(f"[veo] scenes  = {len(SCENES)}\n")

    # 1+2. Serial submit-then-poll per scene with 429 retry. Slower than
    #      parallel (each clip takes 30-90 s to generate) but predictable on
    #      both cost and quota. Veo 2's free quota is roughly 2-3 concurrent
    #      LROs, so any meaningful parallelism trips RESOURCE_EXHAUSTED.
    if not DRY_RUN:
        print("──[1/3] Generate Veo clips (serial) ──────────────────")
        for s in SCENES:
            clip = VEO_DIR / f"{s.n:02d}-clip.mp4"
            if clip.exists():
                print(f"  · scene {s.n}: cached → {clip.name}")
                continue
            # Submit with exponential backoff on 429.
            op: str | None = None
            for attempt in range(6):
                try:
                    op = submit_veo(s)
                    break
                except QuotaExceeded:
                    wait = 30 * (2 ** attempt)
                    print(f"  · scene {s.n}: quota — waiting {wait}s")
                    time.sleep(wait)
            if op is None:
                sys.exit(f"scene {s.n}: gave up after 6 quota retries")
            print(f"  · scene {s.n}: submitted, polling …")
            payload = poll_veo(op)
            decode_veo_video(payload, clip)
            size_kb = clip.stat().st_size / 1024
            print(f"  · scene {s.n}: saved {clip.name} ({size_kb:.0f} KB)")
    else:
        print("[veo] DRY_RUN — using existing clips, skipping Veo")

    # 3. Render per-scene VO with say, mux with the Veo clip.
    print("\n──[2/3] Voiceover + mux ───────────────────────────────")
    muxed: list[Path] = []
    for s in SCENES:
        clip = VEO_DIR / f"{s.n:02d}-clip.mp4"
        vo = VEO_DIR / f"{s.n:02d}-vo.mp3"
        out = VEO_DIR / f"{s.n:02d}-mux.mp4"
        print(f"  · scene {s.n}: voicing  ({len(s.vo)} chars)")
        say_to_mp3(s.vo, vo)
        print(f"  · scene {s.n}: muxing → {out.name}")
        mux(clip, vo, out)
        muxed.append(out)

    # 4. Concat all into the final video.
    print("\n──[3/3] Concatenate ───────────────────────────────────")
    concat_mp4s(muxed, FINAL)

    total = sum(probe_duration(p) for p in muxed)
    size_mb = FINAL.stat().st_size / 1024 / 1024
    print(f"\n[veo] done — {size_mb:.1f} MB, ~{total:.1f}s runtime")
    print(f"[veo] file → {FINAL}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
