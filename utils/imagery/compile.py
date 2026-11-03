#!/usr/bin/env python3
"""Build and verify the bounded Hessen WMS offline XYZ imagery package."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import io
import json
import math
import shutil
from pathlib import Path
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'app/public/imagery/rhein-main'
URL = 'https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows'
BOUNDS = [8.48, 49.93, 8.80, 50.12]
DETAIL = [[8.48, 50.005, 8.765, 50.095], [8.62, 49.95, 8.66, 49.975]]
CIRCUMFERENCE = 40075016.68557849
LIMIT = 80 * 1024 * 1024
RESERVE = 250 * 1024 * 1024


def check_space(required):
    if shutil.disk_usage(ROOT).free < RESERVE + required:
        raise RuntimeError('insufficient disk space: preserving 250 MiB reserve')


def xy(lon, lat, z):
    n = 2 ** z
    return ((lon + 180) / 360 * n,
            (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)


def rectangle(bounds, z):
    west, south, east, north = bounds
    x0, y0 = xy(west, north, z)
    x1, y1 = xy(east, south, z)
    return {(z, x, y) for x in range(math.floor(x0), math.floor(x1) + 1)
            for y in range(math.floor(y0), math.floor(y1) + 1)}


def required_tiles():
    tiles = set()
    for z in range(10, 15):
        tiles.update(rectangle(BOUNDS, z))
    for bounds in DETAIL:
        tiles.update(rectangle(bounds, 15))
    return sorted(tiles)


def tile_url(z, x, y, span=1):
    size = CIRCUMFERENCE / 2 ** z
    half = CIRCUMFERENCE / 2
    west, east = x * size - half, (x + span) * size - half
    north, south = half - y * size, half - (y + span) * size
    params = {'SERVICE': 'WMS', 'REQUEST': 'GetMap', 'VERSION': '1.1.1',
              'LAYERS': 'he_dop_rgb', 'STYLES': '', 'FORMAT': 'image/jpeg',
              'SRS': 'EPSG:3857', 'BBOX': ','.join(f'{v:.9f}' for v in (west, south, east, north)),
              'WIDTH': str(512 * span), 'HEIGHT': str(512 * span)}
    return URL + '?' + urlencode(params)


def validate_image(data):
    if len(data) > 2 * 1024 * 1024:
        raise ValueError('tile exceeds 2 MiB')
    with Image.open(io.BytesIO(data)) as im:
        if im.format != 'JPEG' or im.size != (512, 512):
            raise ValueError('tile is not a 512 x 512 JPEG')
        im.load()


def tile_path(tile):
    z, x, y = tile
    return DEST / 'tiles' / str(z) / str(x) / f'{y}.jpg'


def validate_meta(data, span):
    if len(data) > 16 * 1024 * 1024:
        raise ValueError('source metatile exceeds 16 MiB')
    with Image.open(io.BytesIO(data)) as im:
        if im.format != 'JPEG' or im.size != (512 * span, 512 * span):
            raise ValueError('source has wrong format or dimensions')
        im.load()


def crop_tile(image, x_offset, y_offset):
    left, top = x_offset * 512, y_offset * 512
    return image.crop((left, top, left + 512, top + 512))


def fetch_meta(group):
    z, x, y, span = group
    path = ROOT / 'output/imagery-source' / str(z) / str(x) / f'{y}-s{span}.jpg'
    if path.exists() and path.stat().st_size <= 16 * 1024 * 1024:
        data = path.read_bytes()
        try:
            validate_meta(data, span)
            return data
        except (ValueError, OSError):
            pass
    error = None
    for attempt in range(4):
        try:
            request = Request(tile_url(z, x, y, span), headers={'User-Agent': 'Gefly-offline-imagery/1.0 (bounded regional package)'})
            with urlopen(request, timeout=60) as response:
                data = response.read(16 * 1024 * 1024 + 1)
            validate_meta(data, span)
            check_space(len(data) + 32 * 1024 * 1024)
            path.parent.mkdir(parents=True, exist_ok=True)
            temp = path.with_suffix('.tmp')
            temp.write_bytes(data)
            temp.replace(path)
            return data
        except (OSError, ValueError) as exc:
            error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f'failed source group {group}: {error}')


def group_for(tile):
    z, x, y = tile
    span = 4 if z in (10, 15) else 2 if z == 14 else 1
    return z, x // span * span, y // span * span, span


def derive(group, data, tiles, total):
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        for tile in tiles:
            _, x, y = tile
            out = io.BytesIO()
            crop_tile(image, x - group[1], y - group[2]).save(out, 'JPEG', quality=85, optimize=True)
            derived = out.getvalue()
            validate_image(derived)
            total += len(derived)
            if total > LIMIT:
                raise ValueError(f'imagery exceeds {LIMIT} bytes during build')
            check_space(len(derived) + 32 * 1024 * 1024)
            path = tile_path(tile)
            path.parent.mkdir(parents=True, exist_ok=True)
            temp = path.with_suffix('.tmp')
            temp.write_bytes(derived)
            temp.replace(path)
    return total


def entry(tile, data):
    return dict(zip(('z', 'x', 'y'), tile)) | {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def verify():
    manifest = json.loads((DEST / 'manifest.json').read_text())
    tiles = required_tiles()
    if manifest['version'] != 1 or manifest['id'] != 'hessen-rhein-main-dop-v1' or manifest['scheme'] != 'xyz' or manifest['projection'] != 'EPSG:3857' or manifest['tile_size_px'] != 512 or manifest['min_level'] != 10 or manifest['max_level'] != 15 or manifest['bounds'] != BOUNDS:
        raise ValueError('manifest metadata mismatch')
    if manifest['source']['license'] != 'DL-DE-Zero-2.0' or manifest['source']['capture_date'] is not None:
        raise ValueError('source metadata mismatch')
    source_bytes = (DEST / 'SOURCES.json').read_bytes()
    if hashlib.sha256(source_bytes).hexdigest() != manifest['source']['sources_sha256']:
        raise ValueError('source record hash mismatch')
    source_record = json.loads(source_bytes)
    groups = source_record['groups']
    expected_groups = sorted({group_for(tile) for tile in tiles})
    if [(g['z'], g['x'], g['y'], g['span']) for g in groups] != expected_groups:
        raise ValueError('source group mismatch')
    for group, record in zip(expected_groups, groups):
        if record['url'] != tile_url(*group) or not 0 < record['bytes'] <= 16 * 1024 * 1024 or len(record['sha256']) != 64 or any(c not in '0123456789abcdef' for c in record['sha256']):
            raise ValueError('source provenance mismatch')
    entries = manifest['tiles']
    if len(entries) != len(tiles):
        raise ValueError('tile count mismatch')
    total = 0
    for tile, recorded in zip(tiles, entries):
        path = tile_path(tile)
        if path.stat().st_size > 2 * 1024 * 1024:
            raise ValueError(f'tile exceeds size limit: {tile}')
        data = path.read_bytes()
        validate_image(data)
        if entry(tile, data) != recorded:
            raise ValueError(f'tile mismatch: {tile}')
        total += len(data)
    if total > LIMIT:
        raise ValueError(f'imagery exceeds {LIMIT} bytes: {total}')
    print(f'verified {len(tiles)} tiles, {total} bytes')


def build():
    tiles = required_tiles()
    (DEST / 'manifest.json').unlink(missing_ok=True)
    groups = {}
    for tile in tiles:
        groups.setdefault(group_for(tile), []).append(tile)
    sources = []
    total = 0
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(fetch_meta, group): group for group in sorted(groups, reverse=True)}
        for future in as_completed(futures):
            group = futures[future]
            data = future.result()
            total = derive(group, data, groups[group], total)
            sources.append({'z': group[0], 'x': group[1], 'y': group[2], 'span': group[3],
                            'url': tile_url(*group), 'bytes': len(data),
                            'sha256': hashlib.sha256(data).hexdigest()})
            print(f'{len(sources)}/{len(groups)} source groups', flush=True)
    entries = [entry(tile, tile_path(tile).read_bytes()) for tile in tiles]
    total = sum(e['bytes'] for e in entries)
    if total > LIMIT:
        raise ValueError(f'imagery exceeds {LIMIT} bytes: {total}')
    source_record = {'version': 1, 'grouping': 'tile x and y rounded down to source span; span is 4 for z10/z15, 2 for z14, 1 for z11-z13',
                     'transform': 'decode WMS JPEG; crop 512px north-down XYZ tile; encode JPEG quality 85 optimize',
                     'groups': sorted(sources, key=lambda e: (e['z'], e['x'], e['y']))}
    temp = DEST / 'SOURCES.json.tmp'
    temp.write_text(json.dumps(source_record, indent=2) + '\n')
    temp.replace(DEST / 'SOURCES.json')
    manifest = {'version': 1, 'id': 'hessen-rhein-main-dop-v1', 'scheme': 'xyz',
                'projection': 'EPSG:3857', 'tile_size_px': 512, 'min_level': 10,
                'max_level': 15, 'bounds': BOUNDS,
                'source': {'name': 'Hessen DOP RGB (he_dop_rgb)', 'license': 'DL-DE-Zero-2.0',
                           'capture_date': None, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
                           'service_url': URL, 'wms_version': '1.1.1', 'layer': 'he_dop_rgb',
                           'format': 'image/jpeg', 'license_url': 'https://www.govdata.de/dl-de/zero-2-0',
                           'capabilities_sha256': '5755ee90b686ea2bf3cccd60235b047574fa9d36da9657807b16464cf621009a',
                           'sources_sha256': hashlib.sha256((DEST / 'SOURCES.json').read_bytes()).hexdigest(),
                           'modification': 'resampled by WMS, cropped and JPEG re-encoded',
                           'request_derivation': 'XYZ Web Mercator bounds, variable 1, 2 or 4 tile square source groups'},
                'tiles': entries}
    temp = DEST / 'manifest.json.tmp'
    temp.write_text(json.dumps(manifest, indent=2) + '\n')
    temp.replace(DEST / 'manifest.json')
    print(f'built {len(tiles)} tiles, {total} bytes')
    verify()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true', help='check the published package without network access')
    args = parser.parse_args()
    verify() if args.verify else build()
