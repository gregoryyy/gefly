"""Synthetic adapter fixtures; no third-party aircraft model bytes are redistributed."""
import importlib.util
import json
import re
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("prepare_aircraft", Path(__file__).with_name("prepare-aircraft.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def synthetic_aileron(name: bytes) -> bytes:
    return (b'            <actuator name="' + name + b'">\n'
            b'              <input>synthetic-roll-target</input>\n'
            b'              <rate_limit> 1.57 </rate_limit>\n'
            + module.AILERON_SOURCE_HYSTERESIS
            + b'              <clipto><min>-0.350</min><max>0.260</max></clipto>\n'
            b'              <output>synthetic-surface</output>\n'
            b'            </actuator>\n')


SCALES = (b'            <aerosurface_scale name="fcs/left-aileron-control">\n'
          b'              <input>synthetic-roll-sum</input><gain>0.01745</gain>\n'
          b'              <range><min>-20</min><max>15</max></range>\n'
          b'            </aerosurface_scale>\n'
          b'            <aerosurface_scale name="fcs/right-aileron-control">\n'
          b'              <input>-synthetic-roll-sum</input><gain>0.01745</gain>\n'
          b'              <range><min>-20</min><max>15</max></range>\n'
          b'            </aerosurface_scale>\n')
ELEVATOR = (b'            <actuator name="fcs/elevator-actuator">\n'
            b'              <lag>60</lag><bias>0.002</bias>\n'
            b'              <hysteresis_width> 0.05 </hysteresis_width>\n'
            b'              <output>synthetic-elevator</output>\n'
            b'            </actuator>\n')
AERODYNAMICS = b'  <aerodynamics><coefficient>0.123456</coefficient></aerodynamics>\n'
FIXTURE = (b'<!-- Synthetic author/license notice -->\n<fdm_config>\n'
           + AERODYNAMICS
           + module.SYSTEM + b'      <!-- Preserve the automatic-mixture formula exactly. -->\n'
           + module.CHANNEL + b'        <value>0.987654</value>\n      </channel>\n'
           b'    </system>\n    <flight_control>\n'
           + ELEVATOR + b'        <channel name="Roll">\n' + SCALES
           + b''.join(synthetic_aileron(name) for name in module.AILERON_ACTUATORS)
           + b'        </channel>\n    </flight_control>\n  <autopilot file="upstream-unchanged"/>\n</fdm_config>\n')

AP_FIXTURE = (b'<!-- Synthetic AP notice -->\n<autopilot>\n'
              b'  <property> ap/altitude_hold     </property>\n'
              + module.AP_AGL + b'\n' + module.AP_ERROR + b'\n'
              + module.AP_PID + b'\n' + module.AP_HDOT_INPUT + b'\n' + module.AP_ELEVATOR + b'\n</autopilot>')

class PrepareAircraftTests(unittest.TestCase):
    def test_patch_changes_only_mixture_steering_and_roll_hysteresis_and_is_idempotent(self):
        changed = module.patch_xml(FIXTURE)
        self.assertEqual(changed.count(module.PROPERTY), 1)
        self.assertEqual(changed.count(module.GATED_CHANNEL), 1)
        self.assertEqual(changed.count(module.STEERING_CHANNEL + module.FLIGHT_CONTROL_END), 1)
        self.assertEqual(changed.replace(module.STEERING_CHANNEL, b'', 1).replace(module.PROPERTY, b'', 1).replace(module.GATED_CHANNEL, module.CHANNEL, 1).replace(module.AILERON_ZERO_HYSTERESIS, module.AILERON_SOURCE_HYSTERESIS), FIXTURE)
        self.assertEqual(module.patch_xml(changed), changed)

    def test_only_named_roll_actuators_have_zero_width_while_other_source_bytes_stay(self):
        changed = module.patch_xml(FIXTURE)
        before, after = ET.fromstring(FIXTURE), ET.fromstring(changed)
        for name in module.AILERON_ACTUATORS:
            selector = ".//actuator[@name='" + name.decode() + "']"
            a, b = before.find(selector), after.find(selector)
            self.assertEqual(float(a.findtext("hysteresis_width")), 0.005)
            self.assertEqual(float(b.findtext("hysteresis_width")), 0)
            self.assertEqual(ET.tostring(a.find("rate_limit")), ET.tostring(b.find("rate_limit")))
            self.assertEqual(ET.tostring(a.find("clipto")), ET.tostring(b.find("clipto")))
            self.assertEqual(ET.tostring(a.find("input")), ET.tostring(b.find("input")))
            self.assertEqual(ET.tostring(a.find("output")), ET.tostring(b.find("output")))
        self.assertIn(ELEVATOR, changed)
        self.assertIn(SCALES, changed)
        self.assertIn(AERODYNAMICS, changed)
        self.assertEqual(changed.count(module.AILERON_ZERO_HYSTERESIS), 2)
        self.assertEqual(float(after.findtext(".//actuator[@name='fcs/elevator-actuator']/hysteresis_width")), .05)

    def test_missing_unknown_duplicated_or_partial_roll_targets_fail_closed(self):
        source_line, zero_width = module.AILERON_SOURCE_HYSTERESIS, module.AILERON_ZERO_HYSTERESIS
        unexpected = "Unexpected aileron actuator hysteresis wiring"
        missing = "Expected one named left and right aileron actuator"
        cases = (
            ("missing width", FIXTURE.replace(source_line, b'', 1), unexpected),
            ("unknown width", FIXTURE.replace(source_line, source_line.replace(b'0.005', b'0.006'), 1),
             "Unknown aileron actuator hysteresis value; review adapter"),
            ("partially zero-width pair", FIXTURE.replace(source_line, zero_width, 1),
             "Partially patched aileron hysteresis pair"),
            ("duplicate width", FIXTURE.replace(source_line, source_line + source_line, 1), unexpected),
            ("renamed width tag", FIXTURE.replace(source_line, source_line.replace(b'hysteresis_width', b'hysteresis-width'), 1), unexpected),
            ("renamed actuator", FIXTURE.replace(b'fcs/left-aileron-actuator', b'fcs/another-actuator', 1), missing),
            ("duplicate named actuator", FIXTURE + synthetic_aileron(module.AILERON_ACTUATORS[0]), missing),
            ("missing left actuator", FIXTURE.replace(synthetic_aileron(module.AILERON_ACTUATORS[0]), b'', 1), missing),
            ("nested aileron actuators", FIXTURE.replace(
                synthetic_aileron(module.AILERON_ACTUATORS[0]),
                synthetic_aileron(module.AILERON_ACTUATORS[0]).replace(b'            </actuator>\n', b''), 1), unexpected),
        )
        for name, value, message in cases:
            with self.subTest(case=name), self.assertRaisesRegex(ValueError, '^' + re.escape(message) + '$'):
                module.patch_xml(value)

    def test_unclosed_last_aileron_has_the_specific_missing_closing_tag_error(self):
        right = synthetic_aileron(module.AILERON_ACTUATORS[1])
        right_start = FIXTURE.index(right)
        right_close = FIXTURE.index(b'</actuator>', right_start)
        # Truncate after the right actuator's content, not an earlier elevator
        # closing tag. The helper must take its closing<0 rejection branch.
        truncated = FIXTURE[:right_close]
        self.assertTrue(truncated.endswith(b'            '))
        self.assertEqual(truncated.count(b'<actuator name="fcs/right-aileron-actuator">'), 1)
        self.assertNotIn(b'</actuator>', truncated[right_start:])
        with self.assertRaisesRegex(ValueError, '^Unclosed aileron actuator$'):
            module.patch_aileron_hysteresis(truncated)
        # Preserve the wrapper's flight-control closing tag to prove the full
        # adapter also reaches this actuator-specific guard.
        unclosed_right = right.replace(b'            </actuator>\n', b'', 1)
        with self.assertRaisesRegex(ValueError, '^Unclosed aileron actuator$'):
            module.patch_xml(FIXTURE.replace(right, unclosed_right, 1))

    def test_requires_exactly_one_target_and_rejects_partial_or_different_wiring(self):
        mixture = "Expected one automatic-mixture system/channel"
        closing = "Expected one aircraft flight-control closing tag"
        cases = (
            ("missing mixture channel", FIXTURE.replace(module.CHANNEL, b''), mixture),
            ("duplicate mixture channel", FIXTURE + module.CHANNEL, mixture),
            ("missing mixture system", FIXTURE.replace(module.SYSTEM, b''), mixture),
            ("partial mixture patch", FIXTURE + module.PROPERTY, mixture),
            ("missing flight-control close", FIXTURE.replace(module.FLIGHT_CONTROL_END, b''), closing),
            ("duplicate flight-control close", FIXTURE + module.FLIGHT_CONTROL_END, closing),
            ("unexpected steering component", FIXTURE.replace(module.FLIGHT_CONTROL_END,
             b'<pure_gain name="' + module.STEERING_COMPONENT + b'"/>' + module.FLIGHT_CONTROL_END),
             "Unexpected manual nosewheel steering wiring"),
        )
        for name, value, message in cases:
            with self.subTest(case=name), self.assertRaisesRegex(ValueError, '^' + re.escape(message) + '$'):
                module.patch_xml(value)

    def test_prepare_copies_whole_directory_without_mutating_source_and_records_hashes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source'; source.mkdir()
            (source / 'c172x.xml').write_bytes(FIXTURE)
            (source / 'c172ap.xml').write_bytes(AP_FIXTURE)
            (source / 'copyright.txt').write_bytes(b'unchanged license notice\n')
            (source / 'systems').mkdir(); (source / 'systems' / 'ap.xml').write_bytes(b'unchanged coefficients\n')
            output = root / 'prepared' / 'c172x'; metadata = root / 'manifest.json'
            with patch.object(module, 'SOURCE_XML_SHA256', module.sha256(FIXTURE)), patch.object(module, 'SOURCE_AP_SHA256', module.sha256(AP_FIXTURE)):
                first = module.prepare_aircraft(source, output, metadata)
                second = module.prepare_aircraft(source, output, metadata)
            self.assertEqual(first, second)
            self.assertEqual((source / 'c172x.xml').read_bytes(), FIXTURE)
            self.assertEqual((source / 'c172ap.xml').read_bytes(), AP_FIXTURE)
            self.assertEqual((output / 'c172ap.xml').read_bytes(), module.patch_autopilot(AP_FIXTURE))
            self.assertEqual(first['adapter_id'], 'gefly-c172x-mixture-pitch-ap-v5')
            self.assertEqual(first['ap_source_sha256'], module.sha256(AP_FIXTURE))
            self.assertEqual((output / 'copyright.txt').read_bytes(), b'unchanged license notice\n')
            self.assertEqual((output / 'systems' / 'ap.xml').read_bytes(), b'unchanged coefficients\n')
            self.assertEqual(first['prepared_sha256'], module.sha256((output / 'c172x.xml').read_bytes()))
            self.assertEqual(first['source_sha256'], module.sha256(FIXTURE))
            self.assertEqual(json.loads(metadata.read_text()), first)

    def test_ap_patch_requires_expected_wiring_and_keeps_notice(self):
        changed = module.patch_autopilot(AP_FIXTURE)
        self.assertIn(b'<!-- Synthetic AP notice -->', changed)
        self.assertIn(module.AP_MSL, changed)
        self.assertIn(module.AP_ELEVATOR_GATE, changed)
        self.assertIn(module.AP_GENERIC_PID, changed)
        self.assertNotIn(module.AP_PID, changed)
        # Positive q (nose rising) adds positive elevator (nose down): damping.
        self.assertIn(b'<input> velocities/q-rad_sec </input>\n    <gain> 20.0 </gain>', changed)
        for token in (module.AP_PID, module.AP_AGL, module.AP_HDOT_INPUT, module.AP_ERROR, module.AP_ELEVATOR):
            with self.subTest(token=token), self.assertRaisesRegex(ValueError, r'^Unexpected c172ap\.xml wiring; review adapter$'):
                module.patch_autopilot(AP_FIXTURE.replace(token, b''))

    def test_unknown_source_bytes_are_rejected_before_replacing_existing_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source'; source.mkdir()
            (source / 'c172x.xml').write_bytes(FIXTURE)
            output = root / 'output'; output.mkdir(); sentinel = output / 'keep'; sentinel.write_text('keep')
            with self.assertRaisesRegex(ValueError, r'^Unknown c172x\.xml source bytes; review a new adapter version first$'):
                module.prepare_aircraft(source, output, root / 'manifest.json')
            self.assertEqual(sentinel.read_text(), 'keep')

    def test_rejects_destination_in_source_and_symlink_inputs(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source'; source.mkdir()
            (source / 'c172x.xml').write_bytes(FIXTURE)
            with self.assertRaisesRegex(ValueError, '^Prepared aircraft must be separate from the pinned source$'):
                module.prepare_aircraft(source, source / 'output', root / 'manifest.json')
            with self.assertRaisesRegex(ValueError, '^Prepared aircraft must be separate from the pinned source$'):
                module.prepare_aircraft(source, root, root / 'manifest.json')
            with self.assertRaisesRegex(ValueError, '^Adapter metadata must be separate from the pinned source$'):
                module.prepare_aircraft(source, root / 'output', source / 'manifest.json')
            (source / 'linked').symlink_to(source / 'c172x.xml')
            with self.assertRaisesRegex(ValueError, '^Expected a regular pinned aircraft directory without symlinks$'):
                module.prepare_aircraft(source, root / 'output', root / 'manifest.json')


if __name__ == '__main__':
    unittest.main()
