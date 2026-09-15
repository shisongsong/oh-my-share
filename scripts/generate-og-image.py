#!/usr/bin/env python3
"""Generate OG Image for Oh My Share"""

from PIL import Image, ImageDraw, ImageFont
import os

# OG Image dimensions (recommended for social media)
WIDTH = 1200
HEIGHT = 630

# Colors
BG_COLOR = (25, 25, 35)  # Dark background
ACCENT_COLOR = (100, 200, 150)  # Green accent
TEXT_COLOR = (255, 255, 255)  # White text
SUBTITLE_COLOR = (180, 180, 180)  # Gray subtitle

def create_og_image():
    # Create image
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Draw accent bar at top
    draw.rectangle([0, 0, WIDTH, 8], fill=ACCENT_COLOR)
    
    # Draw accent bar at bottom
    draw.rectangle([0, HEIGHT - 8, WIDTH, HEIGHT], fill=ACCENT_COLOR)
    
    # Draw side accent lines
    draw.rectangle([60, 100, 64, HEIGHT - 100], fill=ACCENT_COLOR)
    
    # Try to use a system font, fallback to default
    try:
        # Try different font paths
        font_paths = [
            '/System/Library/Fonts/Helvetica.ttc',
            '/System/Library/Fonts/SFNS.ttf',
            '/System/Library/Fonts/SFNSText.ttf',
            '/Library/Fonts/Arial.ttf',
        ]
        font_path = None
        for path in font_paths:
            if os.path.exists(path):
                font_path = path
                break
        
        if font_path:
            title_font = ImageFont.truetype(font_path, 72)
            subtitle_font = ImageFont.truetype(font_path, 32)
            desc_font = ImageFont.truetype(font_path, 24)
        else:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            desc_font = ImageFont.load_default()
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
    
    # Draw title "Oh My Share"
    title_text = "Oh My Share"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (WIDTH - title_width) // 2
    draw.text((title_x, 200), title_text, fill=TEXT_COLOR, font=title_font)
    
    # Draw subtitle
    subtitle_text = "Free HTML & Code Sharing Tool"
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (WIDTH - subtitle_width) // 2
    draw.text((subtitle_x, 300), subtitle_text, fill=ACCENT_COLOR, font=subtitle_font)
    
    # Draw description
    desc_text = "End-to-End Encrypted • No Registration Required • Instant Sharing"
    desc_bbox = draw.textbbox((0, 0), desc_text, font=desc_font)
    desc_width = desc_bbox[2] - desc_bbox[0]
    desc_x = (WIDTH - desc_width) // 2
    draw.text((desc_x, 380), desc_text, fill=SUBTITLE_COLOR, font=desc_font)
    
    # Draw URL at bottom
    url_text = "openanthropic.com"
    url_bbox = draw.textbbox((0, 0), url_text, font=desc_font)
    url_width = url_bbox[2] - url_bbox[0]
    url_x = (WIDTH - url_width) // 2
    draw.text((url_x, HEIGHT - 80), url_text, fill=SUBTITLE_COLOR, font=desc_font)
    
    # Save image
    output_path = '/Volumes/huanyin/Workstation/oh-my-share/og-image.png'
    img.save(output_path, 'PNG', quality=95)
    print(f"OG Image saved to: {output_path}")
    return output_path

if __name__ == '__main__':
    create_og_image()
