#!/usr/bin/env python3
"""Build map-only public navaids; never alter the tuned radio/worker catalogue."""
import argparse
import collections
import csv
import gzip
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path

BOUNDS = [6, 47, 14, 51.75]
PACKAGE = 'southern-germany-map-navigation-v1'
OA_COMMIT = 'e86a650a968ba239a1288f96c05fcb80688e77a6'
OA_SHA = 'd7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1'
FG_SHA = '24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839'
OA_KINDS = {'NDB', 'NDB-DME', 'VOR', 'VOR-DME', 'VORTAC', 'DME', 'TACAN'}
SOURCES = [
    {'id': 'ourairports', 'sha256': OA_SHA, 'edition': '2026-11-02 snapshot', 'historical': False,
     'label': 'OurAirports snapshot 2026-11-02; service status unverified',
     'url': f'https://raw.githubusercontent.com/davidmegginson/ourairports-data/{OA_COMMIT}/navaids.csv',
     'license': 'Public domain / Unlicense'},
    {'id': 'nav810', 'sha256': FG_SHA, 'edition': '2013.10', 'historical': True,
     'label': 'Robin A. Peel / FlightGear NAV 2013.10; historical',
     'url': 'https://gitlab.com/flightgear/fgdata/-/raw/5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95/Navaids/nav.dat.gz',
     'license': 'GPL-2.0-or-later'},
]

def digest(data): return hashlib.sha256(data).hexdigest()
def inside(lon, lat): return math.isfinite(lon) and math.isfinite(lat) and BOUNDS[0] <= lon <= BOUNDS[2] and BOUNDS[1] <= lat <= BOUNDS[3]
def number(value): return float(value) if value else None

