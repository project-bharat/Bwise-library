#!/usr/bin/env python3
"""
Generates every icon from the two source PNGs in resources/icons/:
    ic_launcher_foreground.png   (1024x1024, transparent)
    ic_launcher_background.png   (1024x1024)

Usage:
    python scripts/generate-icons.py --brand     # writes src/assets/brand-icon.png (used in footers + PDF slips)
    python scripts/generate-icons.py --android   # writes android/app/src/main/res/mipmap-* (needs `npx cap add android` first)
    python scripts/generate-icons.py             # both (android only if the android/ folder exists)
"""
import os, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'resources', 'icons')
_FG_SOURCE = Image.open(os.path.join(SRC, 'ic_launcher_foreground.png')).convert('RGBA')
BG = Image.open(os.path.join(SRC, 'ic_launcher_background.png')).convert('RGBA')
S = max(_FG_SOURCE.size)

def centered_foreground(source, canvas_size):
    """Trim transparent padding, then re-center the visible mark on the adaptive-icon canvas."""
    alpha = source.getchannel('A')
    # Ignore tiny antialiasing/noise pixels when determining the visible logo bounds.
    alpha = alpha.point(lambda value: 255 if value > 8 else 0)
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    mark = source.crop(bbox)
    # Re-center visible artwork and scale conservatively inside the adaptive-icon safe area.
    target = int(canvas_size * 0.52)
    scale = min(target / mark.width, target / mark.height)
    mark = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(mark, ((canvas_size - mark.width) // 2, (canvas_size - mark.height) // 2))
    return canvas

FG = centered_foreground(_FG_SOURCE, S)

def composite():
    img = BG.resize(FG.size, Image.LANCZOS).copy()
    img.alpha_composite(FG)
    return img

def legacy_square():
    # Keep the complete source canvas for legacy icons too. Cropping here zoomed the
    # mark into the launcher mask and clipped its lower/right edges on some launchers.
    return composite()

def rounded(img, radius_ratio):
    size = img.size[0]
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * radius_ratio), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = img.copy().convert('RGBA'); out.putalpha(mask); return out

def make_brand():
    out_dir = os.path.join(ROOT, 'src', 'assets'); os.makedirs(out_dir, exist_ok=True)
    img = rounded(legacy_square().resize((192, 192), Image.LANCZOS), 0.22)
    img.save(os.path.join(out_dir, 'brand-icon.png'), optimize=True)
    pub = os.path.join(ROOT, 'public'); os.makedirs(pub, exist_ok=True)
    rounded(legacy_square().resize((192, 192), Image.LANCZOS), 0.22).save(os.path.join(pub, 'favicon.png'))
    print('brand icon -> src/assets/brand-icon.png')

def make_android():
    res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
    if not os.path.isdir(res):
        print('android/ not found - skipping launcher icons (run `npx cap add android` first)'); return
    legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    adaptive = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
    sq = legacy_square()
    for d in legacy:
        folder = os.path.join(res, 'mipmap-' + d); os.makedirs(folder, exist_ok=True)
        l = sq.resize((legacy[d], legacy[d]), Image.LANCZOS)
        rounded(l, 0.12).save(os.path.join(folder, 'ic_launcher.png'))
        rounded(l, 0.5).save(os.path.join(folder, 'ic_launcher_round.png'))
        a = adaptive[d]
        FG.resize((a, a), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'))
        BG.resize((a, a), Image.LANCZOS).convert('RGB').save(os.path.join(folder, 'ic_launcher_background.png'))
    anydpi = os.path.join(res, 'mipmap-anydpi-v26'); os.makedirs(anydpi, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
           '</adaptive-icon>\n')
    for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        open(os.path.join(anydpi, n), 'w').write(xml)
    # remove Capacitor's default vector layers so nothing shadows ours
    for p in ('drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml'):
        fp = os.path.join(res, p)
        if os.path.exists(fp): os.remove(fp)
    print('android launcher icons written to', res)

if __name__ == '__main__':
    args = set(sys.argv[1:])
    if not args or '--brand' in args: make_brand()
    if not args or '--android' in args: make_android()
