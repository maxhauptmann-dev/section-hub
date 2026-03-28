#!/usr/bin/env python3
"""
Generate SVG mockup previews for sections that don't have any yet.
Each mockup visually represents the section's layout and function.
"""
import os, json

BASE = os.path.dirname(os.path.abspath(__file__))
SECTIONS_DIR = os.path.join(BASE, "app", "sections")
PREVIEWS_DIR = os.path.join(BASE, "public", "previews")

# ── Colour palettes per category ──────────────────────────────────
PAL = {
    "dark":     {"bg": "#0f0f1a", "fg": "#ffffff", "sub": "#8888aa", "accent": "#818cf8", "accent2": "#c084fc", "card": "#1a1a2e", "border": "#2a2a44"},
    "warm":     {"bg": "#1a1410", "fg": "#ffffff", "sub": "#a09080", "accent": "#c9a96e", "accent2": "#e8c888", "card": "#2a2218", "border": "#3a3228"},
    "cool":     {"bg": "#0a1628", "fg": "#ffffff", "sub": "#7090b0", "accent": "#38bdf8", "accent2": "#818cf8", "card": "#0f1e38", "border": "#1a2e4e"},
    "neon":     {"bg": "#0a0a14", "fg": "#ffffff", "sub": "#8888aa", "accent": "#22d3ee", "accent2": "#f472b6", "card": "#14142a", "border": "#2a2a44"},
    "light":    {"bg": "#f8f8f8", "fg": "#1a1a1a", "sub": "#666666", "accent": "#6366f1", "accent2": "#8b5cf6", "card": "#ffffff", "border": "#e5e7eb"},
    "editorial":{"bg": "#faf8f5", "fg": "#1a1a1a", "sub": "#777777", "accent": "#c9a96e", "accent2": "#b08840", "card": "#ffffff", "border": "#e8e4dd"},
}

def svg_wrap(content, w=600, h=360):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n{content}\n</svg>'

def gradient_def(id, c1, c2, angle="135"):
    if angle == "135":
        return f'<linearGradient id="{id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="{c1}"/><stop offset="100%" stop-color="{c2}"/></linearGradient>'
    return f'<linearGradient id="{id}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="{c1}"/><stop offset="100%" stop-color="{c2}"/></linearGradient>'

def img_placeholder(x, y, w, h, rx=8, color="#2a2a44"):
    cx, cy = x + w//2, y + h//2
    return f'''<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{color}"/>
<line x1="{x+8}" y1="{y+8}" x2="{x+w-8}" y2="{y+h-8}" stroke="{color}" stroke-width="1" opacity=".3"/>
<line x1="{x+w-8}" y1="{y+8}" x2="{x+8}" y2="{y+h-8}" stroke="{color}" stroke-width="1" opacity=".3"/>'''

def star_row(x, y, count=5, size=10, color="#fbbf24"):
    stars = ""
    for i in range(count):
        sx = x + i * (size + 3)
        stars += f'<text x="{sx}" y="{y}" font-size="{size}" fill="{color}">★</text>'
    return stars

# ── Section-specific mockup generators ────────────────────────────

def mock_collection_card_stack(p):
    cards = ""
    for i in range(3):
        ox = 180 + i*15
        oy = 60 - i*8
        cards += f'<rect x="{ox}" y="{oy}" width="240" height="240" rx="12" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1" transform="rotate({-6+i*6},{ox+120},{oy+120})"/>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<defs>{gradient_def("g","#818cf8","#c084fc")}</defs>
{cards}
<text x="300" y="330" text-anchor="middle" font-family="system-ui" font-size="13" fill="{p["sub"]}">Hover to fan out cards</text>''')

def mock_collection_grid(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="35" text-anchor="middle" font-family="system-ui" font-size="20" fill="{p["fg"]}" font-weight="700">Shop Collections</text>
{img_placeholder(20,55,275,135,10,p["card"])}
{img_placeholder(305,55,275,135,10,p["card"])}
{img_placeholder(20,200,275,135,10,p["card"])}
{img_placeholder(305,200,275,135,10,p["card"])}
<text x="157" y="133" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">Summer</text>
<text x="442" y="133" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">Winter</text>
<text x="157" y="278" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">New In</text>
<text x="442" y="278" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">Sale</text>''')

def mock_collection_magazine(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{img_placeholder(20,20,350,320,10,p["card"])}
{img_placeholder(385,20,190,155,10,p["card"])}
{img_placeholder(385,185,190,155,10,p["card"])}
<text x="195" y="190" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["fg"]}" font-weight="700">Editorial</text>
<text x="480" y="105" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}" font-weight="600">Style</text>
<text x="480" y="270" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}" font-weight="600">Looks</text>''')

def mock_collection_marquee(p):
    cards = ""
    for i in range(5):
        x = 10 + i*120
        cards += f'<rect x="{x}" y="100" width="110" height="160" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
        cards += f'<text x="{x+55}" y="190" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Collection</text>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="60" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["fg"]}" font-weight="700">Collections</text>
{cards}
<text x="20" y="300" font-family="system-ui" font-size="11" fill="{p["accent"]}">← Auto-scrolling marquee →</text>''')

def mock_collection_orbit(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<circle cx="300" cy="180" r="130" fill="none" stroke="{p["border"]}" stroke-width="1" stroke-dasharray="4,4"/>
<circle cx="300" cy="180" r="40" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
<text x="300" y="184" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}" font-weight="600">SHOP</text>
<rect x="255" y="42" width="90" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="400" y="120" width="90" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="400" y="230" width="90" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="110" y="120" width="90" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="110" y="230" width="90" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="255" y="268" width="90" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>''')

def mock_collection_polaroid(p):
    cards = ""
    positions = [(80,60,-8), (250,80,4), (420,50,-3), (160,200,6), (340,210,-5)]
    for i,(x,y,r) in enumerate(positions):
        cards += f'<g transform="rotate({r},{x+70},{y+55})"><rect x="{x}" y="{y}" width="140" height="110" rx="3" fill="#fefefe"/><rect x="{x+10}" y="{y+8}" width="120" height="75" fill="{p["card"]}"/><text x="{x+70}" y="{y+102}" text-anchor="middle" font-family="system-ui" font-size="8" fill="#888">Polaroid</text></g>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{cards}''')

def mock_collection_reveal_tiles(p):
    tiles = ""
    positions = [(20,20,185,165), (215,20,175,165), (400,20,180,165), (20,195,270,140), (300,195,280,140)]
    for x,y,w,h in positions:
        tiles += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{tiles}
<text x="300" y="355" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Tiles reveal on scroll</text>''')

def mock_popup(p, title, icon, elements=""):
    return svg_wrap(f'''<rect width="600" height="360" fill="#222"/>
<rect width="600" height="360" fill="rgba(0,0,0,0.5)"/>
<rect x="120" y="40" width="360" height="280" rx="16" fill="{p["bg"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="300" y="100" text-anchor="middle" font-size="32">{icon}</text>
<text x="300" y="140" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["fg"]}" font-weight="700">{title}</text>
{elements}
<circle cx="458" cy="60" r="14" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="458" y="65" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["sub"]}">×</text>''')

def mock_countdown_popup(p):
    timer = f'''<text x="300" y="175" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["sub"]}">Limited time offer</text>
<g transform="translate(200,190)">
  <rect x="0" y="0" width="50" height="45" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
  <text x="25" y="28" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["accent"]}" font-weight="700">02</text>
  <text x="25" y="42" text-anchor="middle" font-family="system-ui" font-size="7" fill="{p["sub"]}">HRS</text>
  <text x="62" y="28" font-family="system-ui" font-size="18" fill="{p["accent"]}">:</text>
  <rect x="72" y="0" width="50" height="45" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
  <text x="97" y="28" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["accent"]}" font-weight="700">45</text>
  <text x="97" y="42" text-anchor="middle" font-family="system-ui" font-size="7" fill="{p["sub"]}">MIN</text>
  <text x="134" y="28" font-family="system-ui" font-size="18" fill="{p["accent"]}">:</text>
  <rect x="144" y="0" width="50" height="45" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
  <text x="169" y="28" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["accent"]}" font-weight="700">30</text>
  <text x="169" y="42" text-anchor="middle" font-family="system-ui" font-size="7" fill="{p["sub"]}">SEC</text>
</g>
<rect x="210" y="250" width="180" height="36" rx="18" fill="{p["accent"]}"/>
<text x="300" y="273" text-anchor="middle" font-family="system-ui" font-size="12" fill="#fff" font-weight="600">GRAB THE DEAL</text>'''
    return mock_popup(p, "Flash Sale!", "⏰", timer)

