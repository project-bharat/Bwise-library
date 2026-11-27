# Bwise Library: asset guidelines

## Colours
- Brand gradient (backgrounds): #1E3535 (top-left) to #047372 (bottom-right), 135 degrees
- Mark gradient (on light): #263838 to #17AB9E
- Wordmark / mono: #293B3B
- Flat dark background: #1E3535

## Construction (see construction_sheet.png)
- Mark: width : height = 1.06 : 1. Spine gap between the two halves = 11% of mark width.
- Mark is balanced: ink top half 50.2% / bottom half 49.8%, ink centre at 49.7% of height. Never nudge it.
- Horizontal lockup: mark height = 100%. Text block runs from cap top (10.2%) to the "y" descender (100%). "Library" baseline sits at 90.5%. Gap mark to text = 0.13 x mark height. Text width = 1.63 x mark height.
- Stacked lockup: mark above wordmark, gap = 0.17 x mark height, wordmark width = 1.65 x mark height, centred on the mark.

## Optical centering (important)
"Bwise" is bold and "Library" is light, so the wordmark carries 2.1x more ink in its top half. Both lockups therefore sit visually high when centred by bounding box, and the space below looks larger.
- Horizontal lockup: place 1.5% of its height lower than bbox centre.
- Stacked lockup: place 2.5% of its height lower than bbox centre.
- Mark alone: centre exactly (0% shift).
The padded files in /logos already include this shift, so centring the file centres the logo optically. Use the _tight files for custom layouts and apply the shift yourself.

## Clear space
At least 25% of logo height on every side (included in the padded /logos files).

## Minimum sizes
- Mark: 16 px (digital) / 6 mm (print)
- Horizontal lockup: 120 px wide
- Stacked lockup: 80 px wide. Below that, use the mark alone.

## Versions
Colour on white or light backgrounds. White on the dark green or gradient backgrounds. Mono (#293B3B) for one-colour print.
Never stretch, rotate, recolour, add shadows, or put the colour logo on the gradient.

## Android adaptive icon
- Layers are 108x108 dp. Only the central 72 dp is guaranteed visible.
- The farthest point of the mark must sit inside a 66 dp circle. Here it is 62 dp.
- Mark is centred horizontally on x = 54 and dropped 4.3 dp (10% of its height) below y = 54. Its pointed top corners are the farthest points from the centre, so a bbox-centred mark looked high in round masks (closest approach to the mask edge: 5.3 dp at top vs 11.5 dp at bottom). After the drop: 8.0 vs 9.0 dp in a circle, 13.1 vs 12.8 in a squircle, 14.5 vs 15.7 in a rounded square.
- Same 10% drop is applied to the round legacy icon, the maskable PWA icon and the Android 12 splash icon. Square-only icons (Play Store, legacy square, apple-touch, favicons) stay bbox-centred.
- Foreground and monochrome layers are transparent; background is a vector gradient.
- Play Store icon is a 512x512 full-bleed square. Do not bake in rounded corners or a circle.

## Source quality
Masters were rebuilt from raster PNGs, so large exports are upscaled. For print or signage, trace the mark and wordmark to SVG and use that as the master.
