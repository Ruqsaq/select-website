"""
Generates a 1920x1080 RGBA PNG that recreates the live hero scrim and marks
the recommended focus zone. Drop this over your video in Premiere to preview
exactly what will be covered vs. visible on the live site.
"""
import math
from PIL import Image, ImageDraw, ImageFont
import numpy as np

W, H = 1920, 1080
NAVY = (21, 20, 61)     # --navy-hero #15143D
CYAN = (116, 213, 226)  # --cyan
OUT  = "/Users/chriscobb/Desktop/hero_overlay_guide.png"

# CSS: linear-gradient(105deg, navy 0%, navy 34%, rgba(navy,0.75) 50%, rgba(navy,0) 72%)
# 0deg points up, angles go clockwise. Direction vector for 105deg:
ang = math.radians(105)
dxh, dyh = math.sin(ang), -math.cos(ang)  # (~0.966, ~0.259)

# Compute t projection for every pixel
ys, xs = np.indices((H, W))
t_raw = (xs - W/2) * dxh + (ys - H/2) * dyh

# Normalize using corner projections (CSS-style line endpoints)
corners = [(0,0),(W,0),(0,H),(W,H)]
projs = [(cx-W/2)*dxh + (cy-H/2)*dyh for cx,cy in corners]
t = (t_raw - min(projs)) / (max(projs) - min(projs))

# Build alpha from stops: 0..0.34 -> 1.0, 0.5 -> 0.75, 0.72 -> 0
alpha = np.where(
    t <= 0.34, 1.0,
    np.where(
        t <= 0.50, 1.0 - (t - 0.34) / (0.50 - 0.34) * (1.0 - 0.75),
        np.where(
            t <= 0.72, 0.75 - (t - 0.50) / (0.72 - 0.50) * 0.75,
            0.0
        )
    )
)

# RGBA buffer
rgba = np.zeros((H, W, 4), dtype=np.uint8)
rgba[..., 0] = NAVY[0]
rgba[..., 1] = NAVY[1]
rgba[..., 2] = NAVY[2]
rgba[..., 3] = np.clip(alpha * 255, 0, 255).astype(np.uint8)

img = Image.fromarray(rgba, "RGBA")
draw = ImageDraw.Draw(img)

# Focus zone: right portion, vertically centered (avoid top/bottom cropping)
fx1, fy1, fx2, fy2 = 1460, 220, 1880, 860

# Dashed cyan border
def dashed_rect(d, box, color, width=4, dash=24, gap=14):
    x1, y1, x2, y2 = box
    # top
    x = x1
    while x < x2:
        d.line([(x, y1), (min(x+dash, x2), y1)], fill=color, width=width)
        x += dash + gap
    # bottom
    x = x1
    while x < x2:
        d.line([(x, y2), (min(x+dash, x2), y2)], fill=color, width=width)
        x += dash + gap
    # left
    y = y1
    while y < y2:
        d.line([(x1, y), (x1, min(y+dash, y2))], fill=color, width=width)
        y += dash + gap
    # right
    y = y1
    while y < y2:
        d.line([(x2, y), (x2, min(y+dash, y2))], fill=color, width=width)
        y += dash + gap

dashed_rect(draw, (fx1, fy1, fx2, fy2), CYAN, width=4, dash=28, gap=14)

# Try a system font for labels; fall back to default
def load_font(size):
    for path in [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()

label_font = load_font(34)
small_font = load_font(22)

# Focus-zone label inside the dashed box, top edge
label = "FOCUS ZONE"
tb = draw.textbbox((0,0), label, font=label_font)
tw, th = tb[2]-tb[0], tb[3]-tb[1]
lx = (fx1 + fx2) // 2 - tw // 2
ly = fy1 + 18
# label background pill for readability
pad = 12
draw.rectangle((lx-pad, ly-6, lx+tw+pad, ly+th+10), fill=(0,0,0,160))
draw.text((lx, ly), label, fill=CYAN, font=label_font)

# Bottom note
note = "1920x1080 hero overlay  ·  left side covered by scrim on the live site  ·  keep important action inside the dashed box"
tb = draw.textbbox((0,0), note, font=small_font)
tw, th = tb[2]-tb[0], tb[3]-tb[1]
nx = (W - tw) // 2
ny = H - 50
draw.rectangle((nx-14, ny-6, nx+tw+14, ny+th+10), fill=(0,0,0,160))
draw.text((nx, ny), note, fill=(220,220,220), font=small_font)

img.save(OUT, "PNG")
print(f"wrote {OUT}  ({img.size[0]}x{img.size[1]})")