def mock_quiz_popup(p):
    quiz = f'''<text x="300" y="175" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Question 1 of 3</text>
<rect x="180" y="183" width="240" height="4" rx="2" fill="{p["card"]}"/>
<rect x="180" y="183" width="80" height="4" rx="2" fill="{p["accent"]}"/>
<rect x="155" y="200" width="130" height="50" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="220" y="221" text-anchor="middle" font-size="16">✨</text>
<text x="220" y="240" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Something new</text>
<rect x="315" y="200" width="130" height="50" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="380" y="221" text-anchor="middle" font-size="16">🎁</text>
<text x="380" y="240" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">A gift</text>
<rect x="155" y="260" width="130" height="50" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="220" y="281" text-anchor="middle" font-size="16">💎</text>
<text x="220" y="300" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Premium</text>
<rect x="315" y="260" width="130" height="50" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="380" y="281" text-anchor="middle" font-size="16">🏷️</text>
<text x="380" y="300" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Best deal</text>'''
    return mock_popup(p, "Find Your Match", "🎯", quiz)

def mock_counter(p, style_label, elements):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="50" text-anchor="middle" font-family="system-ui" font-size="20" fill="{p["fg"]}" font-weight="700">Our Numbers</text>
<text x="300" y="72" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">{style_label}</text>
{elements}''')

def mock_counter_flip(p):
    els = ""
    vals = [("1","2","3","4","Customers"), ("9","8","%","","Satisfaction"), ("5","0","+","","Awards")]
    for i,(a,b,c,d,label) in enumerate(vals):
        bx = 60 + i*200
        for j,ch in enumerate([a,b,c,d]):
            if not ch: continue
            cx = bx + j*38
            els += f'<rect x="{cx}" y="110" width="32" height="52" rx="4" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
            els += f'<line x1="{cx}" y1="136" x2="{cx+32}" y2="136" stroke="{p["bg"]}" stroke-width="1"/>'
            els += f'<text x="{cx+16}" y="145" text-anchor="middle" font-family="system-ui" font-size="22" fill="{p["accent"]}" font-weight="700">{ch}</text>'
        els += f'<text x="{bx+60}" y="185" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">{label}</text>'
    return mock_counter(p, "Split-flap retro display", els)

def mock_counter_milestone(p):
    els = f'''<line x1="300" y1="100" x2="300" y2="320" stroke="{p["border"]}" stroke-width="2"/>'''
    milestones = [(160, 120, "2018", "Founded"), (340, 180, "500+", "Clients"), (160, 240, "10K", "Projects"), (340, 300, "99%", "Satisfaction")]
    for x,y,val,label in milestones:
        els += f'''<circle cx="300" cy="{y}" r="6" fill="{p["accent"]}"/>
<rect x="{x}" y="{y-18}" width="100" height="36" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="{x+50}" y="{y-1}" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["accent"]}" font-weight="700">{val}</text>
<text x="{x+50}" y="{y+13}" text-anchor="middle" font-family="system-ui" font-size="8" fill="{p["sub"]}">{label}</text>'''
    return mock_counter(p, "Timeline milestone path", els)

def mock_counter_radial(p):
    els = ""
    gauges = [(120, "85%", "Quality"), (300, "92%", "Happy"), (480, "78%", "Growth")]
    for cx,val,label in gauges:
        els += f'''<circle cx="{cx}" cy="200" r="60" fill="none" stroke="{p["card"]}" stroke-width="8"/>
<circle cx="{cx}" cy="200" r="60" fill="none" stroke="{p["accent"]}" stroke-width="8" stroke-dasharray="280 377" stroke-linecap="round" transform="rotate(-90,{cx},200)"/>
<text x="{cx}" y="205" text-anchor="middle" font-family="system-ui" font-size="20" fill="{p["fg"]}" font-weight="700">{val}</text>
<text x="{cx}" y="290" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">{label}</text>'''
    return mock_counter(p, "Animated radial gauges", els)

def mock_counter_wave_bars(p):
    els = ""
    bars = [(80,180,"1.2K","Sales"), (180,140,"95%","Rating"), (280,100,"500+","Reviews"), (380,160,"24/7","Support"), (480,120,"50+","Countries")]
    for x,h,val,label in bars:
        els += f'''<rect x="{x}" y="{h}" width="60" height="{310-h}" rx="6" fill="{p["accent"]}" opacity=".8"/>
<text x="{x+30}" y="{h-8}" text-anchor="middle" font-family="system-ui" font-size="13" fill="{p["fg"]}" font-weight="700">{val}</text>
<text x="{x+30}" y="335" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">{label}</text>'''
    return mock_counter(p, "Animated wave bar chart", els)

def mock_faq(p, style_label, elements):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="40" text-anchor="middle" font-family="system-ui" font-size="20" fill="{p["fg"]}" font-weight="700">FAQ</text>
<text x="300" y="58" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">{style_label}</text>
{elements}''')

def mock_faq_card_grid(p):
    els = ""
    qs = ["How does shipping work?", "Return policy?", "Contact support?", "Payment methods?", "Warranty info?", "Track my order?"]
    for i,q in enumerate(qs):
        x = 20 + (i%3)*195
        y = 80 + (i//3)*130
        els += f'''<rect x="{x}" y="{y}" width="180" height="115" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="{x+15}" y="{y+20}" font-family="system-ui" font-size="14" fill="{p["accent"]}">?</text>
<text x="{x+15}" y="{y+45}" font-family="system-ui" font-size="11" fill="{p["fg"]}" font-weight="600">{q}</text>
<text x="{x+15}" y="{y+70}" font-family="system-ui" font-size="9" fill="{p["sub"]}">Click to expand</text>'''
    return mock_faq(p, "Card grid layout", els)

def mock_faq_chat(p):
    els = ""
    chats = [("How do I return?", True, 80), ("Simply go to orders...", False, 140), ("Is shipping free?", True, 210), ("Yes, on all orders!", False, 270)]
    for text, is_q, y in chats:
        if is_q:
            els += f'''<rect x="200" y="{y}" width="370" height="40" rx="16" fill="{p["accent"]}"/>
<text x="385" y="{y+25}" text-anchor="middle" font-family="system-ui" font-size="12" fill="#fff">{text}</text>'''
        else:
            els += f'''<rect x="30" y="{y}" width="370" height="40" rx="16" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="215" y="{y+25}" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}">{text}</text>'''
    return mock_faq(p, "Messenger-style chat bubbles", els)

def mock_faq_flip(p):
    els = ""
    qs = ["Shipping?", "Returns?", "Payment?", "Warranty?"]
    for i,q in enumerate(qs):
        x = 30 + i*145
        els += f'''<rect x="{x}" y="90" width="130" height="160" rx="12" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="{x+65}" y="155" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">{q}</text>
<text x="{x+65}" y="180" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Click to flip</text>
<text x="{x+65}" y="230" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["accent"]}">↻</text>'''
    return mock_faq(p, "Interactive 3D flip cards", els)

def mock_faq_search_timeline(p):
    els = f'''<rect x="150" y="80" width="300" height="36" rx="18" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="175" y="103" font-family="system-ui" font-size="12" fill="{p["sub"]}">🔍 Search questions...</text>
<line x1="300" y1="130" x2="300" y2="340" stroke="{p["border"]}" stroke-width="2"/>'''
    items = [(140, "How does shipping work?"), (200, "What's your return policy?"), (260, "How to track orders?")]
    for y, q in items:
        els += f'''<circle cx="300" cy="{y}" r="5" fill="{p["accent"]}"/>
<rect x="320" y="{y-15}" width="240" height="30" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="335" y="{y+4}" font-family="system-ui" font-size="10" fill="{p["fg"]}">{q}</text>'''
    return mock_faq(p, "Search + timeline layout", els)

def mock_faq_spotlight(p):
    els = ""
    items = [("How does shipping work?", True), ("Return policy?", False), ("Payment methods?", False), ("Warranty info?", False)]
    for i,(q,active) in enumerate(items):
        y = 85 + i*60
        bg = p["accent"] if active else p["card"]
        tc = "#fff" if active else p["fg"]
        els += f'''<rect x="50" y="{y}" width="500" height="48" rx="10" fill="{bg}" stroke="{p["border"]}" stroke-width="1"/>
<text x="75" y="{y+29}" font-family="system-ui" font-size="13" fill="{tc}" font-weight="{"600" if active else "400"}">{q}</text>
<text x="525" y="{y+29}" text-anchor="middle" font-family="system-ui" font-size="14" fill="{tc}">{"−" if active else "+"}</text>'''
    return mock_faq(p, "Glowing spotlight on active", els)

