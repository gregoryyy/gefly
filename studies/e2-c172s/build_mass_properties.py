#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Build SI mass properties from a body-frame component JSON document.

This study tool does not establish aircraft data provenance or validation, and
does not convert body tensors to JSBSim structural axes or XML conventions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

from mass_properties import calculate_mass_properties


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON object key")
        result[key] = value
    return result


def _reject_constant(value):
    raise ValueError("non-finite JSON number is not allowed")


def build_document(raw: bytes) -> dict:
    """Parse strict UTF-8 JSON, calculate, and bind the result to its raw input."""
    document = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object,
                          parse_constant=_reject_constant)
    if not isinstance(document, dict):
        raise ValueError("input must be a JSON object")
    if set(document) != {"schema_version", "frame", "components"}:
        raise ValueError("input requires exactly schema_version, frame and components")
    if document["schema_version"] != "1.0.0":
        raise ValueError("unsupported schema_version; expected 1.0.0")
    if document["frame"] != "body":
        raise ValueError("frame must be body (x forward, y right, z down)")
    result = calculate_mass_properties(document["components"])
    return {
        "schema_version": "1.0.0",
        "frame": "body",
        "tensor_convention": "off_diagonal_negative_products",
        "status": "synthetic_or_user_supplied_not_aircraft_validation",
        "input_sha256": hashlib.sha256(raw).hexdigest(),
        "result": result,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("input", type=Path, help="component JSON file; never modified")
    args = parser.parse_args(argv)
    try:
        raw = args.input.read_bytes()
        result = build_document(raw)
        text = json.dumps(result, indent=2, allow_nan=False)
    except (OSError, UnicodeError, ValueError, OverflowError, RecursionError) as error:
        # Invalid data is an ordinary command failure, never a Python traceback.
        message = " ".join(str(error).split())[:240]
        print(f"ERROR: {message}", file=sys.stderr)
        return 2
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
