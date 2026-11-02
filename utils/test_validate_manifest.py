"""Aircraft manifest validation boundaries (R-AIR-1, R-DATA-1, R-DATA-2)."""

from contextlib import redirect_stderr, redirect_stdout
import copy
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import validate_manifest as vm


MANIFEST = vm.ROOT / "data" / "aircraft" / "c172s-classic" / "manifest.json"
PINNED = vm.file_sha256(MANIFEST)


class DuplicateKeyTests(unittest.TestCase):
    def test_duplicate_object_keys_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="gefly-dup-test-") as directory:
            path = Path(directory) / "dup.json"
            path.write_text('{"a": 1, "b": {"c": 1, "c": 2}}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate JSON object key 'c'"):
                vm.load_json(path)
            path.write_text('{"a": 1, "b": {"c": 1}}', encoding="utf-8")
            self.assertEqual(vm.load_json(path), {"a": 1, "b": {"c": 1}})

    def test_cli_reports_duplicate_keys_as_failure(self):
        with tempfile.TemporaryDirectory(prefix="gefly-dup-test-") as directory:
            path = Path(directory) / "manifest.json"
            path.write_text('{"x": 1, "x": 2}', encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(path)]), 1)


class ManifestValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = vm.load_json(vm.SCHEMA)
        cls.valid = vm.load_json(MANIFEST)

    def manifest(self):
        return copy.deepcopy(self.valid)

    def assertRejected(self, manifest, fragment):
        errors = vm.validate(manifest, self.schema)
        self.assertTrue(any(fragment in error for error in errors),
                        f"expected an error containing {fragment!r}, got {errors}")

    def test_r_air_1_c172s_classic_manifest_is_valid(self):
        self.assertEqual(vm.validate(self.manifest(), self.schema), [])

    def test_r_data_1_citation_of_unregistered_source_fails(self):
        manifest = self.manifest()
        manifest["sources"] = [s for s in manifest["sources"] if s["id"] != "S9"]
        self.assertRejected(manifest, "'S9' is not in the source register")

    def test_r_data_1_missing_source_register_fails(self):
        manifest = self.manifest()
        del manifest["sources"]
        self.assertRejected(manifest, "missing required field 'sources'")

    def test_r_data_1_citation_revision_must_match_register(self):
        manifest = self.manifest()
        manifest["mass_limits"]["max_takeoff_normal"]["citations"][0]["revision"] = "Rev 79"
        self.assertRejected(manifest, "differs from register")

    def test_r_data_1_sourced_value_cannot_cite_unread_source(self):
        manifest = self.manifest()
        manifest["mass_limits"]["max_takeoff_normal"]["citations"] = [
            {"source_id": "S1", "revision": "Rev 88", "page": "29"}]
        self.assertRejected(manifest, "cites unread source 'S1'")

    def test_r_data_1_redistribution_right_is_required(self):
        manifest = self.manifest()
        del manifest["sources"][0]["rights"]["redistribution"]
        self.assertRejected(manifest, "missing required field 'redistribution'")

    def test_r_data_2_status_outside_vocabulary_fails(self):
        manifest = self.manifest()
        manifest["speed_limits"]["vne_ias"]["status"] = "guessed"
        self.assertRejected(manifest, "not in ['sourced', 'derived', 'estimated', 'unknown']")

    def test_r_data_2_unknown_value_must_be_null_with_todo(self):
        manifest = self.manifest()
        quantity = manifest["speed_limits"]["vfe_cas"]
        quantity["value"] = 43.7
        del quantity["todo"]
        errors = vm.validate(manifest, self.schema)
        self.assertTrue(any("vfe_cas.value: expected type null" in e for e in errors), errors)
        self.assertTrue(any("vfe_cas: missing required field 'todo'" in e for e in errors), errors)

    def test_r_data_2_value_without_unit_fails(self):
        manifest = self.manifest()
        del manifest["mass_limits"]["max_ramp_normal"]["unit"]
        self.assertRejected(manifest, "max_ramp_normal: missing required field 'unit'")

    def test_r_data_2_non_si_unit_fails(self):
        manifest = self.manifest()
        manifest["speed_limits"]["vno_ias"]["unit"] = "kt"
        self.assertRejected(manifest, "vno_ias.unit")

    def test_r_data_2_sourced_value_without_page_fails(self):
        manifest = self.manifest()
        del manifest["speed_limits"]["va_ias"]["citations"][1]["page"]
        self.assertRejected(manifest, "va_ias.citations[1]: missing required field 'page'")

    def test_r_data_2_sourced_value_without_citation_fails(self):
        manifest = self.manifest()
        manifest["speed_limits"]["va_ias"]["citations"] = []
        self.assertRejected(manifest, "va_ias.citations: needs at least 1 item")

    def test_r_fid_3_fidelity_must_stay_not_validated(self):
        manifest = self.manifest()
        manifest["fidelity"] = "validated"
        self.assertRejected(manifest, "$.fidelity: must equal")

    def test_r_data_1_duplicate_source_id_fails(self):
        manifest = self.manifest()
        manifest["sources"].append(copy.deepcopy(manifest["sources"][1]))
        self.assertRejected(manifest, "duplicate source id 'S1b'")

    def test_r_data_1_conflict_citing_unregistered_source_fails(self):
        manifest = self.manifest()
        manifest["speed_limits"]["vfe_cas"]["conflicts"][0]["citation"]["source_id"] = "S99"
        self.assertRejected(manifest, "conflicts[0].citation: source 'S99' is not in")

    def test_r_data_1_read_source_requires_checksum(self):
        manifest = self.manifest()
        del manifest["sources"][1]["sha256_prefix"]
        self.assertRejected(manifest, "$.sources[1]: missing required field 'sha256_prefix'")

    def test_r_data_2_derived_value_without_derivation_fails(self):
        manifest = self.manifest()
        del manifest["configuration"]["serial_range"]["last"]["derivation"]
        self.assertRejected(manifest, "serial_range.last: missing required field 'derivation'")

    def test_r_data_2_wrong_si_conversion_fails(self):
        manifest = self.manifest()
        manifest["mass_limits"]["max_takeoff_normal"]["value"] = 1160.2893  # ramp mass
        self.assertRejected(manifest, "max_takeoff_normal: value 1160.2893 kg does not match")

    def test_r_data_2_unlisted_conversion_pair_fails(self):
        manifest = self.manifest()
        manifest["mass_limits"]["max_takeoff_normal"]["original_unit"] = "kgf"
        self.assertRejected(manifest, "no conversion factor for 'kgf'")

    def test_conversion_table_matches_exact_definitions(self):
        self.assertAlmostEqual(vm.CONVERSIONS[("kt", "m/s")] * 3600, 1852)
        self.assertEqual(vm.CONVERSIONS[("lb", "kg")], 0.45359237)
        self.assertEqual(vm.CONVERSIONS[("in", "m")], 0.0254)
        self.assertEqual(vm.CONVERSIONS[("ft", "m")], 0.3048)
        self.assertAlmostEqual(vm.CONVERSIONS[("ft/min", "m/s")], 0.00508)

    def test_airspeed_requires_reference(self):
        manifest = self.manifest()
        del manifest["speed_limits"]["vne_cas"]["reference"]
        self.assertRejected(manifest, "vne_cas: missing required field 'reference'")

    def test_nested_unsupported_schema_keyword_is_rejected_before_validation(self):
        schema = copy.deepcopy(self.schema)
        # Unreached for this manifest's values: only a static audit can see it.
        schema["$defs"]["conflict"]["properties"]["note"]["maxLength"] = 10
        with self.assertRaises(vm.SchemaError):
            vm.validate(self.manifest(), schema)
        schema = copy.deepcopy(self.schema)
        schema["$defs"]["unused"] = {"oneOf": [True]}
        with self.assertRaises(vm.SchemaError):
            vm.validate({}, schema)

    def test_unresolvable_ref_is_schema_error(self):
        schema = copy.deepcopy(self.schema)
        schema["properties"]["mass_limits"] = {"$ref": "#/$defs/missing"}
        with self.assertRaises(vm.SchemaError):
            vm.validate(self.manifest(), schema)

    def test_unsupported_schema_keyword_is_rejected(self):
        schema = copy.deepcopy(self.schema)
        schema["oneOf"] = [True]
        with self.assertRaises(vm.SchemaError):
            vm.validate(self.manifest(), schema)

    def test_cli_exit_codes(self):
        with tempfile.TemporaryDirectory(prefix="gefly-manifest-test-") as directory:
            bad = self.manifest()
            del bad["mass_limits"]["max_ramp_normal"]["unit"]
            path = Path(directory) / "manifest.json"
            path.write_text(json.dumps(bad), encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(MANIFEST)]), 0)
                self.assertEqual(vm.main([str(path)]), 1)


