#!/usr/bin/env python3
"""Run AFTER `npx cap add android` / `npx cap sync android` (idempotent).
 - locks the activity to portrait
 - stamps versionCode / versionName into android/app/build.gradle
Usage: python scripts/android-post-setup.py <versionCode> <versionName>
"""
import re, sys, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android', 'app')
code = sys.argv[1] if len(sys.argv) > 1 else '1'
name = sys.argv[2] if len(sys.argv) > 2 else '1.0'

manifest = os.path.join(ROOT, 'src', 'main', 'AndroidManifest.xml')
s = open(manifest, encoding='utf-8').read()
# Declare runtime permissions for device contact selection and Android 13 notifications.
for permission in ('android.permission.READ_CONTACTS', 'android.permission.POST_NOTIFICATIONS'):
    declaration = f'<uses-permission android:name="{permission}" />'
    if declaration not in s:
        s = s.replace('<application', f'    {declaration}\n    <application', 1)
        print('manifest: added', permission)
if 'android:screenOrientation' not in s:
    s = s.replace('<activity', '<activity android:screenOrientation="portrait"', 1)
    print('manifest: portrait lock added')
else:
    print('manifest: portrait lock already present')
open(manifest, 'w', encoding='utf-8').write(s)

gradle = os.path.join(ROOT, 'build.gradle')
g = open(gradle, encoding='utf-8').read()
g = re.sub(r'versionCode\s+\d+', 'versionCode ' + code, g, count=1)
g = re.sub(r'versionName\s+"[^"]*"', 'versionName "' + name + '"', g, count=1)
open(gradle, 'w', encoding='utf-8').write(g)
print('gradle: versionCode', code, 'versionName', name)

# Build the native splash from the launcher foreground on the configured brand background.
# The React full-screen splash that follows uses public/horizontal-logo.png.
res = os.path.join(ROOT, 'src', 'main', 'res')
icons = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'resources', 'icons')
fg_path = os.path.join(icons, 'ic_launcher_foreground.png')
bg_path = os.path.join(icons, 'ic_launcher_background.png')
if os.path.isfile(fg_path) and os.path.isfile(bg_path):
    fg_source = Image.open(fg_path).convert('RGBA')
    alpha = fg_source.getchannel('A').point(lambda value: 255 if value > 8 else 0)
    bbox = alpha.getbbox()
    if bbox:
        mark = fg_source.crop(bbox)
        canvas_size = max(fg_source.size)
        target = int(canvas_size * 0.68)
        scale = min(target / mark.width, target / mark.height)
        mark = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.Resampling.LANCZOS)
        foreground = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        foreground.alpha_composite(mark, ((canvas_size - mark.width) // 2, (canvas_size - mark.height) // 2))
        background = Image.open(bg_path).convert('RGBA').resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
        background.alpha_composite(foreground)
        drawable = os.path.join(res, 'drawable')
        os.makedirs(drawable, exist_ok=True)
        background.save(os.path.join(drawable, 'splash.png'), optimize=True)
        print('native splash: drawable/splash.png generated from ic_launcher_foreground.png')
    else:
        print('native splash: foreground has no visible artwork; retaining default')
else:
    print('native splash: source icon assets missing; retaining default')

