#!/usr/bin/env python3
"""Build the bounded catalogue from the pinned OurAirports CSV supplied locally."""
import csv, hashlib, json, pathlib, sys

commit = 'e86a650a968ba239a1288f96c05fcb80688e77a6'
source = pathlib.Path(sys.argv[1])
raw = source.read_bytes()
if hashlib.sha256(raw).hexdigest() != '6852f06007ec1154256faff98edb8bbfbbce93fdb279525940864f07e9d90b32':
    raise SystemExit('Source hash changed; review the new OurAirports revision before compiling')
rows = []
with source.open(encoding='utf-8', newline='') as f:
    for r in csv.DictReader(f):
        if r['type'] not in ('small_airport', 'medium_airport', 'large_airport'):
            continue
        lat, lon = float(r['latitude_deg']), float(r['longitude_deg'])
        if not (49 <= lat <= 50.75 and 8 <= lon <= 10):
            continue
        rows.append({'id': r['ident'], 'name': r['name'], 'type': r['type'], 'icao': r['icao_code'], 'local': r['local_code'], 'lat': lat, 'lon': lon, 'elevation_ft': int(r['elevation_ft']) if r['elevation_ft'] else None})
rows.sort(key=lambda r: r['id'])
out = pathlib.Path('app/public/airports')
data = (json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
(out / 'regional.json').write_bytes(data)
manifest = {'schema': 1, 'bounds': [8, 49, 10, 50.75], 'count': len(rows), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'source': 'OurAirports community data, public domain; not a navigation chart', 'source_url': f'https://raw.githubusercontent.com/davidmegginson/ourairports-data/{commit}/airports.csv', 'source_commit': commit, 'source_sha256': hashlib.sha256(raw).hexdigest(), 'source_terms': 'https://ourairports.com/data/', 'retrieved': '2026-11-03'}
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(len(rows), manifest['source_sha256'])
