"""
One-time helper that DRAWS placeholder source artwork:
  resources/icons/ic_launcher_background.png  (1024x1024, full-bleed)
  resources/icons/ic_launcher_foreground.png  (1024x1024, transparent, art inside central ~60% safe zone)
Replace these two PNGs with your own final artwork any time (same names, 1024x1024) -
every launcher/brand icon is regenerated from them by scripts/generate-icons.py.
"""
import os
from PIL import Image, ImageDraw

S = 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'resources', 'icons')
os.makedirs(OUT, exist_ok=True)

# background: forest -> teal diagonal gradient (app palette #1E3535 -> #047372)
bg = Image.new('RGB', (S, S))
px = bg.load()
c1, c2 = (0x1E, 0x35, 0x35), (0x04, 0x73, 0x72)
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * (S - 1))
        px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
bg.save(os.path.join(OUT, 'ic_launcher_background.png'))

# foreground: open book + bookmark, drawn at 4x then downsampled
K = 4
fg = Image.new('RGBA', (S * K, S * K), (0, 0, 0, 0))
d = ImageDraw.Draw(fg)
def P(x, y): return (x * K, y * K)

sand, alabaster, shade, teal = (212, 193, 163, 255), (244, 241, 234, 255), (186, 168, 138, 255), (56, 208, 201, 255)

d.polygon([P(512, 392), P(512, 690), P(330, 650), P(300, 372), P(330, 352)], fill=alabaster)
d.polygon([P(512, 392), P(512, 690), P(694, 650), P(724, 372), P(694, 352)], fill=sand)
d.polygon([P(512, 392), P(330, 352), P(330, 372), P(512, 414)], fill=shade)
d.polygon([P(512, 392), P(694, 352), P(694, 372), P(512, 414)], fill=(226, 211, 184, 255))
for y in [450, 500, 550, 600]:
    d.rounded_rectangle([P(352, y), P(470, y + 14)], radius=7 * K, fill=(30, 53, 53, 150))
    d.rounded_rectangle([P(554, y), P(672, y + 14)], radius=7 * K, fill=(30, 53, 53, 150))
d.rectangle([P(508, 392), P(516, 690)], fill=(30, 53, 53, 200))
d.polygon([P(600, 352), P(650, 352), P(650, 470), P(625, 448), P(600, 470)], fill=teal)

fg = fg.resize((S, S), Image.LANCZOS)
fg.save(os.path.join(OUT, 'ic_launcher_foreground.png'))
print('source icons written to', os.path.abspath(OUT))
