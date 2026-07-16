#!/usr/bin/env python3
"""
Drive Expo Go on Android through remaining Quick Play board cells to the winner screen.

Uses:
  - adb input taps
  - screencap + tesseract OCR for question/answer/end detection
  - optional uiautomator dumps when the app reaches idle (often fails during timers)

Usage:
  python3 scripts/adb_quickplay_to_end.py [device_serial]
"""

from __future__ import annotations

import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional
from xml.etree import ElementTree as ET

DEVICE = sys.argv[1] if len(sys.argv) > 1 else "10DD1T08XU0017S"
ROOT = Path(__file__).resolve().parents[1]
WORKDIR = ROOT / ".tmp-adb-auto"
MAX_TURNS = 40
OCR_SCALE = 2

# Open cells captured from a live board hierarchy (content-desc "N points").
# Updated at runtime when a fresh uiautomator dump succeeds.
SEED_OPEN_CELLS: list[tuple[int, int, str]] = [
    (200, 326, "100 points"),
    (1376, 326, "100 points"),
    (200, 426, "200 points"),
    (511, 426, "200 points"),
    (634, 426, "200 points"),
    (1376, 426, "200 points"),
    (200, 525, "300 points"),
    (511, 525, "300 points"),
    (634, 525, "300 points"),
    (945, 525, "300 points"),
    (1065, 525, "300 points"),
    (1376, 525, "300 points"),
]


@dataclass
class OcrWord:
    text: str
    conf: float
    cx: int
    cy: int
    left: int
    top: int
    width: int
    height: int


def adb(*args: str, check: bool = True, timeout: float = 30) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["adb", "-s", DEVICE, *args],
        check=check,
        text=True,
        capture_output=True,
        timeout=timeout,
    )


def tap(x: int, y: int, label: str) -> None:
    print(f"  tap {label} @ ({x},{y})")
    adb("shell", "input", "tap", str(x), str(y))


def screencap(path: Path) -> None:
    # exec-out avoids intermediate device file issues
    data = subprocess.run(
        ["adb", "-s", DEVICE, "exec-out", "screencap", "-p"],
        check=True,
        capture_output=True,
        timeout=20,
    ).stdout
    path.write_bytes(data)


