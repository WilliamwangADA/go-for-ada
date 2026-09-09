#!/usr/bin/env python3
"""生成 App 图标(画一颗雪球棋子精灵) + 扫码二维码。依赖: pip install segno pillow"""
from PIL import Image, ImageDraw
import segno, os

URL = "https://williamwangada.github.io/go-for-ada/index.html"
TOP, BOT = (207, 238, 255), (191, 227, 192)   # 天空蓝 → 草地绿

os.makedirs("assets/icons", exist_ok=True)

def grad(w, h, top, bot):
    img = Image.new("RGB", (w, h))
    for y in range(h):
        t = y / (h - 1)
        img.paste(tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)), (0, y, w, y + 1))
    return img

S = 512
base = grad(S, S, TOP, BOT).convert("RGBA")
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=96, fill=255)
base.putalpha(mask)

d = ImageDraw.Draw(base)
cx, cy, r = S // 2, S // 2 + 14, 175
# 木纹棋盘影子
d.ellipse([cx - r - 26, cy + r - 34, cx + r + 26, cy + r + 34], fill=(185, 141, 85, 120))
# 雪球身体
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 250, 242, 255),
          outline=(227, 214, 189, 255), width=12)
# 腮红
for sx in (-1, 1):
    d.ellipse([cx + sx * 95 - 34, cy + 40 - 20, cx + sx * 95 + 34, cy + 40 + 20],
              fill=(247, 178, 178, 150))
# 实心眼睛 + 高光
for sx in (-1, 1):
    ex = cx + sx * 60
    d.ellipse([ex - 26, cy - 45 - 26, ex + 26, cy - 45 + 26], fill=(53, 50, 74, 255))
    d.ellipse([ex - 26 + 8, cy - 45 - 18, ex - 26 + 26, cy - 45], fill=(255, 255, 255, 255))
# 微笑
d.arc([cx - 60, cy - 10, cx + 60, cy + 78], start=15, end=165, fill=(53, 50, 74, 255), width=14)
# 头顶小叶子
d.ellipse([cx + 8, cy - r - 52, cx + 76, cy - r + 4], fill=(108, 187, 112, 255))
d.line([cx, cy - r + 16, cx + 26, cy - r - 20], fill=(108, 187, 112, 255), width=12)

base.save("assets/icons/icon-512.png")
base.resize((192, 192)).save("assets/icons/icon-192.png")
base.resize((180, 180)).convert("RGB").save("assets/icons/apple-touch-icon.png")
print("icons -> assets/icons/")

segno.make(URL, error='h').save("assets/qrcode_plain.png", scale=12, border=3,
                                dark="#4c7a52", light="#fffdf6")
q = Image.open("assets/qrcode_plain.png").convert("RGBA")
logo = Image.open("assets/icons/icon-192.png").convert("RGBA")
ls = q.width // 5
logo = logo.resize((ls, ls))
pad = Image.new("RGBA", (ls + 20, ls + 20), (255, 253, 246, 255))
q.alpha_composite(pad, ((q.width - pad.width) // 2, (q.height - pad.height) // 2))
q.alpha_composite(logo, ((q.width - ls) // 2, (q.height - ls) // 2))
q.save("assets/qrcode.png")
print("qrcode -> assets/qrcode.png |", URL)
