#!/usr/bin/env python3
"""
AQC7015 Capstone · Replace procedural road grid with REAL OpenStreetMap roads.

What this does
--------------
1.  Queries the Overpass API for every `highway` way inside central KL bbox.
2.  Projects each way's lat/lon polyline into the existing SVG coord system
    using a 4-district affine fit (KB / BB / PS / LI anchors stay fixed,
    cluster positions are untouched).
3.  Reads `kl-map.svg`, splices in the four real-data road groups
    (capillary / minor / secondary / major), writes the file back.

Usage
-----
    python build_real_roads.py
        # default: reads ./kl-map.svg, writes ./kl-map.svg, fetches via network

    python build_real_roads.py --cache osm-raw.json
        # save the raw Overpass response so you don't re-hit the API next time

    python build_real_roads.py --from-cache osm-raw.json
        # skip network, project from a previously cached response

    python build_real_roads.py --in kl-map.svg --out kl-map.svg --simplify 0.6
        # all options shown

Dependencies
------------
Python 3.8+, stdlib only. No pip install needed.

Network
-------
Needs outbound HTTPS to `overpass-api.de` (with two mirrors as fallback).
Typical runtime: 30-120 s depending on Overpass queue.

License
-------
OSM data is © OpenStreetMap contributors, distributed under ODbL.
This script automatically inserts the required attribution into the SVG.
"""

import argparse
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


# ============================================================================
# AFFINE PROJECTION:  real (lon, lat)  →  SVG (x, y)
# ============================================================================
# Fit derived by least-squares from the 4 hand-placed cluster anchors in the
# existing SVG. These are the locked positions from the project memory:
#
#       district    real (lon,        lat   )    SVG (  x,    y)
#       --------    -----------       -----      -----------
#       KB          101.7050          3.1620     1053         232
#       BB          101.7106          3.1467     1347         590
#       PS          101.6975          3.1429      736         565
#       LI          101.6873          3.1300      320         763
#
# Per-anchor fit residuals (Euclidean SVG units):
#       KB  4.4   BB  3.3   PS 15.3   LI  7.5    (mean ~7.6, max ~15)
#
# So OSM road geometry will be off by at most ~15 SVG units relative to the
# cluster positions — about 1% of the 1600px canvas width.
AFFINE = {
    'a':  46001.69, 'b':  -2446.25, 'e': -4669817.72,   # x = a*lon + b*lat + e
    'c':   7461.49, 'd': -20690.23, 'f':  -693217.69,   # y = c*lon + d*lat + f
}

# Verify on the 4 anchors and print residuals (sanity check at script start).
_ANCHORS = [
    ('KB', 101.7050, 3.1620, 1053, 232),
    ('BB', 101.7106, 3.1467, 1347, 590),
    ('PS', 101.6975, 3.1429,  736, 565),
    ('LI', 101.6873, 3.1300,  320, 763),
]


def project(lon, lat):
    """Real (lon, lat) → SVG (x, y) via locked affine."""
    x = AFFINE['a'] * lon + AFFINE['b'] * lat + AFFINE['e']
    y = AFFINE['c'] * lon + AFFINE['d'] * lat + AFFINE['f']
    return x, y


# ============================================================================
# WHAT TO FETCH
# ============================================================================
# Bounding box covering all 4 districts plus generous margin so edge roads
# don't get clipped at the canvas border.
# Format: (south_lat, west_lon, north_lat, east_lon)  ← Overpass convention
BBOX = (3.122, 101.673, 3.180, 101.722)

# Map each OSM `highway=` value to one of our 4 visual weight classes.
# Anything not in this dict gets dropped (e.g. footways, steps, cycleways,
# tracks — they would noise up the city texture).
HIGHWAY_CLASS = {
    # ── major arteries (thickest stroke)
    'motorway':       'major',
    'trunk':          'major',
    'primary':        'major',
    'motorway_link':  'major',
    'trunk_link':     'major',
    'primary_link':   'major',
    # ── secondary
    'secondary':      'secondary',
    'tertiary':       'secondary',
    'secondary_link': 'secondary',
    'tertiary_link':  'secondary',
    # ── minor named streets
    'residential':    'minor',
    'unclassified':   'minor',
    'living_street':  'minor',
    'road':           'minor',
    # ── fine block-grain (city texture)
    'service':        'capillary',
    'pedestrian':     'capillary',
}

# Stroke style per class — uses the Hangzhou terracotta palette already in
# the SVG. Width/opacity match the original procedural groups so the visual
# weight stays the same.
ROAD_STYLES = {
    'major':     {'stroke': '#a87055', 'width': 3.8, 'opacity': 0.90},
    'secondary': {'stroke': '#b88370', 'width': 2.4, 'opacity': 0.85},
    'minor':     {'stroke': '#c89880', 'width': 1.4, 'opacity': 0.78},
    'capillary': {'stroke': '#d0a890', 'width': 1.0, 'opacity': 0.85},
}


