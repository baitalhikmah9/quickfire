#!/usr/bin/env python3
"""
Make flat grey plate backgrounds transparent for topic PNGs.

Requires ffmpeg + ffprobe on PATH. Samples corners to pick a per-image key
colour, then applies libavfilter colorkey. Skips images that do not look like
a uniform grey canvas (avoids mangling full-bleed art).
"""

from __future__ import annotations

import argparse
import glob
import os
import struct
import subprocess
import sys
import tempfile


def _dims(path: str) -> tuple[int, int]:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0:s=x",
            path,
        ],
        text=True,
    ).strip()
    w_s, h_s = out.split("x")
    return int(w_s), int(h_s)


def _rgba_frame(path: str) -> tuple[int, int, bytes]:
    w, h = _dims(path)
    raw = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            path,
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-",
        ],
        stderr=subprocess.DEVNULL,
    )
    expected = w * h * 4
    if len(raw) < expected:
        raise RuntimeError(f"short decode for {path}: got {len(raw)}, need {expected}")
    return w, h, raw[:expected]


def _px(raw: bytes, w: int, x: int, y: int) -> tuple[int, int, int, int]:
    i = (y * w + x) * 4
    return struct.unpack_from("4B", raw, i)


def _is_keyable_grey(r: int, g: int, b: int, a: int) -> bool:
    """True if this corner pixel looks like the flat mid-grey plate, not subject matter."""
    if a < 210:
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    diff = mx - mn
    avg = (r + g + b) / 3.0
    # Mid neutrals used by exports (~#757474); exclude near-black / bright silver / saturated.
    return diff <= 24 and 95.0 <= avg <= 152.0


def _lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def _corner_rgbs(path: str) -> tuple[int, int, list[tuple[int, int, int, int]]]:
    w, h, raw = _rgba_frame(path)
    corners = [
        _px(raw, w, 0, 0),
        _px(raw, w, w - 1, 0),
        _px(raw, w, 0, h - 1),
        _px(raw, w, w - 1, h - 1),
    ]
    return w, h, corners


def _key_rgb_from_corners(corners: list[tuple[int, int, int, int]]) -> tuple[int, int, int] | None:
    greys = [(r, g, b) for r, g, b, a in corners if _is_keyable_grey(r, g, b, a)]
    if len(greys) < 2:
        return None
    # When two grey tones appear at corners (e.g. vignette vs plate), the export plate is
    # usually the darker pair — average the two darkest qualifying corners only.
    greys_sorted = sorted(greys, key=lambda t: _lum(*t))
    pair = greys_sorted[:2]
    r = round(sum(t[0] for t in pair) / 2)
    g = round(sum(t[1] for t in pair) / 2)
    b = round(sum(t[2] for t in pair) / 2)
    return r, g, b


def _run_colorkey(src: str, dst: str, rgb: tuple[int, int, int], similarity: float, blend: float) -> None:
    rr, gg, bb = rgb
    color = f"0x{rr:02x}{gg:02x}{bb:02x}"
    vf = f"format=rgba,colorkey={color}:{similarity}:{blend}"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            src,
            "-vf",
            vf,
            "-update",
            "1",
            "-frames:v",
            "1",
            dst,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dir",
        default="assets/topics",
        help="Directory of PNG topic images (default: assets/topics)",
    )
    parser.add_argument(
        "--similarity",
        type=float,
        default=0.12,
        help="ffmpeg colorkey similarity (default: 0.12)",
    )
    parser.add_argument(
        "--blend",
        type=float,
        default=0.16,
        help="ffmpeg colorkey edge blend (default: 0.16)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions only; do not write files",
    )
    args = parser.parse_args()

    base = os.path.abspath(args.dir)
    paths = sorted(glob.glob(os.path.join(base, "*.png")))
    if not paths:
        print(f"No PNG files under {base}", file=sys.stderr)
        return 1

    for path in paths:
        name = os.path.basename(path)
        try:
            _w, _h, corners = _corner_rgbs(path)
        except Exception as e:
            print(f"skip {name}: decode failed ({e})")
            continue

        key = _key_rgb_from_corners(corners)
        if key is None:
            print(f"skip {name}: corners not a grey plate ({corners})")
            continue

        if args.dry_run:
            print(f"would key {name} -> rgb{key} corners={corners}")
            continue

        fd, tmp = tempfile.mkstemp(suffix=".png", prefix="keyed_")
        os.close(fd)
        try:
            _run_colorkey(path, tmp, key, args.similarity, args.blend)
            os.replace(tmp, path)
            print(f"ok {name} key={key}")
        except Exception as e:
            try:
                os.remove(tmp)
            except OSError:
                pass
            print(f"fail {name}: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