def compile_map(oa_source, fg_source, output):
    oa_raw, fg_zip = oa_source.read_bytes(), fg_source.read_bytes()
    if digest(oa_raw) != OA_SHA or digest(fg_zip) != FG_SHA:
        raise ValueError('Unreviewed source bytes')
    parser_path = Path(__file__).resolve().parents[1] / 'navdata/build_navdata.py'
    spec = importlib.util.spec_from_file_location('gefly_nav810', parser_path)
    nav = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(nav)
    lines, fg_rows, excluded = nav.parse(gzip.decompress(fg_zip))
    features, used, issues = [], set(), []

    def feature(uid, ident, name, kind, equipment, component, lon, lat, elevation_m,
                frequency_khz, airport_runway, source, source_lines):
        if not inside(lon, lat) or elevation_m is not None and (not math.isfinite(elevation_m) or not -1000 <= elevation_m <= 10000):
            raise ValueError(f'Invalid map component coordinates/height: {uid}/{component}')
        is_ndb = component == 'station' and kind.startswith('NDB')
        frequency = f'{frequency_khz:g} kHz' if is_ndb else f'{frequency_khz / 1000:.2f} MHz'
        features.append({'type': 'Feature', 'id': f'{uid}/{component}',
                         'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
                         'properties': {'station_uid': uid, 'identifier': ident, 'name': name,
                                        'kind': kind, 'component': component, 'equipment': equipment,
                                        'frequency_label': frequency,
                                        'frequency_mhz': '' if is_ndb else f'{frequency_khz / 1000:.2f}',
                                        'airport_runway': airport_runway, 'elevation_m': elevation_m,
                                        'package_id': PACKAGE, 'edition': source['edition'],
                                        'historical': source['historical'], 'source_label': source['label'],
                                        'source_sha256': source['sha256'], 'source_line_ids': source_lines[:]}})

    oa_reader = csv.DictReader(io.StringIO(oa_raw.decode('utf-8'), newline=''))
    oa_fields = oa_reader.fieldnames
    oa_rows = [row for row in oa_reader if row['iso_country'] == 'DE'
               and inside(float(row['longitude_deg']), float(row['latitude_deg']))]
    for row in sorted(oa_rows, key=lambda row: int(row['id'])):
        if row['type'] not in OA_KINDS:
            raise ValueError('Unknown OurAirports type')
        uid = f'oa-{row["id"]}'
        lat, lon = float(row['latitude_deg']), float(row['longitude_deg'])
        elevation = number(row['elevation_ft'])
        feature(uid, row['ident'], row['name'], row['type'], row['type'], 'station', lon, lat,
                None if elevation is None else elevation * .3048, float(row['frequency_khz']),
                row['associated_airport'], SOURCES[0], [])
        # Missing DME coordinates are not inferred. Source-collocated antennas
        # share the parent marker; separate coordinates get their own point.
        if bool(row['dme_latitude_deg']) != bool(row['dme_longitude_deg']):
            raise ValueError('Incomplete OurAirports DME coordinate')
        if row['dme_latitude_deg']:
            dlat, dlon = float(row['dme_latitude_deg']), float(row['dme_longitude_deg'])
            if (dlon, dlat) != (lon, lat):
                elevation = number(row['dme_elevation_ft'])
                feature(uid, row['ident'], row['name'], row['type'], 'DME', 'DME', dlon, dlat,
                        None if elevation is None else elevation * .3048, float(row['dme_frequency_khz']),
                        row['associated_airport'], SOURCES[0], [])

    parents = [row for row in fg_rows if row['type'] in [4, 5] and row['tail'][0].startswith(('ED', 'ET'))
               and inside(row['lon'], row['lat'])]
    for row in parents:
        key = nav.ils_key(row)
        uid = f'nav810-{row["line"]}'
        source_lines, components = [row['line']], []
        for kind, types in [('GS', [6]), ('DME', [12, 13])]:
            candidates = [other for other in fg_rows if other['type'] in types and nav.ils_key(other) == key]
            source_lines.extend(other['line'] for other in candidates)
            if len(candidates) == 1:
                components.append((kind, candidates[0]))
            elif len(candidates) > 1:
                issues.append({'station_uid': uid, 'component': kind, 'source_line_ids': [other['line'] for other in candidates],
                               'reason': 'Ambiguous explicit components; not displayed'})
        used.update(source_lines)
        equipment = ('ILS' if any(kind == 'GS' for kind, _ in components) else 'LOC') + ('/DME' if any(kind == 'DME' for kind, _ in components) else '')
        airport_runway = ' '.join(row['tail'][:2])
        feature(uid, row['id'], ' '.join(row['tail']), 'LOC', equipment, 'station', row['lon'], row['lat'],
                row['elev'] * .3048, row['freq'], airport_runway, SOURCES[1], source_lines)
        for kind, other in components:
            if (other['lon'], other['lat']) != (row['lon'], row['lat']):
                feature(uid, row['id'], ' '.join(row['tail']), 'LOC', equipment, kind, other['lon'], other['lat'],
                        other['elev'] * .3048, row['freq'], airport_runway, SOURCES[1], source_lines)
    features.sort(key=lambda item: item['id'])
    if len(features) > 1000 or len({item['id'] for item in features}) != len(features):
        raise ValueError('Point budget or unique identity violation')
    data = (json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    if len(data) > 1000000:
        raise ValueError('Map package byte budget exceeded')
    manifest = {'schema': 1, 'id': PACKAGE, 'asset': 'southern-germany-v1.json', 'bounds': BOUNDS,
                'count': len(features), 'station_count': len(oa_rows) + len(parents),
                'counts_by_source': {'ourairports': len(oa_rows), 'nav810': len(parents)},
                'counts_by_component': dict(sorted(collections.Counter(item['properties']['component'] for item in features).items())),
                'bytes': len(data), 'sha256': digest(data), 'sources': SOURCES,
                'scope': 'Map-only German source points in 6–14°E / 47–51.75°N; includes adjoining states. Airports use a separate five-state selection. Not current AIS, AIRAC, airspace, NOTAM or published procedures.',
                'component_issues': issues, 'excluded_malformed_worldwide_rows': excluded}
    output.mkdir(parents=True, exist_ok=True)
    (output / manifest['asset']).write_bytes(data)
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    header = next(line for line in lines[:4] if '810 Version' in line)
    (output / 'source-nav810.dat').write_text('I\n' + header + '\n\n' + '\n'.join(lines[index - 1] for index in sorted(used)) + '\n99\n', encoding='utf-8')
    with (output / 'source-ourairports.csv').open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=oa_fields, lineterminator='\n')
        writer.writeheader(); writer.writerows(sorted(oa_rows, key=lambda row: int(row['id'])))
    (output / 'LICENSE-nav810.txt').write_bytes((parser_path.parents[2] / 'app/public/navdata/LICENSE.txt').read_bytes())
    print(json.dumps({key: manifest[key] for key in ['count', 'station_count', 'counts_by_source', 'counts_by_component', 'bytes', 'sha256']}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ourairports', type=Path, required=True)
    parser.add_argument('--nav810', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('app/public/mapdata'))
    args = parser.parse_args()
    compile_map(args.ourairports, args.nav810, args.output)
