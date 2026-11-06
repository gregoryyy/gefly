"""Independent source-boundary fixtures for worldwide discovery compilation."""
import copy
import gzip
import hashlib
import importlib.util
import io
import csv
import json
import pathlib
import unittest

SPEC = importlib.util.spec_from_file_location("ourairports_world", pathlib.Path(__file__).with_name("world.py"))
world = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(world)


def airport(id="1", ident="TEST", lat="0", lon="0", **changes):
    row = {"id": id, "ident": ident, "name": "Test airfield", "type": "small_airport", "latitude_deg": lat, "longitude_deg": lon, "iso_country": "FR", "iso_region": "FR-IDF", "icao_code": ident, "elevation_ft": "0"}
    return {**row, **changes}


def source(rows=None):
    rows = rows or {"airports.csv": [airport()]}
    raw = {}
    for name, fields in world.HEADERS.items():
        stream = io.StringIO(newline="")
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for row in rows.get(name, []):
            writer.writerow({key: row.get(key, "") for key in fields})
        raw[name] = stream.getvalue().encode()
    return raw


def compile_fixture(rows):
    raw = source(rows)
    return world.compile_sources(raw, "2026-11-06", expected_hashes={name: hashlib.sha256(data).hexdigest() for name, data in raw.items()})


def cells(files):
    return [json.loads(data) for name, data in files.items() if name.startswith("cells/")]


