#!/usr/bin/env python3
"""
Classify all sections into basic / advanced / premium tiers
and update meta.json files with new pricing + tier field.

Pricing:
  basic    → €8  (free sections stay free)
  advanced → €15
  premium  → €22
"""

import json, os, glob

SECTIONS_DIR = "/Users/maximilianhauptmannl/Projekte /SectionIQ /section-hub/app/sections"

# ── CLASSIFICATION ──────────────────────────────────────────

# FREE sections (stay free, tier = "basic")
FREE = {
    "cta-banner",
    "feature-columns",
    "features-with-image",
    "hero-banner",
    "hero-minimal",
    "image-with-text",
    "newsletter-banner",
    "rich-text",
    "scrolling-announcement",
    "trust-badges",
}

# PREMIUM (€22) — Complex animations, scroll-triggered, experimental, high-effort
PREMIUM = {
    # Scroll Triggered
    "scroll-card-cascade",
    "scroll-card-stack",
    "scroll-counter-reveal",
    "scroll-fade-layers",
    "scroll-highlight-text",
    "scroll-morph-gallery",
    "scroll-parallax-grid",
    "scroll-pin-timeline",
    "scroll-split-reveal",
    "scroll-storyteller",
    "scroll-text-magnify",
    "scroll-velocity-text",
    "scroll-zoom-reveal",
    # Video (complex)
    "video-cinema-hero",
    "video-feature-reel",
    "video-marquee-loop",
    "video-showcase-reel",
    "video-split-player",
    "video-card-gallery",
    # Before/After (complex)
    "before-after-hotspots",
    "before-after-morph",
    "before-after-gallery",
    "before-after-timeline",
    # Sliders (complex 3D / parallax)
    "slider-3d-coverflow",
    "slider-cinema-strip",
    "slider-morphing-panels",
    "slider-parallax-cards",
    "slider-split-reveal",
    "slider-story-cards",
    # Featured Collection (complex)
    "featured-collection-coverflow",
    "featured-collection-lookbook",
    "featured-collection-mosaic",
    "featured-collection-runway",
    "featured-collection-spotlight",
    "featured-collection-storyboard",
    # Collection (complex)
    "collection-card-stack",
    "collection-magazine",
    "collection-marquee-tape",
    "collection-orbit-ring",
    "collection-polaroid-wall",
    "collection-reveal-tiles",
    # Counter/Timer (complex animations)
    "counter-flip-board",
    "counter-radial-gauge",
    "timer-liquid-morph",
    "timer-neon-glow",
    "timer-orbit-rings",
    # Heroes (complex)
    "hero-cinematic",
    "hero-marquee-split",
    "hero-mosaic",
    "hero-parallax-layers",
    "hero-particle-float",
    "hero-reveal",
    "hero-spotlight",
    # Image (complex)
    "image-lens-focus",
    "image-prism-rotate",
    "image-reveal-carousel",
    "image-lookbook-scroll",
    # Other premium
    "logo-carousel-spin",
    "product-wave-carousel",
    "testimonial-carousel",
    "testimonial-orbit-carousel",
    "feature-orbit-icons",
    "spin-wheel-popup",
}

# BASIC (€8) — Simpler, standard sections
BASIC = {
    "press-logos",
    "logo-cloud",
    "scrolling-text",
    "testimonial-cards",
    "testimonial-image-review",
    "testimonial-scrolling",
    "testimonial-video-slider",
    "collection-grid",
    "collection-circles",
    "product-slider",
    "featured-collection-tabs",
    "hero-split",
    "hero-slideshow",
    "slider-cards",
    "slideshow-product",
    "header-announcement",
    "header-bold",
    "header-classic",
    "header-glass",
    "header-modern",
    "footer-editorial",
    "newsletter-popup",
    "shop-the-look",
    "category-scroll",
}

# Everything else = ADVANCED (€15)

def classify(section_id):
    if section_id in FREE:
        return "basic", None  # keep free
    if section_id in PREMIUM:
        return "premium", 22
    if section_id in BASIC:
        return "basic", 8
    return "advanced", 15

# ── UPDATE ──────────────────────────────────────────────────

updated = 0
errors = []

for meta_path in sorted(glob.glob(os.path.join(SECTIONS_DIR, "*/meta.json"))):
    section_id = os.path.basename(os.path.dirname(meta_path))
    
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"  ❌ {section_id}: JSON error: {e}")
        continue
    
    tier, new_price = classify(section_id)
    
    # Add tier field
    data["tier"] = tier
    
    # Update price (keep free sections free)
    old_price = data.get("price", {})
    old_amount = old_price.get("amount", 0)
    old_type = old_price.get("type", "free")
    
    if new_price is not None:
        data["price"] = {
            "type": "one_time",
            "amount": new_price,
            "currency": "EUR"
        }
    else:
        # Free section
        data["price"] = {
            "type": "free",
            "amount": 0
        }
    
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    
    price_str = f"€{new_price}" if new_price else "FREE"
    old_str = f"€{old_amount}" if old_amount else "FREE"
    change = " ✨" if old_str != price_str else ""
    print(f"  {tier.upper():8s} | {price_str:5s} (was {old_str:5s}) | {section_id}{change}")
    updated += 1

print(f"\n✅ Updated {updated} sections")
if errors:
    print("\nErrors:")
    for e in errors:
        print(e)

# Summary
basic_count = sum(1 for m in glob.glob(os.path.join(SECTIONS_DIR, "*/meta.json"))
                  for d in [json.load(open(m))] if d.get("tier") == "basic")
advanced_count = sum(1 for m in glob.glob(os.path.join(SECTIONS_DIR, "*/meta.json"))
                     for d in [json.load(open(m))] if d.get("tier") == "advanced")
premium_count = sum(1 for m in glob.glob(os.path.join(SECTIONS_DIR, "*/meta.json"))
                    for d in [json.load(open(m))] if d.get("tier") == "premium")

print(f"\n📊 Tier distribution:")
print(f"   🟢 Basic:    {basic_count}")
print(f"   🔵 Advanced: {advanced_count}")
print(f"   🟣 Premium:  {premium_count}")