POH_VALUES = MANIFEST.parent / "poh-values.json"


class PohValuesValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = vm.load_json(vm.POH_SCHEMA)
        cls.manifest_schema = vm.load_json(vm.SCHEMA)
        cls.valid = vm.load_json(POH_VALUES)
        cls.manifest = vm.load_json(MANIFEST)

    def values(self):
        return copy.deepcopy(self.valid)

    def assertRejected(self, document, fragment, manifest=None):
        errors = vm.validate_poh_values(document, self.schema, manifest or self.manifest,
                                        PINNED)
        self.assertTrue(any(fragment in error for error in errors),
                        f"expected an error containing {fragment!r}, got {errors}")

    def test_r_data_2_c172s_poh_values_are_valid(self):
        self.assertEqual(vm.validate_poh_values(self.values(), self.schema, self.manifest, PINNED), [])

    def test_shared_definitions_match_manifest_schema(self):
        for name in ("status", "citation", "citations", "status_rules"):
            self.assertEqual(self.schema["$defs"][name], self.manifest_schema["$defs"][name], name)

    def test_r_data_1_citation_must_resolve_in_named_manifest(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["sources"] = [s for s in manifest["sources"] if s["id"] != "S17"]
        self.assertRejected(self.values(), "'S17' is not in the source register", manifest)

    def test_r_data_1_manifest_id_mismatch_fails_closed(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["manifest_id"] = "gefly.aircraft.other"
        errors = vm.validate_poh_values(self.values(), self.schema, manifest, PINNED)
        self.assertTrue(any("does not match the loaded manifest" in e for e in errors), errors)
        self.assertTrue(any("is not in the source register" in e for e in errors), errors)

    def test_r_data_1_citation_revision_must_match_manifest_register(self):
        document = self.values()
        document["takeoff_distance"]["ground_roll_sl_10c"]["citations"][0]["revision"] = "Rev 4"
        self.assertRejected(document, "differs from register")

    def test_r_data_1_correction_needs_citation(self):
        document = self.values()
        document["corrections"][0]["citations"] = []
        self.assertRejected(document, "corrections[0].citations: needs at least 1 item")

    def test_r_data_2_condition_and_reading_are_required(self):
        document = self.values()
        del document["climb"]["rate_sl_0c"]["condition"]
        del document["stall_speeds"]["flaps_0_rearward_cg_ias"]["reading"]
        errors = vm.validate_poh_values(document, self.schema, self.manifest, PINNED)
        self.assertTrue(any("rate_sl_0c: missing required field 'condition'" in e for e in errors))
        self.assertTrue(any("flaps_0_rearward_cg_ias: missing required field 'reading'" in e
                            for e in errors))

    def test_r_data_2_reading_outside_vocabulary_fails(self):
        document = self.values()
        document["landing_distance"]["ground_roll_sl_10c"]["reading"] = "estimated"
        self.assertRejected(document, "ground_roll_sl_10c.reading")

    def test_r_data_2_wrong_distance_conversion_fails(self):
        document = self.values()
        document["takeoff_distance"]["ground_roll_sl_10c"]["value"] = 925.0
        self.assertRejected(document, "ground_roll_sl_10c: value 925.0 m does not match")

    def test_r_data_2_wrong_climb_rate_conversion_fails(self):
        document = self.values()
        document["climb"]["rate_sl_0c"]["original_value"] = 710
        self.assertRejected(document, "rate_sl_0c: value")

    def test_r_data_2_wrong_calibration_conversion_fails(self):
        document = self.values()
        document["airspeed_calibration"]["normal_flaps_0"]["points"][0]["cas"]["value"] = 28.0
        self.assertRejected(document, "points[0].cas: value 28.0 m/s does not match")

    def test_calibration_reference_cannot_be_swapped(self):
        document = self.values()
        document["airspeed_calibration"]["normal_flaps_10"]["points"][0]["ias"]["reference"] = "CAS"
        self.assertRejected(document, "points[0].ias.reference: must equal")

    def test_calibration_points_must_increase_in_ias(self):
        document = self.values()
        points = document["airspeed_calibration"]["normal_flaps_30"]["points"]
        points[1], points[2] = points[2], points[1]
        self.assertRejected(document, "normal_flaps_30.points[2]: IAS 60 not above previous 70")

    def test_r_data_2_unknown_calibration_needs_todo_and_no_points(self):
        document = self.values()
        document["airspeed_calibration"]["normal_flaps_0"]["status"] = "unknown"
        errors = vm.validate_poh_values(document, self.schema, self.manifest, PINNED)
        self.assertTrue(any("normal_flaps_0: missing required field 'todo'" in e for e in errors))
        self.assertTrue(any("normal_flaps_0.points: must equal []" in e for e in errors), errors)

    def test_r_data_2_climb_rate_needs_reference(self):
        document = self.values()
        del document["climb"]["rate_sl_0c"]["reference"]
        self.assertRejected(document, "rate_sl_0c: missing required field 'reference'")

    def test_r_data_2_sourced_value_needs_conversion(self):
        document = self.values()
        del document["stall_speeds"]["flaps_30_forward_cg_cas"]["conversion"]
        self.assertRejected(document, "flaps_30_forward_cg_cas: missing required field 'conversion'")

    def test_r_fid_3_fidelity_must_stay_not_validated(self):
        document = self.values()
        document["fidelity"] = "validated"
        self.assertRejected(document, "$.fidelity: must equal")

    def test_r_data_1_manifest_version_pin_mismatch_fails(self):
        document = self.values()
        document["manifest"]["manifest_version"] = "9.9.9"
        self.assertRejected(document, "$.manifest.manifest_version")

    def test_r_data_1_manifest_sha256_pin_mismatch_fails(self):
        document = self.values()
        document["manifest"]["manifest_sha256"] = "0" * 64
        self.assertRejected(document, "$.manifest.manifest_sha256")

    def test_r_data_1_unsupplied_digest_fails_closed(self):
        errors = vm.validate_poh_values(self.values(), self.schema, self.manifest)
        self.assertTrue(any("digest not supplied" in e for e in errors), errors)

    def test_r_data_1_missing_pin_fields_fail_schema(self):
        document = self.values()
        del document["manifest"]["manifest_sha256"]
        self.assertRejected(document, "manifest_sha256")

    def test_r_data_1_edited_manifest_bytes_break_pin_via_loader(self):
        with tempfile.TemporaryDirectory(prefix="gefly-poh-test-") as directory:
            (Path(directory) / "manifest.json").write_bytes(MANIFEST.read_bytes() + b"\n")
            path = Path(directory) / vm.POH_VALUES_NAME
            path.write_text(json.dumps(self.values()), encoding="utf-8")
            errors = vm.load_poh_values(path, self.schema, self.manifest_schema)
            self.assertTrue(any("$.manifest.manifest_sha256" in e for e in errors), errors)

    def test_manifest_path_cannot_leave_directory(self):
        with tempfile.TemporaryDirectory(prefix="gefly-poh-test-") as directory:
            document = self.values()
            document["manifest"]["path"] = "../manifest.json"
            path = Path(directory) / vm.POH_VALUES_NAME
            path.write_text(json.dumps(document), encoding="utf-8")
            errors = vm.load_poh_values(path, self.schema, self.manifest_schema)
            self.assertTrue(any("invalid manifest file name" in e for e in errors), errors)

    def test_climb_rate_tagged_as_airspeed_fails(self):
        document = self.values()
        document["climb"]["rate_sl_0c"]["reference"] = "IAS"
        self.assertRejected(document, "rate_sl_0c.reference: must equal \"vertical\"")

    def test_climb_speed_tagged_vertical_fails(self):
        document = self.values()
        document["climb"]["climb_speed_sl"]["reference"] = "vertical"
        self.assertRejected(document, "climb_speed_sl.reference: \"vertical\" not in")

    def test_distance_with_reference_fails(self):
        document = self.values()
        document["takeoff_distance"]["ground_roll_sl_10c"]["reference"] = "IAS"
        self.assertRejected(document, "ground_roll_sl_10c.reference: not allowed")

    def test_distance_in_wrong_si_unit_fails(self):
        document = self.values()
        document["landing_distance"]["ground_roll_sl_10c"]["unit"] = "m/s"
        self.assertRejected(document, "ground_roll_sl_10c.unit: must equal \"m\"")

    def test_stall_key_suffix_must_match_reference(self):
        document = self.values()
        document["stall_speeds"]["flaps_0_rearward_cg_cas"]["reference"] = "IAS"
        self.assertRejected(document, "flaps_0_rearward_cg_cas: key suffix '_cas' needs reference 'CAS'")

    def test_poh_values_reject_invalid_sibling_manifest(self):
        with tempfile.TemporaryDirectory(prefix="gefly-poh-test-") as directory:
            manifest = copy.deepcopy(self.manifest)
            manifest["fidelity"] = "validated"
            (Path(directory) / "manifest.json").write_text(json.dumps(manifest),
                                                          encoding="utf-8")
            path = Path(directory) / vm.POH_VALUES_NAME
            path.write_text(json.dumps(self.values()), encoding="utf-8")
            errors = vm.load_poh_values(path, self.schema, self.manifest_schema)
            self.assertTrue(any(e.startswith("manifest manifest.json: $.fidelity") for e in errors),
                            errors)

    def test_cli_validates_poh_values_with_sibling_manifest(self):
        with tempfile.TemporaryDirectory(prefix="gefly-poh-test-") as directory:
            bad = self.values()
            bad["landing_distance"]["total_50ft_sl_10c"]["original_unit"] = "m"
            # Exact manifest bytes keep the SHA-256 pin valid, so only the injected error fails.
            shutil.copyfile(MANIFEST, Path(directory) / "manifest.json")
            path = Path(directory) / vm.POH_VALUES_NAME
            path.write_text(json.dumps(bad), encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(POH_VALUES)]), 0)
            stderr = io.StringIO()
            with redirect_stdout(io.StringIO()), redirect_stderr(stderr):
                self.assertEqual(vm.main([str(path)]), 1)
            self.assertIn("total_50ft_sl_10c.original_unit", stderr.getvalue())
            self.assertNotIn("manifest_sha256", stderr.getvalue())


