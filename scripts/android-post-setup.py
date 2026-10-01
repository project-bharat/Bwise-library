#!/usr/bin/env python3
"""Run AFTER `npx cap add android` / `npx cap sync android` (idempotent).
 - locks the activity to portrait
 - stamps versionCode / versionName into android/app/build.gradle
Usage: python scripts/android-post-setup.py <versionCode> <versionName>
"""
import re, sys, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android', 'app')
code = sys.argv[1] if len(sys.argv) > 1 else '1'
name = sys.argv[2] if len(sys.argv) > 2 else '1.0'

manifest = os.path.join(ROOT, 'src', 'main', 'AndroidManifest.xml')
s = open(manifest, encoding='utf-8').read()
if 'android:screenOrientation' not in s:
    s = s.replace('<activity', '<activity android:screenOrientation="portrait"', 1)
    open(manifest, 'w', encoding='utf-8').write(s)
    print('manifest: portrait lock added')
else:
    print('manifest: portrait lock already present')

gradle = os.path.join(ROOT, 'build.gradle')
g = open(gradle, encoding='utf-8').read()
g = re.sub(r'versionCode\s+\d+', 'versionCode ' + code, g, count=1)
g = re.sub(r'versionName\s+"[^"]*"', 'versionName "' + name + '"', g, count=1)
open(gradle, 'w', encoding='utf-8').write(g)
print('gradle: versionCode', code, 'versionName', name)
