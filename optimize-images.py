#!/usr/bin/env python3
"""
Optimize preview images:
- Convert PNGs/JPGs to WebP (quality 82, method 6)
- Re-optimize existing WebP files (resize + re-encode)
- Resize images wider than 1200px down to 1200px
"""
import os
import sys
import tempfile
import shutil
from pathlib import Path
from PIL import Image

PREVIEWS_DIR = "/Users/maximilianhauptmannl/shopify/section-hub/public/previews"
MAX_WIDTH = 1200
WEBP_QUALITY = 82
SUPPORTED = {".png", ".jpg", ".jpeg", ".webp"}

total_saved = 0
converted = 0
skipped = 0

for root, dirs, files in os.walk(PREVIEWS_DIR):
    for fname in files:
        ext = Path(fname).suffix.lower()
        if ext not in SUPPORTED:
            continue

        fpath = Path(root) / fname
        original_size = fpath.stat().st_size

        try:
            img = Image.open(fpath)

            # Convert palette/RGBA PNGs properly
            if img.mode in ("P", "PA"):
                img = img.convert("RGBA")
            if img.mode == "RGBA":
                bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
                bg.paste(img, mask=img)
                img = bg.convert("RGB")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Resize if too wide
            if img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / img.width
                new_height = int(img.height * ratio)
                img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)

            webp_path = fpath.with_suffix(".webp")

            if ext == ".webp":
                # Re-optimize: save to temp file first, then compare
                tmp_fd, tmp_path = tempfile.mkstemp(suffix=".webp")
                os.close(tmp_fd)
                img.save(tmp_path, "WEBP", quality=WEBP_QUALITY, method=6)
                new_size = os.path.getsize(tmp_path)

                if new_size < original_size:
                    shutil.move(tmp_path, str(fpath))
                    saved = original_size - new_size
                    pct = (saved / original_size) * 100
                    total_saved += saved
                    converted += 1
                    print(f"✅ {fname} (re-optimized)  "
                          f"{original_size/1024:.0f}KB → {new_size/1024:.0f}KB  "
                          f"(-{pct:.0f}%)")
                else:
                    os.remove(tmp_path)
                    skipped += 1
                    print(f"⏭️  {fname} already optimal  "
                          f"({original_size/1024:.0f}KB)")
            else:
                # PNG/JPG → WebP
                img.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
                new_size = webp_path.stat().st_size
                saved = original_size - new_size
                pct = (saved / original_size) * 100 if original_size > 0 else 0
                total_saved += saved
                converted += 1

                print(f"✅ {fname} → {webp_path.name}  "
                      f"{original_size/1024:.0f}KB → {new_size/1024:.0f}KB  "
                      f"(-{pct:.0f}%)")

                # Remove original PNG/JPG
                os.remove(fpath)

        except Exception as e:
            print(f"❌ {fname}: {e}", file=sys.stderr)

print(f"\n🎉 Done! Optimized {converted} images, skipped {skipped}.")
print(f"💾 Total saved: {total_saved/1024/1024:.1f} MB")
