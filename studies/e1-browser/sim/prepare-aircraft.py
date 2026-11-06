#!/usr/bin/env python3
"""Prepare an ignored c172x copy with switchable mixture, pitch AP, steering and zero-width aileron hysteresis.

The pinned source checkout is never modified; aircraft aerodynamic coefficients remain intact.
Pitch-servo gains are an explicit generic simulator adaptation, not KAP 140 tuning.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ADAPTER_ID = "gefly-c172x-mixture-pitch-ap-v5"
SOURCE_AP_SHA256 = "1e83fec37beabf33e1a1bdd7a30fb5d4aeca79ddb52a2dca58a7bcfc1d20e570"
SOURCE_XML_SHA256 = "b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840"
SYSTEM = b'    <system name="Mixture control">\n'
PROPERTY = b'      <property value="1"> systems/automatic-mixture-enabled </property>\n'
CHANNEL = b'      <channel name="Automatic Mixture Control">\n'
GATED_CHANNEL = b'      <channel name="Automatic Mixture Control" execute="systems/automatic-mixture-enabled">\n'

FLIGHT_CONTROL_END = b'    </flight_control>'
STEERING_COMPONENT = b'fcs/gefly-manual-nosewheel-steering'
# The reused generic Autopilot system writes zero steering even while off.
# Aircraft flight_control channels run after that system: preserve the existing
# manual sign convention every step, without changing source gear geometry.
STEERING_CHANNEL = b"""        <channel name="Gefly manual nosewheel steering">
            <pure_gain name="fcs/gefly-manual-nosewheel-steering">
                <input>fcs/rudder-cmd-norm</input>
                <gain>-1</gain>
                <output>fcs/steer-cmd-norm</output>
            </pure_gain>
        </channel>
"""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# The pinned generic model's aileron backlash retains a signed surface offset
# after a manual command returns to trim. Set only the two aileron hysteresis
# widths to zero; retain source travel/rate limits, scales, mass and aerodynamics.
# These are generic simulator input semantics, not measured C172 rigging values.
AILERON_ACTUATORS = (b"fcs/left-aileron-actuator", b"fcs/right-aileron-actuator")
AILERON_SOURCE_HYSTERESIS = b"              <hysteresis_width> 0.005 </hysteresis_width>\n"
AILERON_ZERO_HYSTERESIS = b"              <hysteresis_width> 0 </hysteresis_width>\n"


def patch_aileron_hysteresis(data: bytes) -> bytes:
    """Set the two named actuator hysteresis widths to zero, preserving other bytes."""
    actuators = []
    for name in AILERON_ACTUATORS:
        opening = b'<actuator name="' + name + b'">'
        if data.count(opening) != 1:
            raise ValueError("Expected one named left and right aileron actuator")
        start = data.index(opening)
        closing = data.find(b"</actuator>", start)
        if closing < 0:
            raise ValueError("Unclosed aileron actuator")
        block = data[start:closing + len(b"</actuator>")]
        if block.count(b"<actuator ") != 1 or block.count(b"<hysteresis_width>") != 1:
            raise ValueError("Unexpected aileron actuator hysteresis wiring")
        original = block.count(AILERON_SOURCE_HYSTERESIS)
        zero_width = block.count(AILERON_ZERO_HYSTERESIS)
        if original + zero_width != 1:
            raise ValueError("Unknown aileron actuator hysteresis value; review adapter")
        actuators.append((block, original))
    if actuators[0][1] != actuators[1][1]:
        raise ValueError("Partially patched aileron hysteresis pair")
    if actuators[0][1]:
        for block, _ in actuators:
            data = data.replace(block, block.replace(AILERON_SOURCE_HYSTERESIS, AILERON_ZERO_HYSTERESIS, 1), 1)
    return data


def patch_xml(data: bytes) -> bytes:
    """Byte-preserving structural patch; production entry also checks the source hash."""
    if data.count(PROPERTY) == 1 and data.count(GATED_CHANNEL) == 1 and data.count(CHANNEL) == 0:
        changed = data
    elif data.count(SYSTEM) == 1 and data.count(CHANNEL) == 1 and PROPERTY not in data and GATED_CHANNEL not in data:
        changed = data.replace(SYSTEM, SYSTEM + PROPERTY, 1).replace(CHANNEL, GATED_CHANNEL, 1)
    else:
        raise ValueError("Expected one automatic-mixture system/channel")
    if changed.count(FLIGHT_CONTROL_END) != 1:
        raise ValueError("Expected one aircraft flight-control closing tag")
    if changed.count(STEERING_COMPONENT):
        if changed.count(STEERING_COMPONENT) != 1 or changed.count(STEERING_CHANNEL + FLIGHT_CONTROL_END) != 1:
            raise ValueError("Unexpected manual nosewheel steering wiring")
    else:
        changed = changed.replace(FLIGHT_CONTROL_END, STEERING_CHANNEL + FLIGHT_CONTROL_END, 1)
    return patch_aileron_hysteresis(changed)


# Generic simulator servo adaptation: stronger VS feedback plus body pitch-rate
# damping addresses observed native climb oscillations. Gains are engineering
# choices covered by a bounded native regression, not sourced KAP 140 hardware
# gains or aircraft-performance validation. VS enters in ft/s; q in rad/s.
AP_AGL = b"<input> -position/h-agl-ft </input>"
AP_MSL = b"<input> -position/h-sl-ft </input>"
AP_HDOT_INPUT = b"<input> fcs/hdot-command </input>"
AP_HDOT_SELECT = b"""<input> ap/gefly-hdot-command </input>"""
AP_HDOT_SWITCH = b"""  <switch name="ap/gefly-hdot-command">
    <default value="fcs/hdot-command"/>
    <test value="ap/gefly-vs-command-fps">ap/gefly-vs-mode eq 1</test>
  </switch>