def mock_faq_tabbed(p):
    tabs = f'''<rect x="50" y="80" width="120" height="32" rx="6" fill="{p["accent"]}"/>
<text x="110" y="101" text-anchor="middle" font-family="system-ui" font-size="11" fill="#fff" font-weight="600">Shipping</text>
<rect x="180" y="80" width="120" height="32" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="240" y="101" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Returns</text>
<rect x="310" y="80" width="120" height="32" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="370" y="101" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Payment</text>'''
    items = ""
    for i,q in enumerate(["How long does shipping take?", "Do you ship internationally?", "What carriers do you use?"]):
        y = 130 + i*65
        items += f'''<rect x="50" y="{y}" width="500" height="52" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="75" y="{y+30}" font-family="system-ui" font-size="12" fill="{p["fg"]}">{q}</text>
<text x="530" y="{y+30}" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["sub"]}">+</text>'''
    return mock_faq(p, "Tabbed categories", tabs + items)

def mock_hero(p, title, subtitle, style_els=""):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<defs>{gradient_def("hg",p["accent"],p["accent2"])}</defs>
{style_els}
<text x="300" y="140" text-anchor="middle" font-family="system-ui" font-size="32" fill="{p["fg"]}" font-weight="700">{title}</text>
<text x="300" y="175" text-anchor="middle" font-family="system-ui" font-size="13" fill="{p["sub"]}">{subtitle}</text>
<rect x="235" y="200" width="130" height="40" rx="8" fill="url(#hg)"/>
<text x="300" y="225" text-anchor="middle" font-family="system-ui" font-size="13" fill="#fff" font-weight="600">Shop Now</text>''')

def mock_hero_cinematic(p):
    return mock_hero(p, "Cinematic Hero", "Parallax video background with letterbox bars",
        f'<rect width="600" height="40" fill="#000"/><rect y="320" width="600" height="40" fill="#000"/>')

def mock_hero_marquee_split(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{img_placeholder(0,0,300,360,0,p["card"])}
<rect x="0" y="140" width="600" height="60" fill="{p["accent"]}" opacity=".85" transform="rotate(-10,300,170)"/>
<text x="300" y="178" text-anchor="middle" font-family="system-ui" font-size="22" fill="#fff" font-weight="800" transform="rotate(-10,300,170)">MARQUEE TEXT BAND</text>
<text x="450" y="100" text-anchor="middle" font-family="system-ui" font-size="24" fill="{p["fg"]}" font-weight="700">Bold Split</text>
<text x="450" y="280" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["sub"]}">Shop Now →</text>''')

def mock_hero_mosaic(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{img_placeholder(20,20,200,165,8,p["card"])}
{img_placeholder(230,20,150,80,8,p["card"])}
{img_placeholder(390,20,190,165,8,p["card"])}
{img_placeholder(230,110,150,75,8,p["card"])}
{img_placeholder(20,195,280,145,8,p["card"])}
{img_placeholder(310,195,270,145,8,p["card"])}
<text x="300" y="195" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="700">Mosaic Hero</text>''')

def mock_hero_parallax(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<rect x="0" y="280" width="600" height="80" fill="{p["card"]}" opacity=".3"/>
<rect x="0" y="200" width="600" height="80" fill="{p["card"]}" opacity=".2"/>
<rect x="0" y="120" width="600" height="80" fill="{p["card"]}" opacity=".1"/>
<text x="300" y="100" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Layer 1 — slow</text>
<text x="300" y="210" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Layer 2 — medium</text>
<text x="300" y="310" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Layer 3 — fast</text>
<text x="300" y="180" text-anchor="middle" font-family="system-ui" font-size="28" fill="{p["fg"]}" font-weight="700">Parallax Layers</text>''')

def mock_hero_particle(p):
    dots = ""
    import random
    random.seed(42)
    for _ in range(30):
        x, y, r = random.randint(10,590), random.randint(10,350), random.randint(2,5)
        o = round(random.random()*0.5+0.1, 2)
        dots += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{p["accent"]}" opacity="{o}"/>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{dots}
<text x="300" y="160" text-anchor="middle" font-family="system-ui" font-size="28" fill="{p["fg"]}" font-weight="700">Particle Float</text>
<text x="300" y="190" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["sub"]}">Floating particles &amp; light orbs</text>
<rect x="235" y="210" width="130" height="38" rx="8" fill="{p["accent"]}"/>
<text x="300" y="234" text-anchor="middle" font-family="system-ui" font-size="12" fill="#fff" font-weight="600">Explore</text>''')

def mock_hero_reveal(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<rect x="150" y="40" width="300" height="200" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="300" y="150" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["sub"]}">Image expands to fullscreen on scroll ↓</text>
<text x="300" y="300" text-anchor="middle" font-family="system-ui" font-size="24" fill="{p["fg"]}" font-weight="700">Scroll Reveal</text>
<text x="300" y="325" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Window → Fullscreen transition</text>''')

def mock_hero_spotlight(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<defs><radialGradient id="spot"><stop offset="0%" stop-color="{p["accent"]}" stop-opacity=".25"/><stop offset="100%" stop-color="{p["bg"]}" stop-opacity="0"/></radialGradient></defs>
<circle cx="300" cy="180" r="150" fill="url(#spot)"/>
<text x="300" y="165" text-anchor="middle" font-family="system-ui" font-size="28" fill="{p["fg"]}" font-weight="700">Spotlight</text>
<text x="300" y="195" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["sub"]}">Radial spotlight follows cursor</text>
<rect x="235" y="215" width="130" height="38" rx="8" fill="{p["accent"]}"/>
<text x="300" y="239" text-anchor="middle" font-family="system-ui" font-size="12" fill="#fff" font-weight="600">Discover</text>''')

def mock_image_gallery(p, title, layout_els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">{title}</text>
{layout_els}''')

def mock_image_collage(p):
    els = f'''{img_placeholder(20,50,180,140,8,p["card"])}
{img_placeholder(210,50,170,200,8,p["card"])}
{img_placeholder(390,50,190,120,8,p["card"])}
{img_placeholder(20,200,180,140,8,p["card"])}
{img_placeholder(390,180,190,160,8,p["card"])}'''
    return mock_image_gallery(p, "Collage Minimal", els)

def mock_image_grid_light(p):
    els = ""
    for r in range(2):
        for c in range(3):
            x = 20 + c*195
            y = 50 + r*155
            els += img_placeholder(x, y, 180, 140, 8, p["card"])
    return mock_image_gallery(p, "Image Grid", els)

def mock_image_horizon_split(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{img_placeholder(0,0,300,180,0,p["card"])}
<text x="450" y="70" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">The Story</text>
<text x="450" y="95" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Alternating layout</text>
<text x="150" y="260" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Behind the Scenes</text>
<text x="150" y="285" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Editorial captions</text>
{img_placeholder(300,180,300,180,0,p["card"])}''')

def mock_image_lens_focus(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Lens Focus</text>
{img_placeholder(30,50,160,260,8,p["card"])}
<rect x="200" y="50" width="200" height="260" rx="10" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
<text x="300" y="185" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["accent"]}">In Focus</text>
{img_placeholder(410,50,160,260,8,p["card"])}
<text x="300" y="335" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Active image appears sharp, others blur</text>''')

def mock_image_lookbook(p):
    els = ""
    for i in range(4):
        x = 10 + i*150
        els += f'<rect x="{x}" y="60" width="140" height="250" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
        els += f'<text x="{x+70}" y="300" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Look {i+1}</text>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="40" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Lookbook</text>
{els}
<text x="300" y="340" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">← Horizontal scroll →</text>''')

def mock_image_mosaic_wall(p):
    tiles = f'''{img_placeholder(20,45,180,120,6,p["card"])}
{img_placeholder(210,45,180,200,6,p["card"])}
{img_placeholder(400,45,180,100,6,p["card"])}
{img_placeholder(20,175,180,160,6,p["card"])}
{img_placeholder(400,155,180,180,6,p["card"])}'''
    return mock_image_gallery(p, "Mosaic Wall", tiles)

