#!/usr/bin/env python3
"""TODO2.0.133: inspect the existing model's active static lift contributions.

Source-table arithmetic only, not a replacement dynamics model or aircraft polar.
Excludes elevator/rate terms, ground effect, hysteresis, thrust and body-axis
transforms. Neither a calculated maximum nor a stall-speed acceptance is claimed.
"""
from pathlib import Path
import hashlib
import json
import math
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
path = HERE / '.work/prepared-aircraft/c172x/c172x.xml'
raw = path.read_bytes()
root = ET.fromstring(raw)
axis = root.find("aerodynamics/axis[@name='LIFT']")
assert axis is not None
functions = {item.attrib['name']: item for item in axis.findall('function')}
legacy = functions['aero/coefficient/CLwbh'].find('product/table/tableData')
alpha = functions['aero/coefficient/CLalpha'].find('product/table')
flap = functions['aero/coefficient/CLDf'].find('product/table/tableData')
assert legacy is not None and alpha is not None and flap is not None

def interpolate(points, x):
    """FGTable-style endpoint clamping and linear interpolation on one axis."""
    assert all(a[0] < b[0] for a, b in zip(points, points[1:]))
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    for (a, va), (b, vb) in zip(points, points[1:]):
        if a <= x <= b:
            return va + (vb - va) * (x - a) / (b - a)
    raise ValueError('unreachable interpolation interval')

def rows(element):
    return [[float(x) for x in line.split()] for line in element.text.strip().splitlines() if line.strip()]

def two_dimensional(element, row, column):
    data = rows(element)
    columns = data[0]
    assert all(len(values) == len(columns) + 1 for values in data[1:])
    return interpolate([(values[0], interpolate(list(zip(columns, values[1:])), column)) for values in data[1:]], row)

flap_points = [tuple(row) for row in rows(flap)]
assert all(len(row) == 2 for row in flap_points)
blocks = sorted((float(block.attrib['breakPoint']), block) for block in alpha.findall('tableData'))
assert len(blocks) == 7
samples = []
for flap_deg in (0, 10, 20, 30):
    for alpha_rad in (.05, .1, .2, .238, .28, .34, .36):
        cl_legacy = two_dimensional(legacy, alpha_rad, 0)
        slope = interpolate([(angle, two_dimensional(block, math.degrees(alpha_rad), 0)) for angle, block in blocks], flap_deg)
        cl_added = alpha_rad * slope
        cl_flap = interpolate(flap_points, flap_deg)
        samples.append(dict(alpha_rad=alpha_rad, flap_deg=flap_deg,
                            legacy_alpha_component=cl_legacy,
                            additional_alpha_component=cl_added,
                            flap_delta_component=cl_flap,
                            static_component_sum=cl_legacy + cl_added + cl_flap))
# Independent source-point checks: zero-beta clean 10-degree row and flap endpoints.
clean = dict(blocks)[0]
assert two_dimensional(clean, 0, 0) == 4.657724
assert two_dimensional(clean, 10, 0) == 4.271521
assert interpolate(flap_points, 0) == 0 and interpolate(flap_points, 30) == .35
result = dict(scope=__doc__.strip(), assumptions=dict(beta_deg=0, hysteresis_norm=0, ground_effect_factor=1),
              diagnostic_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              model_sha256=hashlib.sha256(raw).hexdigest(),
              source_runtime='FGAerodynamics loads and sums every active function child of each axis; see pinned source lines186-196 and371-388.',
              active_lift_functions=list(functions), samples=samples)
output = HERE.parents[2] / 'output/flight/c172-lift-task133.json'
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
