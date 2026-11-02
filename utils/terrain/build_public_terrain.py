#!/usr/bin/env python3
"""Compile the bounded public DGM/GCG package. No runtime network dependency.

Use requirements.txt in a temporary environment. Inputs remain external source
files; output nodes have geographic point registration, south→north rows.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
import pyproj
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling

WEST, SOUTH, EAST, NORTH = 8.45, 49.85, 8.90, 50.35
SIZE = 1025
DEM_SHA = '2e37db3ef8b07ec2bb206f289d1200f5cfbf41c37a3413688244dea7c29df894'
GEOID_ZIP_SHA = '16b2f09996aee74eaa647fde4b7724ade17e384be534f38d23d9d229f30520c3'
ASCII_PATH = 'quasigeoid.geo89.w/quasigeoid/w/linux/ascii/GCG2016v2023_W.txt'
DEM_URL = ('https://inspire-hessen.de/raster/dgm1-2025H2/ows?SERVICE=WCS&VERSION=2.0.1'
           '&REQUEST=GetCoverage&COVERAGEID=he_dgm1_32&SUBSET=E(460000,500000)'
           '&SUBSET=N(5520000,5580000)&FORMAT=image/tiff')
GEOID_URL = 'https://daten.gdz.bkg.bund.de/produkte/sonstige/quasigeoid/aktuell/quasigeoid.geo89.w.zip'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def geoid_nodes(ascii_bytes: bytes) -> np.ndarray:
    source = np.loadtxt(io.BytesIO(ascii_bytes))
    latitudes = np.unique(source[:, 0])
    longitudes = np.unique(source[:, 1])
    values = source[:, 2].reshape(len(latitudes), len(longitudes))[::-1]
    if not np.allclose(source[:, 0].reshape(values.shape)[:, 0], latitudes[::-1], rtol=0, atol=1e-10):
        raise ValueError('Unexpected GCG row ordering')
    lon = np.linspace(WEST, EAST, SIZE)
    lat = np.linspace(SOUTH, NORTH, SIZE)
    ix = np.searchsorted(longitudes, lon, side='right') - 1
    iy = np.searchsorted(latitudes, lat, side='right') - 1
    if min(ix) < 0 or max(ix) >= len(longitudes) - 1 or min(iy) < 0 or max(iy) >= len(latitudes) - 1:
        raise ValueError('GCG source does not cover terrain package')
    dx = (lon - longitudes[ix]) / (longitudes[ix + 1] - longitudes[ix])
    dy = (lat - latitudes[iy]) / (latitudes[iy + 1] - latitudes[iy])
    sw = values[iy[:, None], ix[None, :]]
    se = values[iy[:, None], ix[None, :] + 1]
    nw = values[iy[:, None] + 1, ix[None, :]]
    ne = values[iy[:, None] + 1, ix[None, :] + 1]
    if any(not np.all(np.isfinite(v) & (np.abs(v) < 200)) for v in [sw, se, nw, ne]):
        raise ValueError('Missing quasigeoid source node')
    return ((1 - dy[:, None]) * ((1 - dx[None, :]) * sw + dx[None, :] * se)
            + dy[:, None] * ((1 - dx[None, :]) * nw + dx[None, :] * ne))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dem', type=Path, required=True)
    parser.add_argument('--geoid', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    dem_bytes, geoid_bytes = args.dem.read_bytes(), args.geoid.read_bytes()
    if sha(dem_bytes) != DEM_SHA or sha(geoid_bytes) != GEOID_ZIP_SHA:
        raise ValueError('Source hash mismatch: review a new source edition before regenerating')
    with zipfile.ZipFile(io.BytesIO(geoid_bytes)) as archive:
        ascii_bytes = archive.read(ASCII_PATH)
        source_notices = {'BKG-SOURCES.pdf': archive.read('quasigeoid.geo89.w/datenquellen_quasigeoid.pdf'),
                          'BKG-CC-BY-NOTICE.pdf': archive.read('quasigeoid.geo89.w/quellenvermerk_ccby_v4_0.pdf')}
    step_lon, step_lat = (EAST - WEST) / (SIZE - 1), (NORTH - SOUTH) / (SIZE - 1)
    # GeoTIFF pixels are areas; their centers become the published point nodes.
    transform = from_origin(WEST - step_lon / 2, NORTH + step_lat / 2, step_lon, step_lat)
    physical_north_first = np.full((SIZE, SIZE), np.nan, dtype=np.float64)
    with rasterio.open(args.dem) as source:
        if source.crs != rasterio.crs.CRS.from_epsg(25832) or source.nodata != -9999:
            raise ValueError('Unexpected DEM CRS or NoData convention')
        reproject(source=rasterio.band(source, 1), destination=physical_north_first,
                  src_transform=source.transform, src_crs=source.crs, src_nodata=-9999,
                  dst_transform=transform, dst_crs='EPSG:4326', dst_nodata=np.nan,
                  resampling=Resampling.bilinear, num_threads=1)
        dem_source = {'url': DEM_URL, 'sha256': sha(dem_bytes), 'bytes': len(dem_bytes),
                      'crs': str(source.crs), 'transform': list(source.transform),
                      'width': source.width, 'height': source.height,
                      'physical_datum': 'DHHN2016', 'coverage': 'he_dgm1_32', 'edition': '2025H2',
                      'license': 'DL-DE-Zero-2.0', 'license_url': 'https://www.govdata.de/dl-de/zero-2-0'}
    physical = physical_north_first[::-1]
    geoid = geoid_nodes(ascii_bytes)
    if not np.all(np.isfinite(physical) & (physical > -1000) & (physical < 10000)):
        raise ValueError('DEM has unavailable cells; never synthesize zero-height terrain')
    packed = np.empty((SIZE, SIZE, 2), dtype='<f4')
    packed[:, :, 0], packed[:, :, 1] = physical, geoid
    binary = packed.tobytes(order='C')
    args.output.mkdir(parents=True, exist_ok=True)
    asset = 'edfe-taunus-v1.f32'
    (args.output / asset).write_bytes(binary)
    for name, content in source_notices.items():
        (args.output / name).write_bytes(content)
    manifest = {'version': 1, 'id': 'hessen-edfe-taunus-dgm32-gcg2016v2023-v1',
                'asset': asset, 'sha256': sha(binary), 'bytes': len(binary),
                'width': SIZE, 'height': SIZE, 'rows': 'south-to-north',
                'encoding': 'float32-le-interleaved-H-zeta',
                'physical_datum': 'DHHN2016', 'geoid_model': 'GCG2016v2023_W',
                'horizontal_crs': 'EPSG:4326 (ETRS89 treated as WGS84 for this research region)',
                'west_rad': float(np.deg2rad(WEST)), 'south_rad': float(np.deg2rad(SOUTH)),
                'east_rad': float(np.deg2rad(EAST)), 'north_rad': float(np.deg2rad(NORTH)),
                'bounds_west_south_east_north_deg': [WEST, SOUTH, EAST, NORTH],
                'interpolation': 'piecewise-linear-SW-NE',
                'physical_range_m': [float(physical.min()), float(physical.max())],
                'geoid_range_m': [float(geoid.min()), float(geoid.max())],
                'max_float32_quantization_error_m': float(np.max(np.abs(packed[:, :, 0] - physical))),
                'notices': {name: {'sha256': sha(content), 'bytes': len(content)} for name, content in source_notices.items()},
                'sources': [dem_source, {'url': GEOID_URL, 'sha256': sha(geoid_bytes),
                            'ascii_path': ASCII_PATH, 'ascii_sha256': sha(ascii_bytes),
                            'license': 'CC-BY-4.0', 'license_url': 'https://creativecommons.org/licenses/by/4.0/',
                            'attribution': '© Bundesamt für Kartographie und Geodäsie 2026',
                            'data_sources': 'https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/Datenquellen_Quasigeoid.pdf',
                            'changes': 'Regional bilinear sampling and conversion to float32 node offsets.'}],
                'build': {'script_sha256': sha(Path(__file__).read_bytes()),
                          'rasterio': rasterio.__version__, 'pyproj': pyproj.__version__, 'numpy': np.__version__},
                'limitations': ['Regional prototype, not full EDDF/100 NM coverage.',
                                '32 m overview of DGM1, resampled to approximately 32–54 m geographic nodes.',
                                'No surveyed runway flattening, obstacles, buildings or current airport data.',
                                'ETRS89/WGS84 epoch difference is not resolved; not a navigation/survey reference.',
                                'DEM accuracy and coarse render-LOD residual are not aircraft training acceptance.']}
    (args.output / 'edfe-taunus-v1.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({key: manifest[key] for key in ['id', 'bytes', 'sha256', 'physical_range_m', 'geoid_range_m']}))


if __name__ == '__main__':
    main()