PERFORMANCE_VALUES = MANIFEST.parent / "performance-values.json"


class PerformanceValuesValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = vm.load_json(vm.PERFORMANCE_SCHEMA)
        cls.manifest_schema = vm.load_json(vm.SCHEMA)
        cls.poh_schema = vm.load_json(vm.POH_SCHEMA)
        cls.valid = vm.load_json(PERFORMANCE_VALUES)
        cls.manifest = vm.load_json(MANIFEST)

    def values(self):
        return copy.deepcopy(self.valid)

    def assertRejected(self, document, fragment, manifest=None):
        errors = vm.validate_performance_values(document, self.schema,
                                                manifest or self.manifest, PINNED)
        self.assertTrue(any(fragment in error for error in errors),
                        f"expected an error containing {fragment!r}, got {errors}")

    def test_r_data_2_c172s_performance_values_are_valid(self):
        self.assertEqual(
            vm.validate_performance_values(self.values(), self.schema, self.manifest,
                                           PINNED), [])

    def test_shared_definitions_match_other_schemas(self):
        for name in ("status", "citation", "citations", "status_rules"):
            self.assertEqual(self.schema["$defs"][name], self.manifest_schema["$defs"][name], name)
        self.assertEqual(self.schema["$defs"]["reading"], self.poh_schema["$defs"]["reading"])

    def test_new_conversion_factors_match_exact_definitions(self):
        self.assertEqual(vm.CONVERSIONS[("nm", "m")], 1852.0)
        self.assertEqual(vm.CONVERSIONS[("inHg", "Pa")], 3386.389)
        self.assertAlmostEqual(vm.CONVERSIONS[("in^3", "m^3")], 1.6387064e-5, places=15)
        self.assertAlmostEqual(vm.CONVERSIONS[("gal/h", "m^3/s")] * 3600, 3.785411784e-3,
                               places=15)
        self.assertAlmostEqual(vm.CONVERSIONS[("lb/h", "kg/s")] * 3600, 0.45359237, places=15)
        self.assertEqual(vm.CONVERSIONS[("%", "1")], 0.01)

    def test_r_data_1_citation_must_resolve_in_named_manifest(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["sources"] = [s for s in manifest["sources"] if s["id"] != "A14"]
        self.assertRejected(self.values(), "'A14' is not in the source register", manifest)

    def test_r_data_1_sourced_value_cannot_cite_unread_source(self):
        manifest = copy.deepcopy(self.manifest)
        for source in manifest["sources"]:
            if source["id"] == "A14":
                source["access_status"] = "not_read"
        self.assertRejected(self.values(), "cites unread source 'A14'", manifest)

    def test_r_data_1_manifest_id_mismatch_fails_closed(self):
        document = self.values()
        document["manifest"]["manifest_id"] = "gefly.aircraft.other"
        self.assertRejected(document, "does not match the loaded manifest")

    def test_r_data_2_wrong_engine_power_conversion_fails(self):
        document = self.values()
        document["engine_sea_level"]["full_throttle"]["points"][0]["power"]["value"] = 104000.0
        self.assertRejected(document, "full_throttle.points[0].power: value 104000.0 W")

    def test_r_data_2_wrong_manifold_pressure_conversion_fails(self):
        document = self.values()
        point = document["engine_sea_level"]["part_throttle"]["points"][0]
        point["manifold_pressure"]["value"] = 67700.0  # 20 inHg at 3385 Pa/inHg
        self.assertRejected(document, "manifold_pressure: value 67700.0 Pa")

    def test_r_data_2_small_si_values_are_checked_relatively(self):
        document = self.values()
        point = document["cruise"]["pa_2000ft_standard_temperature"]["points"][0]
        point["fuel_flow"]["value"] = point["fuel_flow"]["value"] * 1.01
        self.assertRejected(document, "fuel_flow: value")
        document = self.values()
        document["engine_ratings"]["displacement"]["value"] = 0.0059
        self.assertRejected(document, "displacement: value 0.0059 m^3")

    def test_r_data_2_wrong_unit_pair_fails(self):
        document = self.values()
        document["glide"]["distance_12000ft"]["original_unit"] = "ft"
        self.assertRejected(document, "distance_12000ft: value")
        document = self.values()
        point = document["cruise"]["pa_2000ft_standard_temperature"]["points"][0]
        point["fuel_flow"]["original_unit"] = "%"
        self.assertRejected(document, "fuel_flow.original_unit: must equal \"gal/h\"")

    def test_r_data_2_cruise_speed_must_be_true_airspeed(self):
        document = self.values()
        point = document["cruise"]["pa_2000ft_standard_temperature"]["points"][0]
        point["true_airspeed"]["reference"] = "IAS"
        self.assertRejected(document, "true_airspeed.reference: must equal \"TAS\"")
        del point["true_airspeed"]["reference"]
        self.assertRejected(document, "true_airspeed: missing required field 'reference'")

    def test_non_airspeed_quantity_cannot_carry_reference(self):
        document = self.values()
        document["glide"]["distance_12000ft"]["reference"] = "TAS"
        self.assertRejected(document, "distance_12000ft.reference: not allowed")

    def test_glide_key_suffix_must_match_reference(self):
        document = self.values()
        document["glide"]["best_glide_ias"]["reference"] = "CAS"
        self.assertRejected(document, "key suffix '_ias' needs reference 'IAS'")

    def test_r_data_2_condition_and_reading_are_required(self):
        document = self.values()
        del document["glide"]["best_glide_ias"]["condition"]
        self.assertRejected(document, "best_glide_ias: missing required field 'condition'")
        document = self.values()
        del document["engine_sea_level"]["full_throttle"]["reading"]
        self.assertRejected(document, "full_throttle: missing required field 'reading'")

    def test_r_data_2_derived_value_needs_derivation(self):
        document = self.values()
        del document["glide"]["glide_ratio"]["derivation"]
        self.assertRejected(document, "glide_ratio: missing required field 'derivation'")

    def test_r_data_2_unknown_series_needs_todo_and_no_points(self):
        document = self.values()
        series = document["engine_sea_level"]["full_throttle_2300_rpm"]
        del series["todo"]
        self.assertRejected(document, "full_throttle_2300_rpm: missing required field 'todo'")
        document = self.values()
        series = document["engine_sea_level"]["full_throttle_2300_rpm"]
        series["points"] = copy.deepcopy(
            document["engine_sea_level"]["full_throttle"]["points"][:1])
        self.assertRejected(document, "full_throttle_2300_rpm.points: must equal []")

    def test_r_data_2_sourced_series_needs_points_and_conversion(self):
        document = self.values()
        document["cruise"]["pa_2000ft_standard_temperature"]["points"] = []
        self.assertRejected(document, "pa_2000ft_standard_temperature.points: needs at least 1")
        document = self.values()
        del document["engine_sea_level"]["part_throttle"]["conversion"]
        self.assertRejected(document, "part_throttle: missing required field 'conversion'")

    def test_series_points_must_increase(self):
        document = self.values()
        points = document["cruise"]["pa_2000ft_standard_temperature"]["points"]
        points[0], points[1] = points[1], points[0]
        self.assertRejected(document, "pa_2000ft_standard_temperature.points[1]")
        document = self.values()
        points = document["engine_sea_level"]["part_throttle"]["points"]
        points[1] = copy.deepcopy(points[0])
        self.assertRejected(document, "part_throttle.points[1]: (2000, 20.0, 77) not above")
        document = self.values()
        points = document["engine_fuel"]["rpm_2400_best_power"]["points"]
        points[0], points[1] = points[1], points[0]
        self.assertRejected(document, "rpm_2400_best_power.points[1]: (2400, 120) not above")

    def test_r_fid_3_fidelity_must_stay_not_validated(self):
        document = self.values()
        document["fidelity"] = "validated"
        self.assertRejected(document, "$.fidelity: must equal")

    def glide_ratio_mismatch(self, document):
        """Recompute the derived glide ratio from its distance reading and 12,000 ft."""
        glide = document["glide"]
        distance = glide["distance_12000ft"]
        self.assertIn("12,000 ft", distance["condition"])
        expected = distance["value"] / (12000 * vm.CONVERSIONS[("ft", "m")])
        ratio = glide["glide_ratio"]
        return [name for name, value in (("value", ratio["value"]),
                                         ("original_value", ratio["original_value"]))
                if abs(value - expected) > vm.CONVERSION_TOLERANCE * max(1.0, expected)]

    def test_r_data_2_derived_glide_ratio_matches_distance_and_height(self):
        self.assertEqual(self.glide_ratio_mismatch(self.values()), [])
        document = self.values()
        document["glide"]["distance_12000ft"]["value"] = 17.0 * 1852
        document["glide"]["distance_12000ft"]["original_value"] = 17.0
        self.assertEqual(self.glide_ratio_mismatch(document), ["value", "original_value"])
        document = self.values()
        document["glide"]["glide_ratio"]["value"] = 9.5
        self.assertEqual(self.glide_ratio_mismatch(document), ["value"])

    def test_r_data_2_wrong_fuel_flow_conversion_fails(self):
        document = self.values()
        point = document["engine_fuel"]["rpm_2400_best_economy"]["points"][0]
        point["fuel_flow"]["value"] = point["fuel_flow"]["original_value"] * 0.45359237 / 3600 * 1.01
        self.assertRejected(document, "rpm_2400_best_economy.points[0].fuel_flow: value")

    def test_fuel_series_needs_mixture_and_matching_units(self):
        document = self.values()
        del document["engine_fuel"]["rpm_2400_best_power"]["mixture"]
        self.assertRejected(document, "rpm_2400_best_power: missing required field 'mixture'")
        document = self.values()
        document["engine_fuel"]["rpm_2400_best_power"]["points"][0]["fuel_flow"][
            "original_unit"] = "gal/h"
        self.assertRejected(document, "fuel_flow.original_unit: must equal \"lb/h\"")

    def test_unknown_fuel_series_needs_todo(self):
        document = self.values()
        del document["engine_fuel"]["rpm_2700"]["todo"]
        self.assertRejected(document, "rpm_2700: missing required field 'todo'")

    def test_cli_validates_performance_values_with_sibling_manifest(self):
        with tempfile.TemporaryDirectory(prefix="gefly-perf-test-") as directory:
            bad = self.values()
            bad["glide"]["best_glide_ias"]["unit"] = "m"
            shutil.copyfile(MANIFEST, Path(directory) / "manifest.json")
            path = Path(directory) / vm.PERFORMANCE_VALUES_NAME
            path.write_text(json.dumps(bad), encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(PERFORMANCE_VALUES)]), 0)
            stderr = io.StringIO()
            with redirect_stdout(io.StringIO()), redirect_stderr(stderr):
                self.assertEqual(vm.main([str(path)]), 1)
            self.assertIn("best_glide_ias", stderr.getvalue())
            self.assertNotIn("manifest_sha256", stderr.getvalue())

    def test_performance_values_reject_invalid_sibling_manifest(self):
        with tempfile.TemporaryDirectory(prefix="gefly-perf-test-") as directory:
            manifest = copy.deepcopy(self.manifest)
            manifest["fidelity"] = "validated"
            (Path(directory) / "manifest.json").write_text(json.dumps(manifest),
                                                          encoding="utf-8")
            path = Path(directory) / vm.PERFORMANCE_VALUES_NAME
            path.write_text(json.dumps(self.values()), encoding="utf-8")
            errors = vm.load_poh_values(path, self.schema, self.manifest_schema,
                                        vm.validate_performance_values)
            self.assertTrue(any(e.startswith("manifest manifest.json: $.fidelity") for e in errors),
                            errors)


