"""Offline consistency tests for the shipped NAV810 subset (standard library only).

The pinned source gzip is not tracked, so these tests check that the shipped package,
its manifest and the compiler constants agree, rather than recompiling.
"""

import gzip
import hashlib
import json
import math
from pathlib import Path
import sys
import unittest
import tempfile
import contextlib
import io

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
        self.assertEqual(manifest["sha256"], hashlib.sha256((PUBLIC / manifest["asset"]).read_bytes()).hexdigest())
        self.assertEqual(manifest["bytes"], (PUBLIC / manifest["asset"]).stat().st_size)
        self.assertEqual(manifest["id"], json.loads((PUBLIC / manifest["asset"]).read_bytes())["id"])

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


class WorldwidePackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = (PUBLIC / "world-v1.bin").read_bytes()
        cls.world = json.loads(cls.data)
        cls.regional = json.loads((PUBLIC / "rhein-main-v1.json").read_bytes())
        cls.source = PUBLIC / "source-nav810-gzip.bin"
        cls.lines, cls.rows, _ = build_navdata.parse(gzip.decompress(cls.source.read_bytes()))

    def test_world_package_is_bounded_and_has_unique_source_services(self):
        self.assertLess(len(self.data), 8 * 1024 * 1024)
        self.assertEqual(len(self.world["records"]), 7923)
        self.assertEqual(len({r["uid"] for r in self.world["records"]}), 7923)
        self.assertEqual(self.world["id"], "world-nav810-2013-10-v1")
        self.assertEqual(self.world["source"]["compiler_sha256"], hashlib.sha256((HERE / "build_navdata.py").read_bytes()).hexdigest())
        self.assertEqual(hashlib.sha256(self.source.read_bytes()).hexdigest(), build_navdata.SOURCE_SHA)
        self.assertIn("either version 2", self.lines[1])

    def test_regional_services_and_components_are_identical(self):
        world = {r["uid"]: r for r in self.world["records"]}
        self.assertEqual(len(self.regional["records"]), 86)
        for record in self.regional["records"]:
            self.assertEqual(world[record["uid"]], record)

    def test_default_and_worldwide_compilers_reproduce_shipped_bytes(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()):
            output = Path(directory)
            build_navdata.compile_package(self.source, output)
            self.assertEqual((output / "rhein-main-v1.json").read_bytes(), (PUBLIC / "rhein-main-v1.json").read_bytes())
            self.assertEqual(json.loads((output / "manifest.json").read_text())["id"], self.regional["id"])
            build_navdata.compile_package(self.source, output, worldwide=True)
            self.assertEqual((output / "world-v1.bin").read_bytes(), self.data)
            self.assertEqual((output / "source-nav810-gzip.bin").read_bytes(), self.source.read_bytes())

    def test_invalid_channels_and_glideslope_values_remain_unavailable(self):
        issues = self.world["component_issues"]
        channels = [i for i in issues if i["component"] == "service"]
        self.assertEqual(len(channels), 11)
        modeled = {r["uid"]: r for r in self.world["records"]}
        for issue in channels:
            self.assertNotIn(issue["station_uid"], modeled)
        bad_angle = [i for i in issues if "Unsupported source glideslope angle" in i["reason"]]
        self.assertEqual(len(bad_angle), 1)
        self.assertIsNone(modeled[bad_angle[0]["station_uid"]]["gs"])
        self.assertEqual({i["source_line"] for i in self.world["excluded_malformed_worldwide_rows"]}, {16455, 16758, 16812, 16827})
        for record in self.world["records"]:
            self.assertFalse(set(record["source_line_ids"]) & {16455, 16758, 16812, 16827})

    def test_circular_normalization_preserves_source_angles_with_diagnostics(self):
        changes = [i for i in self.world["component_issues"] if "normalized_degrees" in i]
        self.assertGreater(len(changes), 10)
        for issue in changes:
            source, normalized = issue["source_degrees"], issue["normalized_degrees"]
            self.assertAlmostEqual(math.sin(math.radians(source)), math.sin(math.radians(normalized)), places=12)
            self.assertAlmostEqual(math.cos(math.radians(source)), math.cos(math.radians(normalized)), places=12)
            self.assertTrue(issue["source_line_ids"])


if __name__ == "__main__":
    unittest.main()
