#!/usr/bin/env python3
"""Prepare an ignored c172x copy with a switchable upstream automatic-mixture channel.

Only a default-on property and its channel execute attribute are added. The pinned
source checkout is never modified and no aerodynamic/engine/AP coefficient changes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ADAPTER_ID = "gefly-c172x-manual-mixture-v1"
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
    prepared = patch_xml(original)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".gefly-aircraft-", dir=destination.parent) as temporary:
        staging = Path(temporary) / "c172x"
        shutil.copytree(source, staging)
        (staging / "c172x.xml").write_bytes(prepared)
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
