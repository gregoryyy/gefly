"""Synthetic adapter fixtures; do not redistribute the upstream propeller tables."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('prepare_propeller', Path(__file__).with_name('prepare-propeller.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# Three deliberately synthetic multiplier rows per table, including design-point
# identity. They are not a copy of the upstream coefficient table.
def branch(name, variable):
    return (f'if($ac_pitch == 0) {{ // fixed pitch\n'
            f' print(" <table name=\\"{name}\\" type=\\"internal\\">\\n");\n'
            f' printf(" 0.0 %5.4f\\n", ${variable} * 0.500);\n'
            f' printf(" 0.2 %5.4f\\n", ${variable} * 1.000);\n'
            f' printf(" 1.4 %5.4f\\n", ${variable} * -0.750);\n'
            '} else { // unrelated variable-pitch branch\n}\n')

GENERATOR = ('<?php\n// Synthetic author notice\n' + branch('C_THRUST', 'ct0') + branch('C_POWER', 'cp0')).encode()
ENGINE = b'<piston_engine><maxhp>160</maxhp><maxrpm>2700</maxrpm></piston_engine>'
PROPELLER = b'''<propeller name="Synthetic source">
<!-- Synthetic geometry and source notice, retained. -->
<ixx>1.67</ixx><diameter unit="IN">75</diameter><numblades>2</numblades>
<minpitch>22</minpitch><maxpitch>22</maxpitch>
<table name="C_THRUST" type="internal"><tableData>0 0.123456\n2 -0.12</tableData></table>
<table name="C_POWER" type="internal"><tableData>0 0.765432\n2 0.07</tableData></table>
<table name="CT_MACH" type="internal"><tableData>0.5 1\n2 0.8</tableData></table>
<table name="CP_MACH" type="internal"><tableData>0.5 1\n2 1.8</tableData></table>
</propeller>'''
FIXTURE = {'utils/aeromatic/prop2.php': GENERATOR, 'engine/eng_io320.xml': ENGINE, 'engine/prop_75in2f.xml': PROPELLER}


class PreparePropellerTests(unittest.TestCase):
    def source(self, root):
        source = root / 'source'
        for relative, data in FIXTURE.items():
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        return source

    def test_extracts_only_fixed_pitch_rows_and_preserves_signs(self):
        multipliers = module.fixed_pitch_multipliers(GENERATOR)
        self.assertEqual(set(multipliers), {'C_THRUST', 'C_POWER'})
        self.assertEqual(multipliers['C_POWER'], [(0, .5), (.2, 1), (1.4, -.75)])
        for text in (GENERATOR.replace(b'// fixed pitch', b'// unknown branch'),
                     GENERATOR.replace(b'1.4 %5.4f', b'0.1 %5.4f'),
                     GENERATOR.replace(b'* -0.750', b'* 0.750'), GENERATOR + GENERATOR):
            with self.subTest(text=text), self.assertRaises(ValueError):
                module.fixed_pitch_multipliers(text)

    def test_direct_drive_design_point_holdout_and_retained_geometry(self):
        result, inputs = module.model_xml(GENERATOR, ENGINE, PROPELLER)
        # Independently calculated with Decimal at 28 digits, before running adapter.
        self.assertAlmostEqual(inputs['cp0'], .04258269989766734619240615565, places=15)
        self.assertAlmostEqual(inputs['ct0'], .05961577985673428466936861791, places=15)
        xml = ET.fromstring(result)
        cp = xml.find("table[@name='C_POWER']/tableData").text.split()
        ct = xml.find("table[@name='C_THRUST']/tableData").text.split()
        self.assertEqual(cp[2:4], ['0.2', '0.0426'])
        self.assertEqual(ct[2:4], ['0.2', '0.0596'])
        self.assertLess(float(cp[-1]), 0)
        self.assertLess(float(ct[-1]), 0)
        self.assertEqual(xml.findtext('gearratio').strip(), '1.0')
        original = ET.fromstring(PROPELLER)
        for tag in ('ixx', 'diameter', 'numblades', 'minpitch', 'maxpitch',
                    "table[@name='CT_MACH']", "table[@name='CP_MACH']"):
            self.assertEqual(ET.tostring(xml.find(tag)), ET.tostring(original.find(tag)))
        self.assertIn(b'Synthetic geometry and source notice, retained.', result)
        self.assertIn(b'David P. Culp', result)
        self.assertIn(b'not validated C172S', result)

    def test_rejects_geometry_or_design_power_changes(self):
        cases = ((ENGINE.replace(b'160', b'180'), PROPELLER),
                 (ENGINE.replace(b'2700', b'2500'), PROPELLER),
                 (ENGINE, PROPELLER.replace(b'unit="IN"', b'unit="FT"')),
                 (ENGINE, PROPELLER.replace(b'<minpitch>22', b'<minpitch>20')),
                 (ENGINE, PROPELLER.replace(b'<numblades>2', b'<numblades>3')))
        for engine, propeller in cases:
            with self.subTest(engine=engine, propeller=propeller), self.assertRaises(ValueError):
                module.model_xml(GENERATOR, engine, propeller)

    def test_reproducible_output_hashes_and_source_untouched(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = self.source(root)
            destination = root / 'out/propeller.xml'; metadata = root / 'out/meta.json'
            with patch.object(module, 'SOURCE_SHA256', {path: module.sha256(data) for path, data in FIXTURE.items()}):
                first = module.prepare_propeller(source, destination, metadata)
                first_bytes = destination.read_bytes()
                second = module.prepare_propeller(source, destination, metadata)
            self.assertEqual(first, second)
            self.assertEqual(destination.read_bytes(), first_bytes)
            self.assertEqual(json.loads(metadata.read_text()), first)
            self.assertEqual(first['prepared_sha256'], module.sha256(first_bytes))
            self.assertEqual(first['adapter_script_sha256'], module.sha256(Path(module.__file__).read_bytes()))
            for relative, data in FIXTURE.items():
                self.assertEqual((source / relative).read_bytes(), data)
            self.assertEqual({record['path']: record['sha256'] for record in first['sources']},
                             {path: module.sha256(data) for path, data in FIXTURE.items()})

    def test_unknown_source_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = self.source(root)
            destination = root / 'propeller.xml'; destination.write_text('keep')
            metadata = root / 'meta.json'; metadata.write_text('keep metadata')
            with self.assertRaisesRegex(ValueError, 'Unknown source bytes'):
                module.prepare_propeller(source, destination, metadata)
            self.assertEqual(destination.read_text(), 'keep')
            self.assertEqual(metadata.read_text(), 'keep metadata')

    @patch.dict(module.SOURCE_SHA256, {path: module.sha256(data) for path, data in FIXTURE.items()}, clear=True)
    def test_rejects_source_output_overlap_nonregular_and_symlink_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = self.source(root)
            output = root / 'out.xml'; meta = root / 'meta.json'
            output.symlink_to(source / 'engine/prop_75in2f.xml')
            for destination, metadata in ((output, meta), (source / 'new.xml', meta),
                                          (root / 'fine.xml', source / 'meta.json'),
                                          (source, meta), (meta, meta), (root / 'out', root / 'out/meta.json')):
                with self.subTest(destination=destination, metadata=metadata), self.assertRaises(ValueError):
                    module.prepare_propeller(source, destination, metadata)
            output.unlink()
            (source / 'engine/eng_io320.xml').unlink()
            (source / 'engine/eng_io320.xml').symlink_to(source / 'engine/prop_75in2f.xml')
            with self.assertRaisesRegex(ValueError, 'Symlink source'):
                module.prepare_propeller(source, output, meta)
            (source / 'engine/eng_io320.xml').unlink()
            (source / 'engine/eng_io320.xml').mkdir()
            with self.assertRaisesRegex(ValueError, 'regular source'):
                module.prepare_propeller(source, output, meta)


if __name__ == '__main__':
    unittest.main()
