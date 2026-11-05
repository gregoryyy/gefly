#!/usr/bin/env python3
"""Compile a source-pinned, one-degree ETOPO/EGM2008 emergency terrain baseline.

Offline only. Inputs are bounded ERDDAP subsets, a geoid TIFF and an ocean mask;
this tool does not download a full-resolution global DEM or install dependencies.
"""
from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import math
from pathlib import Path
import struct
from PIL import Image

WIDTH, HEIGHT = 361, 181
IDENT = 'world-etopo2022-1deg-egm2008-v1'
DEM_URL = 'https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_60s.json?z[0:60:10799][0:60:21599]'
NORTH_URL = 'https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_60s.json?z[10799:1:10799][0:60:21599]'
METADATA_URL = 'https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_60s.das'
GEOID_URL = 'https://cdn.proj.org/us_nga_egm08_25.tif'
OCEAN_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_ocean.geojson'
SOURCE_HASHES = {
    'dem': 'a0e925530769f34d38bb79c57a727228252eed66cd1c3c031c1a81db7d5284fe',
    'north': '6e67c26a99137b8570b265d01824bf340bdc062417f7450281bb2cda688f37da',
    # ERDDAP injects access timestamps into .das history. Check its semantic
    # reference below and record the actual response hash; numeric sources stay pinned.
    'metadata': None,
    'geoid': '4191d471eefebf24091b56dbc604353cb3b8cf8cc70e448bb9ae56a272bef17a',
    'ocean': '5b810162af4b20805838cfd766ef1a445c350cf6aafc8b589515daef30033adf',
}
SOURCE_URLS = dict(dem=DEM_URL, north=NORTH_URL, metadata=METADATA_URL,
                   geoid=GEOID_URL, ocean=OCEAN_URL)
SOURCE_LIMITS = dict(dem=5_000_000, north=100_000, metadata=50_000,
                     geoid=90_000_000, ocean=2_000_000)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def source_bytes(path: Path, key: str) -> bytes:
    if path.stat().st_size > SOURCE_LIMITS[key]:
        raise ValueError(f'{key}: source exceeds compiler byte bound')
    raw = path.read_bytes()
    if SOURCE_HASHES[key] is not None and sha256(raw) != SOURCE_HASHES[key]:
        raise ValueError(f'{key}: source changed; review and pin its identity before rebuilding')
    return raw


def parse_subset(raw: bytes, latitudes: list[float], longitudes: list[float]) -> list[list[float]]:
    table = json.loads(raw)['table']
    if table['columnNames'] != ['latitude', 'longitude', 'z'] or table['columnUnits'] != ['degrees_north', 'degrees_east', 'meters']:
        raise ValueError('Unexpected ERDDAP columns or units')
    rows = table['rows']
    if len(rows) != len(latitudes) * len(longitudes):
        raise ValueError('Unexpected ERDDAP subset shape')
    result = []
    for y, lat in enumerate(latitudes):
        values = []
        for x, lon in enumerate(longitudes):
            row = rows[y * len(longitudes) + x]
            if len(row) != 3 or any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) for v in row):
                raise ValueError('Invalid ERDDAP sample')
            if abs(row[0] - lat) > 1e-8 or abs(row[1] - lon) > 1e-8:
                raise ValueError('ERDDAP sample order/coordinates differ from the pinned lattice')
            if not -12000 < row[2] < 10000:
                raise ValueError('Missing or implausible source elevation, including -99999 no-data')
            values.append(float(row[2]))
        result.append(values)
    return result


def ring_row(ring: list[list[float]], latitude: float) -> tuple[list[float], list[tuple[float, float]]]:
    """Ray crossings plus horizontal boundary intervals for one fixed latitude."""
    crossings, boundaries = [], []
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if y1 == y2 == latitude:
            boundaries.append((min(x1, x2), max(x1, x2)))
        elif min(y1, y2) <= latitude <= max(y1, y2):
            # Explicit segment boundary, including vertical edges and vertices.
            x = x1 + (latitude - y1) * (x2 - x1) / (y2 - y1)
            boundaries.append((x, x))
        if (y1 > latitude) != (y2 > latitude):
            crossings.append(x1 + (latitude - y1) * (x2 - x1) / (y2 - y1))
    return sorted(crossings), boundaries


def inside_ring(row: tuple[list[float], list[tuple[float, float]]], longitude: float) -> bool:
    crossings, boundaries = row
    return any(a <= longitude <= b for a, b in boundaries) or bisect.bisect_right(crossings, longitude) % 2 == 1