def ocr_words(screen_path: Path) -> list[OcrWord]:
    from PIL import Image, ImageEnhance, ImageOps

    im = Image.open(screen_path).convert("RGB")
    im2 = im.resize((im.width * OCR_SCALE, im.height * OCR_SCALE), Image.Resampling.LANCZOS)
    im2 = ImageOps.autocontrast(ImageEnhance.Contrast(im2).enhance(1.5))
    ocr_path = WORKDIR / "screen_ocr.png"
    im2.save(ocr_path)
    out_base = WORKDIR / "out"
    subprocess.run(
        ["tesseract", str(ocr_path), str(out_base), "--psm", "11", "tsv"],
        check=True,
        capture_output=True,
        timeout=60,
    )
    lines = (out_base.with_suffix(".tsv")).read_text().splitlines()
    if not lines:
        return []
    header = lines[0].split("\t")
    idx = {k: i for i, k in enumerate(header)}
    words: list[OcrWord] = []
    for line in lines[1:]:
        parts = line.split("\t")
        if len(parts) <= idx["text"]:
            continue
        text = parts[idx["text"]].strip()
        if not text:
            continue
        try:
            conf = float(parts[idx["conf"]])
        except ValueError:
            conf = -1.0
        if 0 <= conf < 25:
            continue
        left = int(parts[idx["left"]])
        top = int(parts[idx["top"]])
        width = int(parts[idx["width"]])
        height = int(parts[idx["height"]])
        words.append(
            OcrWord(
                text=text,
                conf=conf,
                cx=(left + width // 2) // OCR_SCALE,
                cy=(top + height // 2) // OCR_SCALE,
                left=left // OCR_SCALE,
                top=top // OCR_SCALE,
                width=width // OCR_SCALE,
                height=height // OCR_SCALE,
            )
        )
    return words


def joined_text(words: Iterable[OcrWord]) -> str:
    return " ".join(w.text for w in words)


def find_phrase_center(words: list[OcrWord], phrase: str) -> Optional[tuple[int, int]]:
    """Find sequential word match for a phrase; return center of the span."""
    tokens = phrase.upper().split()
    upper = [w.text.upper() for w in words]
    n = len(tokens)
    for i in range(len(upper) - n + 1):
        if upper[i : i + n] == tokens:
            span = words[i : i + n]
            cx = sum(w.cx for w in span) // n
            cy = sum(w.cy for w in span) // n
            return cx, cy
    # loose: all tokens present nearby
    return None


def find_token(words: list[OcrWord], token: str, *, min_conf: float = 40) -> list[OcrWord]:
    t = token.upper()
    return [w for w in words if w.text.upper() == t and (w.conf < 0 or w.conf >= min_conf)]


def detect_phase(words: list[OcrWord]) -> str:
    text = joined_text(words).upper()
    # Winner/end screen (OCR often drops "MATCH COMPLETE" / slogan punctuation)
    if (
        "MATCH COMPLETE" in text
        or "PLAY BACKFIRE TODAY" in text
        or "BACK TO HOME" in text
        or "PLAYBACKFIRE" in text.replace(" ", "")
        or (
            "ANDROID" in text
            and "IOS" in text
            and "WEB" in text
            and ("VS" in text or "TEAM 1" in text)
        )
    ):
        return "winner"
    if "FINISH MATCH" in text:
        return "finish"
    if "NEXT TURN" in text:
        return "next"
    if "WHO GETS" in text or "NEITHER TEAM" in text or "CORRECT ANSWER" in text:
        return "award"
    if "SHOW ANSWER" in text:
        return "show"
    # Board: score HUD / topic labels / point tiles (OCR is messy in landscape)
    board_markers = (
        "BACKFIRE",
        "MATCH MENU",
        "21ST CENTURY",
        "MODERN MIDDLE",
        "EXTENDED UNIVERSE",
        "MINUS 50",
        "PLUS 50",
    )
    if any(m in text for m in board_markers):
        return "board"
    if re.search(r"\bTEAM\s*[12]\b", text) and re.search(r"\b(100|200|300)\b", text):
        return "board"
    if "QUICK PLAY" in text and "CHOOSE" in text:
        return "mode"
    return "unknown"


def try_uiautomator_open_cells() -> list[tuple[int, int, str]]:
    remote = "/sdcard/ui-backfire.xml"
    try:
        adb("shell", "rm", "-f", remote, check=False, timeout=5)
        # short timeout — this often hangs while timers animate
        adb("shell", "uiautomator", "dump", "--compressed", remote, check=False, timeout=4)
        raw = adb("shell", "cat", remote, check=False, timeout=5).stdout
    except subprocess.TimeoutExpired:
        return []
    start = raw.find("<?xml")
    if start < 0:
        return []
    try:
        root = ET.fromstring(raw[start:])
    except ET.ParseError:
        return []
    cells: list[tuple[int, int, str]] = []
    for n in root.iter("node"):
        desc = n.attrib.get("content-desc") or ""
        if not re.fullmatch(r"\d+ points", desc):
            continue
        if n.attrib.get("clickable") != "true":
            continue
        m = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.attrib.get("bounds", ""))
        if not m:
            continue
        x1, y1, x2, y2 = map(int, m.groups())
        cells.append(((x1 + x2) // 2, (y1 + y2) // 2, desc))
    cells.sort(key=lambda c: (int(c[2].split()[0]), c[0], c[1]))
    return cells


def wait_phase(wanted: set[str], *, timeout_s: float = 15) -> tuple[str, list[OcrWord]]:
    deadline = time.time() + timeout_s
    last = "unknown"
    words: list[OcrWord] = []
    while time.time() < deadline:
        screencap(WORKDIR / "screen.png")
        words = ocr_words(WORKDIR / "screen.png")
        last = detect_phase(words)
        print(f"  phase={last}")
        if last in wanted:
            return last, words
        time.sleep(0.2)
    return last, words


def resolve_question_flow() -> str:
    """From show-answer or award or next, finish the current question. Returns final phase."""
    phase, words = wait_phase({"show", "award", "next", "finish", "winner", "board"}, timeout_s=12)
    if phase == "winner":
        return phase
    if phase == "board":
        return phase

    if phase == "show":
        pos = find_phrase_center(words, "SHOW ANSWER")
        if not pos:
            # fallback: button is mid-bottom on landscape question layout
            pos = (806, 563)
        tap(pos[0], pos[1], "SHOW ANSWER")
        time.sleep(0.7)
        phase, words = wait_phase({"award", "next", "finish", "winner", "board"}, timeout_s=12)

    if phase == "award":
        # Prefer Team 1 award tile
        team_words = find_token(words, "Team")
        one_words = find_token(words, "1")
        pos = None
        for tw in team_words:
            for ow in one_words:
                if abs(tw.cy - ow.cy) < 40 and ow.cx > tw.cx and ow.cx - tw.cx < 80:
                    pos = ((tw.cx + ow.cx) // 2, (tw.cy + ow.cy) // 2 + 20)
                    break
            if pos:
                break
        if not pos:
            # left award card on landscape answer layout
            pos = (450, 550)
        tap(pos[0], pos[1], "Team 1 award")
        time.sleep(0.7)
        phase, words = wait_phase({"next", "finish", "winner", "board", "award"}, timeout_s=12)
        # if still award, maybe need second tap
        if phase == "award":
            tap(pos[0], pos[1], "Team 1 award retry")
            time.sleep(0.7)
            phase, words = wait_phase({"next", "finish", "winner", "board"}, timeout_s=12)

    if phase in {"next", "finish"}:
        phrase = "FINISH MATCH" if phase == "finish" else "NEXT TURN"
        pos = find_phrase_center(words, phrase)
        if not pos:
            # next-turn dock is bottom-center
            pos = (806, 640) if phase == "next" else (806, 640)
        tap(pos[0], pos[1], phrase)
        time.sleep(0.9)
        phase, _ = wait_phase({"board", "winner", "show", "award", "next", "finish"}, timeout_s=12)
    return phase


def main() -> int:
    WORKDIR.mkdir(parents=True, exist_ok=True)
    print(f"Device: {DEVICE}")
    print(f"Workdir: {WORKDIR}")

    # Reduce animation stalls for any uiautomator attempts
    for key in ("window_animation_scale", "transition_animation_scale", "animator_duration_scale"):
        adb("shell", "settings", "put", "global", key, "0", check=False)

    adb(
        "shell",
        "am",
        "start",
        "-n",
        "host.exp.exponent/.experience.ExperienceActivity",
        check=False,
    )
    time.sleep(0.8)

    open_cells = try_uiautomator_open_cells()
    if open_cells:
        print(f"Open cells from uiautomator: {len(open_cells)}")
    else:
        open_cells = list(SEED_OPEN_CELLS)
        print(f"Using seed open-cell coordinates: {len(open_cells)}")

    # If already mid-question, resolve first
    screencap(WORKDIR / "screen.png")
    words = ocr_words(WORKDIR / "screen.png")
    phase = detect_phase(words)
    print(f"Start phase: {phase}")
    if phase == "winner":
        print("Already on winner screen")
        return 0
    if phase in {"show", "award", "next", "finish"}:
        phase = resolve_question_flow()
        if phase == "winner":
            print("Reached winner screen")
            return 0

    cell_index = 0
    for turn in range(1, MAX_TURNS + 1):
        print(f"\n=== turn {turn} ===")
        screencap(WORKDIR / "screen.png")
        words = ocr_words(WORKDIR / "screen.png")
        phase = detect_phase(words)
        print(f"  phase={phase}")
        if phase == "winner":
            print("Reached winner screen")
            adb("exec-out", "screencap", "-p", check=False)
            (WORKDIR / "winner.png").write_bytes(
                subprocess.run(
                    ["adb", "-s", DEVICE, "exec-out", "screencap", "-p"],
                    check=True,
                    capture_output=True,
                ).stdout
            )
            print(f"Screenshot: {WORKDIR / 'winner.png'}")
            return 0

        if phase in {"show", "award", "next", "finish"}:
            phase = resolve_question_flow()
            if phase == "winner":
                print("Reached winner screen")
                return 0
            continue

        # Refresh open cells if possible
        fresh = try_uiautomator_open_cells()
        if fresh:
            open_cells = fresh
            cell_index = 0
            print(f"  refreshed open cells: {len(open_cells)}")

        if cell_index >= len(open_cells):
            # Last cell often lands on end screen; give OCR a longer look.
            phase, words = wait_phase({"winner", "show", "award", "board", "finish", "next"}, timeout_s=10)
            if phase == "winner":
                print("Reached winner screen")
                (WORKDIR / "winner.png").write_bytes(
                    subprocess.run(
                        ["adb", "-s", DEVICE, "exec-out", "screencap", "-p"],
                        check=True,
                        capture_output=True,
                    ).stdout
                )
                print(f"Screenshot: {WORKDIR / 'winner.png'}")
                return 0
            if phase in {"show", "award", "next", "finish"}:
                phase = resolve_question_flow()
                if phase == "winner":
                    print("Reached winner screen")
                    return 0
            # Re-query open cells once more before giving up
            fresh = try_uiautomator_open_cells()
            if fresh:
                open_cells = fresh
                cell_index = 0
                print(f"  recovered open cells: {len(open_cells)}")
                continue
            print("No more open cell coordinates; giving up")
            print(f"  last OCR sample: {joined_text(words)[:180]!r}")
            return 1

        x, y, label = open_cells[cell_index]
        cell_index += 1
        tap(x, y, label)
        time.sleep(0.8)

        phase = resolve_question_flow()
        if phase == "winner":
            print("Reached winner screen")
            (WORKDIR / "winner.png").write_bytes(
                subprocess.run(
                    ["adb", "-s", DEVICE, "exec-out", "screencap", "-p"],
                    check=True,
                    capture_output=True,
                ).stdout
            )
            print(f"Screenshot: {WORKDIR / 'winner.png'}")
            return 0
        if phase not in {"board", "unknown"}:
            print(f"  unexpected phase after resolve: {phase}")

    print("Failed to reach winner within turn budget")
    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(exc.stdout)
        print(exc.stderr, file=sys.stderr)
        raise
