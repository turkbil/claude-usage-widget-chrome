#!/usr/bin/env python3
"""Generate the extension icons in all required sizes (16/32/48/128 + 256
for the Chrome Web Store promo tile). Renders an amber donut ring on a
warm dark square — a tiny, monochromatic mark that holds up at 16px."""

import os
from pathlib import Path
from PIL import Image, ImageDraw

OUT  = Path(__file__).resolve().parent.parent / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# Palette
BG    = (28, 28, 30, 255)        # near-black
TRACK = (255, 255, 255, 38)      # 15% white
EMBER = (214, 140, 69, 255)
HILITE = (255, 200, 130, 255)    # soft highlight on the ring

# Donut fill (0..1) — looks lively at ~0.6 (~70% of the ring)
FILL = 0.68

def render(size: int) -> Image.Image:
    """Render at 4x then downsample for sub-pixel smoothness."""
    s = size * 4
    img = Image.new("RGBA", (s, s), BG)
    d = ImageDraw.Draw(img)

    # Geometry
    pad   = int(s * 0.13)
    thick = int(s * 0.16)
    box   = (pad, pad, s - pad, s - pad)

    # Track (full circle)
    d.arc(box, 0, 360, fill=TRACK, width=thick)

    # Fill arc, start at 12 o'clock (= -90°)
    end = -90 + 360 * FILL
    d.arc(box, -90, end, fill=EMBER, width=thick)

    # Tiny highlight at the start cap
    cap = thick // 2
    cx = (box[0] + box[2]) // 2
    cy = box[1] + thick // 2
    d.ellipse((cx - cap, cy - cap, cx + cap, cy + cap), fill=HILITE)

    return img.resize((size, size), Image.LANCZOS)


def main():
    for n in (16, 32, 48, 128):
        out = OUT / f"icon-{n}.png"
        render(n).save(out, "PNG")
        print(f"wrote {out}  ({n}×{n})")

    # Promo tile (Chrome Web Store small marquee) — 440×280 with the logo centered.
    promo = Image.new("RGBA", (440, 280), BG)
    icon = render(220)
    promo.paste(icon, ((440 - 220) // 2, (280 - 220) // 2), icon)
    promo_path = OUT.parent / "store-assets" / "promo-tile-440x280.png"
    promo.save(promo_path, "PNG")
    print(f"wrote {promo_path}")


if __name__ == "__main__":
    main()