class OceanMask:
    """Only the globally connected ocean component; isolated Caspian stays inland."""

    def __init__(self, raw: bytes):
        data = json.loads(raw)
        if data.get('type') != 'FeatureCollection' or not 1 <= len(data['features']) <= 100:
            raise ValueError('Unexpected ocean feature collection')
        candidates = []
        for feature in data['features']:
            geometry = feature['geometry']
            if geometry['type'] == 'Polygon':
                polygons = [geometry['coordinates']]
            elif geometry['type'] == 'MultiPolygon':
                polygons = geometry['coordinates']
            else:
                raise ValueError('Ocean mask must contain polygons')
            for rings in polygons:
                if not rings:
                    raise ValueError('Empty ocean polygon')
                for ring in rings:
                    if len(ring) < 4 or ring[0] != ring[-1]:
                        raise ValueError('Ocean ring is not closed')
                    for point in ring:
                        if len(point) != 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in point) or not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90:
                            raise ValueError('Invalid ocean-mask coordinate')
                west = min(p[0] for p in rings[0]); east = max(p[0] for p in rings[0])
                north = max(p[1] for p in rings[0])
                if west == -180 and east == 180 and north == 90:
                    candidates.append(rings)
        if len(candidates) != 1:
            raise ValueError('Expected exactly one globally connected ocean polygon')
        self.rings = candidates[0]
        self.rows = {lat: [ring_row(r, lat) for r in self.rings] for lat in range(-90, 91)}

    def contains(self, longitude: float, latitude: int) -> bool:
        row = self.rows[latitude]
        return inside_ring(row[0], longitude) and not any(inside_ring(hole, longitude) for hole in row[1:])


def validate_geoid(image: Image.Image) -> None:
    if image.mode != 'F' or image.size != (8640, 4321):
        raise ValueError('Unexpected EGM2008 grid format')
    if tuple(image.tag_v2.get(33550, ())) != (1 / 24, 1 / 24, 0) or tuple(image.tag_v2.get(33922, ())) != (0, 0, 0, -180, 90, 0):
        raise ValueError('Unexpected EGM2008 grid registration')
    # 1025=2 is PixelIsPoint: coordinates refer to nodes, not cell corners.
    keys = image.tag_v2.get(34735, ())
    entries = [tuple(keys[i:i + 4]) for i in range(4, len(keys), 4)]
    if (1025, 0, 1, 2) not in entries or (2048, 0, 1, 4326) not in entries:
        raise ValueError('EGM2008 grid must be WGS84 PixelIsPoint')


def geoid_node(image: Image.Image, longitude: int, latitude: int) -> float:
    # Exact one-degree nodes are a 24-node subsample of the 2.5-minute grid.
    # The source omits duplicate +180; wrap it to the identical -180 sample.
    x, y = ((longitude + 180) * 24) % 8640, (90 - latitude) * 24
    value = float(image.getpixel((x, y)))
    if not math.isfinite(value) or abs(value) >= 200:
        raise ValueError('Invalid geoid undulation')
    return value


def pack_grid(dem: list[list[float]], north: list[float], geoid, ocean) -> tuple[bytes, dict]:
    if len(dem) != 180 or any(len(row) != 360 for row in dem) or len(north) != 360:
        raise ValueError('Unexpected coarse source grid shape')
    south_pole = math.fsum(dem[0]) / 360
    north_pole = math.fsum(north) / 360
    packed = bytearray(); ocean_count = inland_negative_count = 0
    minimum, maximum = math.inf, -math.inf
    failures = []
    for latitude in range(-90, 91):
        row = bytearray()
        for longitude in range(-180, 180):
            raw = south_pole if latitude == -90 else north_pole if latitude == 90 else dem[latitude + 90][longitude % 360]
            if not math.isfinite(raw) or not -12000 < raw < 10000:
                raise ValueError('Invalid source height cannot be repaired by an ocean mask')
            wet = ocean.contains(longitude, latitude)
            height = 0.0 if wet else raw
            if not -1000 < height < 10000:
                failures.append((latitude, longitude, height))
            undulation = geoid(longitude, latitude)
            if not math.isfinite(undulation) or abs(undulation) >= 200:
                raise ValueError('Invalid geoid undulation')
            ocean_count += int(wet); inland_negative_count += int(not wet and height < 0)
            minimum, maximum = min(minimum, height), max(maximum, height)
            encoded = struct.pack('<ff', height, undulation)
            packed_height, packed_geoid = struct.unpack('<ff', encoded)
            if (-1000 < height < 10000 and not -1000 < packed_height < 10000) or abs(packed_geoid) >= 200:
                raise ValueError('Float32 rounding escaped the declared height/geoid bounds')
            row.extend(encoded)
        row.extend(row[:8])  # Canonical +180 is bit-identical to -180.
        packed.extend(row)
    if failures:
        raise ValueError(f'Unsupported deep/non-ocean source nodes ({len(failures)}): {failures[:10]}')
    if len(packed) != WIDTH * HEIGHT * 8:
        raise ValueError('Incorrect packed asset length')
    return bytes(packed), dict(ocean_nodes_excluding_seam=ocean_count,
                              negative_inland_nodes_excluding_seam=inland_negative_count,
                              minimum_height_m=minimum, maximum_height_m=maximum,
                              south_pole_source_mean_m=south_pole,
                              north_pole_source_mean_m=north_pole)


