"""Convert TimberVault logo: transparent bg + distinct brown wood planks."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Lou\.cursor\projects\c-projects-logger\assets\tvlogo-5d1f08f8-1326-4426-b09c-b58c67ba5c60.png"
)
OUT = Path(r"C:\projects\logger\public\brand\timbervault-logo.png")

# Distinct wood tones for stacked planks (top → bottom)
WOOD_TONES = [
    (210, 160, 95),   # light oak / pine
    (160, 100, 55),   # medium walnut
    (105, 62, 32),    # dark mahogany
]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()

    active: list[int] = []
    for x in range(w):
        count = sum(1 for y in range(h) if sum(px[x, y][:3]) > 40)
        if count > 4:
            active.append(x)

    icon_end = active[0]
    for i in range(1, len(active)):
        if active[i] - active[i - 1] > 10:
            icon_end = active[i - 1]
            break
    else:
        icon_end = int(w * 0.34)

    icon_pts: list[tuple[int, int, float]] = []
    for y in range(h):
        for x in range(0, icon_end + 1):
            lum = sum(px[x, y][:3]) / 3.0
            if lum > 18:
                icon_pts.append((x, y, lum))

    ys = [p[1] for p in icon_pts]
    y_min, y_max = min(ys), max(ys)
    # Main stack is the brighter upper mass; reflection is faint below.
    # Use luminance-weighted y to split into 3 plank bands excluding very dim reflection.
    solid = [p for p in icon_pts if p[2] >= 55]
    sy = [p[1] for p in solid] or ys
    s_min, s_max = min(sy), max(sy)
    band = max(1.0, (s_max - s_min + 1) / 3.0)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = (r + g + b) / 3.0

            if lum < 18:
                opx[x, y] = (0, 0, 0, 0)
                continue

            # Wordmark
            if x > icon_end + 6:
                alpha = 255 if lum > 70 else int(max(0, min(255, (lum / 70) * 255)))
                t = max(0.0, min(1.0, (lum - 40) / 180))
                c = int(lerp(180, 255, t))
                opx[x, y] = (c, c, c, alpha)
                continue

            # Reflection under stack
            if y > s_max + 2 or (y > s_max - 4 and lum < 70):
                base = WOOD_TONES[2]
                shade = max(0.4, min(0.9, lum / 140.0))
                wood = (
                    int(base[0] * shade),
                    int(base[1] * shade),
                    int(base[2] * shade),
                )
                alpha = int(max(30, min(120, lum * 1.3)))
                opx[x, y] = (*wood, alpha)
                continue

            plank_i = int(min(2, max(0, (y - s_min) / band)))
            base = WOOD_TONES[plank_i]

            # Mild lighting from source luminance (keep plank colors distinct)
            shade = 0.78 + 0.35 * max(0.0, min(1.0, (lum - 40) / 170.0))
            # Side faces / grain lines are darker in source
            if lum < 100:
                shade *= 0.82

            wood = (
                int(min(255, base[0] * shade)),
                int(min(255, base[1] * shade)),
                int(min(255, base[2] * shade)),
            )
            opx[x, y] = (*wood, 255)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "PNG")
    print(f"wrote {OUT} size={out.size} icon_end={icon_end} bands={s_min}-{s_max}")


if __name__ == "__main__":
    main()