class WorldAirportCompilation(unittest.TestCase):
    def test_half_open_cells_dateline_and_poles(self):
        for lat, lon, expected in [(-90, -180, "0-0"), (90, 180, "0-35"), (0, 0, "36-18"), (-0.00001, -0.00001, "35-17"), (49.9, 8.6, "37-27"), (5, 5, "37-19")]:
            self.assertEqual(world.cell_id(lat, lon), expected)
        for lat, lon in [(90.1, 0), (0, -180.1), (float("nan"), 0), (0, float("inf"))]:
            with self.assertRaises(ValueError):
                world.cell_id(lat, lon)

    def test_global_airports_source_types_and_zero_missing_elevation(self):
        rows = [airport("1", "FR-A", "49", "2"), airport("2", "US-A", "38", "-122", iso_country="US", iso_region="US-CA", elevation_ft=""), airport("3", "CLOSED", "-34", "18", type="closed", iso_country="ZA", iso_region="ZA-WC")]
        manifest, files = compile_fixture({"airports.csv": rows})
        airports = {a["id"]: a for cell in cells(files) for a in cell["airports"]}
        self.assertEqual(manifest["counts"]["airports"], 3)
        self.assertEqual(airports["FR-A"]["elevation_ft"], 0)
        self.assertIsNone(airports["US-A"]["elevation_ft"])
        self.assertEqual(airports["CLOSED"]["type"], "closed")
        self.assertEqual(airports["US-A"]["source_id"], "2")

    def test_runways_follow_airport_cell_and_do_not_invent_missing_ends(self):
        runway = {"id": "11", "airport_ident": "TEST", "length_ft": "3000", "width_ft": "-1", "surface": "ASP", "lighted": "1", "closed": "0", "le_ident": "09", "le_latitude_deg": "5.1", "le_longitude_deg": "", "he_ident": "27", "he_heading_degT": "362"}
        manifest, files = compile_fixture({"airports.csv": [airport()], "runways.csv": [runway]})
        self.assertEqual(list(manifest["cells"]), ["36-18"])
        value = cells(files)[0]["runways"][0]
        self.assertEqual(value["length_ft"], 3000)
        self.assertIsNone(value["width_ft"])
        self.assertEqual(value["le"]["lat"], 5.1)
        self.assertIsNone(value["le"]["lon"])
        self.assertIsNone(value["he"]["lat"])
        self.assertIsNone(value["he"]["heading_degT"])
        self.assertEqual(manifest["rejections"], {"runways.he_heading_degT": 1, "runways.width_ft": 1})

    def test_com_retains_untunable_zero_and_out_of_band_source_values(self):
        frequencies = ["118.005", "0", "1795.5", "123.4567", "-1"]
        rows = [{"id": str(i + 1), "airport_ident": "TEST", "type": "TWR", "description": "Test tower", "frequency_mhz": value} for i, value in enumerate(frequencies)]
        manifest, files = compile_fixture({"airports.csv": [airport()], "airport-frequencies.csv": rows})
        stations = cells(files)[0]["com"]
        self.assertEqual([s["channel_khz"] for s in stations], [118005, 0, 1795500])
        self.assertEqual([s["source_frequency_mhz"] for s in stations], frequencies[:3])
        self.assertEqual(manifest["rejections"], {"com.invalid_record": 2})

    def test_navaid_identity_not_ident_and_fractional_ndb_units(self):
        common = {"ident": "DUP", "name": "Test beacon", "type": "NDB", "latitude_deg": "-33", "longitude_deg": "18", "iso_country": "ZA", "associated_airport": ""}
        manifest, files = compile_fixture({"airports.csv": [airport()], "navaids.csv": [{**common, "id": "8", "frequency_khz": "345.5"}, {**common, "id": "9", "frequency_khz": "-1"}]})
        beacons = [n for cell in cells(files) for n in cell["navaids"]]
        self.assertEqual([n["id"] for n in beacons], ["oa-nav-8", "oa-nav-9"])
        self.assertEqual(beacons[0]["frequency_khz"], 345.5)
        self.assertIsNone(beacons[1]["frequency_khz"])
        self.assertEqual(manifest["counts"]["navaids"], 2)
        self.assertEqual(manifest["rejections"], {"navaids.frequency_khz": 1})

    def test_unknown_children_are_counted_not_attached_to_nearest_airport(self):
        manifest, files = compile_fixture({"airports.csv": [airport()], "runways.csv": [{"id": "2", "airport_ident": "MISSING"}], "airport-frequencies.csv": [{"id": "3", "airport_ident": "MISSING"}]})
        self.assertEqual(manifest["rejections"], {"com.unknown_airport": 1, "runways.unknown_airport": 1})
        self.assertEqual(cells(files)[0]["runways"], [])

    def test_primary_coordinate_failure_does_not_silently_drop_airport(self):
        with self.assertRaisesRegex(ValueError, "Invalid primary airport"):
            compile_fixture({"airports.csv": [airport(lat="NaN")]})
        with self.assertRaisesRegex(ValueError, "Invalid primary airport"):
            compile_fixture({"airports.csv": [airport(), airport("2")]})
        with self.assertRaisesRegex(ValueError, "Empty required source text"):
            compile_fixture({"airports.csv": [airport(name=" \t ")]})

    def test_source_pin_duplicate_numeric_ids_and_columns_fail_closed(self):
        raw = source()
        with self.assertRaisesRegex(ValueError, "source size/hash"):
            world.compile_sources(raw, "2026-11-06")
        with self.assertRaisesRegex(ValueError, "Duplicate source identifier"):
            compile_fixture({"airports.csv": [airport(), airport(ident="OTHER")]})
        invalid = b"id,ident\n1,X\n"
        with self.assertRaisesRegex(ValueError, "source columns"):
            world.read_source("airports.csv", invalid, world.digest(invalid))

    def test_search_and_packages_have_exact_hashes_and_reproducible_gzip(self):
        rows = {"airports.csv": [airport("2", "SECOND", "1", "1", iata_code="SEC", gps_code="GPS"), airport()]}
        before = copy.deepcopy(rows)
        manifest, files = compile_fixture(rows)
        self.assertEqual(compile_fixture(rows), (manifest, files))
        self.assertEqual(rows, before)
        expanded = gzip.decompress(files["search.bin"])
        self.assertEqual(world.digest(expanded), manifest["search"]["expanded_sha256"])
        self.assertEqual(len(expanded), manifest["search"]["expanded_bytes"])
        self.assertEqual(world.digest(files["search.bin"]), manifest["search"]["sha256"])
        hits = json.loads(expanded)["entries"]
        self.assertEqual([hit["id"] for hit in hits], ["SECOND", "TEST"])
        self.assertIn("SEC", hits[0]["codes"])
        self.assertIn("GPS", hits[0]["codes"])
        for identity, entry in manifest["cells"].items():
            data = files[f"cells/{identity}.bin"]
            self.assertEqual(world.digest(data), entry["sha256"])
            self.assertEqual(len(data), entry["bytes"])
            parsed = json.loads(data)
            self.assertEqual({key: len(parsed[key]) for key in world.KINDS}, entry["counts"])

    def test_source_text_is_data_and_nonselected_fields_are_not_copied(self):
        value = airport(name='<img src=x onerror="alert(1)">')
        _, files = compile_fixture({"airports.csv": [value]})
        self.assertEqual(cells(files)[0]["airports"][0]["name"], value["name"])
        self.assertNotIn("home_link", files["cells/36-18.bin"].decode())
        self.assertNotIn("comments", files["cells/36-18.bin"].decode())


if __name__ == "__main__":
    unittest.main()