INDICATION_VALUES = MANIFEST.parent / "indication-loading-values.json"


class IndicationLoadingValuesTests(unittest.TestCase):
    """Engine/fuel indications and sample loading (user decision 2026-11-02; R-DATA-1, R-DATA-2, R-AIR-1)."""

    @classmethod
    def setUpClass(cls):
        cls.schema = vm.load_json(vm.INDICATION_SCHEMA)
        cls.manifest_schema = vm.load_json(vm.SCHEMA)
        cls.poh_schema = vm.load_json(vm.POH_SCHEMA)
        cls.valid = vm.load_json(INDICATION_VALUES)
        cls.manifest = vm.load_json(MANIFEST)

    def values(self):
        return copy.deepcopy(self.valid)

    def assertRejected(self, document, fragment):
        errors = vm.validate_indication_values(document, self.schema, self.manifest, PINNED)
        self.assertTrue(any(fragment in error for error in errors),
                        f"expected an error containing {fragment!r}, got {errors}")

    def test_r_data_2_c172s_indication_loading_values_are_valid(self):
        self.assertEqual(vm.validate_indication_values(self.values(), self.schema,
                                                       self.manifest, PINNED), [])

    def test_shared_definitions_match_other_schemas(self):
        for name in ("status", "citation", "citations", "status_rules"):
            self.assertEqual(self.schema["$defs"][name], self.manifest_schema["$defs"][name], name)
        self.assertEqual(self.schema["$defs"]["reading"], self.poh_schema["$defs"]["reading"])

    def test_new_conversion_factors_match_exact_definitions(self):
        self.assertAlmostEqual(vm.CONVERSIONS[("psi", "Pa")], 6894.757293168361, places=9)
        self.assertEqual(vm.CONVERSIONS[("gal", "m^3")], 3.785411784e-3)
        self.assertEqual(vm.CONVERSIONS[("h", "s")], 3600.0)
        self.assertAlmostEqual(vm.CONVERSIONS[("lb-in/1000", "kg*m")], 11.521246198, places=9)
        scale, offset = vm.AFFINE_CONVERSIONS[("degF", "K")]
        self.assertAlmostEqual((32 + offset) * scale, 273.15, places=12)
        self.assertAlmostEqual((212 + offset) * scale, 373.15, places=12)

    def test_affine_temperature_conversion_is_checked(self):
        document = self.values()
        document["indications"]["oil_temp_k"]["markings"][1]["at"]["value"] = 245.0
        self.assertRejected(document, "does not match 245 degF")

    def test_sample_loading_must_be_labelled_as_sample(self):
        document = self.values()
        document["sample_loading"]["nature"] = "weighed aircraft"
        self.assertRejected(document, "sample_loading.nature")

    def test_arc_needs_lower_and_upper(self):
        document = self.values()
        del document["indications"]["oil_press_pa"]["markings"][1]["upper"]
        self.assertRejected(document, "missing required field 'upper'")

    def test_red_line_needs_at(self):
        document = self.values()
        del document["indications"]["oil_press_pa"]["markings"][0]["at"]
        self.assertRejected(document, "missing required field 'at'")

    def test_red_annunciator_is_a_warning(self):
        document = self.values()
        document["annunciators"]["ann_oil_press"]["kind"] = "caution"
        self.assertRejected(document, "ann_oil_press.kind")

    def test_unknown_scale_needs_todo(self):
        document = self.values()
        del document["indications"]["fuel_flow_m3ps"]["scale"]["todo"]
        self.assertRejected(document, "scale: missing required field 'todo'")

    def test_estimated_scale_needs_applicability_and_citation(self):
        # GAPS Q23 update 2026-11-02 08:01: FlightGear (another variant) values stay estimated.
        document = self.values()
        scale = document["indications"]["oil_temp_k"]["scale"]
        self.assertEqual(scale["status"], "estimated")
        del scale["applicability"]
        self.assertRejected(document, "scale: missing required field 'applicability'")
        document = self.values()
        document["indications"]["oil_temp_k"]["scale"]["citations"] = []
        self.assertRejected(document, "oil_temp_k.scale.citations")

    def test_estimate_status_cannot_be_sourced(self):
        document = self.values()
        document["indications"]["hobbs_time_s"]["counting"]["status"] = "sourced"
        self.assertRejected(document, "counting.status")
        document = self.values()
        del document["annunciators"]["ann_low_fuel_left"]["triggers"][0]["basis"]["applicability"]
        self.assertRejected(document, "basis: missing required field 'applicability'")

    def test_estimate_cites_registered_flightgear_revision(self):
        document = self.values()
        citation = document["indications"]["hobbs_time_s"]["counting"]["citations"][0]
        self.assertEqual(citation["source_id"], "S14")
        citation["revision"] = "master 0000000"
        self.assertRejected(document, "differs from register")

    def test_derived_arm_needs_derivation(self):
        document = self.values()
        del document["sample_loading"]["values"]["basic_empty_arm"]["derivation"]
        self.assertRejected(document, "basic_empty_arm: missing required field 'derivation'")

    def test_marking_unit_must_match_indication(self):
        document = self.values()
        document["indications"]["oil_press_pa"]["markings"][1]["lower"]["unit"] = "K"
        self.assertRejected(document, "markings[1].lower.unit: 'K' differs from indication unit 'Pa'")

    def test_marking_original_unit_must_match_indication(self):
        document = self.values()
        marking = document["indications"]["vac_suction_pa"]["markings"][0]
        marking["upper"].update(original_unit="psi", original_value=5.5 * 3386.389 / vm.CONVERSIONS[("psi", "Pa")])
        self.assertRejected(document, "markings[0].upper.original_unit: 'psi' differs")

    def test_arc_lower_must_be_below_upper(self):
        document = self.values()
        arc = document["indications"]["oil_press_pa"]["markings"][1]
        arc["lower"], arc["upper"] = arc["upper"], arc["lower"]
        self.assertRejected(document, "markings[1]: lower 620528.16 is not below upper 344737.86")

    def test_derived_arm_is_recomputed_from_moment_and_mass(self):
        document = self.values()
        arm = document["sample_loading"]["values"]["basic_empty_arm"]
        arm["original_value"] = 38.3
        arm["value"] = round(38.3 * 0.0254, 5)
        self.assertRejected(document, "differs from moment/mass 0.96836 m")

    def test_derived_arm_within_uncertainty_passes(self):
        document = self.values()
        arm = document["sample_loading"]["values"]["basic_empty_arm"]
        arm["original_value"] = 38.14
        arm["value"] = round(38.14 * 0.0254, 5)  # 0.0004 m off, below 0.001 m
        self.assertEqual(vm.validate_indication_values(document, self.schema, self.manifest,
                                                       PINNED), [])

    def test_derived_quantity_needs_derived_reading(self):
        document = self.values()
        document["sample_loading"]["values"]["basic_empty_arm"]["reading"] = "tabulated"
        self.assertRejected(document, "basic_empty_arm.reading: must equal \"derived\"")

    def test_conflict_without_citations_is_rejected(self):
        document = self.values()
        document["conflicts"][0]["citations"] = []
        self.assertRejected(document, "conflicts[0].citations")

    def test_unregistered_unit_pair_errors(self):
        document = self.values()
        document["sample_loading"]["values"]["fuel_arm"]["original_unit"] = "lb"
        self.assertRejected(document, "no conversion factor for 'lb' -> 'm'")

    def test_affine_and_multiplicative_conversions_differ(self):
        errors = []
        node = {"value": 310.9278, "unit": "K", "original_value": 100, "original_unit": "degF"}
        vm.conversions(node, errors)
        self.assertEqual(errors, [])
        node["value"] = 100 * 5 / 9  # multiplicative only: misses the 459.67 offset
        vm.conversions(node, errors)
        self.assertTrue(any("does not match 100 degF" in e for e in errors), errors)
        errors = []
        vm.conversions({"value": 137895.15, "unit": "Pa", "original_value": 20,
                        "original_unit": "psi"}, errors)
        self.assertEqual(errors, [])

    def test_arm_uncertainty_must_be_positive(self):
        document = self.values()
        document["sample_loading"]["values"]["basic_empty_arm"]["uncertainty_si"] = 0
        self.assertRejected(document, "uncertainty_si: 0 must be positive")

    def test_arm_uncertainty_is_capped_at_half_a_percent(self):
        document = self.values()
        arm = document["sample_loading"]["values"]["basic_empty_arm"]
        arm["original_value"] = 60
        arm["value"] = round(60 * 0.0254, 5)
        arm["uncertainty_si"] = 10
        self.assertRejected(document, "uncertainty_si: 10 exceeds 0.5% of the arm")

    def test_governs_needs_a_matching_conflict(self):
        document = self.values()
        del document["conflicts"][0]["fields"]
        self.assertRejected(document, "governs is true but no conflicts entry lists 'tach_prop_radps'")
        document = self.values()
        document["conflicts"][0]["fields"] = ["oil_temp_k"]
        self.assertRejected(document, "tach_prop_radps.markings[0]: governs is true")

    def test_electrical_scope_requires_inclusion(self):
        document = self.values()
        del document["indications"]["ammeter_a"]["inclusion"]
        self.assertRejected(document, "ammeter_a: missing required field 'inclusion'")
        document = self.values()
        del document["annunciators"]["ann_volts"]["inclusion"]
        self.assertRejected(document, "ann_volts: missing required field 'inclusion'")

    def test_red_line_min_must_be_below_red_line_max(self):
        document = self.values()
        markings = document["indications"]["oil_press_pa"]["markings"]
        markings[0]["at"], markings[2]["at"] = markings[2]["at"], markings[0]["at"]
        self.assertRejected(document, "red_line_min 792897.09 is not below red_line_max 137895.15")

    def test_cli_validates_indication_values_with_sibling_manifest(self):
        with tempfile.TemporaryDirectory(prefix="gefly-ind-test-") as directory:
            bad = self.values()
            bad["sample_loading"]["values"]["fuel_arm"]["value"] = 48.0
            shutil.copyfile(MANIFEST, Path(directory) / "manifest.json")
            path = Path(directory) / vm.INDICATION_VALUES_NAME
            path.write_text(json.dumps(bad), encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(INDICATION_VALUES)]), 0)
            stderr = io.StringIO()
            with redirect_stdout(io.StringIO()), redirect_stderr(stderr):
                self.assertEqual(vm.main([str(path)]), 1)
            self.assertIn("fuel_arm: value 48.0 m does not match 48.0 in", stderr.getvalue())
            self.assertNotIn("manifest_sha256", stderr.getvalue())

if __name__ == "__main__":
    unittest.main()
