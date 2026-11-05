#!/usr/bin/env python3
"""Compose fixed-size WMS PNG responses supplied over stdin; write RGBA PNG to stdout."""
import base64
import io
import json
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = 512 * 512
raw = sys.stdin.buffer.read(15 * 1024 * 1024 + 1)
if len(raw) > 15 * 1024 * 1024:
    raise ValueError('input too large')
inputs = json.loads(raw)
if not isinstance(inputs, list) or not 1 <= len(inputs) <= 5:
    raise ValueError('invalid images')
canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
for item in inputs:
    data = base64.b64decode(item, validate=True)
    if len(data) > 2 * 1024 * 1024:
        raise ValueError('image too large')
    im = Image.open(io.BytesIO(data))
    if im.format != 'PNG' or im.size != (512, 512):
        raise ValueError('invalid PNG')
    im.load()
    rgba = im.convert('RGBA')
    # Some services return an opaque, uniform blank outside their footprint.
    extrema = rgba.convert('RGB').getextrema()
    if all(low == high and low in (0, 255) for low, high in extrema):
        continue
    canvas.alpha_composite(rgba)
out = io.BytesIO()
canvas.save(out, format='PNG')
result = out.getvalue()
if len(result) > 2 * 1024 * 1024:
    raise ValueError('output too large')
sys.stdout.buffer.write(result)