def mock_image_prism(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Prism Rotate</text>
<g transform="translate(200,60)">
  <rect x="0" y="0" width="200" height="240" rx="4" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1" transform="skewY(-3)"/>
  <rect x="200" y="10" width="40" height="230" fill="{p["accent"]}" opacity=".2" transform="skewY(15)"/>
</g>
<text x="300" y="330" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">3D auto-rotating prism</text>''')

def mock_image_reveal_carousel(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<rect x="0" y="0" width="300" height="360" fill="{p["card"]}"/>
<rect x="300" y="0" width="300" height="360" fill="{p["accent"]}" opacity=".15"/>
<text x="150" y="170" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}">Current Slide</text>
<text x="450" y="170" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["accent"]}">Next Slide</text>
<line x1="300" y1="0" x2="300" y2="360" stroke="{p["accent"]}" stroke-width="3"/>
<text x="300" y="340" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Curtain reveal transition</text>''')

def mock_image_scatter(p):
    cards = ""
    import random
    random.seed(99)
    for i in range(6):
        x, y = random.randint(30,430), random.randint(30,220)
        r = random.randint(-12,12)
        cards += f'<g transform="rotate({r},{x+60},{y+50})"><rect x="{x}" y="{y}" width="120" height="95" rx="2" fill="#fefefe"/><rect x="{x+8}" y="{y+6}" width="104" height="65" fill="{p["card"]}"/><text x="{x+60}" y="{y+88}" text-anchor="middle" font-family="system-ui" font-size="7" fill="#888">Photo {i+1}</text></g>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
{cards}''')

def mock_logo_spin(p):
    els = ""
    for i in range(6):
        x = 20 + i*97
        els += f'<rect x="{x}" y="140" width="85" height="55" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
        els += f'<text x="{x+42}" y="172" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Logo</text>'
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="100" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Trusted By</text>
{els}
<text x="300" y="250" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">← Infinite auto-scroll →</text>''')

def mock_product_wave(p):
    els = ""
    offsets = [0, -10, 5, -15, 8]
    for i in range(5):
        x = 15 + i*120
        y = 100 + offsets[i]
        els += f'''<rect x="{x}" y="{y}" width="110" height="160" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="{x+10}" y="{y+10}" width="90" height="80" rx="6" fill="{p["border"]}"/>
<text x="{x+55}" y="{y+115}" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Product</text>
<text x="{x+55}" y="{y+130}" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["accent"]}" font-weight="600">$49</text>'''
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="60" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["fg"]}" font-weight="700">Trending Now</text>
{els}
<text x="300" y="310" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">~ Floating wave motion ~</text>''')

def mock_feature_orbit(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<circle cx="300" cy="180" r="120" fill="none" stroke="{p["border"]}" stroke-width="1" stroke-dasharray="6,4"/>
<circle cx="300" cy="180" r="50" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
<text x="300" y="184" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}" font-weight="700">Brand</text>
<circle cx="300" cy="55" r="22" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="300" y="60" text-anchor="middle" font-size="14">🚀</text>
<circle cx="420" cy="120" r="22" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="420" y="125" text-anchor="middle" font-size="14">⭐</text>
<circle cx="420" cy="240" r="22" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="420" y="245" text-anchor="middle" font-size="14">🔒</text>
<circle cx="300" cy="305" r="22" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="300" y="310" text-anchor="middle" font-size="14">💎</text>
<circle cx="180" cy="240" r="22" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="180" y="245" text-anchor="middle" font-size="14">🌿</text>
<circle cx="180" cy="120" r="22" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="180" y="125" text-anchor="middle" font-size="14">📦</text>''')

def mock_fc(p, title, layout_els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="35" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">{title}</text>
{layout_els}''')

def mock_fc_coverflow(p):
    els = f'''<rect x="80" y="80" width="120" height="180" rx="8" fill="{p["card"]}" opacity=".5" transform="skewY(3)"/>
<rect x="240" y="60" width="120" height="220" rx="8" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
<rect x="400" y="80" width="120" height="180" rx="8" fill="{p["card"]}" opacity=".5" transform="skewY(-3)"/>
<text x="300" y="180" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}">Featured</text>
<text x="300" y="310" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">3D Coverflow</text>'''
    return mock_fc(p, "Featured Collection", els)

def mock_fc_lookbook(p):
    els = f'''{img_placeholder(20,55,280,280,8,p["card"])}
<rect x="320" y="55" width="130" height="130" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="460" y="55" width="120" height="130" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="320" y="195" width="260" height="60" rx="6" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="450" y="230" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Editorial lookbook</text>'''
    return mock_fc(p, "Lookbook", els)

def mock_fc_mosaic(p):
    els = f'''{img_placeholder(20,55,190,145,8,p["card"])}
{img_placeholder(220,55,175,280,8,p["card"])}
{img_placeholder(405,55,175,130,8,p["card"])}
{img_placeholder(20,210,190,125,8,p["card"])}
{img_placeholder(405,195,175,140,8,p["card"])}'''
    return mock_fc(p, "Mosaic Collection", els)

def mock_fc_runway(p):
    els = ""
    for i in range(3):
        x = 20 + i*195
        if i % 2 == 0:
            els += f'<rect x="{x}" y="55" width="180" height="120" rx="8" fill="{p["card"]}"/><text x="{x+90}" y="195" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}">Product Name</text><text x="{x+90}" y="210" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["accent"]}">$129</text>'
        else:
            els += f'<text x="{x+90}" y="95" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}">Product Name</text><text x="{x+90}" y="110" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["accent"]}">$89</text><rect x="{x}" y="125" width="180" height="120" rx="8" fill="{p["card"]}"/>'
    return mock_fc(p, "Runway Collection", els)

def mock_fc_spotlight(p):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<defs><radialGradient id="fcs"><stop offset="0%" stop-color="{p["accent"]}" stop-opacity=".2"/><stop offset="100%" stop-color="{p["bg"]}" stop-opacity="0"/></radialGradient></defs>
<circle cx="300" cy="180" r="160" fill="url(#fcs)"/>
<rect x="210" y="50" width="180" height="230" rx="12" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="1"/>
<text x="300" y="305" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">Spotlight Product</text>
<text x="300" y="325" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["accent"]}">$199</text>''')

def mock_fc_storyboard(p):
    els = ""
    for i in range(3):
        x = 10 + i*200
        els += f'''<rect x="{x}" y="55" width="185" height="270" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="{x+10}" y="{65}" width="165" height="130" rx="4" fill="{p["border"]}"/>
<text x="{x+92}" y="225" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}" font-weight="600">Chapter {i+1}</text>
<text x="{x+92}" y="245" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Product story</text>'''
    return mock_fc(p, "Storyboard", els)

def mock_fc_tabs(p):
    tabs = f'''<rect x="120" y="55" width="100" height="28" rx="5" fill="{p["accent"]}"/>
<text x="170" y="74" text-anchor="middle" font-family="system-ui" font-size="10" fill="#fff" font-weight="600">New In</text>
<rect x="230" y="55" width="100" height="28" rx="5" fill="{p["card"]}"/>
<text x="280" y="74" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Best Sellers</text>
<rect x="340" y="55" width="100" height="28" rx="5" fill="{p["card"]}"/>
<text x="390" y="74" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Sale</text>'''
    products = ""
    for i in range(4):
        x = 40 + i*140
        products += f'''<rect x="{x}" y="100" width="120" height="150" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="{x+10}" y="110" width="100" height="80" rx="4" fill="{p["border"]}"/>
<text x="{x+60}" y="215" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Product</text>
<text x="{x+60}" y="230" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["accent"]}">$49</text>'''
    return mock_fc(p, "Collection Tabs", tabs + products)

def mock_fc_flyin(p):
    """FC Fly-In – 4 product cards with staggered offset suggesting animation."""
    products = ""
    for i in range(4):
        x = 40 + i*140
        # Stagger y-offset to suggest fly-in motion
        y_off = 100 + (3 - i) * 12
        opacity = 0.4 + i * 0.2
        products += f'''<rect x="{x}" y="{y_off}" width="120" height="160" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1" opacity="{opacity}"/>
<rect x="{x+10}" y="{y_off+10}" width="100" height="80" rx="4" fill="{p["border"]}" opacity="{opacity}"/>
<text x="{x+60}" y="{y_off+115}" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}" opacity="{opacity}">Product</text>
<text x="{x+60}" y="{y_off+130}" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["accent"]}" opacity="{opacity}">$59</text>'''
    # Arrow indicators suggesting upward fly-in
    arrows = f'''<text x="300" y="330" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">↑ Scroll-triggered fly-in</text>'''
    return mock_fc(p, "FC Fly-In", products + arrows)

