#!/usr/bin/env python3
"""Prepare an ignored c172x copy with switchable mixture and pitch AP wiring.

The pinned source checkout is never modified; upstream coefficients remain intact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ADAPTER_ID = "gefly-c172x-mixture-pitch-ap-v2"
SOURCE_AP_SHA256 = "1e83fec37beabf33e1a1bdd7a30fb5d4aeca79ddb52a2dca58a7bcfc1d20e570"
SOURCE_XML_SHA256 = "b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840"
SYSTEM = b'    <system name="Mixture control">\n'
PROPERTY = b'      <property value="1"> systems/automatic-mixture-enabled </property>\n'
CHANNEL = b'      <channel name="Automatic Mixture Control">\n'
GATED_CHANNEL = b'      <channel name="Automatic Mixture Control" execute="systems/automatic-mixture-enabled">\n'


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def patch_xml(data: bytes) -> bytes:
    """Byte-preserving structural patch; production entry also checks the source hash."""
    if data.count(PROPERTY) == 1 and data.count(GATED_CHANNEL) == 1 and data.count(CHANNEL) == 0:
        return data
    if data.count(SYSTEM) != 1 or data.count(CHANNEL) != 1 or PROPERTY in data or GATED_CHANNEL in data:
        raise ValueError("Expected one unmodified automatic-mixture system/channel")
    return data.replace(SYSTEM, SYSTEM + PROPERTY, 1).replace(CHANNEL, GATED_CHANNEL, 1)


# Retain upstream PID coefficients; change only sensor/command selection and
# final output gating. VS is provided in the upstream controller's ft/s.
AP_AGL = b"<input> -position/h-agl-ft </input>"
AP_MSL = b"<input> -position/h-sl-ft </input>"
AP_HDOT_INPUT = b"<input> fcs/hdot-command </input>"
AP_HDOT_SELECT = b"""<input> ap/gefly-hdot-command </input>"""
AP_HDOT_SWITCH = b"""  <switch name="ap/gefly-hdot-command">
    <default value="fcs/hdot-command"/>
    <test value="ap/gefly-vs-command-fps">ap/gefly-vs-mode eq 1</test>
  </switch>

"""
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
  <switch name="ap/elevator_cmd">
    <default value="0.0"/>
    <test value="fcs/elevator">ap/altitude_hold eq 1</test>
  </switch>"""

def patch_autopilot(data: bytes) -> bytes:
    properties = b"  <property> ap/altitude_hold     </property>"
    added_properties = properties + b"\n  <property> ap/gefly-vs-mode </property>\n  <property> ap/gefly-vs-command-fps </property>"
    replacements = ((properties, added_properties), (AP_AGL, AP_MSL), (AP_HDOT_INPUT, AP_HDOT_SELECT),
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
