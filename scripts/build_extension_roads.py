#!/usr/bin/env python3
"""
build_extension_roads.py — Phase 2 of the cream-gap fix.

WHAT THIS DOES
--------------
The Hub modal opens on the LEFT (width 410px) and can drag the host SVG
rightward to expose its left edge. Without anything west of viewBox x=-200,
the cream `--bg-map` background showed through that gap.

Phase 1 added a sibling SVG `<svg id="map-svg-extension" viewBox="-913 -125 713 1313">`
inside `#map-host`, positioned at left:-410px so its contents fill that gap
when the user drags right. This script populates that SVG with REAL OSM road
geometry from Overpass — covering the area west and south of the original
main-map bbox.

HOW IT INTEGRATES WITH build_real_roads.py
------------------------------------------
- Same AFFINE projection (locked from the 4 cluster anchors)
- Same HIGHWAY_CLASS taxonomy
- DIFFERENT bbox: shifted west to lon 101.659 and south to lat 3.092 so the
  resulting paths cover the extension viewBox x=-913..-200 at every latitude
  in the canvas. East edge 101.674 deliberately overlaps the original west
  (101.673) by 0.001° to catch ways crossing the boundary.
- DIFFERENT clip window: clips to the extension SVG's viewBox only
  (x=-913..-200, y=-200..1200), so we don't double-paint roads that the
  main `kl-map.svg` already shows.
- DIFFERENT stroke styles: matches the CURRENT hub.html road styles, not
  build_real_roads.py's older palette. (Hub.html roads were re-styled to
  warmer terracotta tones — #b58874 / #c39988 / #d2ab9c / #dcbeae — and
  this script uses those values so the extension matches seamlessly across
  the x=-200 boundary.)

OUTPUT
------
Rewrites `pages/hub.html` in place. Finds the `<svg id="map-svg-extension">…</svg>`
element and replaces its INNER CONTENT (preserving viewBox/preserveAspectRatio
on the opening tag) with 4 `<g id="roads-{class}-ext">` blocks. Re-runnable
without manual cleanup — the regex matches the SVG element regardless of
what's currently inside it.

RUN
---
    cd <repo-root>
    python scripts/build_extension_roads.py

Optional flags:
    --in / --out      paths (default: pages/hub.html for both)
    --cache PATH      save raw Overpass response
    --from-cache PATH skip network, load JSON from file
    --simplify F      Douglas-Peucker tolerance (default 0.6 SVG units)
    --dry-run         print stats only, don't touch hub.html

NETWORK NOTE
------------
The Anthropic sandbox where this was written cannot reach Overpass (403
on every mirror). Kunm runs this on her local machine where Overpass is
accessible. If all 3 mirrors fail the script prints a clear error and exits
nonzero without touching hub.html.

Reference: Phase 1 architecture decision in the May 31 cream-gap session.
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
# AFFINE PROJECTION — copied verbatim from build_real_roads.py
# ============================================================================
# Fit derived by least-squares from the 4 hand-placed cluster anchors in the
# existing SVG. DO NOT modify — these are the locked positions:
#       KB 101.7050, 3.1620 → 1053, 232
#       BB 101.7106, 3.1467 → 1347, 590
#       PS 101.6975, 3.1429 →  736, 565
#       LI 101.6873, 3.1300 →  320, 763
AFFINE = {
    'a':  46001.69, 'b':  -2446.25, 'e': -4669817.72,   # x = a*lon + b*lat + e
    'c':   7461.49, 'd': -20690.23, 'f':  -693217.69,   # y = c*lon + d*lat + f
}

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
# WHAT TO FETCH — extension bbox (west + south of original)
# ============================================================================
# Format: (south_lat, west_lon, north_lat, east_lon)  ← Overpass convention
#
# Derivation:
#   Extension viewBox is x=-913..-200, y=-125..1188 (height 1313).
#   The affine has nonzero b and c coefficients → it's a rotation+shear,
#   not pure scale. A lon/lat rectangle projects to a SKEWED quadrilateral
#   in SVG space, NOT an axis-aligned rectangle. So bbox edges must be
#   chosen so that the WORST corner still lands outside the extension
#   viewBox, not just the average.
#
#   Solving the affine for each viewBox corner:
#       to cover x=-913 at lat=3.092 (SW worst): need west_lon ≤ 101.6585
#       to cover x=-200 at lat=3.180 (NE worst): need east_lon ≥ 101.6788
#       to cover y=1188 at lon=101.658 (S worst): need south_lat ≤ 3.0953
#       to cover y=-125 at lon=101.680 (N): need north_lat ≥ 3.165 (slack)
#
#   The CLIP step below tosses anything outside the extension viewBox, so
#   oversizing the bbox is harmless — just costs a few more KB from Overpass.
BBOX = (3.090, 101.658, 3.180, 101.680)


# Same taxonomy as build_real_roads.py — single source of truth for what
# counts as a "road" in this project.
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


# Stroke styles MATCH CURRENT HUB.HTML, not build_real_roads.py's older
# palette. These four classes must render visually identical to the main
# map's roads or the seam at x=-200 will show.
#
# To verify: open pages/hub.html, search for `id="roads-major"` and confirm
# stroke / stroke-width / opacity here match. If they ever drift, this is
# the line to update.
ROAD_STYLES = {
    'major':     {'stroke': '#b58874', 'width': 3.8, 'opacity': 0.90},
    'secondary': {'stroke': '#c39988', 'width': 2.4, 'opacity': 0.85},
    'minor':     {'stroke': '#d2ab9c', 'width': 1.4, 'opacity': 0.78},
    'capillary': {'stroke': '#dcbeae', 'width': 1.0, 'opacity': 0.85},
}


# ============================================================================
# CLIP WINDOW — extension viewBox area only
# ============================================================================
# Drops ways that lie entirely east of x=-200, since those are already drawn
# by the main map. Keeps ways with ANY vertex inside the extension's visible
# region (with margin).
#
# Format: (x_min, y_min, x_max, y_max)
CLIP = (-913, -200, -200, 1200)


def in_window(pts):
    return any(CLIP[0] < x < CLIP[2] and CLIP[1] < y < CLIP[3] for x, y in pts)


# ============================================================================
# OVERPASS API — same mirrors as build_real_roads.py
# ============================================================================
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
    raise RuntimeError(
        f'all Overpass mirrors failed; last error: {last_err}\n'
        '  Most common cause: no internet / blocked egress. Try again from a\n'
        '  different network, or save the JSON manually from overpass-turbo.eu\n'
        '  and re-run with --from-cache PATH.'
    )


# ============================================================================
# POLYLINE SIMPLIFICATION (Douglas-Peucker, iterative)
# ============================================================================
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


# ============================================================================
# SVG SPLICE — replace inner content of <svg id="map-svg-extension">
# ============================================================================

def build_group(group_id, cls, paths):
    """One <g id="roads-XXX-ext"> block containing N <path> children."""
    s = ROAD_STYLES[cls]
    head = (
        f'<g id="{group_id}" stroke="{s["stroke"]}" '
        f'stroke-width="{s["width"]}" fill="none" '
        f'stroke-linecap="round" opacity="{s["opacity"]}">'
    )
    body = ''.join(f'<path d="{path_d(p)}"/>' for p in paths)
    return head + body + '</g>'


# Matches `<svg id="map-svg-extension" ...>` (opening tag, any attribute
# order) up through its FIRST `</svg>`. The extension SVG must never have
# nested <svg> elements — we don't put any in it, so this is safe.
_EXT_SVG_PAT = re.compile(
    r'(<svg\s+id="map-svg-extension"[^>]*>)(.*?)(</svg>)',
    flags=re.DOTALL,
)


def splice_extension(html, new_inner):
    """Replace the inner content of <svg id="map-svg-extension"> in hub.html."""
    out, n = _EXT_SVG_PAT.subn(
        # The middle group is escaped against backreference interpretation.
        lambda m: m.group(1) + '\n' + new_inner + '\n' + m.group(3),
        html,
    )
    if n == 0:
        sys.exit(
            'ERROR: <svg id="map-svg-extension"> not found in hub.html.\n'
            '  Phase 1 must have run first to create the extension element.\n'
            '  If you reverted Phase 1, restore it before running Phase 2.'
        )
    if n > 1:
        sys.stderr.write(
            f'  WARN: matched {n} extension SVG elements (expected 1); '
            'all were replaced\n'
        )
    return out


# ============================================================================
# MAIN
# ============================================================================

def verify_anchors():
    sys.stderr.write('Affine sanity check (must match build_real_roads.py):\n')
    for name, lon, lat, sx, sy in _ANCHORS:
        fx, fy = project(lon, lat)
        err = math.hypot(fx - sx, fy - sy)
        sys.stderr.write(
            f'  {name}: lon/lat ({lon},{lat}) → '
            f'fit ({fx:.1f},{fy:.1f}) vs locked ({sx},{sy})  err={err:.1f}\n'
        )


def main():
    ap = argparse.ArgumentParser(
        description='Populate the west-extension SVG in hub.html with real OSM roads.'
    )
    ap.add_argument('--in',   dest='inp', default='pages/hub.html',
                    help='source hub.html (default: pages/hub.html, relative to cwd)')
    ap.add_argument('--out',  dest='out', default='pages/hub.html',
                    help='output hub.html (default: same as --in, in-place)')
    ap.add_argument('--cache', help='save raw Overpass response to this path')
    ap.add_argument('--from-cache',
                    help='load Overpass response from this file, skip network')
    ap.add_argument('--simplify', type=float, default=0.6,
                    help='Douglas-Peucker tolerance in SVG units '
                         '(0 = no simplification, default 0.6)')
    ap.add_argument('--dry-run', action='store_true',
                    help='print stats only, do not write hub.html')
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
        sys.stderr.write(
            '  (extension area: west+south of main map; ~1.7 km wide strip)\n'
        )
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

    sys.stderr.write('\nKept ways per class (extension area only):\n')
    for cls in ('major', 'secondary', 'minor', 'capillary'):
        sys.stderr.write(f'  {cls:10s} {len(by_class[cls]):5d}\n')
    sys.stderr.write(f'  skipped (no class match):  {skipped_no_class}\n')
    sys.stderr.write(f'  skipped (entirely east of clip): {skipped_out}\n')

    total_kept = sum(len(v) for v in by_class.values())
    if total_kept == 0:
        sys.stderr.write(
            '\nWARN: 0 ways kept. Possible causes:\n'
            '  • bbox is wrong (check BBOX constant)\n'
            '  • Overpass returned no data for this area\n'
            '  • clip window excluded everything (check CLIP constant)\n'
        )

    if args.dry_run:
        sys.stderr.write('\n--dry-run set, exiting without writing hub.html.\n')
        return

    # 3) Build the 4 <g> blocks. Order matters for paint stacking:
    #    capillary first (drawn underneath) → major last (drawn on top).
    blocks = [
        build_group('roads-capillary-ext', 'capillary', by_class['capillary']),
        build_group('roads-minor-ext',     'minor',     by_class['minor']),
        build_group('roads-secondary-ext', 'secondary', by_class['secondary']),
        build_group('roads-major-ext',     'major',     by_class['major']),
    ]
    new_inner = (
        '<!-- Extension roads: © OpenStreetMap contributors (ODbL) -->\n'
        + '\n'.join(blocks)
    )

    # 4) Splice into hub.html
    if not os.path.exists(args.inp):
        sys.exit(
            f'ERROR: input file not found: {args.inp}\n'
            '  Hint: run this script from the repo root, not from scripts/.'
        )
    with open(args.inp) as fh:
        html = fh.read()
    orig_size = len(html)

    html = splice_extension(html, new_inner)

    with open(args.out, 'w') as fh:
        fh.write(html)
    sys.stderr.write(
        f'\n✓ wrote {args.out}  ({orig_size/1024:.0f} KB → {len(html)/1024:.0f} KB)\n'
    )
    sys.stderr.write(
        'Verify in Chrome:\n'
        '  1. Open Hub, click F6 (or any sign cluster) to open the modal.\n'
        '  2. Zoom out fully and drag the map RIGHT to expose the left edge.\n'
        '  3. The previously-cream gap should now show continuous road texture\n'
        '     that visually matches the main map at the x=-200 seam.\n'
    )


if __name__ == '__main__':
    main()