def mock_footer(p, title, els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="700">{title}</text>
{els}''')

def mock_footer_mega(p):
    els = f'''<rect x="0" y="40" width="600" height="50" fill="{p["accent"]}" opacity=".1"/>
<text x="300" y="70" text-anchor="middle" font-family="system-ui" font-size="13" fill="{p["accent"]}" font-weight="600">Get 20% Off — Join Now →</text>
<text x="60" y="120" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Brand</text>
<text x="60" y="140" font-family="system-ui" font-size="9" fill="{p["sub"]}">Your trusted store.</text>
<text x="250" y="120" font-family="system-ui" font-size="11" fill="{p["fg"]}" font-weight="600">Shop</text>
<text x="250" y="140" font-family="system-ui" font-size="9" fill="{p["sub"]}">All Products</text>
<text x="250" y="155" font-family="system-ui" font-size="9" fill="{p["sub"]}">New Arrivals</text>
<text x="350" y="120" font-family="system-ui" font-size="11" fill="{p["fg"]}" font-weight="600">Help</text>
<text x="350" y="140" font-family="system-ui" font-size="9" fill="{p["sub"]}">Contact</text>
<text x="350" y="155" font-family="system-ui" font-size="9" fill="{p["sub"]}">FAQ</text>
<text x="450" y="120" font-family="system-ui" font-size="11" fill="{p["fg"]}" font-weight="600">Legal</text>
<text x="450" y="140" font-family="system-ui" font-size="9" fill="{p["sub"]}">Privacy</text>
<text x="450" y="155" font-family="system-ui" font-size="9" fill="{p["sub"]}">Terms</text>
<rect x="60" y="170" width="200" height="32" rx="16" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="80" y="191" font-family="system-ui" font-size="9" fill="{p["sub"]}">✉ Newsletter signup</text>
<line x1="20" y1="220" x2="580" y2="220" stroke="{p["border"]}" stroke-width="1"/>
<text x="300" y="245" text-anchor="middle" font-family="system-ui" font-size="8" fill="{p["sub"]}">© 2024 Brand. All rights reserved.</text>'''
    return mock_footer(p, "", els)

def mock_footer_horizon(p):
    els = f'''<rect x="0" y="40" width="600" height="35" fill="{p["card"]}"/>
<text x="100" y="62" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">🚚 Free Shipping</text>
<text x="300" y="62" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">↩️ Easy Returns</text>
<text x="500" y="62" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">🔒 Secure Payment</text>
<rect x="0" y="85" width="300" height="180" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="150" y="140" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}" font-weight="600">Stay Updated</text>
<rect x="40" y="155" width="220" height="30" rx="15" fill="{p["bg"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="60" y="175" font-family="system-ui" font-size="9" fill="{p["sub"]}">Enter email</text>
<text x="320" y="120" font-family="system-ui" font-size="10" fill="{p["fg"]}" font-weight="600">Quick Links</text>
<text x="320" y="140" font-family="system-ui" font-size="9" fill="{p["sub"]}">About · Contact · FAQ</text>
<line x1="20" y1="280" x2="580" y2="280" stroke="{p["border"]}" stroke-width="1"/>
<text x="300" y="305" text-anchor="middle" font-family="system-ui" font-size="8" fill="{p["sub"]}">© 2024 Brand — Scroll to top ↑</text>'''
    return mock_footer(p, "", els)

def mock_scroll_section(p, title, subtitle, visual):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">{title}</text>
<text x="300" y="50" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">{subtitle}</text>
{visual}
<text x="300" y="345" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">↓ Scroll to activate</text>''')

def mock_scroll_card_cascade(p):
    cards = ""
    for i in range(4):
        x = 100 + i*40
        y = 80 + i*30
        cards += f'<rect x="{x}" y="{y}" width="200" height="140" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1" opacity="{1-i*0.15}"/>'
    return mock_scroll_section(p, "Card Cascade", "Cards fly in from alternating sides", cards)

def mock_scroll_card_stack(p):
    cards = ""
    for i in range(3):
        x = 190 + i*5
        y = 70 + i*10
        cards += f'<rect x="{x}" y="{y}" width="220" height="200" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
    return mock_scroll_section(p, "Card Stack", "Cards stack on scroll with 3D depth", cards)

def mock_scroll_counter_reveal(p):
    vals = [("2.5K", "Customers"), ("98%", "Satisfaction"), ("50+", "Awards")]
    els = ""
    for i,(v,l) in enumerate(vals):
        x = 60 + i*200
        els += f'''<text x="{x+80}" y="180" text-anchor="middle" font-family="system-ui" font-size="32" fill="{p["accent"]}" font-weight="700">{v}</text>
<text x="{x+80}" y="210" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">{l}</text>'''
    return mock_scroll_section(p, "Counter Reveal", "Numbers count up on scroll", els)

def mock_scroll_highlight(p):
    return mock_scroll_section(p, "Highlight Text", "Words highlight as you scroll",
        f'''<text x="300" y="170" text-anchor="middle" font-family="system-ui" font-size="24" fill="{p["sub"]}">
<tspan fill="{p["fg"]}">We craft </tspan><tspan fill="{p["accent"]}">beautiful</tspan><tspan fill="{p["sub"]}"> products</tspan>
</text>
<text x="300" y="210" text-anchor="middle" font-family="system-ui" font-size="24" fill="{p["sub"]}">
<tspan fill="{p["accent"]}">designed</tspan><tspan fill="{p["sub"]}"> to </tspan><tspan fill="{p["sub"]}">inspire</tspan>
</text>''')

def mock_scroll_morph(p):
    return mock_scroll_section(p, "Morph Gallery", "Images morph and transform on scroll",
        f'''{img_placeholder(80,70,200,220,12,p["card"])}
<rect x="320" y="100" width="200" height="160" rx="40" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="1"/>
<text x="420" y="185" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Morphing shape</text>''')

def mock_scroll_parallax_grid(p):
    els = ""
    positions = [(40,70,150,110), (200,100,170,130), (380,60,180,120), (50,200,160,100), (220,250,140,80), (370,200,190,110)]
    for x,y,w,h in positions:
        els += img_placeholder(x,y,w,h,6,p["card"])
    return mock_scroll_section(p, "Parallax Grid", "Each image floats at different speed", els)

def mock_scroll_text_magnify(p):
    return mock_scroll_section(p, "Text Magnify", "Text grows from tiny to massive on scroll",
        f'''<text x="300" y="130" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">your tagline</text>
<text x="300" y="200" text-anchor="middle" font-family="system-ui" font-size="36" fill="{p["fg"]}" font-weight="700">YOUR TAGLINE</text>
<text x="300" y="270" text-anchor="middle" font-family="system-ui" font-size="60" fill="{p["accent"]}" font-weight="800" opacity=".3">TAG</text>''')

def mock_scroll_velocity(p):
    return mock_scroll_section(p, "Velocity Text", "Scroll speed controls marquee velocity",
        f'''<text x="0" y="160" font-family="system-ui" font-size="48" fill="{p["fg"]}" font-weight="800" opacity=".15">VELOCITY TEXT THAT MOVES</text>
<text x="0" y="230" font-family="system-ui" font-size="48" fill="{p["accent"]}" font-weight="800" opacity=".2">FASTER WHEN YOU SCROLL</text>''')

def mock_scroll_zoom(p):
    return mock_scroll_section(p, "Zoom Reveal", "Small image explodes to fullscreen",
        f'''<rect x="250" y="80" width="100" height="80" rx="6" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="1"/>
<text x="300" y="125" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Start</text>
<text x="300" y="200" text-anchor="middle" font-family="system-ui" font-size="20" fill="{p["accent"]}">↓</text>
<rect x="100" y="220" width="400" height="80" rx="8" fill="{p["card"]}" opacity=".4" stroke="{p["accent"]}" stroke-width="1" stroke-dasharray="4,4"/>
<text x="300" y="265" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Expands to fullscreen</text>''')

def mock_slider(p, title, els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">{title}</text>
{els}
<circle cx="260" cy="340" r="4" fill="{p["accent"]}"/>
<circle cx="278" cy="340" r="4" fill="{p["border"]}"/>
<circle cx="296" cy="340" r="4" fill="{p["border"]}"/>''')

def mock_slider_3d_coverflow(p):
    return mock_slider(p, "3D Coverflow", f'''<rect x="50" y="70" width="140" height="220" rx="8" fill="{p["card"]}" opacity=".4" transform="skewY(4)"/>
<rect x="230" y="55" width="140" height="240" rx="10" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
<rect x="410" y="70" width="140" height="220" rx="8" fill="{p["card"]}" opacity=".4" transform="skewY(-4)"/>
<text x="300" y="185" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["fg"]}">Active Slide</text>''')

