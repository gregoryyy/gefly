#!/usr/bin/env python3
"""Build a source-complete five-state subset of the pinned OurAirports CSV.

This community inventory is not an official list of operating airfields. Preserve
all source types, including closed facilities and heliports; UI filters must not
silently turn this selection into a claim about operational availability.
"""
import collections
import csv
import hashlib
import io
import json
import math
import pathlib
import sys

COMMIT = 'e86a650a968ba239a1288f96c05fcb80688e77a6'
SOURCE_SHA256 = '6852f06007ec1154256faff98edb8bbfbbce93fdb279525940864f07e9d90b32'
REGIONS = ('DE-BW', 'DE-BY', 'DE-HE', 'DE-RP', 'DE-SL')
BOUNDS = [6, 47, 14, 51.75]  # WGS84 west, south, east, north degrees.
TYPES = {'small_airport', 'medium_airport', 'large_airport', 'heliport',
         'seaplane_base', 'balloonport', 'closed'}

source = pathlib.Path(sys.argv[1])
raw = source.read_bytes()
if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
    raise SystemExit('Source hash changed; review the new OurAirports revision before compiling')
rows = []
ids = set()
for record in csv.DictReader(io.StringIO(raw.decode('utf-8'), newline='')):
    if record['iso_region'] not in REGIONS:
        continue
    lat, lon = float(record['latitude_deg']), float(record['longitude_deg'])
    elevation = int(record['elevation_ft']) if record['elevation_ft'] else None
    if (record['type'] not in TYPES or not record['ident'] or record['ident'] in ids
            or not record['name'] or not math.isfinite(lat) or not math.isfinite(lon)
            or not BOUNDS[0] <= lon <= BOUNDS[2] or not BOUNDS[1] <= lat <= BOUNDS[3]
            or elevation is not None and abs(elevation) >= 30000):
        raise SystemExit(f'Invalid selected source record: {record["ident"]}')
    ids.add(record['ident'])
    rows.append({'id': record['ident'], 'name': record['name'], 'type': record['type'],
                 'icao': record['icao_code'], 'local': record['local_code'],
                 'lat': lat, 'lon': lon, 'elevation_ft': elevation,
                 'iso_region': record['iso_region']})
rows.sort(key=lambda record: record['id'])
if len(rows) > 1000:
    raise SystemExit('Selected catalogue exceeds the reviewed 1000-record budget')
out = pathlib.Path('app/public/airports')
data = (json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
if len(data) > 200000:
    raise SystemExit('Selected catalogue exceeds the reviewed 200000-byte budget')
manifest = {
    'schema': 2,
    'id': 'southern-germany-airports-v1',
    'bounds': BOUNDS,
    'regions': list(REGIONS),
    'count': len(rows),
    'counts_by_type': dict(sorted(collections.Counter(record['type'] for record in rows).items())),
    'counts_by_region': dict(sorted(collections.Counter(record['iso_region'] for record in rows).items())),
    'bytes': len(data),
    'sha256': hashlib.sha256(data).hexdigest(),
    'source': 'OurAirports community data, public domain; not a navigation chart',
    'scope': 'All source entries in DE-BW, DE-BY, DE-HE, DE-RP and DE-SL; all source types retained, including heliports and closed facilities. Not an official or operationally complete inventory.',
    'source_url': f'https://raw.githubusercontent.com/davidmegginson/ourairports-data/{COMMIT}/airports.csv',
    'source_commit': COMMIT,
    'source_sha256': SOURCE_SHA256,
    'source_terms': 'https://ourairports.com/data/',
    'retrieved': '2026-11-03',
}
(out / 'regional.json').write_bytes(data)
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'{len(rows)} entries, {len(data)} bytes, {manifest["sha256"]}')
