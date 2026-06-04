#!/usr/bin/env python3
"""
AQC7015 Capstone · Move district landmarks out from under flower clusters
and scale them 1.5× for visibility.

What this does
--------------
Replaces the <g id="landmarks-and-labels"> block in kl-map.svg with a
new block where each landmark is positioned OUTSIDE its cluster's bbox
and rendered at 1.5× scale, with the district label sitting below the
landmark instead of below the cluster.

  district  cluster bbox             landmark new pos      direction
  ────────  ───────────────────────  ──────────────────    ──────────
  KB        x[908,1204] y[140,370]   (1310, 256)           east of cluster
  BB        x[1236,1470] y[457,742]  (1500, 800)           south-east, below
  PS        x[576,907]  y[465,698]   (980,  580)           east of cluster
  LI        x[170,473]  y[658,893]   (90,   774)           west of cluster

Usage
-----
    python3 fix_landmarks.py
        # reads ./kl-map.svg, writes ./kl-map.svg in place

Idempotent — running multiple times yields the same result.
Preserves all road groups (your OSM data is safe).
"""

import os
import re
import sys

SVG_PATH = sys.argv[1] if len(sys.argv) > 1 else 'kl-map.svg'

# New landmark/label positions per district
NEW_POSITIONS = {
    'KB': {'lm_id': 'lm_mosque',  'lm_xy': (1310, 256), 'lbl_xy': (1310, 336),
           'names': {'en': 'Kampung Baru', 'ms': 'Kampung Baru',
                     'zh': '甘榜峇鲁', 'ta': 'கம்போங் பாரு', 'jawi': 'كامڤوڠ بارو'}},
    'BB': {'lm_id': 'lm_twins',   'lm_xy': (1180, 800), 'lbl_xy': (1180, 880),
           'names': {'en': 'Bukit Bintang', 'ms': 'Bukit Bintang',
                     'zh': '武吉免登', 'ta': 'புக்கிட் பின்தாங்', 'jawi': 'بوكيت بينتڠ'}},
    'PS': {'lm_id': 'lm_arch',    'lm_xy': (980,  580), 'lbl_xy': (980,  660),
           'names': {'en': 'Petaling Street', 'ms': 'Jalan Petaling',
                     'zh': '茨厂街', 'ta': 'சீனத் தெரு', 'jawi': 'جالن ڤتاليڠ'}},
    'LI': {'lm_id': 'lm_gopuram', 'lm_xy': (90,   774), 'lbl_xy': (90,   854),
           'names': {'en': 'Little India', 'ms': 'Brickfields',
                     'zh': '小印度', 'ta': 'லிட்டில் இந்தியா', 'jawi': 'بريكفيلدس'}},
}

# Font specs per language (kept identical to current SVG)
LANG_FONTS = {
    'en':   {'size': 19, 'family': 'Georgia, Noto Serif, serif',                       'rtl': False},
    'ms':   {'size': 19, 'family': 'Georgia, Noto Serif, serif',                       'rtl': False},
    'zh':   {'size': 19, 'family': 'Noto Serif SC, Noto Serif, Georgia, serif',        'rtl': False},
    'ta':   {'size': 16, 'family': 'Noto Sans Tamil, Georgia, serif',                  'rtl': False},
    'jawi': {'size': 19, 'family': 'Noto Naskh Arabic, Georgia, serif',                'rtl': True},
}


def build_district_block(district, spec):
    lm_x, lm_y = spec['lm_xy']
    lbl_x, lbl_y = spec['lbl_xy']
    rect_x, rect_y = lbl_x - 90, lbl_y - 21       # 180×30 pill centered on label
    lines = [f'<g class="district-marker" data-district="{district}">']
    lines.append(
        f'  <rect x="{rect_x}" y="{rect_y}" width="180" height="30" rx="15" '
        f'fill="#fbf3dc" opacity="0.94" stroke="#7a4830" stroke-width="0.4"/>'
    )
    lines.append(
        f'  <g transform="translate({lm_x},{lm_y}) scale(1.5)">'
        f'<use href="#{spec["lm_id"]}"/></g>'
    )
    for lang, name in spec['names'].items():
        f = LANG_FONTS[lang]
        rtl = ' direction="rtl"' if f['rtl'] else ''
        lines.append(
            f'  <text class="label-text" data-lang="{lang}" '
            f'x="{lbl_x}" y="{lbl_y}" font-size="{f["size"]}" font-weight="700" '
            f'font-family="{f["family"]}" text-anchor="middle" fill="#7a4830"{rtl}>'
            f'{name}</text>'
        )
    lines.append('</g>')
    return '\n'.join(lines)


def main():
    if not os.path.exists(SVG_PATH):
        sys.exit(f'ERROR: SVG not found: {SVG_PATH}')

    with open(SVG_PATH) as fh:
        svg = fh.read()
    orig_size = len(svg)

    new_block = '<g id="landmarks-and-labels">\n'
    for district in ('KB', 'BB', 'PS', 'LI'):
        new_block += build_district_block(district, NEW_POSITIONS[district])
        new_block += '\n'
    new_block += '</g>'

    # Find <g id="landmarks-and-labels"> opening; then walk forward balancing
    # <g>/</g> tags until the outermost </g> closes the group.
    open_re = re.compile(r'<g\s+id="landmarks-and-labels"[^>]*>')
    open_m = open_re.search(svg)
    if not open_m:
        sys.exit('ERROR: <g id="landmarks-and-labels"> not found.')

    cursor = open_m.end()
    depth = 1
    tag_re = re.compile(r'<g\b[^>]*>|</g>')
    end_pos = None
    for m in tag_re.finditer(svg, cursor):
        if m.group(0).startswith('</g'):
            depth -= 1
            if depth == 0:
                end_pos = m.end()
                break
        else:
            depth += 1
    if end_pos is None:
        sys.exit('ERROR: outer </g> for landmarks-and-labels never balanced.')

    new_svg = svg[:open_m.start()] + new_block + svg[end_pos:]

    with open(SVG_PATH, 'w') as fh:
        fh.write(new_svg)

    print(f'✓ updated {SVG_PATH}')
    print(f'  size: {orig_size/1024:.0f} KB → {len(new_svg)/1024:.0f} KB')
    print(f'  4 districts repositioned, landmarks scaled 1.5×')


if __name__ == '__main__':
    main()
