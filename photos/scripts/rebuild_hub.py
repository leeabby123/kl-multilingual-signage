#!/usr/bin/env python3
"""
AQC7015 Capstone · Re-inline kl-map.svg into hub-page.html.

The Hub page inlines the SVG directly into the HTML (so file:// works without
a server). After running build_real_roads.py, the SVG changes but the HTML
still has the old SVG embedded — run this script to re-inline.

Usage
-----
    python rebuild_hub.py
        # reads ./kl-map.svg + ./hub-page.html
        # writes ./hub-page.html (in place)

Dependencies: stdlib only.
"""

import os
import re
import sys


def main():
    svg_path  = sys.argv[1] if len(sys.argv) > 1 else 'kl-map.svg'
    html_path = sys.argv[2] if len(sys.argv) > 2 else 'hub-page.html'

    if not os.path.exists(svg_path):
        sys.exit(f'ERROR: SVG not found: {svg_path}')
    if not os.path.exists(html_path):
        sys.exit(f'ERROR: HTML not found: {html_path}')

    with open(svg_path) as f:
        svg_str = f.read().strip()
    with open(html_path) as f:
        html = f.read()

    # Inject id="map-svg" if not present (Hub JS targets this id).
    if 'id="map-svg"' not in svg_str:
        svg_str = svg_str.replace('<svg ', '<svg id="map-svg" ', 1)

    # Find the existing <svg id="map-svg" ...>...</svg> in the HTML and replace.
    pattern = re.compile(r'<svg\s+id="map-svg"[^>]*>.*?</svg>', flags=re.DOTALL)
    if not pattern.search(html):
        sys.exit('ERROR: no <svg id="map-svg"> block found in HTML. '
                 'Hub page may not be in the expected state.')
    new_html, n = pattern.subn(svg_str, html, count=1)
    if n != 1:
        sys.exit(f'ERROR: expected 1 replacement, got {n}')

    with open(html_path, 'w') as f:
        f.write(new_html)

    print(f'✓ re-inlined {svg_path} into {html_path}')
    print(f'  HTML size: {len(html)/1024:.0f} KB → {len(new_html)/1024:.0f} KB')


if __name__ == '__main__':
    main()