def mock_slider_cards(p):
    return mock_slider(p, "Card Slider", f'''{img_placeholder(20,50,580,240,10,p["card"])}
<rect x="380" y="120" width="180" height="130" rx="10" fill="{p["bg"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="470" y="175" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["fg"]}">Preview Card</text>
<text x="470" y="195" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Floating overlay</text>''')

def mock_slider_cinema(p):
    els = ""
    for i in range(4):
        x = 30 + i*145
        els += f'''<rect x="{x}" y="60" width="130" height="220" rx="4" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="{x-5}" y="60" width="8" height="220" fill="{p["bg"]}"/>
<rect x="{x+127}" y="60" width="8" height="220" fill="{p["bg"]}"/>'''
        for j in range(11):
            yy = 65 + j*20
            els += f'<rect x="{x-3}" y="{yy}" width="4" height="8" rx="1" fill="{p["border"]}"/>'
            els += f'<rect x="{x+129}" y="{yy}" width="4" height="8" rx="1" fill="{p["border"]}"/>'
    return mock_slider(p, "Cinema Strip", els)

def mock_slider_morphing(p):
    els = ""
    widths = [60, 240, 60, 60, 60]
    x = 30
    for i,w in enumerate(widths):
        active = w == 240
        els += f'<rect x="{x}" y="60" width="{w}" height="240" rx="8" fill="{p["card"]}" stroke="{p["accent"] if active else p["border"]}" stroke-width="{2 if active else 1}"/>'
        if active:
            els += f'<text x="{x+w//2}" y="185" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["fg"]}">Expanded Panel</text>'
        x += w + 10
    return mock_slider(p, "Morphing Panels", els)

def mock_slider_parallax_cards(p):
    return mock_slider(p, "Parallax Cards", f'''<rect x="40" y="120" width="180" height="140" rx="10" fill="{p["card"]}" opacity=".3" stroke="{p["border"]}" stroke-width="1"/>
<rect x="210" y="80" width="180" height="200" rx="12" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
<text x="300" y="185" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["fg"]}">Depth Effect</text>
<rect x="380" y="120" width="180" height="140" rx="10" fill="{p["card"]}" opacity=".3" stroke="{p["border"]}" stroke-width="1"/>
<rect x="60" y="280" width="480" height="30" rx="4" fill="{p["card"]}" opacity=".2"/>
<text x="300" y="300" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Multi-layer parallax background</text>''')

def mock_slider_split_reveal(p):
    return mock_slider(p, "Split Reveal", f'''{img_placeholder(0,50,300,260,0,p["card"])}
<rect x="300" y="50" width="300" height="260" fill="{p["bg"]}"/>
<text x="450" y="150" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["fg"]}" font-weight="700">Title</text>
<text x="450" y="175" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Wipe-reveal transition</text>
<rect x="400" y="200" width="100" height="32" rx="6" fill="{p["accent"]}"/>
<text x="450" y="221" text-anchor="middle" font-family="system-ui" font-size="10" fill="#fff" font-weight="600">Shop</text>''')

def mock_slider_story_cards(p):
    els = ""
    for i in range(4):
        x = 30 + i*145
        els += f'''<rect x="{x}" y="55" width="130" height="240" rx="12" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="{x}" y="220" width="130" height="75" rx="0 0 12 12" fill="{p["accent"]}" opacity=".15"/>
<text x="{x+65}" y="250" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Story {i+1}</text>'''
    return mock_slider(p, "Story Cards", els)

def mock_slideshow_product(p):
    return mock_slider(p, "Product Slideshow", f'''{img_placeholder(20,50,580,240,10,p["card"])}
<rect x="360" y="100" width="200" height="150" rx="12" fill="rgba(0,0,0,0.6)"/>
<text x="460" y="145" text-anchor="middle" font-family="system-ui" font-size="14" fill="#fff" font-weight="600">Product Name</text>
<text x="460" y="170" text-anchor="middle" font-family="system-ui" font-size="12" fill="{p["accent"]}">$129.00</text>
<rect x="410" y="200" width="100" height="30" rx="6" fill="{p["accent"]}"/>
<text x="460" y="220" text-anchor="middle" font-family="system-ui" font-size="10" fill="#fff" font-weight="600">Add to Cart</text>''')

def mock_testimonial(p, title, els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="35" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">{title}</text>
{els}''')

def mock_testimonial_carousel(p):
    els = ""
    for i in range(3):
        x = 20 + i*195
        els += f'''<rect x="{x}" y="60" width="180" height="200" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
{star_row(x+50,90,5,10,"#fbbf24")}
<text x="{x+90}" y="120" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}">"Amazing product!"</text>
<circle cx="{x+90}" cy="200" r="18" fill="{p["border"]}"/>
<text x="{x+90}" y="240" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Customer</text>'''
    return mock_testimonial(p, "Testimonial Carousel", els)

def mock_testimonial_glow(p):
    els = ""
    for i in range(3):
        x = 20 + i*195
        els += f'''<rect x="{x}" y="60" width="180" height="220" rx="12" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="1"/>
<rect x="{x-2}" y="58" width="184" height="224" rx="14" fill="none" stroke="{p["accent"]}" stroke-width="1" opacity=".3" filter="blur(4px)"/>
{star_row(x+50,100,5,10,"#fbbf24")}
<text x="{x+90}" y="135" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}">"Incredible quality"</text>
<text x="{x+90}" y="155" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}">"and fast shipping!"</text>
<circle cx="{x+90}" cy="210" r="16" fill="{p["border"]}"/>
<text x="{x+90}" y="252" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Jane D.</text>'''
    return mock_testimonial(p, "Glow Cards", els)

def mock_testimonial_hero_slider(p):
    return mock_testimonial(p, "Hero Slider", f'''{img_placeholder(20,55,580,250,10,p["card"])}
<text x="300" y="140" text-anchor="middle" font-family="system-ui" font-size="22" fill="#fff" font-weight="600">"Best purchase ever"</text>
{star_row(262,170,5,14,"#fbbf24")}
<text x="300" y="210" text-anchor="middle" font-family="system-ui" font-size="12" fill="rgba(255,255,255,0.7)">— Sarah Johnson</text>
<circle cx="280" cy="330" r="4" fill="{p["accent"]}"/>
<circle cx="300" cy="330" r="4" fill="{p["border"]}"/>
<circle cx="320" cy="330" r="4" fill="{p["border"]}"/>''')

def mock_testimonial_magazine(p):
    return mock_testimonial(p, "Magazine Layout", f'''<rect x="20" y="55" width="340" height="270" rx="10" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<text x="190" y="120" text-anchor="middle" font-family="serif" font-size="60" fill="{p["accent"]}" opacity=".3">"</text>
<text x="190" y="180" text-anchor="middle" font-family="serif" font-size="16" fill="{p["fg"]}" font-style="italic">This changed everything</text>
<text x="190" y="210" text-anchor="middle" font-family="serif" font-size="16" fill="{p["fg"]}" font-style="italic">about how I shop.</text>
<text x="190" y="250" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">— Featured Review</text>
<rect x="380" y="55" width="200" height="130" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<rect x="380" y="195" width="200" height="130" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>''')

def mock_testimonial_masonry(p):
    heights = [130, 170, 150, 100, 160, 120]
    positions = []
    cols = [55, 55, 55]
    for i,h in enumerate(heights):
        c = i % 3
        x = 20 + c*195
        y = cols[c]
        positions.append((x,y,h))
        cols[c] += h + 10
    els = ""
    for x,y,h in positions:
        els += f'<rect x="{x}" y="{y}" width="180" height="{h}" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
    return mock_testimonial(p, "Masonry Wall", els)

def mock_testimonial_orbit(p):
    return mock_testimonial(p, "Orbit Carousel", f'''<circle cx="300" cy="200" r="120" fill="none" stroke="{p["border"]}" stroke-width="1" stroke-dasharray="4,4"/>
<rect x="220" y="130" width="160" height="120" rx="12" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="2"/>
{star_row(252,165,5,10,"#fbbf24")}
<text x="300" y="195" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["fg"]}">"Outstanding!"</text>
<text x="300" y="225" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Active Review</text>
<rect x="80" y="240" width="80" height="55" rx="8" fill="{p["card"]}" opacity=".4"/>
<rect x="440" y="150" width="80" height="55" rx="8" fill="{p["card"]}" opacity=".4"/>''')

def mock_testimonial_social(p):
    els = ""
    for i in range(3):
        x = 20 + i*195
        els += f'''<rect x="{x}" y="60" width="180" height="240" rx="12" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<circle cx="{x+30}" cy="85" r="12" fill="{p["border"]}"/>
