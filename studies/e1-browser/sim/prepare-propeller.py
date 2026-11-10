#!/usr/bin/env python3
"""Prepare a local-only generic fixed-pitch propeller with windmilling tables.

Reuse David P. Culp's Aero-Matic v1.1 fixed-pitch table multipliers from the
hash-pinned JSBSim source, without executing PHP. Beyond the end of those finite
tables, append rows converted from hash-pinned digitized NACA Report 641
(Hartman and Biermann, 1938) negative thrust/torque coefficients, which cover
windmilling down to the locked propeller. This is a generic research propeller,
not validated C172S/McCauley data. Generated model bytes stay ignored.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import tempfile
import xml.etree.ElementTree as ET

ADAPTER_ID = 'gefly-generic-fixed-pitch-windmilling-v2'
SOURCE_SHA256 = {
    'utils/aeromatic/prop2.php': '658eb2c7a409fe7793514a6e0add07ff6b693b0161ee205379d3606f0117dab6',
    'engine/eng_io320.xml': '0cedc1e356a7a572a175f351a4abb952ba91081219a37dc7192bce3a2181d8c6',
    'engine/prop_75in2f.xml': '6481edf1da940fdea5358913d226c3e25d3e6b8209b4805370258a9a65ca7403',
}
RHO_SLUG_FT3 = 0.002378  # Aero-Matic v1.1 design-point density, not runtime atmosphere.
NEGATIVE_DATA = Path(__file__).with_name('naca-tr641-figure3.json')
NEGATIVE_DATA_SHA256 = 'f39ab7d0adc71b9f275ed836dd64061eb104d1fe8e9e7d7b49d48a4edde7b45e'
# Row spacing for the appended high-advance rows. JSBSim interpolates CT/CP
# linearly in J while CT = Tc*J^2 grows quadratically; a 1.1 geometric step keeps
# that interpolation error below about 0.25 %. This is a table-resolution choice,
# not an aerodynamic coefficient.
EXTENSION_J_RATIO = 1.1
# Last appended row: nD/V = 0.01, inside the source chart's locked-to-zero domain.
# Below the corresponding shaft speed JSBSim clamps to this row (force and torque
# then fall as n^2); a fully stopped propeller still produces no JSBSim force.
EXTENSION_J_MAX = 100.0
# Plausibility bound at each join: relative difference between the last Aero-Matic
# coefficient and the TR-641 value converted at the same J. Both are generic
# estimates of the same windmilling branch; elsewhere in their overlap they differ
# by about 3-15 %. A larger step means the selected curve does not describe a
# compatible propeller (the 15 degree curve would differ by about 47 % in CT).
# This guards the join; it is not fitted to an aircraft or glide outcome.
JOIN_RELATIVE_DIFFERENCE_LIMIT = 0.25
REPOSITORY = Path(__file__).resolve().parents[3]


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


def _curve(points, name: str, angle) -> list[tuple[float, float]]:
    pairs = [(float(x), float(y)) for x, y in points]
    if (len(pairs) < 3 or pairs[0][0] != 0 or any(a[0] >= b[0] for a, b in zip(pairs, pairs[1:]))
            or not all(math.isfinite(v) for pair in pairs for v in pair)):
        raise ValueError(f'Unordered or incomplete {name} curve at {angle} degrees')
    if pairs[-1][1] != 0 or any(value >= 0 for _, value in pairs[:-1]):
        raise ValueError(f'{name} curve at {angle} degrees must be negative up to its final zero crossing')
    return pairs


def negative_curves(data: bytes) -> dict[float, dict[str, list[tuple[float, float]]]]:
    """Validate digitized Tc/Qc(nD/V) curves; reject anything but negative-region data."""
    record = json.loads(data.decode('utf-8'))
    curves = {}
    for curve in record.get('curves', []):
        angle = float(curve['blade_angle_deg'])
        if angle in curves:
            raise ValueError(f'Duplicate blade-angle curve: {angle}')
        curves[angle] = {name: _curve(curve[name], name, angle) for name in ('Tc', 'Qc')}
    if not curves:
        raise ValueError('Expected digitized negative thrust/torque curves')
    return curves


def _interpolate(pairs: list[tuple[float, float]], x: float) -> float:
    if not pairs[0][0] <= x <= pairs[-1][0]:
        raise ValueError('Advance outside the digitized source domain; no extrapolation')
    for (x0, y0), (x1, y1) in zip(pairs, pairs[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    raise ValueError('No interpolation interval')


def _zero_crossing_j(rows: list[tuple[float, float]]) -> float:
    for (j0, c0), (j1, c1) in zip(rows, rows[1:]):
        if c0 > 0 >= c1:
            return j0 + (j1 - j0) * c0 / (c0 - c1)
    raise ValueError('Expected a positive-to-negative coefficient crossing')


def select_negative_curve(curves: dict, power_rows: list[tuple[float, float]]) -> tuple[float, dict]:
    """Pick the source blade angle whose zero-torque advance ratio is nearest the
    existing Aero-Matic zero-power advance ratio, keeping shaft power continuous."""
    target = _zero_crossing_j(power_rows)
    zero_j = {angle: 1 / curve['Qc'][-1][0] for angle, curve in curves.items()}
    angle = min(zero_j, key=lambda a: (abs(zero_j[a] - target), a))
    return angle, {'aeromatic_zero_power_j': target,
                   'source_zero_torque_j': {str(a): j for a, j in sorted(zero_j.items())},
                   'selected_blade_angle_deg_at_0_75R': angle}


def extension_rows(curve: list[tuple[float, float]], last_j: float, power: bool) -> list[tuple[float, float]]:
    """Convert V^2-based Tc/Qc to n^2-based CT = Tc*J^2 and CP = 2*pi*Qc*J^2."""
    if 1 / last_j >= curve[-1][0]:
        raise ValueError('Existing table must end inside the source negative region')
    advance, j = [], last_j
    while j * EXTENSION_J_RATIO < EXTENSION_J_MAX:
        j *= EXTENSION_J_RATIO
        advance.append(j)
    advance.append(EXTENSION_J_MAX)
    factor = 2 * math.pi if power else 1
    return [(j, factor * _interpolate(curve, 1 / j) * j * j) for j in advance]


def model_xml(generator: bytes, engine: bytes, original_propeller: bytes,
              negative_data: bytes) -> tuple[bytes, dict]:
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
    curves = negative_curves(negative_data)
    base = {name: [(j, scale * multiplier) for j, multiplier in multipliers[name]]
            for name, scale in (('C_THRUST', ct0), ('C_POWER', cp0))}
    angle, selection = select_negative_curve(curves, base['C_POWER'])
    extension = {'C_THRUST': extension_rows(curves[angle]['Tc'], base['C_THRUST'][-1][0], False),
                 'C_POWER': extension_rows(curves[angle]['Qc'], base['C_POWER'][-1][0], True)}
    join = {}
    for name, curve, factor in (('C_THRUST', curves[angle]['Tc'], 1.0), ('C_POWER', curves[angle]['Qc'], 2 * math.pi)):
        j, aeromatic = base[name][-1]
        source = factor * _interpolate(curve, 1 / j) * j * j
        join[name] = {'j': j, 'aeromatic': aeromatic, 'tr641': source,
                      'relative_difference': (aeromatic - source) / abs(source)}
        if abs(join[name]['relative_difference']) > JOIN_RELATIVE_DIFFERENCE_LIMIT:
            raise ValueError(f'{name} join differs by more than {JOIN_RELATIVE_DIFFERENCE_LIMIT:.0%} '
                             'between Aero-Matic and the selected TR-641 curve')
    for name in ('C_THRUST', 'C_POWER'):
        if not all(b[1] < a[1] for a, b in zip([base[name][-1]] + extension[name], extension[name])):
            raise ValueError(f'{name} extension must continue the negative windmilling branch monotonically')
        tables = prop.findall(f"table[@name='{name}']")
        if len(tables) != 1 or len(tables[0].findall('tableData')) != 1:
            raise ValueError(f'Expected one active {name} table')
        tables[0].find('tableData').text = '\n' + ''.join(
            f'      {j:.1f}  {value:.4f}\n' for j, value in base[name]) + ''.join(
            f'      {j:.4f}  {value:.4f}\n' for j, value in extension[name]) + '    '
    gearratio = prop.find('gearratio')
    if gearratio is None:
        gearratio = ET.SubElement(prop, 'gearratio')
    gearratio.text = ' 1.0 '
    prop.set('name', 'Generic Aero-Matic fixed-pitch windmilling research propeller')
    notice = (b'<?xml version="1.0"?>\n<!-- Generic research adapter; not validated C172S propeller data.\n'
              b'Fixed-pitch multipliers: Aero-Matic v1.1, July 2003, David P. Culp.\n'
              b'Source: JSBSim v1.3.3 utils/aeromatic/prop2.php; see adapter metadata.\n'
              b'Rows beyond the Aero-Matic tables: NACA Report 641 (Hartman and Biermann, 1938),\n'
              b'figure 3, 2-blade Clark Y, digitized Tc/Qc converted to CT/CP; see adapter metadata.\n'
              b'Adaptation: direct-drive engine design RPM; retained geometry/inertia/Mach corrections.\n'
              b'Generated locally; no real-aircraft glide performance acceptance. -->\n')
    data = notice + ET.tostring(prop, encoding='utf-8') + b'\n'
    inputs = {'engine_max_power_hp': hp, 'engine_design_rpm': rpm, 'propeller_design_rpm': rpm,
              'diameter_in': diameter_in, 'inertia_slug_ft2': 1.67, 'blades': 2,
              'fixed_pitch_deg': 22, 'gear_ratio': 1, 'design_density_slug_ft3': RHO_SLUG_FT3,
              'cp0': cp0, 'ct0': ct0, 'table_decimal_places': 4,
              'negative_region': {**selection, 'extension_j_ratio': EXTENSION_J_RATIO,
                                  'extension_j_max': EXTENSION_J_MAX,
                                  'aeromatic_table_end_j': {name: base[name][-1][0] for name in base},
                                  'appended_rows': {name: len(rows) for name, rows in extension.items()},
                                  'join': join, 'join_relative_difference_limit': JOIN_RELATIVE_DIFFERENCE_LIMIT}}
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


def _recorded_path(path: Path) -> str:
    absolute = path.resolve()
    try:
        return absolute.relative_to(REPOSITORY).as_posix()
    except ValueError:
        return absolute.as_posix()


def prepare_propeller(source: Path, destination: Path, metadata: Path,
                      negative_data: Path = NEGATIVE_DATA) -> dict:
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
    if negative_data.is_symlink() or not negative_data.is_file():
        raise ValueError('Expected the regular digitized negative-region data file')
    negative = negative_data.read_bytes()
    if sha256(negative) != NEGATIVE_DATA_SHA256:
        raise ValueError('Unknown negative-region data bytes; review a new adapter version first')
    prepared, inputs = model_xml(originals['utils/aeromatic/prop2.php'], originals['engine/eng_io320.xml'],
                                 originals['engine/prop_75in2f.xml'], negative)
    result = {'adapter_id': ADAPTER_ID, 'scope': 'generic research fixed-pitch windmilling; not accepted aircraft data',
              'source_jsbsim_commit': '66f7fafc07fe13e7ede9db20873030fed2881713',
              'sources': [{'path': path, 'sha256': sha256(data)} for path, data in sorted(originals.items())],
              'negative_region_source': {'path': _recorded_path(negative_data),
                                         'id': json.loads(negative)['id'], 'sha256': sha256(negative),
                                         'reference': 'NACA Report 641 (1938), figure 3; NTRS 19930091716'},
              'inputs': inputs, 'prepared_sha256': sha256(prepared),
              'adapter_script_sha256': sha256(Path(__file__).read_bytes()),
              'adaptations': ['Direct-drive design RPM replaces Aero-Matic tip-speed/gearbox heuristic',
                              'Retain pinned propeller geometry, inertia and Mach corrections; replace only fixed-pitch CP/CT tables',
                              'Beyond the finite Aero-Matic tables, append NACA TR-641 negative-region rows (CT = Tc*J^2, CP = 2*pi*Qc*J^2) instead of clamping the last coefficient',
                              'Select the NACA blade-angle curve by the Aero-Matic zero-power advance ratio; no extrapolation beyond the digitized locked-to-zero domain',
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
