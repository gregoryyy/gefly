# SPDX-License-Identifier: GPL-3.0-or-later
"""CLI and strict-input checks using synthetic components only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().with_name("build_mass_properties.py")


def component(name, mass, cg):
    return {"id": name, "mass_kg": mass, "cg_m": cg,
            "inertia_cg_kg_m2": [[0, 0, 0], [0, 0, 0], [0, 0, 0]]}


def document():
    return {"schema_version": "1.0.0", "frame": "body", "components": [
        component("left", 2, [-1, 0, 0]), component("right", 2, [1, 0, 0])]}


class CommandTests(unittest.TestCase):
    def run_input(self, raw):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "components.json"
            path.write_bytes(raw)
            result = subprocess.run([sys.executable, str(SCRIPT), str(path)],
                                    cwd=directory, text=True, capture_output=True,
                                    timeout=10, check=False)
            self.assertEqual(path.read_bytes(), raw)
            self.assertEqual(sorted(p.name for p in Path(directory).iterdir()),
                             ["components.json"])
        return result

    def assert_invalid(self, raw):
        result = self.run_input(raw)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertIn("ERROR:", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        return result

    def test_two_point_masses_and_raw_input_hash(self):
        raw = json.dumps(document(), indent=2).encode()
        result = self.run_input(raw)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        output = json.loads(result.stdout)
        self.assertEqual(output["schema_version"], "1.0.0")
        self.assertEqual(output["frame"], "body")
        self.assertEqual(output["tensor_convention"], "off_diagonal_negative_products")
        self.assertEqual(output["status"],
                         "synthetic_or_user_supplied_not_aircraft_validation")
        self.assertEqual(output["input_sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual(output["result"], {
            "mass_kg": 4, "cg_m": [0, 0, 0],
            "inertia_cg_kg_m2": [[0, 0, 0], [0, 4, 0], [0, 0, 4]]})

    def test_off_axis_points_have_negative_product_of_inertia(self):
        value = document()
        value["components"] = [component("a", 1, [-1, -1, 0]),
                               component("b", 1, [1, 1, 0])]
        result = self.run_input(json.dumps(value).encode())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["result"]["inertia_cg_kg_m2"],
                         [[2, -2, 0], [-2, 2, 0], [0, 0, 4]])

    def test_duplicate_keys_rejected_at_root_and_nested(self):
        raw = json.dumps(document()).encode()
        self.assert_invalid(raw.replace(b'"frame": "body"',
                                        b'"frame": "body", "frame": "body"'))
        self.assert_invalid(raw.replace(b'"mass_kg": 2',
                                        b'"mass_kg": 2, "mass_kg": 2', 1))

    def test_non_json_constants_and_overflowing_numbers_rejected(self):
        raw = json.dumps(document()).encode()
        for token in (b"NaN", b"Infinity", b"-Infinity", b"1e9999"):
            with self.subTest(token=token):
                self.assert_invalid(raw.replace(b'"mass_kg": 2',
                                                b'"mass_kg": ' + token, 1))

    def test_malformed_json_and_utf8_rejected(self):
        for raw in (b"{", b"\xff", b"[]", b"null", b"{} {}"):
            with self.subTest(raw=raw):
                self.assert_invalid(raw)

    def test_wrong_envelope_rejected(self):
        for key, value in (("schema_version", "9"), ("frame", "structural"),
                           ("extra", True), ("components", [])):
            with self.subTest(key=key):
                doc = document()
                doc[key] = value
                self.assert_invalid(json.dumps(doc).encode())
        doc = document()
        del doc["frame"]
        self.assert_invalid(json.dumps(doc).encode())

    def test_invalid_component_uses_core_validation(self):
        for field, value in (("mass_kg", True), ("mass_kg", -1),
                             ("cg_m", [0, 0]), ("extra", 0)):
            with self.subTest(field=field, value=value):
                doc = document()
                doc["components"][0][field] = value
                self.assert_invalid(json.dumps(doc).encode())

    def test_missing_input_file_fails_without_traceback(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, str(SCRIPT),
                                     str(Path(directory) / "missing.json")],
                                    text=True, capture_output=True, timeout=10, check=False)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertIn("ERROR:", result.stderr)
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