def build(paths: dict[str, Path], output: Path) -> dict:
    raw = {key: source_bytes(paths[key], key) for key in SOURCE_HASHES}
    metadata = raw['metadata'].decode('utf-8')
    if 'String vert_crs_name "EGM2008"' not in metadata or 'Global (Ice Surface)' not in metadata or 'Float32 _FillValue -99999.0' not in metadata:
        raise ValueError('NOAA source metadata does not identify EGM2008 ice surface/no-data')
    source_lons = [x + 1 / 120 for x in range(360)]
    dem = parse_subset(raw['dem'], [y - 90 + 1 / 120 for y in range(180)], source_lons)
    north = parse_subset(raw['north'], [90 - 1 / 120], source_lons)[0]
    ocean = OceanMask(raw['ocean'])
    with Image.open(paths['geoid']) as image:
        validate_geoid(image)
        packed, stats = pack_grid(dem, north, lambda lon, lat: geoid_node(image, lon, lat), ocean)
    manifest = dict(version=1, id=IDENT, width=WIDTH, height=HEIGHT,
                    bounds=[-180, -90, 180, 90], rows='south-to-north',
                    encoding='float32-le-interleaved-H-zeta', physical_datum='EGM2008',
                    geoid_model='EGM2008', asset='world-v1.f32', bytes=len(packed),
                    sha256=sha256(packed))
    provenance = dict(version=1, id=IDENT, source_accessed='2026-11-05',
        compiler_sha256=sha256(Path(__file__).read_bytes()),
        sources={key: dict(url=SOURCE_URLS[key], bytes=len(value), sha256=sha256(value)) for key, value in raw.items()},
        dataset='NOAA ETOPO 2022 v1 60 arc-second Global Ice Surface, EGM2008 physical heights',
        source_resolution_arcsec=60, output_node_spacing_degrees=1,
        resampling='Nearest source centre at target latitude/longitude +1/120 degree; source longitude 0..360 wrapped to -180..180. Polar values are longitude means of the nearest source row. Duplicate +180 copies -180 bits.',
        geoid_sampling='Exact 24-node stride of NGA EGM2008 2.5-minute PixelIsPoint grid; h_ellipsoid = H + zeta; +180 wraps to -180.',
        ice='Ice Surface, not bedrock beneath Greenland/Antarctic ice sheets.',
        ocean='Natural Earth 1:50m globally connected ocean polygon only, with holes respected; isolated Caspian polygon excluded. Ocean nodes set H=0 EGM2008. Negative inland heights preserved. Shoreline is approximate at this output spacing.',
        nodata='Reject nonfinite, source -99999, remaining non-ocean H<=-1000/H>=10000 or abs(zeta)>=200; no invented zero replacement for missing samples.',
        limitations='One-degree coarse baseline, about 111 km north-south node spacing. No surveyed airport, coastline, lake-surface, obstacle or landing fidelity. Interpolation cannot recover lost relief.',
        licences=dict(dem='NOAA ETOPO User Guide section 4: free private, academic and commercial use; cite NOAA NCEI and DOI 10.25921/fd45-gt74.', geoid='NGA via PROJ-data: Public Domain.', ocean='Natural Earth: Public Domain; Made with Natural Earth.'),
        statistics=stats)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'world-v1.f32').write_bytes(packed)
    (output / 'world-v1.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (output / 'SOURCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for key in SOURCE_HASHES:
        parser.add_argument('--' + key, type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build({key: getattr(args, key) for key in SOURCE_HASHES}, args.output), indent=2))
