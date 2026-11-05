"""Crop Logger logo, keep transparency, push plank tones apart."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Lou\.cursor\projects\c-projects-logger\assets\logger-logo-rings_v2-72cf9482-fd0d-4d3e-bc2d-8d1c40af265f.png"
)
OUT = Path(r"C:\projects\logger\public\brand\logger-logo.png")
ALIAS = Path(r"C:\projects\logger\public\brand\timbervault-logo.png")

PLANK_TONES = [
    (232, 178, 112),  # light oak (top)
    (186, 118, 58),   # medium walnut
    (132, 78, 36),    # darker mahogany (bottom)
]


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    px = src.load()

    # Content bbox: any non-transparent, non-empty pixel
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 12 and not (r > 248 and g > 248 and b > 248 and a < 40):
                if a > 12 and (r < 245 or g < 245 or b < 245 or a > 200):
                    # include white wordmark (opaque white) and wood
                    if a > 20:
                        xs.append(x)
                        ys.append(y)

    pad = 8
    left, top, right, bottom = min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad
    left, top = max(0, left), max(0, top)
    right, bottom = min(w, right), min(h, bottom)
    im = src.crop((left, top, right, bottom))
    w, h = im.size
    px = im.load()

    # Icon is left portion before the wordmark gap
    active: list[int] = []
    for x in range(w):
        count = 0
        for y in range(h):
            r, g, b, a = px[x, y]
            if a > 40 and (r < 230 or g < 220):  # wood-ish, not pure white text
                count += 1
        if count > 4:
            active.append(x)

    icon_end = int(w * 0.45)
    for i in range(1, len(active)):
        if active[i] - active[i - 1] > 6:
            icon_end = active[i - 1]
            break
    if active:
        # Prefer last contiguous wood column cluster start..gap
        icon_end = max(icon_end, active[0])

    wood_ys = [
        y
        for y in range(h)
        for x in range(0, min(icon_end + 1, w))
        if px[x, y][3] > 40 and (px[x, y][0] < 235 or px[x, y][1] < 210)
    ]
    y_min, y_max = (min(wood_ys), max(wood_ys)) if wood_ys else (0, h - 1)
    band = max(1.0, (y_max - y_min + 1) / 3.0)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                op[x, y] = (0, 0, 0, 0)
                continue

            # Wordmark / light letters: keep as-is (white)
            if x > icon_end + 2 and r > 200 and g > 200 and b > 200:
                op[x, y] = (255, 255, 255, a)
                continue
            if x > icon_end + 2:
                op[x, y] = (r, g, b, a)
                continue

            # Wood icon region
            lum = (r + g + b) / 3.0
            plank_i = int(min(2, max(0, (y - y_min) / band)))
            target = PLANK_TONES[plank_i]

            # Preserve dark outlines / rings
            if lum < 70:
                op[x, y] = (
                    int(target[0] * 0.28),
                    int(target[1] * 0.28),
                    int(target[2] * 0.28),
                    a,
                )
                continue

            blend = 0.5
            nr = int(r * (1 - blend) + target[0] * blend)
            ng = int(g * (1 - blend) + target[1] * blend)
            nb = int(b * (1 - blend) + target[2] * blend)
            shade = 0.8 + 0.3 * max(0.0, min(1.0, (lum - 50) / 160.0))
            op[x, y] = (
                int(min(255, nr * shade)),
                int(min(255, ng * shade)),
                int(min(255, nb * shade)),
                a,
            )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "PNG")
    out.save(ALIAS, "PNG")
    print(f"wrote {OUT} size={out.size} icon_end={icon_end} crop=({left},{top},{right},{bottom})")


if __name__ == "__main__":
    main()
