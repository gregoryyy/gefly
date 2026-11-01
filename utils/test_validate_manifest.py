"""Aircraft manifest validation boundaries (R-AIR-1, R-DATA-1, R-DATA-2)."""

from contextlib import redirect_stderr, redirect_stdout
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest

import validate_manifest as vm


MANIFEST = vm.ROOT / "data" / "aircraft" / "c172s-classic" / "manifest.json"


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
        errors = vm.validate_poh_values(document, self.schema, manifest or self.manifest)
        self.assertTrue(any(fragment in error for error in errors),
                        f"expected an error containing {fragment!r}, got {errors}")

    def test_r_data_2_c172s_poh_values_are_valid(self):
        self.assertEqual(vm.validate_poh_values(self.values(), self.schema, self.manifest), [])

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
        errors = vm.validate_poh_values(self.values(), self.schema, manifest)
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
        errors = vm.validate_poh_values(document, self.schema, self.manifest)
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
        errors = vm.validate_poh_values(document, self.schema, self.manifest)
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
            (Path(directory) / "manifest.json").write_text(json.dumps(self.manifest),
                                                          encoding="utf-8")
            path = Path(directory) / vm.POH_VALUES_NAME
            path.write_text(json.dumps(bad), encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(POH_VALUES)]), 0)
                self.assertEqual(vm.main([str(path)]), 1)


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
                                                manifest or self.manifest)
        self.assertTrue(any(fragment in error for error in errors),
                        f"expected an error containing {fragment!r}, got {errors}")

    def test_r_data_2_c172s_performance_values_are_valid(self):
        self.assertEqual(
            vm.validate_performance_values(self.values(), self.schema, self.manifest), [])

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
            (Path(directory) / "manifest.json").write_text(json.dumps(self.manifest),
                                                          encoding="utf-8")
            path = Path(directory) / vm.PERFORMANCE_VALUES_NAME
            path.write_text(json.dumps(bad), encoding="utf-8")
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(vm.main([str(PERFORMANCE_VALUES)]), 0)
                self.assertEqual(vm.main([str(path)]), 1)

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


if __name__ == "__main__":
    unittest.main()
