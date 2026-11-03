"""Offline consistency tests for the shipped NAV810 subset (standard library only).

The pinned source gzip is not tracked, so these tests check that the shipped package,
its manifest and the compiler constants agree, rather than recompiling.
"""

import hashlib
import json
import math
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_navdata  # noqa: E402

PUBLIC = HERE.parents[1] / "app" / "public" / "navdata"


class ShippedPackageTests(unittest.TestCase):
    def setUp(self):
        self.data = (PUBLIC / "rhein-main-v1.json").read_bytes()
        self.package = json.loads(self.data)

    def test_manifest_matches_package_bytes(self):
        manifest = json.loads((PUBLIC / "manifest.json").read_text())
        self.assertEqual(manifest["sha256"], hashlib.sha256(self.data).hexdigest())
        self.assertEqual(manifest["bytes"], len(self.data))
        self.assertEqual(manifest["id"], self.package["id"])

    def test_package_was_compiled_by_this_compiler(self):
        compiler = hashlib.sha256((HERE / "build_navdata.py").read_bytes()).hexdigest()
        self.assertEqual(self.package["source"]["compiler_sha256"], compiler,
                         "regenerate app/public/navdata with build_navdata.py")
        self.assertEqual(self.package["source"]["gzip_sha256"], build_navdata.SOURCE_SHA)
        self.assertEqual(self.package["source"]["commit"], build_navdata.COMMIT)

    def test_region_anchor_matches_pinned_record(self):
        region = self.package["region"]
        self.assertEqual((region["center_lat_deg"], region["center_lon_deg"]), build_navdata.CENTER)
        self.assertEqual(region["radius_nm"], build_navdata.RADIUS_NM)
        record = region["center_source_record"]
        self.assertEqual(record, build_navdata.CENTER_RECORD)
        self.assertIn(record["repository_commit"], record["url"])
        self.assertRegex(record["sha256"], r"^[0-9a-f]{64}$")
        lat, lon = build_navdata.CENTER
        self.assertIn(f"latitude_deg {lat:g}", record["record"])
        self.assertIn(f"longitude_deg {lon:g}", record["record"])
        self.assertIn("not verified official ARP", region["center_reference"])

    def test_every_record_is_within_the_declared_extent(self):
        center = build_navdata.CENTER
        for record in self.package["records"]:
            distance = build_navdata.distance(center, (record["lat_deg"], record["lon_deg"]))
            self.assertTrue(math.isfinite(distance))
            self.assertLessEqual(distance, build_navdata.RADIUS_NM, record["uid"])


if __name__ == "__main__":
    unittest.main()
