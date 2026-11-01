# E2 mass and inertia preparation

This study provides a standard-library component build-up calculation for the
[172S model plan](../../docs/design/FDM-172S.md), §1.3. It is **calculation groundwork,
not a Cessna 172S model or M-a acceptance**. The examples and reference tests use
synthetic masses. No aircraft mass, geometry, inertia, aerodynamic coefficient or
source-derived parameter is supplied here.

The scope supports the explicit units, frames and evidence boundaries of
[SPEC](../../docs/SPEC.md) R-AIR-1, R-DATA-2 and R-SIM-5. It does not establish
simulator fidelity or training credit.

## Calculation contract

`mass_properties.calculate_mass_properties(components)` accepts a nonempty list
of components. Each component has exactly these fields:

| Field | Meaning |
| --- | --- |
| `id` | Nonempty, unique component identifier. |
| `mass_kg` | Positive finite mass in kilograms. |
| `cg_m` | Three finite position coordinates in metres, from a common calculation reference. |
| `inertia_cg_kg_m2` | Symmetric, physically realizable 3×3 inertia tensor about that component's own CG, in kg·m². Zero tensors represent point masses. |

All vectors and tensors use the same axis orientation: x forward, y right and z
down. A component tensor must already be expressed in these axes; the tool does
not rotate tensors or infer component orientations. The common calculation
reference may be chosen arbitrarily, but must be the same for every component.
The result is total `mass_kg`, combined `cg_m` relative to that reference, and
`inertia_cg_kg_m2` about the combined CG, using the parallel-axis theorem.

The CLI calls this orientation `frame: "body"`. This is **not** the serialization
of an aircraft's mass items in [CONTRACTS §1](../../docs/design/CONTRACTS.md): that
contract stores mass items in the structural frame (x aft, y right, z up), and its
runtime body frame has its origin at the current CG. Convert structural positions
and tensors explicitly at a future loader boundary; do not pass structural
coordinates directly to this calculation.

Tensor off-diagonal entries are **negative products of inertia**: for example,
`Ixy = −∫xy dm`. They are not the positive product `∫xy dm`. No JSBSim XML or
`Ixz` conversion is provided. The model plan requires checking JSBSim 1.3.3's
`negated_crossproduct_inertia` behavior and verifying it with an off-axis-torque
fixture before that boundary is implemented.

The calculation rejects invalid shapes, non-finite numbers, nonpositive masses,
duplicate identifiers, asymmetric tensors, physically impossible tensors and
non-finite results. Tensor symmetry and realizability checks allow relative
roundoff of 1e-12 after scaling by the largest absolute tensor entry;
near-symmetric entries are averaged. It does not certify that a valid input describes an aircraft
or that its values have acceptable provenance.

## Synthetic example and command

From the repository root, save this input outside the tracked source tree, for
example as `output/e2-point-masses.json` after creating `output/`:

```json
{
  "schema_version": "1.0.0",
  "frame": "body",
  "components": [
    {
      "id": "left",
      "mass_kg": 1,
      "cg_m": [-1, 0, 0],
      "inertia_cg_kg_m2": [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    },
    {
      "id": "right",
      "mass_kg": 1,
      "cg_m": [1, 0, 0],
      "inertia_cg_kg_m2": [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    }
  ]
}
```

```sh
python3 studies/e2-c172s/build_mass_properties.py output/e2-point-masses.json
python3 -m unittest discover -s studies/e2-c172s -v
```

The expected result is a 2 kg mass, CG `[0, 0, 0]` m, and inertia tensor
`[[0, 0, 0], [0, 2, 0], [0, 0, 2]]` kg·m². These are invented point masses for
checking arithmetic, not aircraft inputs.

The CLI reads one JSON file and writes a JSON result to stdout; invalid input
produces a nonzero exit and a diagnostic on stderr. Its input envelope has exactly
`schema_version`, `frame` and `components`; duplicate keys, nonstandard numeric
constants and unexpected fields are errors. The output includes the SHA-256 of
the raw input bytes, frame and tensor conventions, the calculation result and an
explicit unvalidated-input status. That hash identifies the exact input file; it
is not a source-rights record, model-package hash or validation approval.

## Remaining aircraft work

The model plan's M-a exit criteria remain open: representative empty mass and CG,
a cited component distribution, geometry and vertical datum, propeller mass and
inertia, station/load checks, gear and ground-roll behavior, provenance coverage
and JSBSim sign fixtures. Real inputs must satisfy the
[aircraft manifest's provenance rules](../../data/aircraft/c172s-classic/README.md)
and the model plan before being used as an aircraft claim. A completed arithmetic
test alone cannot close any of those evidence gaps.
