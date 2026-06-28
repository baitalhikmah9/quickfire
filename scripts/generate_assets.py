#!/usr/bin/env python3
"""Generate properly padded icon assets for Backfire from the source logo."""

from PIL import Image
import os

SRC = "assets/BF app logo.png"
ICON_SIZE = 1024
SPLASH_WIDTH = 1920
SPLASH_HEIGHT = 1080
# Matches the yellow fill in `BF app logo.png` / brand guidelines
BRAND_YELLOW = (241, 200, 74, 255)
ADAPTIVE_SAFE_ZONE = 0.66  # Inner 66% safe zone for Android adaptive icons


def generate_on_yellow_canvas(src_path: str, output: str, scale_pct: float, size: int) -> None:
    """Center the source logo on a full-bleed yellow square canvas."""
    img = Image.open(src_path).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), BRAND_YELLOW)
    max_dim = max(img.size)
    new_size = int(size * scale_pct / 100)
    scale = new_size / max_dim
    new_w = int(img.width * scale)
    new_h = int(img.height * scale)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    canvas.save(output)
    print(f"Generated {output} ({size}x{size}, {scale_pct}% scale on yellow)")


def generate_splash(src_path: str, output: str, scale_pct: float) -> None:
    """Center the logo on a transparent splash canvas (splash screen uses a black bg)."""
    img = Image.open(src_path).convert("RGBA")
    canvas = Image.new("RGBA", (SPLASH_WIDTH, SPLASH_HEIGHT), (0, 0, 0, 0))
    max_dim = max(img.size)
    target = int(min(SPLASH_WIDTH, SPLASH_HEIGHT) * scale_pct / 100)
    scale = target / max_dim
    new_w = int(img.width * scale)
    new_h = int(img.height * scale)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    x = (SPLASH_WIDTH - new_w) // 2
    y = (SPLASH_HEIGHT - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    canvas.save(output)
    print(f"Generated {output} ({SPLASH_WIDTH}x{SPLASH_HEIGHT}, {scale_pct}% scale)")


def main() -> None:
    os.chdir(os.path.join(os.path.dirname(__file__), ".."))

    src = os.path.join(os.getcwd(), SRC)
    if not os.path.exists(src):
        print(f"Error: {src} not found")
        return

    # Full-bleed yellow prevents a black seam on Android adaptive icons.
    generate_on_yellow_canvas(src, "assets/icon.png", 100, ICON_SIZE)
    generate_on_yellow_canvas(src, "assets/adaptive-icon.png", ADAPTIVE_SAFE_ZONE * 100, ICON_SIZE)
    generate_splash(src, "assets/splash-icon.png", 55)

    print("\nDone!")


if __name__ == "__main__":
    main()
