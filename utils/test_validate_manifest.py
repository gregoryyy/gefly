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


if __name__ == "__main__":
    unittest.main()
