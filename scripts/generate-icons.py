"""Install the supplied launcher artwork into Capacitor's generated Android project."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
res = root / "android/app/src/main/res"
if res.is_dir():
    shutil.copytree(root / "resources/brand-res", res, dirs_exist_ok=True)
