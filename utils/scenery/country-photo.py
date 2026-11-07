#!/usr/bin/env python3
"""Validate one official country image and conservatively mask Austrian borders.

Austria uses Natural Earth 1:10m admin-0 v5.1.1, public domain. The mask
is approximate cartography, not a surveyed legal or imagery coverage boundary.
The 800 m projected interior margin exceeds 500 m on Austrian latitudes.
"""
import io
import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = 256 * 256
LIMIT = 2 * 1024 * 1024
source, z, x, y = sys.argv[1], *map(int, sys.argv[2:])
if source not in ('ch', 'at') or not 7 <= z <= 20 or not 0 <= x < 2**z or not 0 <= y < 2**z:
    raise ValueError('invalid tile')
body = sys.stdin.buffer.read(LIMIT + 1)
if not 0 < len(body) <= LIMIT:
    raise ValueError('invalid image size')
im = Image.open(io.BytesIO(body))
if im.size != (256, 256) or im.format != ('PNG' if source == 'ch' else 'JPEG'):
    raise ValueError('invalid image format or dimensions')
im.load()
image = im.convert('RGBA')
if source == 'at':
    polygon = json.loads((Path(__file__).parent / 'austria-ne-10m.geojson').read_text())
    if polygon['type'] != 'Polygon':
        raise ValueError('invalid country geometry')
    n = 2 ** z
    def pixel(point):
        lon, lat = point
        radians = math.radians(lat)
        return ((lon + 180) / 360 * n * 256 - x * 256,
                (1 - math.asinh(math.tan(radians)) / math.pi) / 2 * n * 256 - y * 256)
    rings = [[pixel(p) for p in ring] for ring in polygon['coordinates']]
    # Geodesic ground distance is scale*cos(latitude), so 800 projected metres
    # exceeds 500 ground metres throughout the documented Austrian envelope.
    radius = math.ceil(800 * n * 256 / 40075016.68557849) + 1
    mask = Image.new('L', (256, 256), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(rings[0], fill=255)
    for ring in rings[1:]:
        draw.polygon(ring, fill=0)
    if radius > 512:
        # Avoid allocating/drawing enormous round strokes in deep zooms. A
        # tile near even a segment's expanded bbox is conservatively omitted.
        for ring in rings:
            for a, b in zip(ring, ring[1:]):
                if (max(a[0], b[0]) >= -radius and min(a[0], b[0]) <= 255 + radius
                        and max(a[1], b[1]) >= -radius and min(a[1], b[1]) <= 255 + radius):
                    mask.paste(0, (0, 0, 256, 256))
                    break
            else:
                continue
            break
    else:
        for ring in rings:
            draw.line(ring, fill=0, width=2 * radius + 1, joint='curve')
            # Explicit round joins make the margin independent of line join behavior.
            for px, py in ring:
                if -radius <= px <= 255 + radius and -radius <= py <= 255 + radius:
                    draw.ellipse((px-radius, py-radius, px+radius, py+radius), fill=0)
    image.putalpha(mask)
empty = image.getchannel('A').getbbox() is None
if empty:
    image = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
sys.stderr.write('empty\n' if empty else 'data\n')
out = io.BytesIO()
image.save(out, format='PNG')
result = out.getvalue()
if len(result) > LIMIT:
    raise ValueError('encoded image too large')
sys.stdout.buffer.write(result)
