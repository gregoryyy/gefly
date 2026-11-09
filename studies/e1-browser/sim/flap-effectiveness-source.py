#!/usr/bin/env python3
"""Read the exact reconstructed v5 model's flap contributions; no model changes.

Normalized static source-function arithmetic is distinct from measured native
forces or real-aircraft flap calibration. Dynamic/elevator/ground-effect terms
and force-to-CG moment-arm coupling are not reconstructed here.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[2] / 'output/flight/flap-effectiveness'
EXPECTED_WASM = '266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc'
EXPECTED_XML = 'cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def interpolate(points, value):
    if len(points) < 2 or not all(a[0] < b[0] for a, b in zip(points, points[1:])):
        raise ValueError('Expected strictly ordered interpolation source points')
    if not math.isfinite(value):
        raise ValueError('Expected finite interpolation input')
    if value <= points[0][0]:
        return points[0][1]
    if value >= points[-1][0]:
        return points[-1][1]
    for (lower, a), (upper, b) in zip(points, points[1:]):
        if lower <= value <= upper:
            return a + (b - a) * (value - lower) / (upper - lower)
    raise ValueError('No interpolation interval')


def rows(element):
    result = [[float(value) for value in line.split()] for line in element.text.strip().splitlines() if line.strip()]
    if not all(math.isfinite(value) for row in result for value in row):
        raise ValueError('Nonfinite source table')
    return result


def table_2d(element, row, column):
    data = rows(element)
    columns = data[0]
    if not all(len(line) == len(columns) + 1 for line in data[1:]):
        raise ValueError('Invalid two-dimensional table shape')
    return interpolate([(line[0], interpolate(list(zip(columns, line[1:])), column)) for line in data[1:]], row)


def reconstruct():
    build = json.loads((HERE / 'dist/build-info.json').read_text())
    if sha((HERE / 'dist/jsbsim.wasm').read_bytes()) != EXPECTED_WASM or build['wasm_sha256'] != EXPECTED_WASM:
        raise ValueError('Expected current installed v5 WASM')
    adapter_path = HERE / 'prepare-aircraft.py'
    source_path = HERE / '.work/jsbsim-1.3.3/aircraft/c172x/c172x.xml'
    original = source_path.read_bytes()
    if sha(adapter_path.read_bytes()) != build['aircraft_adapter']['adapter_script_sha256'] or sha(original) != build['aircraft_adapter']['source_sha256']:
        raise ValueError('Adapter/source do not match executing build metadata')
    spec = importlib.util.spec_from_file_location('flap_source_v5_adapter', adapter_path)
    adapter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(adapter)
    prepared = adapter.patch_xml(original)
    if sha(prepared) != EXPECTED_XML or build['aircraft_adapter']['prepared_sha256'] != EXPECTED_XML:
        raise ValueError('Reconstructed aircraft does not match installed v5')
    return build, prepared, original


def audit(prepared):
    root = ET.fromstring(prepared)
    functions = {item.attrib['name'].split('/')[-1]: item for item in root.findall('aerodynamics/axis/function')}
    one = {name: [tuple(row) for row in rows(functions[name].find('product/table/tableData'))] for name in ('CLDf', 'CDDf', 'CmDf')}
    legacy = functions['CLwbh'].find('product/table/tableData')
    slope_blocks = sorted((float(block.attrib['breakPoint']), block) for block in functions['CLalpha'].findall('product/table/tableData'))
    drag = functions['CDwbh'].find('product/table/tableData')
    cdo = float(functions['CDo'].find('product/value').text)
    for name in one:
        assert functions[name].find('product/table/independentVar').text == 'fcs/flap-pos-deg'
    assert one['CLDf'] == [(0, 0), (10, .25), (20, .30), (30, .35)]
    assert one['CDDf'] == [(0, 0), (10, .007), (20, .012), (30, .018)]
    assert one['CmDf'] == [(0, 0), (10, -.03), (20, -.05), (30, -.06)]
    samples = []
    for alpha_deg in (0, 5, 10, 15):
        alpha_rad = math.radians(alpha_deg)
        for flap_deg in (0, 10, 20, 30):
            slope = interpolate([(flap, table_2d(block, alpha_deg, 0)) for flap, block in slope_blocks], flap_deg)
            clwbh = table_2d(legacy, alpha_rad, 0)
            clalpha = alpha_rad * slope
            cldf = interpolate(one['CLDf'], flap_deg)
            cddf = interpolate(one['CDDf'], flap_deg)
            cdwbh = table_2d(drag, alpha_rad, flap_deg)
            cmdf = interpolate(one['CmDf'], flap_deg)
            samples.append({'alpha_deg': alpha_deg, 'flap_deg': flap_deg, 'CLwbh': clwbh, 'CLalpha': clalpha, 'CLDf': cldf,
                            'static_lift_subset_CL': clwbh + clalpha + cldf, 'CDo': cdo, 'CDDf': cddf, 'CDwbh': cdwbh,
                            'static_drag_subset_CD': cdo + cddf + cdwbh, 'direct_CmDf': cmdf})
    for row in samples:
        baseline = next(item for item in samples if item['alpha_deg'] == row['alpha_deg'] and item['flap_deg'] == 0)
        row['delta_vs_clean'] = {field: row[field] - baseline[field] for field in ('static_lift_subset_CL', 'static_drag_subset_CD', 'direct_CmDf')}
        if row['flap_deg']:
            assert row['delta_vs_clean']['static_lift_subset_CL'] > 0
            assert row['delta_vs_clean']['static_drag_subset_CD'] > 0
            assert row['direct_CmDf'] < 0
    channel = root.find("flight_control/channel[@name='Flaps']")
    traverse = [{'degrees': float(item.find('position').text), 'transition_s': float(item.find('time').text)} for item in channel.findall('kinematic/traverse/setting')]
    return {'assumptions': {'beta_deg': 0, 'stall_hysteresis': 0, 'ground_effect_factor': 1, 'elevator_and_rates': 0,
                            'moment': 'CmDf direct source term only; not total pitching moment/force-CG coupling'},
            'flap_tables': one, 'traverse': traverse, 'active_axes': {axis.attrib['name']: [item.attrib['name'] for item in axis.findall('function')] for axis in root.findall('aerodynamics/axis')}, 'samples': samples}


def main():
    build, prepared, original = reconstruct()
    report = audit(prepared)
    mutable_prepared = HERE / '.work/prepared-aircraft/c172x/c172x.xml'
    report.update({'scope': __doc__.strip(), 'source': {'jsbsim_commit': build['jsbsim_commit'], 'wasm_sha256': EXPECTED_WASM,
        'reconstructed_prepared_sha256': sha(prepared), 'original_xml_sha256': sha(original), 'adapter_script_sha256': build['aircraft_adapter']['adapter_script_sha256'],
        'diagnostic_sha256': sha(Path(__file__).read_bytes()), 'mutable_prepared_excluded_sha256': sha(mutable_prepared.read_bytes()) if mutable_prepared.exists() else None,
        'model_url': f"https://github.com/JSBSim-Team/jsbsim/blob/{build['jsbsim_commit']}/aircraft/c172x/c172x.xml"}})
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'executing-v5-aircraft.xml').write_bytes(prepared)
    (OUTPUT / 'source.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'source': report['source'], 'tables': report['flap_tables'], 'matched_source_samples': report['samples']}, indent=2))


if __name__ == '__main__':
    main()
