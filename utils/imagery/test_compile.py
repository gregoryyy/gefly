import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image
import compile as imagery


class ImageryTests(unittest.TestCase):
    def test_known_web_mercator_coordinates_and_y_direction(self):
        self.assertEqual(imagery.xy(0, 0, 1), (1.0, 1.0))
        self.assertAlmostEqual(imagery.xy(-90, 0, 2)[0], 1.0)
        self.assertLess(imagery.xy(8, 51, 15)[1], imagery.xy(8, 50, 15)[1])
        self.assertIn('BBOX=-20037508.342789244,-20037508.342789244,0.000000000,0.000000000',
                      imagery.tile_url(1, 0, 1).replace('%2C', ','))

    def test_metatile_crops_north_down(self):
        image = Image.new('RGB', (2048, 2048), 'black')
        image.paste('red', (512, 0, 1024, 512))
        image.paste('blue', (512, 512, 1024, 1024))
        self.assertEqual(imagery.crop_tile(image, 1, 0).getpixel((0, 0)), (255, 0, 0))
        self.assertEqual(imagery.crop_tile(image, 1, 1).getpixel((0, 0)), (0, 0, 255))
        self.assertEqual(imagery.group_for((15, 17003, 11005)), (15, 17000, 11004, 4))

    def test_wms_error_and_wrong_dimensions_rejected(self):
        with self.assertRaises((ValueError, OSError)):
            imagery.validate_image(b'<ServiceException>bad request</ServiceException>')
        output = io.BytesIO()
        Image.new('RGB', (4, 4)).save(output, 'JPEG')
        with self.assertRaises(ValueError):
            imagery.validate_image(output.getvalue())
        with self.assertRaises(ValueError):
            imagery.validate_image(b'x' * (2 * 1024 * 1024 + 1))

    def test_verifier_rejects_changed_bytes_and_source_license(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(imagery, 'DEST', Path(directory)), patch.object(imagery, 'required_tiles', return_value=[(10, 1, 2)]):
            tile = imagery.tile_path((10, 1, 2))
            tile.parent.mkdir(parents=True)
            out = io.BytesIO()
            Image.new('RGB', (512, 512)).save(out, 'JPEG')
            data = out.getvalue()
            tile.write_bytes(data)
            manifest = {'version': 1, 'id': 'hessen-rhein-main-dop-v1', 'scheme': 'xyz', 'projection': 'EPSG:3857', 'tile_size_px': 512, 'min_level': 10, 'max_level': 15, 'bounds': imagery.BOUNDS, 'source': {'license': 'DL-DE-Zero-2.0', 'capture_date': None}, 'tiles': [imagery.entry((10, 1, 2), data)]}
            group = imagery.group_for((10, 1, 2))
            sources = {'groups': [{'z': group[0], 'x': group[1], 'y': group[2], 'span': group[3], 'url': imagery.tile_url(*group), 'bytes': 1, 'sha256': 'a' * 64}]}
            source_bytes = json.dumps(sources).encode()
            (Path(directory) / 'SOURCES.json').write_bytes(source_bytes)
            manifest['source']['sources_sha256'] = hashlib.sha256(source_bytes).hexdigest()
            path = Path(directory) / 'manifest.json'
            path.write_text(json.dumps(manifest))
            imagery.verify()
            (Path(directory) / 'SOURCES.json').write_bytes(source_bytes + b' ')
            with self.assertRaises(ValueError):
                imagery.verify()
            (Path(directory) / 'SOURCES.json').write_bytes(source_bytes)
            manifest['tiles'][0]['sha256'] = hashlib.sha256(b'other').hexdigest()
            path.write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):
                imagery.verify()
            manifest['source']['license'] = 'unknown'
            path.write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):
                imagery.verify()


if __name__ == '__main__':
    unittest.main()
