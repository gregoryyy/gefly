#!/usr/bin/env python3
"""Prepare a local-only generic fixed-pitch propeller with windmilling tables.

Reuse David P. Culp's Aero-Matic v1.1 fixed-pitch table multipliers from the
hash-pinned JSBSim source, without executing PHP. This is a generic research
propeller, not validated C172S/McCauley data. Generated model bytes stay ignored.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import tempfile
import xml.etree.ElementTree as ET

ADAPTER_ID = 'gefly-generic-fixed-pitch-windmilling-v1'
SOURCE_SHA256 = {
    'utils/aeromatic/prop2.php': '658eb2c7a409fe7793514a6e0add07ff6b693b0161ee205379d3606f0117dab6',
    'engine/eng_io320.xml': '0cedc1e356a7a572a175f351a4abb952ba91081219a37dc7192bce3a2181d8c6',
    'engine/prop_75in2f.xml': '6481edf1da940fdea5358913d226c3e25d3e6b8209b4805370258a9a65ca7403',
}
RHO_SLUG_FT3 = 0.002378  # Aero-Matic v1.1 design-point density, not runtime atmosphere.


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fixed_pitch_multipliers(generator: bytes) -> dict[str, list[tuple[float, float]]]:
    """Read only the two fixed-pitch branches, never evaluate source as code."""
    text = generator.decode('utf-8')
    branches = re.findall(r'if\(\$ac_pitch == 0\) \{\s*// fixed pitch\s*(.*?)\}\s*else', text, re.S)
    if len(branches) != 2:
        raise ValueError('Expected exactly two Aero-Matic fixed-pitch table branches')
    result = {}
    row = re.compile(r'printf\("\s*([0-9]+\.[0-9]+)\s+%5\.4f\\n",\s*\$(ct0|cp0)\s*\*\s*(-?[0-9]+\.[0-9]+)\);')
    for branch, name, coefficient in zip(branches, ('C_THRUST', 'C_POWER'), ('ct0', 'cp0')):
        if f'name=\\"{name}\\"' not in branch:
            raise ValueError(f'Expected fixed-pitch {name} table')
        rows = row.findall(branch)
        if len(rows) < 3 or any(variable != coefficient for _, variable, _ in rows):
            raise ValueError(f'Unexpected fixed-pitch {name} multiplier rows')
        pairs = [(float(j), float(multiplier)) for j, _, multiplier in rows]
        if pairs[0][0] != 0 or any(a[0] >= b[0] for a, b in zip(pairs, pairs[1:])):
            raise ValueError(f'Unordered fixed-pitch {name} advance ratios')
        if pairs[0][1] <= 0 or pairs[-1][1] >= 0:
            raise ValueError(f'{name} must cover positive powered and negative windmilling coefficients')
        result[name] = pairs
    return result


def model_xml(generator: bytes, engine: bytes, original_propeller: bytes) -> tuple[bytes, dict]:
    """Use direct-drive design RPM; preserve existing geometry/inertia/Mach tables."""
    engine_xml = ET.fromstring(engine)
    parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))
    prop = ET.fromstring(original_propeller, parser=parser)
    if engine_xml.tag != 'piston_engine' or prop.tag != 'propeller':
        raise ValueError('Expected piston engine and propeller XML')
    hp, rpm = (float(engine_xml.findtext(tag, 'nan')) for tag in ('maxhp', 'maxrpm'))
    diameter_in = float(prop.findtext('diameter', 'nan'))
    if (hp != 160 or rpm != 2700 or diameter_in != 75 or prop.find('diameter').get('unit') != 'IN'
            or float(prop.findtext('ixx', 'nan')) != 1.67 or int(prop.findtext('numblades', '0')) != 2
            or float(prop.findtext('minpitch', 'nan')) != 22 or float(prop.findtext('maxpitch', 'nan')) != 22):
        raise ValueError('Unexpected pinned direct-drive engine/propeller geometry')
    multipliers = fixed_pitch_multipliers(generator)
    diameter_ft = diameter_in / 12
    cp0 = hp * 550 / (RHO_SLUG_FT3 * (rpm / 60) ** 3 * diameter_ft ** 5)
    ct0 = cp0 * 1.4
    for name, scale in (('C_THRUST', ct0), ('C_POWER', cp0)):
        tables = prop.findall(f"table[@name='{name}']")
        if len(tables) != 1 or len(tables[0].findall('tableData')) != 1:
            raise ValueError(f'Expected one active {name} table')
        tables[0].find('tableData').text = '\n' + ''.join(
            f'      {j:.1f}  {scale * multiplier:.4f}\n' for j, multiplier in multipliers[name]) + '    '
    gearratio = prop.find('gearratio')
    if gearratio is None:
        gearratio = ET.SubElement(prop, 'gearratio')
    gearratio.text = ' 1.0 '
    prop.set('name', 'Generic Aero-Matic fixed-pitch windmilling research propeller')
    notice = (b'<?xml version="1.0"?>\n<!-- Generic research adapter; not validated C172S propeller data.\n'
              b'Fixed-pitch multipliers: Aero-Matic v1.1, July 2003, David P. Culp.\n'
              b'Source: JSBSim v1.3.3 utils/aeromatic/prop2.php; see adapter metadata.\n'
              b'Adaptation: direct-drive engine design RPM; retained geometry/inertia/Mach corrections.\n'
              b'Generated locally; no real-aircraft glide performance acceptance. -->\n')
    data = notice + ET.tostring(prop, encoding='utf-8') + b'\n'
    inputs = {'engine_max_power_hp': hp, 'engine_design_rpm': rpm, 'propeller_design_rpm': rpm,
              'diameter_in': diameter_in, 'inertia_slug_ft2': 1.67, 'blades': 2,
              'fixed_pitch_deg': 22, 'gear_ratio': 1, 'design_density_slug_ft3': RHO_SLUG_FT3,
              'cp0': cp0, 'ct0': ct0, 'table_decimal_places': 4}
    return data, inputs


def _checked_output(source: Path, path: Path) -> Path:
    absolute = path.absolute()
    resolved = absolute.resolve()
    if (absolute.is_symlink() or resolved == source or source in resolved.parents
            or resolved in source.parents or (absolute.exists() and not absolute.is_file())):
        raise ValueError('Output must be a regular file separate from the pinned source')
    return absolute


def _atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix='.gefly-propeller-', dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(data)
            stream.flush()
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def prepare_propeller(source: Path, destination: Path, metadata: Path) -> dict:
    if source.is_symlink() or not source.is_dir():
        raise ValueError('Expected a regular pinned JSBSim source directory')
    source = source.resolve(strict=True)
    destination, metadata = (_checked_output(source, path) for path in (destination, metadata))
    if (destination.resolve() == metadata.resolve() or destination.resolve() in metadata.resolve().parents
            or metadata.resolve() in destination.resolve().parents):
        raise ValueError('Propeller and metadata outputs must be separate, non-overlapping files')
    originals = {}
    for relative, expected in SOURCE_SHA256.items():
        path = source / relative
        if any(part.is_symlink() for part in (path, *path.parents) if part != source and source in part.parents):
            raise ValueError(f'Symlink source rejected: {relative}')
        if not path.is_file():
            raise ValueError(f'Expected regular source file: {relative}')
        data = path.read_bytes()
        if sha256(data) != expected:
            raise ValueError(f'Unknown source bytes: {relative}; review a new adapter version first')
        originals[relative] = data
    prepared, inputs = model_xml(originals['utils/aeromatic/prop2.php'], originals['engine/eng_io320.xml'], originals['engine/prop_75in2f.xml'])
    result = {'adapter_id': ADAPTER_ID, 'scope': 'generic research fixed-pitch windmilling; not accepted aircraft data',
              'source_jsbsim_commit': '66f7fafc07fe13e7ede9db20873030fed2881713',
              'sources': [{'path': path, 'sha256': sha256(data)} for path, data in sorted(originals.items())],
              'inputs': inputs, 'prepared_sha256': sha256(prepared),
              'adapter_script_sha256': sha256(Path(__file__).read_bytes()),
              'adaptations': ['Direct-drive design RPM replaces Aero-Matic tip-speed/gearbox heuristic',
                              'Retain pinned propeller geometry, inertia and Mach corrections; replace only fixed-pitch CP/CT tables',
                              'No tuning to a C172 glide ratio or aircraft-specific reference curve']}
    metadata_data = (json.dumps(result, sort_keys=True) + '\n').encode('utf-8')
    _atomic_write(destination, prepared)
    _atomic_write(metadata, metadata_data)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('metadata', type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare_propeller(args.source, args.destination, args.metadata), sort_keys=True))


if __name__ == '__main__':
    main()
