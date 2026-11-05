"""Build favicon.ico / icon.png / apple-icon.png from the Logger plank art."""
from PIL import Image
from pathlib import Path

SRC = Path(r"C:\Users\Lou\.cursor\projects\c-projects-logger\assets\ico-cb6df1a6-810a-46f6-bc65-bdcf5eaf5081.png")
ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "app"
PUBLIC = ROOT / "public"
SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = pixels[x, y]
            if r < 18 and g < 18 and b < 18:
                pixels[x, y] = (0, 0, 0, 0)

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    cw, ch = img.size
    side = max(cw, ch)
    pad = int(side * 0.06)
    side = side + pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - cw) // 2, (side - ch) // 2), img)

    master = canvas.resize((512, 512), Image.Resampling.LANCZOS)
    brand = PUBLIC / "brand" / "logger-icon.png"
    brand.parent.mkdir(parents=True, exist_ok=True)
    master.save(brand, optimize=True)

    APP.mkdir(parents=True, exist_ok=True)
    master.save(APP / "icon.png", optimize=True)

    apple = canvas.resize((180, 180), Image.Resampling.LANCZOS)
    apple_bg = Image.new("RGBA", (180, 180), (18, 20, 23, 255))
    apple_bg.paste(apple, (0, 0), apple)
    apple_bg.convert("RGB").save(APP / "apple-icon.png", optimize=True)

    for path in (APP / "favicon.ico", PUBLIC / "favicon.ico"):
        master.save(path, format="ICO", sizes=SIZES)
        print("wrote", path, path.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