# ============================================================================
# OVERPASS API
# ============================================================================
# Multiple mirrors for fallback. Order = preference.
OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
]


def build_query(bbox):
    """Overpass QL: every way with a `highway` tag inside bbox, geometry inline."""
    s, w, n, e = bbox
    return (
        '[out:json][timeout:90];'
        f'way["highway"]({s},{w},{n},{e});'
        'out geom;'
    )


def fetch_overpass(query):
    """POST query to Overpass mirror, return parsed JSON. Falls back across mirrors."""
    body = urllib.parse.urlencode({'data': query}).encode('utf-8')
    last_err = None
    for url in OVERPASS_ENDPOINTS:
        sys.stderr.write(f'→ querying {url}\n')
        try:
            req = urllib.request.Request(
                url, data=body,
                headers={
                    'User-Agent': 'KL-multilingual-signage/1.0 (AQC7015 capstone, University of Malaya)',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                method='POST',
            )
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=180) as resp:
                raw = resp.read()
                sys.stderr.write(f'  ok ({len(raw)/1024:.0f} KB in {time.time()-t0:.1f}s)\n')
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            last_err = e
            sys.stderr.write(f'  HTTP {e.code}: {e.reason}\n')
        except Exception as e:
            last_err = e
            sys.stderr.write(f'  failed: {e}\n')
    raise RuntimeError(f'all Overpass mirrors failed; last error: {last_err}')


# ============================================================================
# POLYLINE SIMPLIFICATION (Douglas-Peucker, iterative)
# ============================================================================
# OSM way geometry can have hundreds of nodes per way. Most of them are
# imperceptible curve detail at our zoom. Simplifying with a 0.5-1.0 SVG-unit
# tolerance cuts file size 5-10× with no visible loss.