<text x="{x+50}" y="83" font-family="system-ui" font-size="10" fill="{p["fg"]}" font-weight="600">@user{i+1}</text>
<text x="{x+50}" y="95" font-family="system-ui" font-size="8" fill="{p["sub"]}">verified buyer</text>
<text x="{x+15}" y="130" font-family="system-ui" font-size="9" fill="{p["fg"]}">"Love this product!</text>
<text x="{x+15}" y="145" font-family="system-ui" font-size="9" fill="{p["fg"]}">Must have! 🔥"</text>
<rect x="{x+10}" y="165" width="160" height="90" rx="6" fill="{p["border"]}"/>
<text x="{x+15}" y="275" font-family="system-ui" font-size="8" fill="{p["sub"]}">❤️ 42 · 💬 5</text>'''
    return mock_testimonial(p, "Social Stack", els)

def mock_testimonials_basic(p):
    return mock_testimonial_carousel(p)

def mock_timer(p, title, timer_els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="60" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Sale Ends In</text>
<text x="300" y="80" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">{title}</text>
{timer_els}
<rect x="220" y="290" width="160" height="38" rx="8" fill="{p["accent"]}"/>
<text x="300" y="314" text-anchor="middle" font-family="system-ui" font-size="12" fill="#fff" font-weight="600">Shop Now</text>''')

def mock_timer_liquid(p):
    els = ""
    vals = [("12","Days"), ("08","Hours"), ("45","Min"), ("30","Sec")]
    for i,(v,l) in enumerate(vals):
        x = 95 + i*115
        els += f'''<rect x="{x}" y="110" width="90" height="100" rx="20" fill="{p["card"]}" stroke="{p["accent"]}" stroke-width="1"/>
<text x="{x+45}" y="170" text-anchor="middle" font-family="system-ui" font-size="28" fill="{p["accent"]}" font-weight="700">{v}</text>
<text x="{x+45}" y="195" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">{l}</text>'''
    return mock_timer(p, "Liquid morphing effect", els)

def mock_timer_neon(p):
    els = ""
    vals = [("12","Days"), ("08","Hrs"), ("45","Min"), ("30","Sec")]
    for i,(v,l) in enumerate(vals):
        x = 95 + i*115
        els += f'''<rect x="{x}" y="110" width="90" height="100" rx="6" fill="{p["bg"]}" stroke="{p["accent"]}" stroke-width="2"/>
<rect x="{x-1}" y="109" width="92" height="102" rx="7" fill="none" stroke="{p["accent"]}" stroke-width="1" opacity=".4"/>
<text x="{x+45}" y="170" text-anchor="middle" font-family="system-ui" font-size="30" fill="{p["accent"]}" font-weight="700">{v}</text>
<text x="{x+45}" y="195" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">{l}</text>'''
    return mock_timer(p, "Cyberpunk neon glow tubes", els)

def mock_timer_orbit(p):
    els = ""
    vals = [("12","Days"), ("08","Hrs"), ("45","Min"), ("30","Sec")]
    for i,(v,l) in enumerate(vals):
        cx = 120 + i*115
        els += f'''<circle cx="{cx}" cy="170" r="45" fill="none" stroke="{p["border"]}" stroke-width="4"/>
<circle cx="{cx}" cy="170" r="45" fill="none" stroke="{p["accent"]}" stroke-width="4" stroke-dasharray="200 283" stroke-linecap="round" transform="rotate(-90,{cx},170)"/>
<text x="{cx}" y="175" text-anchor="middle" font-family="system-ui" font-size="22" fill="{p["fg"]}" font-weight="700">{v}</text>
<text x="{cx}" y="230" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">{l}</text>'''
    return mock_timer(p, "Orbital SVG ring animation", els)

def mock_video(p, title, els):
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">{title}</text>
{els}''')

def mock_video_card_gallery(p):
    els = ""
    for r in range(2):
        for c in range(3):
            x = 20 + c*195
            y = 50 + r*155
            els += f'''<rect x="{x}" y="{y}" width="180" height="140" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<circle cx="{x+90}" cy="{y+65}" r="18" fill="{p["accent"]}" opacity=".8"/>
<text x="{x+90}" y="{y+71}" text-anchor="middle" font-family="system-ui" font-size="14" fill="#fff">▶</text>'''
    return mock_video(p, "Video Card Gallery", els)

def mock_video_cinema_hero(p):
    return mock_video(p, "Cinema Hero", f'''{img_placeholder(20,50,560,260,10,p["card"])}
<circle cx="300" cy="180" r="30" fill="{p["accent"]}" opacity=".85"/>
<text x="303" y="188" text-anchor="middle" font-family="system-ui" font-size="20" fill="#fff">▶</text>
<rect x="150" y="230" width="300" height="60" rx="12" fill="rgba(255,255,255,0.08)"/>
<text x="300" y="255" text-anchor="middle" font-family="system-ui" font-size="14" fill="#fff" font-weight="600">Glassmorphism Card</text>
<text x="300" y="275" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(255,255,255,0.6)">Full-bleed cinematic video</text>''')

def mock_video_feature_reel(p):
    return mock_video(p, "Feature Reel", f'''{img_placeholder(20,50,280,130,8,p["card"])}
<circle cx="160" cy="115" r="20" fill="{p["accent"]}" opacity=".8"/>
<text x="163" y="122" text-anchor="middle" font-family="system-ui" font-size="14" fill="#fff">▶</text>
<text x="400" y="100" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">Feature One</text>
<text x="400" y="120" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Description of feature</text>
<text x="200" y="240" text-anchor="middle" font-family="system-ui" font-size="14" fill="{p["fg"]}" font-weight="600">Feature Two</text>
<text x="200" y="260" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Alternating layout</text>
{img_placeholder(300,200,280,130,8,p["card"])}
<circle cx="440" cy="265" r="20" fill="{p["accent"]}" opacity=".8"/>
<text x="443" y="272" text-anchor="middle" font-family="system-ui" font-size="14" fill="#fff">▶</text>''')

def mock_video_marquee(p):
    els = ""
    for i in range(5):
        x = 10 + i*122
        els += f'''<rect x="{x}" y="90" width="110" height="180" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>
<circle cx="{x+55}" cy="{180}" r="14" fill="{p["accent"]}" opacity=".7"/>
<text x="{x+57}" y="185" text-anchor="middle" font-family="system-ui" font-size="12" fill="#fff">▶</text>'''
    return mock_video(p, "Video Marquee", els + f'\n<text x="300" y="310" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">← Continuous scroll loop →</text>')

def mock_video_showcase_reel(p):
    thumbs = ""
    for i in range(5):
        bdr = p["accent"] if i == 0 else p["border"]
        thumbs += f'<rect x="{60+i*100}" y="285" width="80" height="50" rx="6" fill="{p["card"]}" stroke="{bdr}" stroke-width="1"/>'
    return mock_video(p, "Showcase Reel", f'''{img_placeholder(20,50,560,220,10,p["card"])}
<circle cx="300" cy="160" r="25" fill="{p["accent"]}" opacity=".85"/>
<text x="303" y="167" text-anchor="middle" font-family="system-ui" font-size="16" fill="#fff">▶</text>
{thumbs}
<text x="300" y="350" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["sub"]}">Thumbnail reel navigation</text>''')

def mock_video_split(p):
    return mock_video(p, "Video Split", f'''{img_placeholder(20,50,280,270,8,p["card"])}
<circle cx="160" cy="185" r="25" fill="{p["accent"]}" opacity=".85"/>
<text x="163" y="192" text-anchor="middle" font-family="system-ui" font-size="16" fill="#fff">▶</text>
<text x="450" y="130" text-anchor="middle" font-family="system-ui" font-size="18" fill="{p["fg"]}" font-weight="700">Our Story</text>
<text x="450" y="155" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">Watch the journey behind</text>
<text x="450" y="170" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">every product we make.</text>
<rect x="400" y="200" width="100" height="32" rx="6" fill="{p["accent"]}"/>
<text x="450" y="221" text-anchor="middle" font-family="system-ui" font-size="10" fill="#fff" font-weight="600">Learn More</text>''')

