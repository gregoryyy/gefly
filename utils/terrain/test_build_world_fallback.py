"""Validate source registration, ocean-only masking and the compiled world asset."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('world_builder', HERE / 'build_world_fallback.py')
world = importlib.util.module_from_spec(spec)
spec.loader.exec_module(world)


def subset(rows, names=None, units=None):
    return json.dumps(dict(table=dict(columnNames=names or ['latitude', 'longitude', 'z'],
        columnUnits=units or ['degrees_north', 'degrees_east', 'meters'], rows=rows))).encode()


def mask_bytes():
    ocean = [[-180, -80], [180, -80], [180, 90], [-180, 90], [-180, -80]]
    land = [[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]]
    inland_water = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]
    return json.dumps(dict(type='FeatureCollection', features=[
        dict(geometry=dict(type='Polygon', coordinates=[inland_water])),
        dict(geometry=dict(type='Polygon', coordinates=[ocean, land]))])).encode()


class SourceTests(unittest.TestCase):
    def test_source_coordinate_order_units_and_no_data_are_checked(self):
        raw = subset([[-.5, .5, -20], [-.5, 1.5, 200], [.5, .5, 300], [.5, 1.5, 400]])
        self.assertEqual(world.parse_subset(raw, [-.5, .5], [.5, 1.5]), [[-20, 200], [300, 400]])
        for bad in [subset([[-.5, .5, -99999]]), subset([[-.5, .5, None]]),
                    subset([[-.5, .5, math.nan]]), subset([[.5, -.5, 1]]),
                    subset([[-.5, .5, 1]], units=['degrees_north', 'degrees_east', 'feet']),
                    subset([[-.5, .5, 1], [-.5, 1.5, 2]])]:
            with self.subTest(raw=bad), self.assertRaises((ValueError, TypeError)):
                world.parse_subset(bad, [-.5], [.5])

    def test_hash_changed_source_is_rejected_before_compilation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'changed.json'; path.write_bytes(b'{}')
            with self.assertRaisesRegex(ValueError, 'source changed'):
                world.source_bytes(path, 'dem')

    def test_ocean_excludes_land_holes_and_disconnected_inland_water(self):
        ocean = world.OceanMask(mask_bytes())
        self.assertTrue(ocean.contains(30, 0))
        self.assertFalse(ocean.contains(0, 0))
        self.assertFalse(ocean.contains(1.5, 1))
        self.assertFalse(ocean.contains(10, 0), 'land-hole boundary stays inland')
        self.assertTrue(ocean.contains(0, 90), 'north boundary is included')
        self.assertFalse(ocean.contains(0, -90), 'southern ice/land is not ocean')

    def test_invalid_or_ambiguous_geometry_is_rejected(self):
        data = json.loads(mask_bytes())
        data['features'].append(data['features'][1])
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            world.OceanMask(json.dumps(data).encode())
        data = json.loads(mask_bytes()); data['features'][0]['geometry']['coordinates'][0][-1] = [0, 0]
        with self.assertRaisesRegex(ValueError, 'not closed'):
            world.OceanMask(json.dumps(data).encode())

    def test_geoid_registration_is_point_not_half_pixel_offset(self):
        class Geoid:
            mode = 'F'; size = (8640, 4321)
            tag_v2 = {33550: (1 / 24, 1 / 24, 0), 33922: (0, 0, 0, -180, 90, 0),
                      34735: (1, 1, 0, 2, 1025, 0, 1, 2, 2048, 0, 1, 4326)}
            def getpixel(self, point):
                x, y = point
                return x / 8640 + y / 4321
        image = Geoid(); world.validate_geoid(image)
        self.assertEqual(world.geoid_node(image, -180, 90), 0)
        self.assertEqual(world.geoid_node(image, 180, 0), world.geoid_node(image, -180, 0))
        self.assertEqual(world.geoid_node(image, 0, 90), .5)
        image.tag_v2 = dict(image.tag_v2, **{})
        image.tag_v2[33922] = (0, 0, 0, -180.020833333333, 90.020833333333, 0)
        with self.assertRaisesRegex(ValueError, 'registration'):
            world.validate_geoid(image)


class PackingTests(unittest.TestCase):
    def setUp(self):
        self.dem = [[100.0 + row for _ in range(360)] for row in range(180)]
        self.north = [-4000.0] * 360
        self.ocean = world.OceanMask(mask_bytes())

    def test_negative_inland_survives_and_only_ocean_is_sea_level(self):
        self.dem[90][0] = -25.0
        self.dem[90][30] = -3000.0
        data, stats = world.pack_grid(self.dem, self.north, lambda lon, lat: lat / 10, self.ocean)
        at = lambda lon, lat: struct.unpack_from('<ff', data, ((lat + 90) * 361 + lon + 180) * 8)
        self.assertEqual(at(0, 0), (-25, 0))
        self.assertEqual(at(30, 0), (0, 0))
        self.assertEqual(at(0, -90), (100, -9))
        self.assertEqual(at(0, 90), (0, 9))
        self.assertEqual(stats['negative_inland_nodes_excluding_seam'], 1)
        self.assertEqual(len(data), 522728)
        for row in range(181):
            self.assertEqual(data[row * 361 * 8:row * 361 * 8 + 8],
                             data[(row * 361 + 360) * 8:(row * 361 + 361) * 8])

    def test_deep_inland_or_no_data_is_not_clamped_or_replaced(self):
        self.dem[90][0] = -1001.0
        with self.assertRaisesRegex(ValueError, 'Unsupported deep'):
            world.pack_grid(self.dem, self.north, lambda lon, lat: 0, self.ocean)
        self.dem[90][0] = 100
        self.dem[90][30] = -99999
        with self.assertRaisesRegex(ValueError, 'cannot be repaired'):
            world.pack_grid(self.dem, self.north, lambda lon, lat: 0, self.ocean)

    def test_nonfinite_geoid_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'geoid'):
            world.pack_grid(self.dem, self.north, lambda lon, lat: math.nan, self.ocean)

    def test_float32_rounding_cannot_escape_declared_bounds(self):
        with self.assertRaisesRegex(ValueError, 'Float32 rounding'):
            world.pack_grid(self.dem, self.north, lambda lon, lat: 199.999999, self.ocean)
        self.dem[0] = [9999.9999] * 360
        with self.assertRaisesRegex(ValueError, 'Float32 rounding'):
            world.pack_grid(self.dem, self.north, lambda lon, lat: 0, self.ocean)


class CompiledAssetTests(unittest.TestCase):
    def test_actual_asset_matches_manifest_and_preserves_spherical_boundaries(self):
        directory = HERE.parents[1] / 'app/public/terrain/world'
        manifest = json.loads((directory / 'world-v1.json').read_text())
        data = (directory / manifest['asset']).read_bytes()
        self.assertEqual(manifest['id'], world.IDENT)
        self.assertEqual(manifest['physical_datum'], 'EGM2008')
        self.assertEqual(manifest['geoid_model'], 'EGM2008')
        self.assertEqual((manifest['width'], manifest['height'], manifest['bytes']), (361, 181, 522728))
        self.assertEqual(manifest['bounds'], [-180, -90, 180, 90])
        self.assertEqual(hashlib.sha256(data).hexdigest(), manifest['sha256'])
        values = list(struct.iter_unpack('<ff', data))
        self.assertEqual(len(values), 361 * 181)
        for height, geoid in values:
            self.assertTrue(math.isfinite(height) and -1000 < height < 10000)
            self.assertTrue(math.isfinite(geoid) and abs(geoid) < 200)
        for row in range(181):
            self.assertEqual(values[row * 361], values[row * 361 + 360])
        for start in [0, 180 * 361]:
            self.assertTrue(all(pair == values[start] for pair in values[start:start + 361]))
        self.assertEqual(values[180 * 361][0], 0, 'Arctic surface, not bathymetry')
        self.assertGreater(values[0][0], 2000, 'Antarctic ice surface, not sea level')
        self.assertTrue(any(height < 0 for height, _ in values), 'inland negatives retained')
        # Independently read source-grid point references; catches sign/row/half-pixel mistakes.
        self.assertAlmostEqual(values[(50 + 90) * 361 + 180][1], 45.0618782043457, places=5)
        self.assertAlmostEqual(values[(50 + 90) * 361][1], -5.776759147644043, places=5)
        source = json.loads((directory / 'SOURCE.json').read_text())
        self.assertEqual(source['compiler_sha256'], hashlib.sha256((HERE / 'build_world_fallback.py').read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()