def dp_simplify(points, tolerance=0.6):
    """Iterative Douglas-Peucker. points = [(x,y), ...] in SVG units."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    tol2 = tolerance * tolerance
    while stack:
        i0, i1 = stack.pop()
        x0, y0 = points[i0]
        x1, y1 = points[i1]
        dx, dy = x1 - x0, y1 - y0
        seg2 = dx * dx + dy * dy
        max_d2, max_i = 0.0, -1
        for i in range(i0 + 1, i1):
            x, y = points[i]
            if seg2 == 0:
                d2 = (x - x0) ** 2 + (y - y0) ** 2
            else:
                t = ((x - x0) * dx + (y - y0) * dy) / seg2
                t = max(0.0, min(1.0, t))
                px, py = x0 + t * dx, y0 + t * dy
                d2 = (x - px) ** 2 + (y - py) ** 2
            if d2 > max_d2:
                max_d2, max_i = d2, i
        if max_d2 > tol2 and max_i > 0:
            keep[max_i] = True
            stack.append((i0, max_i))
            stack.append((max_i, i1))
    return [p for p, k in zip(points, keep) if k]


def path_d(points):
    """Polyline → SVG path d attribute (1-decimal precision saves bytes)."""
    out = [f'M{points[0][0]:.1f},{points[0][1]:.1f}']
    for x, y in points[1:]:
        out.append(f'L{x:.1f},{y:.1f}')
    return ''.join(out)


# Clip window — keep ways with ANY vertex inside this rectangle.
# Bigger than the 1600x1000 canvas so we keep partial roads at the edge.
CLIP = (-200, -200, 1800, 1200)


def in_window(pts):
    return any(CLIP[0] < x < CLIP[2] and CLIP[1] < y < CLIP[3] for x, y in pts)


# ============================================================================
# SVG SPLICE
# ============================================================================

def build_group(group_id, cls, paths):
    """One <g id="roads-XXX"> block containing N <path> children."""
    s = ROAD_STYLES[cls]
    head = (
        f'<g id="{group_id}" stroke="{s["stroke"]}" '
        f'stroke-width="{s["width"]}" fill="none" '
        f'stroke-linecap="round" opacity="{s["opacity"]}">'
    )
    body = ''.join(f'<path d="{path_d(p)}"/>' for p in paths)
    return head + body + '</g>'


def replace_group(svg, group_id, new_block):
    """Find <g id="..."> ... </g> and substitute. Returns updated SVG."""
    pat = re.compile(
        r'<g\s+id="' + re.escape(group_id) + r'"[^>]*>.*?</g>',
        flags=re.DOTALL,
    )
    out, n = pat.subn(new_block, svg)
    if n == 0:
        sys.stderr.write(f'  WARN: <g id="{group_id}"> not found in source SVG — skipped\n')
    return out


# ============================================================================
# MAIN
# ============================================================================

def verify_anchors():
    sys.stderr.write('Affine sanity check:\n')
    for name, lon, lat, sx, sy in _ANCHORS:
        fx, fy = project(lon, lat)
        err = math.hypot(fx - sx, fy - sy)
        sys.stderr.write(
            f'  {name}: lon/lat ({lon},{lat}) → '
            f'fit ({fx:.1f},{fy:.1f}) vs locked ({sx},{sy})  err={err:.1f}\n'
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in',   dest='inp', default='kl-map.svg',
                    help='source SVG (default: ./kl-map.svg)')
    ap.add_argument('--out',  dest='out', default='kl-map.svg',
                    help='output SVG (default: same as --in, i.e. in-place)')
    ap.add_argument('--cache', help='save raw Overpass response to this path')
    ap.add_argument('--from-cache', help='load Overpass response from this file, skip network')
    ap.add_argument('--simplify', type=float, default=0.6,
                    help='Douglas-Peucker tolerance in SVG units (0 = no simplification, default 0.6)')
    ap.add_argument('--dry-run', action='store_true',
                    help='print stats only, do not write SVG')
    args = ap.parse_args()

    verify_anchors()
    sys.stderr.write('\n')

    # 1) Fetch (or load cached) OSM data
    if args.from_cache:
        sys.stderr.write(f'Loading cached Overpass response: {args.from_cache}\n')
        with open(args.from_cache) as fh:
            osm = json.load(fh)
    else:
        sys.stderr.write(f'Fetching OSM highways for bbox {BBOX}\n')
        osm = fetch_overpass(build_query(BBOX))
        if args.cache:
            with open(args.cache, 'w') as fh:
                json.dump(osm, fh)
            sys.stderr.write(f'Cached raw response → {args.cache}\n')

    ways = osm.get('elements', [])
    sys.stderr.write(f'Got {len(ways)} OSM elements\n')

    # 2) Project & classify
    by_class = {'major': [], 'secondary': [], 'minor': [], 'capillary': []}
    seen_ids = set()
    skipped_no_class = 0
    skipped_out = 0
    for w in ways:
        if w.get('type') != 'way':
            continue
        wid = w.get('id')
        if wid in seen_ids:
            continue
        seen_ids.add(wid)
        tag = w.get('tags', {}).get('highway')
        cls = HIGHWAY_CLASS.get(tag)
        if cls is None:
            skipped_no_class += 1
            continue
        geom = w.get('geometry') or []
        pts = [project(g['lon'], g['lat']) for g in geom]
        if len(pts) < 2:
            continue
        if not in_window(pts):
            skipped_out += 1
            continue
        if args.simplify > 0:
            pts = dp_simplify(pts, args.simplify)
        by_class[cls].append(pts)

    sys.stderr.write('\nKept ways per class:\n')
    for cls in ('major', 'secondary', 'minor', 'capillary'):
        sys.stderr.write(f'  {cls:10s} {len(by_class[cls]):5d}\n')
    sys.stderr.write(f'  skipped (no class match):  {skipped_no_class}\n')
    sys.stderr.write(f'  skipped (outside canvas):  {skipped_out}\n')

    if args.dry_run:
        sys.stderr.write('\n--dry-run set, exiting without writing SVG.\n')
        return

    # 3) Build new <g> blocks
    new_blocks = {
        'roads-capillary': build_group('roads-capillary', 'capillary', by_class['capillary']),
        'roads-minor':     build_group('roads-minor',     'minor',     by_class['minor']),
        'roads-secondary': build_group('roads-secondary', 'secondary', by_class['secondary']),
        'roads-major':     build_group('roads-major',     'major',     by_class['major']),
    }

    # 4) Splice into existing SVG
    if not os.path.exists(args.inp):
        sys.exit(f'ERROR: input SVG not found: {args.inp}')
    with open(args.inp) as fh:
        svg = fh.read()
    orig_size = len(svg)

    for gid, block in new_blocks.items():
        svg = replace_group(svg, gid, block)

    # OSM attribution (required by ODbL)
    OSM_NOTE = '<!-- Road geometry: © OpenStreetMap contributors (ODbL) -->'
    if OSM_NOTE not in svg:
        svg = svg.replace('<title>', OSM_NOTE + '\n<title>', 1)

    with open(args.out, 'w') as fh:
        fh.write(svg)
    sys.stderr.write(
        f'\n✓ wrote {args.out}  ({orig_size/1024:.0f} KB → {len(svg)/1024:.0f} KB)\n'
    )
    sys.stderr.write(
        'Reminder: hub-page.html inlines the SVG. Re-inline by running:\n'
        '    (cd to outputs dir, then run your hub-rebuild step,\n'
        '     or just regenerate hub-page.html with the new kl-map.svg embedded)\n'
    )


if __name__ == '__main__':
    main()
