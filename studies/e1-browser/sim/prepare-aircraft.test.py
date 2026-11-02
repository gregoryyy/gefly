"""Synthetic adapter fixtures; no third-party aircraft model bytes are redistributed."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("prepare_aircraft", Path(__file__).with_name("prepare-aircraft.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

FIXTURE = (b'<!-- Synthetic author/license notice -->\n<fdm_config>\n'
           b'  <aerodynamics><coefficient>0.123456</coefficient></aerodynamics>\n'
           + module.SYSTEM + b'      <!-- Preserve the automatic-mixture formula exactly. -->\n'
           + module.CHANNEL + b'        <value>0.987654</value>\n      </channel>\n'
           b'    </system>\n  <autopilot file="upstream-unchanged"/>\n</fdm_config>\n')


class PrepareAircraftTests(unittest.TestCase):
    def test_patch_changes_only_default_on_gate_wiring_and_is_idempotent(self):
        changed = module.patch_xml(FIXTURE)
        self.assertEqual(changed.count(module.PROPERTY), 1)
        self.assertEqual(changed.count(module.GATED_CHANNEL), 1)
        self.assertEqual(changed.replace(module.PROPERTY, b'', 1).replace(module.GATED_CHANNEL, module.CHANNEL, 1), FIXTURE)
        self.assertEqual(module.patch_xml(changed), changed)

    def test_requires_exactly_one_target_and_rejects_partial_or_different_wiring(self):
        for value in (FIXTURE.replace(module.CHANNEL, b''), FIXTURE + module.CHANNEL,
                      FIXTURE.replace(module.SYSTEM, b''), FIXTURE + module.PROPERTY):
            with self.subTest(value=value), self.assertRaises(ValueError):
                module.patch_xml(value)

    def test_prepare_copies_whole_directory_without_mutating_source_and_records_hashes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source'; source.mkdir()
            (source / 'c172x.xml').write_bytes(FIXTURE)
            (source / 'copyright.txt').write_bytes(b'unchanged license notice\n')
            (source / 'systems').mkdir(); (source / 'systems' / 'ap.xml').write_bytes(b'unchanged coefficients\n')
            output = root / 'prepared' / 'c172x'; metadata = root / 'manifest.json'
            with patch.object(module, 'SOURCE_XML_SHA256', module.sha256(FIXTURE)):
                first = module.prepare_aircraft(source, output, metadata)
                second = module.prepare_aircraft(source, output, metadata)
            self.assertEqual(first, second)
            self.assertEqual((source / 'c172x.xml').read_bytes(), FIXTURE)
            self.assertEqual((output / 'copyright.txt').read_bytes(), b'unchanged license notice\n')
            self.assertEqual((output / 'systems' / 'ap.xml').read_bytes(), b'unchanged coefficients\n')
            self.assertEqual(first['prepared_sha256'], module.sha256((output / 'c172x.xml').read_bytes()))
            self.assertEqual(first['source_sha256'], module.sha256(FIXTURE))
            self.assertEqual(json.loads(metadata.read_text()), first)

    def test_unknown_source_bytes_are_rejected_before_replacing_existing_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source'; source.mkdir()
            (source / 'c172x.xml').write_bytes(FIXTURE)
            output = root / 'output'; output.mkdir(); sentinel = output / 'keep'; sentinel.write_text('keep')
            with self.assertRaisesRegex(ValueError, 'Unknown c172x.xml'):
                module.prepare_aircraft(source, output, root / 'manifest.json')
            self.assertEqual(sentinel.read_text(), 'keep')

    def test_rejects_destination_in_source_and_symlink_inputs(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source'; source.mkdir()
            (source / 'c172x.xml').write_bytes(FIXTURE)
            with self.assertRaises(ValueError):
                module.prepare_aircraft(source, source / 'output', root / 'manifest.json')
            with self.assertRaises(ValueError):
                module.prepare_aircraft(source, root, root / 'manifest.json')
            with self.assertRaises(ValueError):
                module.prepare_aircraft(source, root / 'output', source / 'manifest.json')
            (source / 'linked').symlink_to(source / 'c172x.xml')
            with self.assertRaises(ValueError):
                module.prepare_aircraft(source, root / 'output', root / 'manifest.json')


if __name__ == '__main__':
    unittest.main()
