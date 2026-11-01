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
