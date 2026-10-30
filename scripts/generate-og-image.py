#!/usr/bin/env python3
"""Generate the warm paper OG image for Oh My Share."""

from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH = 1200
HEIGHT = 630
ROOT = Path(__file__).resolve().parent.parent

PAPER = (244, 239, 228)
CARD = (251, 247, 238)
INK = (28, 26, 23)
INK_2 = (69, 66, 58)
INK_3 = (106, 99, 87)
LINE = (216, 205, 187)
TERRACOTTA = (163, 77, 44)
OCHRE = (168, 121, 47)
SAGE = (79, 107, 82)
SAGE_DEEP = (60, 83, 64)
CREAM = (251, 247, 238)

SONGTI = "/System/Library/Fonts/Supplemental/Songti.ttc"
PINGFANG = (
    "/System/Library/AssetsV2/com_apple_MobileAsset_Font7/"
    "3419f2a427639ad8c8e139149a287865a90fa17e.asset/AssetData/PingFang.ttc"
)
FALLBACK = "/System/Library/Fonts/Helvetica.ttc"


def font(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except Exception:
        return ImageFont.truetype(FALLBACK, size)


def text(draw, xy, value, fill, face):
    draw.text(xy, value, fill=fill, font=face)


def main():
    img = Image.new("RGB", (WIDTH, HEIGHT), PAPER).convert("RGBA")
    draw = ImageDraw.Draw(img)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((730, -300, 1330, 300), fill=(196, 152, 92, 54))
    gd.ellipse((880, 160, 1280, 560), fill=(79, 107, 82, 22))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    rng = random.Random(7)
    grain = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grain)
    for _ in range(6200):
        x = rng.randrange(WIDTH)
        y = rng.randrange(HEIGHT)
        gd.point((x, y), fill=(28, 26, 23, 8))
    img = Image.alpha_composite(img, grain)
    draw = ImageDraw.Draw(img)

    serif = font(SONGTI, 76, 1)
    serif_small = font(SONGTI, 30, 1)
    sans = font(PINGFANG, 26, 11)
    sans_small = font(PINGFANG, 22, 11)
    sans_tiny = font(PINGFANG, 15, 11)

    # Brand
    draw.rounded_rectangle((100, 76, 128, 104), radius=7, outline=TERRACOTTA, width=2)
    draw.line((108, 84, 120, 84), fill=TERRACOTTA, width=1)
    draw.line((108, 92, 124, 92), fill=TERRACOTTA, width=1)
    text(draw, (142, 76), "Oh My Share", INK, font(PINGFANG, 27, 11))

    # Headline
    text(draw, (96, 166), "把 HTML 和代码，", INK, serif)
    text(draw, (96, 264), "分享给喜欢的人。", INK, serif)
    draw.line((100, 386, 720, 386), fill=LINE, width=1)

    text(draw, (100, 414), "免费 · 无需注册 · 可选加密", INK_2, sans)
    text(draw, (100, 462), "一个文件、一段代码，或整个站点，都能变成一条简单的链接。", INK_3, sans_small)

    # Share card illustration
    card = (820, 128, 1120, 500)
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((card[0] + 4, card[1] + 18, card[2] + 8, card[3] + 22), radius=22, fill=(64, 46, 26, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(card, radius=20, fill=CARD, outline=LINE, width=1)

    draw.text((850, 158), "分享一个页面", fill=INK, font=font(SONGTI, 25, 1))
    draw.text((850, 195), "单个文件、一段代码，或整个站点。", fill=INK_3, font=sans_tiny)
    for i, label in enumerate(("上传文件", "粘贴代码", "上传目录")):
        x = 850 + i * 82
        draw.rounded_rectangle((x, 228, x + 76, 264), radius=8, fill=(236, 228, 212))
        draw.text((x + 10, 238), label, fill=INK_2, font=font(PINGFANG, 12, 11))
    draw.rounded_rectangle((850, 286, 1090, 404), radius=10, outline=(190, 177, 157), width=1)
    draw.line((870, 326, 950, 326), fill=INK_3, width=2)
    draw.line((870, 346, 990, 346), fill=LINE, width=1)
    draw.rounded_rectangle((850, 426, 1090, 470), radius=9, fill=SAGE)
    draw.text((930, 437), "生成分享链接", fill=CREAM, font=font(PINGFANG, 14, 11))

    # Single badge capsule
    pill = (792, 512, 1012, 550)
    draw.rounded_rectangle(pill, radius=19, fill=CARD, outline=LINE, width=1)
    draw.rounded_rectangle((806, 524, 818, 538), radius=2, outline=TERRACOTTA, width=1)
    draw.text((826, 522), "Made with Oh My Share", fill=INK_2, font=font(PINGFANG, 12, 11))

    text(draw, (100, 566), "openanthropic.com", INK_3, sans_small)

    output = ROOT / "og-image.png"
    img.convert("RGB").save(output, "PNG", optimize=True)
    print(f"OG image saved to: {output}")


if __name__ == "__main__":
    main()