"""
AP_PID = b"<kp> 0.01 </kp>\n    <ki> 0.00015 </ki>\n    <kd> 0.0003 </kd>"
AP_GENERIC_PID = b"<kp> 0.04 </kp>\n    <ki> 0.0006 </ki>\n    <kd> 0.0012 </kd>"
AP_ERROR = b'  <summer name="fcs/hdot-error">'
AP_ELEVATOR = b"""  <pure_gain name="fcs/elevator">
    <input> fcs/altitude-hold-pid </input>
    <gain> -1.0 </gain>
    <output> ap/elevator_cmd </output>
  </pure_gain>"""
AP_ELEVATOR_GATE = b"""  <pure_gain name="fcs/elevator">
    <input> fcs/altitude-hold-pid </input>
    <gain> -1.0 </gain>
  </pure_gain>
  <!-- Generic simulator pitch-rate damping; norm per rad/s, not KAP tuning. -->
  <pure_gain name="ap/gefly-pitch-rate-damping">
    <input> velocities/q-rad_sec </input>
    <gain> 20.0 </gain>
  </pure_gain>
  <summer name="ap/gefly-pitch-servo">
    <input> fcs/elevator </input>
    <input> ap/gefly-pitch-rate-damping </input>
    <clipto><min>-1.0</min><max>1.0</max></clipto>
  </summer>
  <switch name="ap/elevator_cmd">
    <default value="0.0"/>
    <test value="ap/gefly-pitch-servo">ap/altitude_hold eq 1</test>
  </switch>"""

def patch_autopilot(data: bytes) -> bytes:
    properties = b"  <property> ap/altitude_hold     </property>"
    added_properties = properties + b"\n  <property> ap/gefly-vs-mode </property>\n  <property> ap/gefly-vs-command-fps </property>"
    replacements = ((AP_PID, AP_GENERIC_PID), (properties, added_properties), (AP_AGL, AP_MSL), (AP_HDOT_INPUT, AP_HDOT_SELECT),
                    (AP_ERROR, AP_HDOT_SWITCH + AP_ERROR), (AP_ELEVATOR, AP_ELEVATOR_GATE))
    for before, after in replacements:
        if data.count(before) != 1:
            raise ValueError("Unexpected c172ap.xml wiring; review adapter")
        data = data.replace(before, after, 1)
    return data


def prepare_aircraft(source: Path, destination: Path, metadata: Path) -> dict[str, str]:
    source = source.resolve(strict=True)
    destination = destination.absolute()
    if (destination.is_symlink() or source == destination.resolve()
            or source in destination.resolve().parents or destination.resolve() in source.parents):
        raise ValueError("Prepared aircraft must be separate from the pinned source")
    if metadata.is_symlink() or source == metadata.resolve() or source in metadata.resolve().parents:
        raise ValueError("Adapter metadata must be separate from the pinned source")
    if not source.is_dir() or any(path.is_symlink() for path in source.rglob("*")):
        raise ValueError("Expected a regular pinned aircraft directory without symlinks")
    original = (source / "c172x.xml").read_bytes()
    if sha256(original) != SOURCE_XML_SHA256:
        raise ValueError("Unknown c172x.xml source bytes; review a new adapter version first")
    original_ap = (source / "c172ap.xml").read_bytes()
    if sha256(original_ap) != SOURCE_AP_SHA256:
        raise ValueError("Unknown c172ap.xml source bytes; review a new adapter version first")
    prepared = patch_xml(original)
    prepared_ap = patch_autopilot(original_ap)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".gefly-aircraft-", dir=destination.parent) as temporary:
        staging = Path(temporary) / "c172x"
        shutil.copytree(source, staging)
        (staging / "c172x.xml").write_bytes(prepared)
        (staging / "c172ap.xml").write_bytes(prepared_ap)
        if destination.exists():
            if not destination.is_dir():
                raise ValueError("Prepared aircraft destination is not a directory")
            shutil.rmtree(destination)
        staging.rename(destination)
    result = {
        "adapter_id": ADAPTER_ID,
        "source_path": "aircraft/c172x/c172x.xml",
        "source_sha256": sha256(original),
        "prepared_sha256": sha256(prepared),
        "ap_source_sha256": sha256(original_ap),
        "ap_prepared_sha256": sha256(prepared_ap),
        "adapter_script_sha256": sha256(Path(__file__).read_bytes()),
    }
    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(json.dumps(result, sort_keys=True) + "\n")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("metadata", type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare_aircraft(args.source, args.destination, args.metadata), sort_keys=True))


if __name__ == "__main__":
    main()
