# SPDX-License-Identifier: GPL-3.0-or-later
"""Component mass properties in SI, expressed in one common body frame.

Axes: x forward, y right, z down. Each component's inertia tensor is about
its own CG, already resolved along these axes. Tensor off-diagonal entries
are -integral(x*y dm), etc.; these are NOT JSBSim XML products of inertia.
No aircraft values, frame rotations, or JSBSim sign adaptation are supplied.

Tensor symmetry and physical realizability use a relative roundoff allowance
of 1e-12 after scaling by the largest absolute entry. Realizability means
C = trace(I)/2 * identity - I is positive semidefinite: its eigenvalues
must be nonnegative (symmetric Jacobi diagonalization). This includes point masses and planar/linear bodies.
"""

from __future__ import annotations

import math


_FIELDS = {"id", "mass_kg", "cg_m", "inertia_cg_kg_m2"}
_TENSOR_TOLERANCE = 1e-12


def _number(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name}: expected a finite number")
    try:
        result = float(value)
    except (OverflowError, ValueError):
        raise ValueError(f"{name}: expected a finite number") from None
    if not math.isfinite(result):
        raise ValueError(f"{name}: expected a finite number")
    return result


def _sum(values, name):
    try:
        result = math.fsum(values)
    except (OverflowError, ValueError):
        raise ValueError(f"{name}: non-finite arithmetic result") from None
    if not math.isfinite(result):
        raise ValueError(f"{name}: non-finite arithmetic result")
    return result


def _tensor(value, name):
    if not isinstance(value, list) or len(value) != 3 or any(
            not isinstance(row, list) or len(row) != 3 for row in value):
        raise ValueError(f"{name}: expected a 3 by 3 tensor")
    matrix = [[_number(item, f"{name}[{i}][{j}]") for j, item in enumerate(row)]
              for i, row in enumerate(value)]
    scale = max(abs(item) for row in matrix for item in row)
    if scale == 0:
        return matrix
    normalized = [[item / scale for item in row] for row in matrix]
    for i in range(3):
        for j in range(i):
            if abs(normalized[i][j] - normalized[j][i]) > _TENSOR_TOLERANCE:
                raise ValueError(f"{name}: tensor must be symmetric")
            mean = (normalized[i][j] + normalized[j][i]) / 2
            normalized[i][j] = normalized[j][i] = mean
            # Divide before adding, avoiding overflow for finite inputs.
            matrix[i][j] = matrix[j][i] = matrix[i][j] / 2 + matrix[j][i] / 2
    half_trace = _sum((normalized[i][i] / 2 for i in range(3)), name)
    second = [[(half_trace if i == j else 0.0) - normalized[i][j]
               for j in range(3)] for i in range(3)]
    # Diagonalize the symmetric second-moment matrix. Checking principal minors
    # with an absolute tolerance would hide negative eigenvalues near a singular
    # matrix (e.g. a small off-diagonal term between two zero diagonal entries).
    for _ in range(32):
        p, q = max(((i, j) for i in range(3) for j in range(i)),
                   key=lambda pair: abs(second[pair[0]][pair[1]]))
        if abs(second[p][q]) <= 1e-15:
            break
        angle = 0.5 * math.atan2(2 * second[p][q], second[q][q] - second[p][p])
        cosine, sine = math.cos(angle), math.sin(angle)
        pp, qq, pq = second[p][p], second[q][q], second[p][q]
        second[p][p] = cosine**2 * pp - 2 * cosine * sine * pq + sine**2 * qq
        second[q][q] = sine**2 * pp + 2 * cosine * sine * pq + cosine**2 * qq
        second[p][q] = second[q][p] = 0.0
        for k in range(3):
            if k not in (p, q):
                kp, kq = second[k][p], second[k][q]
                second[k][p] = second[p][k] = cosine * kp - sine * kq
                second[k][q] = second[q][k] = sine * kp + cosine * kq
    if any(second[i][i] < -_TENSOR_TOLERANCE for i in range(3)):
        raise ValueError(f"{name}: tensor is not physically realizable")
    return matrix


def calculate_mass_properties(components):
    """Return total mass, CG and inertia about total CG for validated components.

    ``components`` is a nonempty list of dictionaries with exactly: unique
    nonempty ``id``, positive ``mass_kg``, three-entry ``cg_m`` list, and
    ``inertia_cg_kg_m2`` 3x3 list. Input is never modified. Invalid input or
    non-finite intermediate/output arithmetic raises ValueError.
    """
    if not isinstance(components, list) or not components:
        raise ValueError("components: expected a nonempty list")
    records = []
    identifiers = set()
    for index, component in enumerate(components):
        name = f"components[{index}]"
        if not isinstance(component, dict) or set(component) != _FIELDS:
            raise ValueError(f"{name}: expected exactly {sorted(_FIELDS)}")
        identifier = component["id"]
        if not isinstance(identifier, str) or not identifier.strip():
            raise ValueError(f"{name}.id: expected a nonempty string")
        if identifier in identifiers:
            raise ValueError(f"{name}.id: duplicate identifier {identifier!r}")
        identifiers.add(identifier)
        mass = _number(component["mass_kg"], f"{name}.mass_kg")
        if mass <= 0:
            raise ValueError(f"{name}.mass_kg: must be positive")
        cg = component["cg_m"]
        if not isinstance(cg, list) or len(cg) != 3:
            raise ValueError(f"{name}.cg_m: expected three coordinates")
        cg = [_number(item, f"{name}.cg_m[{i}]") for i, item in enumerate(cg)]
        inertia = _tensor(component["inertia_cg_kg_m2"], f"{name}.inertia_cg_kg_m2")
        records.append((mass, cg, inertia))
    total_mass = _sum((record[0] for record in records), "mass_kg")
    # Use the largest component's CG as origin. A small, distant first component
    # would make the weighted offsets cancel a large reference coordinate and
    # lose the contribution of that small mass. Break mass ties by distance to
    # the coordinate origin (max norm), then coordinates, deterministically.
    # Coincident bodies also avoid spurious offsets at large absolute positions;
    # mass fractions avoid overflow from mass*position.
    reference_cg = max(records, key=lambda record: (
        record[0], -max(abs(value) for value in record[1]), tuple(record[1])))[1]
    total_cg = []
    for i in range(3):
        weighted_offsets = [mass / total_mass * _number(cg[i] - reference_cg[i],
                                                       "CG offset")
                            for mass, cg, _ in records]
        total_cg.append(_sum([reference_cg[i], *weighted_offsets], f"cg_m[{i}]"))
    terms = [[[] for _ in range(3)] for _ in range(3)]
    for mass, cg, inertia in records:
        offset = [_number(cg[i] - total_cg[i], "CG offset") for i in range(3)]
        for i in range(3):
            for j in range(3):
                # Parallel-axis theorem: I_total = I_component + m*(r² E - rrT).
                # For diagonal entries sum the other two squares directly;
                # subtracting r²-r_i² would lose precision for elongated bodies.
                if i == j:
                    shift = _sum((mass * offset[k] * offset[k] for k in range(3)
                                  if k != i), "parallel-axis shift")
                else:
                    shift = _number(-mass * offset[i] * offset[j], "parallel-axis shift")
                terms[i][j].extend((inertia[i][j], shift))
    total_inertia = [[_sum(terms[i][j], f"inertia_cg_kg_m2[{i}][{j}]")
                      for j in range(3)] for i in range(3)]
    total_inertia = _tensor(total_inertia, "inertia_cg_kg_m2")
    return {"mass_kg": total_mass, "cg_m": total_cg,
            "inertia_cg_kg_m2": total_inertia}