def mock_scroll_pin_timeline(p):
    """Vertical timeline with alternating left/right cards"""
    items = ""
    # Draw vertical line
    items += f'<line x1="300" y1="30" x2="300" y2="330" stroke="{p["accent"]}" stroke-width="2"/>'
    # Left items
    items += f'<rect x="80" y="50" width="180" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
    items += f'<circle cx="300" cy="80" r="6" fill="{p["accent"]}"/>'
    items += f'<text x="170" y="73" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">2020</text>'
    items += f'<text x="170" y="85" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">The Beginning</text>'
    # Right items
    items += f'<rect x="340" y="150" width="180" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
    items += f'<circle cx="300" cy="180" r="6" fill="{p["accent"]}"/>'
    items += f'<text x="430" y="173" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">2022</text>'
    items += f'<text x="430" y="185" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">Major Milestone</text>'
    # Left items
    items += f'<rect x="80" y="250" width="180" height="60" rx="8" fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1"/>'
    items += f'<circle cx="300" cy="280" r="6" fill="{p["accent"]}"/>'
    items += f'<text x="170" y="273" text-anchor="middle" font-family="system-ui" font-size="10" fill="{p["sub"]}">2024</text>'
    items += f'<text x="170" y="285" text-anchor="middle" font-family="system-ui" font-size="9" fill="{p["fg"]}">New Chapter</text>'
    
    return svg_wrap(f'''<rect width="600" height="360" fill="{p["bg"]}"/>
<text x="300" y="30" text-anchor="middle" font-family="system-ui" font-size="16" fill="{p["fg"]}" font-weight="700">Our Journey</text>
{items}
<text x="300" y="355" text-anchor="middle" font-family="system-ui" font-size="11" fill="{p["sub"]}">Timeline with IntersectionObserver</text>''')

# ── Mapping section-id → generator function + palette ─────────────
GENERATORS = {
    "collection-card-stack":         (mock_collection_card_stack, "dark"),
    "collection-grid":               (mock_collection_grid, "light"),
    "collection-magazine":           (mock_collection_magazine, "editorial"),
    "collection-marquee-tape":       (mock_collection_marquee, "dark"),
    "collection-orbit-ring":         (mock_collection_orbit, "neon"),
    "collection-polaroid-wall":      (mock_collection_polaroid, "warm"),
    "collection-reveal-tiles":       (mock_collection_reveal_tiles, "dark"),
    "countdown-deal-popup":          (mock_countdown_popup, "dark"),
    "counter-flip-board":            (mock_counter_flip, "dark"),
    "counter-milestone-path":        (mock_counter_milestone, "dark"),
    "counter-radial-gauge":          (mock_counter_radial, "dark"),
    "counter-wave-bars":             (mock_counter_wave_bars, "dark"),
    "faq-card-grid":                 (mock_faq_card_grid, "dark"),
    "faq-chat-bubbles":              (mock_faq_chat, "dark"),
    "faq-flip-cards":                (mock_faq_flip, "dark"),
    "faq-search-timeline":           (mock_faq_search_timeline, "dark"),
    "faq-spotlight":                 (mock_faq_spotlight, "dark"),
    "faq-tabbed-categories":         (mock_faq_tabbed, "dark"),
    "feature-orbit-icons":           (mock_feature_orbit, "dark"),
    "featured-collection-coverflow": (mock_fc_coverflow, "dark"),
    "featured-collection-flyIn":     (mock_fc_flyin, "dark"),
    "featured-collection-lookbook":  (mock_fc_lookbook, "editorial"),
    "featured-collection-mosaic":    (mock_fc_mosaic, "dark"),
    "featured-collection-runway":    (mock_fc_runway, "dark"),
    "featured-collection-spotlight": (mock_fc_spotlight, "dark"),
    "featured-collection-storyboard":(mock_fc_storyboard, "dark"),
    "featured-collection-tabs":      (mock_fc_tabs, "dark"),
    "footer-horizon":                (mock_footer_horizon, "dark"),
    "footer-mega":                   (mock_footer_mega, "dark"),
    "hero-cinematic":                (mock_hero_cinematic, "dark"),
    "hero-marquee-split":            (mock_hero_marquee_split, "dark"),
    "hero-mosaic":                   (mock_hero_mosaic, "dark"),
    "hero-parallax-layers":          (mock_hero_parallax, "dark"),
    "hero-particle-float":           (mock_hero_particle, "dark"),
    "hero-reveal":                   (mock_hero_reveal, "dark"),
    "hero-spotlight":                (mock_hero_spotlight, "dark"),
    "image-collage-minimal":         (mock_image_collage, "editorial"),
    "image-grid-light":              (mock_image_grid_light, "light"),
    "image-horizon-split":           (mock_image_horizon_split, "dark"),
    "image-lens-focus":              (mock_image_lens_focus, "dark"),
    "image-lookbook-scroll":         (mock_image_lookbook, "dark"),
    "image-mosaic-wall":             (mock_image_mosaic_wall, "dark"),
    "image-prism-rotate":            (mock_image_prism, "dark"),
    "image-reveal-carousel":         (mock_image_reveal_carousel, "dark"),
    "image-scatter-gallery":         (mock_image_scatter, "warm"),
    "logo-carousel-spin":            (mock_logo_spin, "light"),
    "product-wave-carousel":         (mock_product_wave, "dark"),
    "quiz-popup":                    (mock_quiz_popup, "dark"),
    "scroll-card-cascade":           (mock_scroll_card_cascade, "dark"),
    "scroll-card-stack":             (mock_scroll_card_stack, "dark"),
    "scroll-counter-reveal":         (mock_scroll_counter_reveal, "dark"),
    "scroll-highlight-text":         (mock_scroll_highlight, "dark"),
    "scroll-morph-gallery":          (mock_scroll_morph, "dark"),
    "scroll-parallax-grid":          (mock_scroll_parallax_grid, "dark"),
    "scroll-pin-timeline":           (mock_scroll_pin_timeline, "dark"),
    "scroll-text-magnify":           (mock_scroll_text_magnify, "dark"),
    "scroll-velocity-text":          (mock_scroll_velocity, "dark"),
    "scroll-zoom-reveal":            (mock_scroll_zoom, "dark"),
    "slider-3d-coverflow":           (mock_slider_3d_coverflow, "dark"),
    "slider-cards":                  (mock_slider_cards, "dark"),
    "slider-cinema-strip":           (mock_slider_cinema, "warm"),
    "slider-morphing-panels":        (mock_slider_morphing, "dark"),
    "slider-parallax-cards":         (mock_slider_parallax_cards, "dark"),
    "slider-split-reveal":           (mock_slider_split_reveal, "dark"),
    "slider-story-cards":            (mock_slider_story_cards, "dark"),
    "slideshow-product":             (mock_slideshow_product, "dark"),
    "testimonial-carousel":          (mock_testimonial_carousel, "dark"),
    "testimonial-glow-cards":        (mock_testimonial_glow, "dark"),
    "testimonial-hero-slider":       (mock_testimonial_hero_slider, "dark"),
    "testimonial-magazine-layout":   (mock_testimonial_magazine, "editorial"),
    "testimonial-masonry-wall":      (mock_testimonial_masonry, "dark"),
    "testimonial-orbit-carousel":    (mock_testimonial_orbit, "dark"),
    "testimonial-social-stack":      (mock_testimonial_social, "light"),
    "testimonials-carousel":         (mock_testimonials_basic, "dark"),
    "timer-liquid-morph":            (mock_timer_liquid, "dark"),
    "timer-neon-glow":               (mock_timer_neon, "neon"),
    "timer-orbit-rings":             (mock_timer_orbit, "cool"),
    "video-card-gallery":            (mock_video_card_gallery, "dark"),
    "video-cinema-hero":             (mock_video_cinema_hero, "dark"),
    "video-feature-reel":            (mock_video_feature_reel, "dark"),
    "video-marquee-loop":            (mock_video_marquee, "dark"),
    "video-showcase-reel":           (mock_video_showcase_reel, "dark"),
    "video-split-player":            (mock_video_split, "dark"),
}

# ── Main ──────────────────────────────────────────────────────────
created = 0
skipped = 0

for section_id, (gen_fn, pal_key) in GENERATORS.items():
    section_dir = os.path.join(SECTIONS_DIR, section_id)
    preview_dir = os.path.join(PREVIEWS_DIR, section_id)

    if not os.path.isdir(section_dir):
        print(f"⚠️  Section dir not found: {section_id}")
        skipped += 1
        continue

    # Skip if already has previews
    if os.path.isdir(preview_dir) and os.listdir(preview_dir):
        print(f"⏭️  Already has preview: {section_id}")
        skipped += 1
        continue

    os.makedirs(preview_dir, exist_ok=True)

    palette = PAL[pal_key]
    svg_content = gen_fn(palette)

    output_path = os.path.join(preview_dir, "default.svg")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg_content)

    print(f"✅ {section_id}")
    created += 1

print(f"\n🎉 Done! Created {created} previews, skipped {skipped}.")
