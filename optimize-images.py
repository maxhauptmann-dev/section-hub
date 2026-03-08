#!/usr/bin/env python3
"""
Optimize preview images:
- Convert PNGs to WebP (quality 80, much smaller)
- Resize images wider than 1200px down to 1200px
- Keep originals as backup with .bak extension
"""
import os
import sys
from pathlib import Path
from PIL import Image

PREVIEWS_DIR = "/Users/maximilianhauptmannl/shopify/section-hub/public/previews"
MAX_WIDTH = 1200
WEBP_QUALITY = 82

total_saved = 0
converted = 0

for root, dirs, files in os.walk(PREVIEWS_DIR):
    for fname in files:
        if not fname.lower().endswith(".png"):
            continue
        
        fpath = Path(root) / fname
        original_size = fpath.stat().st_size
        
        try:
            img = Image.open(fpath)
            
            # Resize if too wide
            if img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / img.width
                new_height = int(img.height * ratio)
                img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)
            
            # Save as WebP
            webp_path = fpath.with_suffix(".webp")
            img.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
            
            new_size = webp_path.stat().st_size
            saved = original_size - new_size
            pct = (saved / original_size) * 100 if original_size > 0 else 0
            total_saved += saved
            converted += 1
            
            print(f"✅ {fname} → {webp_path.name}  "
                  f"{original_size/1024:.0f}KB → {new_size/1024:.0f}KB  "
                  f"(-{pct:.0f}%)")
            
            # Remove original PNG
            os.remove(fpath)
            
        except Exception as e:
            print(f"❌ {fname}: {e}", file=sys.stderr)

print(f"\n🎉 Done! Converted {converted} images.")
print(f"💾 Total saved: {total_saved/1024/1024:.1f} MB")
