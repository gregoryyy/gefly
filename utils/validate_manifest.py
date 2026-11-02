#!/usr/bin/env python3
"""Validate Gefly aircraft manifests and selected-value files without third-party packages (R-AIR-1, R-DATA-1, R-DATA-2).

Implements the JSON Schema 2020-12 keywords used by data/schema/aircraft-manifest.schema.json,
data/schema/poh-values.schema.json, data/schema/performance-values.schema.json and
data/schema/indication-loading-values.schema.json.
The whole schema is audited before validation and any other keyword or unresolvable $ref
is an error, so a schema change cannot silently weaken validation. Then
applies rules that JSON Schema cannot express: every citation names a registered source
with the same revision, sourced/derived values cite only sources that were actually read,
and each SI value matches its published value through a fixed conversion-factor table.
A poh-values.json file cites the source register of the sibling manifest it names (which is
schema-validated too), its airspeed-calibration points must be strictly increasing in IAS,
and a quantity key ending in _ias, _cas or _tas must carry that airspeed reference.
A performance-values.json file follows the same sibling-manifest rules; its engine, fuel and
cruise series points must be strictly increasing by engine speed, then manifold pressure/power.
An indication-loading-values.json file (engine/fuel indications and the sample loading
example) follows the same sibling-manifest, citation and conversion rules; degF converts
to K affinely.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "data" / "schema" / "aircraft-manifest.schema.json"
POH_SCHEMA = ROOT / "data" / "schema" / "poh-values.schema.json"
DEFAULT_MANIFESTS = "data/aircraft/*/manifest.json"
DEFAULT_POH_VALUES = "data/aircraft/*/poh-values.json"
POH_VALUES_NAME = "poh-values.json"
PERFORMANCE_SCHEMA = ROOT / "data" / "schema" / "performance-values.schema.json"
DEFAULT_PERFORMANCE_VALUES = "data/aircraft/*/performance-values.json"
PERFORMANCE_VALUES_NAME = "performance-values.json"
INDICATION_SCHEMA = ROOT / "data" / "schema" / "indication-loading-values.schema.json"
DEFAULT_INDICATION_VALUES = "data/aircraft/*/indication-loading-values.json"
INDICATION_VALUES_NAME = "indication-loading-values.json"
ANNOTATIONS = {"$schema", "$id", "$comment", "$defs", "title", "description"}
KEYWORDS = {
    "$ref", "type", "enum", "const", "required", "properties", "additionalProperties",
    "minProperties", "items", "minItems", "minLength", "pattern", "allOf", "if", "then",
}
READ_STATUSES = {"read", "read_selected_pages"}
# Exact SI factors: (original unit, SI unit) -> SI value per original unit.
CONVERSIONS = {
    ("lb", "kg"): 0.45359237,
    ("kt", "m/s"): 1852 / 3600,
    ("in", "m"): 0.0254,
    ("rpm", "rad/s"): 2 * math.pi / 60,
    ("hp", "W"): 745.69987158227022,  # mechanical horsepower
    ("ft", "m"): 0.3048,
    ("ft/min", "m/s"): 0.3048 / 60,
    ("nm", "m"): 1852.0,
    ("inHg", "Pa"): 3386.389,  # conventional inch of mercury (NIST SP 811)
    ("in^3", "m^3"): 0.0254 ** 3,
    ("gal/h", "m^3/s"): 3.785411784e-3 / 3600,  # US gallon, exact
    ("lb/h", "kg/s"): 0.45359237 / 3600,
    ("%", "1"): 0.01,
    ("1", "1"): 1.0,
    ("psi", "Pa"): 0.45359237 * 9.80665 / 0.0254 ** 2,  # lbf/in^2, exact
    ("gal", "m^3"): 3.785411784e-3,  # US gallon, exact
    ("h", "s"): 3600.0,
    ("s", "s"): 1.0,
    ("V", "V"): 1.0,
    ("A", "A"): 1.0,
    ("lb-in/1000", "kg*m"): 1000 * 0.45359237 * 0.0254,  # published moment/1000
    ("lb/gal", "kg/m^3"): 0.45359237 / 3.785411784e-3,
}
# Affine conversions: SI = (original + offset) * factor.
AFFINE_CONVERSIONS = {
    ("degF", "K"): (5 / 9, 459.67),  # exact: K = (degF + 459.67) * 5/9
}
CONVERSION_TOLERANCE = 0.5e-4  # relative to max(floor, |SI value|): manifests round to 4 decimals
# Units whose SI values are far below 1 are checked purely relatively (floor 0), so they
# must be stated to about 5 significant digits; all other units use floor 1.
TOLERANCE_FLOOR = {"m^3": 0.0, "m^3/s": 0.0, "kg/s": 0.0}


class SchemaError(Exception):
    """The schema itself uses an unsupported construct."""


def type_matches(value, name):
    if name == "object":
        return isinstance(value, dict)
    if name == "array":
        return isinstance(value, list)
    if name == "string":
        return isinstance(value, str)
    if name == "null":
        return value is None
    if name == "boolean":
        return isinstance(value, bool)
    if name == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if name == "number":
        return (isinstance(value, (int, float)) and not isinstance(value, bool)
                and math.isfinite(value))
    raise SchemaError(f"unsupported type {name!r}")


def resolve(root, reference):
    if not isinstance(reference, str) or not reference.startswith("#/"):
        raise SchemaError(f"only local $ref is supported: {reference!r}")
    node = root
    try:
        for part in reference[2:].split("/"):
            node = node[part]
    except (KeyError, TypeError, IndexError):
        raise SchemaError(f"unresolvable $ref {reference!r}") from None
    if not isinstance(node, (dict, bool)):
        raise SchemaError(f"$ref {reference!r} does not name a schema")
    return node


def audit(schema, root=None, path="#"):
    """Statically reject unsupported keywords and bad $ref anywhere in the schema."""
    root = schema if root is None else root
    if isinstance(schema, bool):
        return
    if not isinstance(schema, dict):
        raise SchemaError(f"{path}: schema must be an object or boolean")
    unknown = set(schema) - ANNOTATIONS - KEYWORDS
    if unknown:
        raise SchemaError(f"unsupported keyword(s) {sorted(unknown)} at {path}")
    if "$ref" in schema:
        resolve(root, schema["$ref"])
    children = []
    for key in ("properties", "$defs"):
        if key in schema:
            if not isinstance(schema[key], dict):
                raise SchemaError(f"{path}/{key}: must be an object")
            children += [(f"{path}/{key}/{name}", item) for name, item in schema[key].items()]
    for key in ("items", "additionalProperties", "if", "then"):
        if key in schema:
            children.append((f"{path}/{key}", schema[key]))
    if "allOf" in schema:
        if not isinstance(schema["allOf"], list):
            raise SchemaError(f"{path}/allOf: must be an array")
        children += [(f"{path}/allOf/{index}", item) for index, item in enumerate(schema["allOf"])]
    for child_path, child in children:
        audit(child, root, child_path)


def check(value, schema, root, path, errors):
    """Append 'path: message' strings for every violation of schema at value."""
    if schema is True:
        return
    if schema is False:
        errors.append(f"{path}: not allowed")
        return
    unknown = set(schema) - ANNOTATIONS - KEYWORDS
    if unknown:
        raise SchemaError(f"unsupported keyword(s) {sorted(unknown)} at {path}")
    if "$ref" in schema:
        check(value, resolve(root, schema["$ref"]), root, path, errors)
    if "type" in schema:
        names = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(type_matches(value, name) for name in names):
            errors.append(f"{path}: expected type {'/'.join(names)}, got {json.dumps(value)[:60]}")
            return
    if "const" in schema and not equal(value, schema["const"]):
        errors.append(f"{path}: must equal {json.dumps(schema['const'])}")
    if "enum" in schema and not any(equal(value, item) for item in schema["enum"]):
        errors.append(f"{path}: {json.dumps(value)[:60]} not in {schema['enum']}")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            errors.append(f"{path}: shorter than {schema['minLength']}")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: does not match {schema['pattern']}")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: needs at least {schema['minItems']} item(s)")
        if "items" in schema:
            for index, item in enumerate(value):
                check(item, schema["items"], root, f"{path}[{index}]", errors)
    if isinstance(value, dict):
        for name in schema.get("required", []):
            if name not in value:
                errors.append(f"{path}: missing required field {name!r}")
        if len(value) < schema.get("minProperties", 0):
            errors.append(f"{path}: needs at least {schema['minProperties']} field(s)")
        properties = schema.get("properties", {})
        for name, item in value.items():
            if name in properties:
                check(item, properties[name], root, f"{path}.{name}", errors)
            elif "additionalProperties" in schema:
                extra = schema["additionalProperties"]
                if extra is False:
                    errors.append(f"{path}: unexpected field {name!r}")
                else:
                    check(item, extra, root, f"{path}.{name}", errors)
    for part in schema.get("allOf", []):
        check(value, part, root, path, errors)
    if "if" in schema:
        probe = []
        check(value, schema["if"], root, path, probe)
        if not probe and "then" in schema:
            check(value, schema["then"], root, path, errors)


def equal(left, right):
    """JSON equality: booleans are not numbers."""
    if isinstance(left, bool) or isinstance(right, bool):
        return type(left) is type(right) and left == right
    return left == right


def walk(node, path="$"):
    if isinstance(node, dict):
        yield path, node
        for key, item in node.items():
            yield from walk(item, f"{path}.{key}")
    elif isinstance(node, list):
        for index, item in enumerate(node):
            yield from walk(item, f"{path}[{index}]")


def cross_references(manifest, errors, sources=None):
    """Check citations in manifest against a source register (default: its own)."""
    if sources is None:
        sources = manifest.get("sources")
    if not isinstance(sources, list):
        return
    register = {}
    for index, source in enumerate(sources):
        if isinstance(source, dict) and isinstance(source.get("id"), str):
            if source["id"] in register:
                errors.append(f"$.sources[{index}]: duplicate source id {source['id']!r}")
            register[source["id"]] = source
    for path, node in walk(manifest):
        if "source_id" in node:
            source = register.get(node["source_id"])
            if source is None:
                errors.append(f"{path}: source {node['source_id']!r} is not in the source register")
            elif node.get("revision") != source.get("revision"):
                errors.append(f"{path}: revision {node.get('revision')!r} differs from "
                              f"register {source.get('revision')!r} for {node['source_id']}")
        if node.get("status") in {"sourced", "derived"} and isinstance(node.get("citations"), list):
            for index, citation in enumerate(node["citations"]):
                source = register.get(citation.get("source_id")) if isinstance(citation, dict) else None
                if source is not None and source.get("access_status") not in READ_STATUSES:
                    errors.append(f"{path}.citations[{index}]: {node['status']} value cites "
                                  f"unread source {citation['source_id']!r}")


def conversions(manifest, errors):
    """Recompute SI values from published values with the fixed factor table."""
    for path, node in walk(manifest):
        value, original = node.get("value"), node.get("original_value")
        if "unit" not in node or "original_unit" not in node:
            continue
        if not all(type_matches(item, "number") for item in (value, original)):
            continue
        pair = (node["original_unit"], node["unit"])
        factor = CONVERSIONS.get(pair)
        if pair in AFFINE_CONVERSIONS:
            scale, offset = AFFINE_CONVERSIONS[pair]
            expected = (original + offset) * scale
        elif factor is None:
            errors.append(f"{path}: no conversion factor for {node['original_unit']!r} "
                          f"-> {node['unit']!r}")
            continue
        else:
            expected = original * factor
        floor = TOLERANCE_FLOOR.get(node["unit"], 1.0)
        if abs(value - expected) > CONVERSION_TOLERANCE * max(floor, abs(expected)):
            errors.append(f"{path}: value {value} {node['unit']} does not match "
                          f"{original} {node['original_unit']} (expected {expected:.4f})")


def validate(manifest, schema):
    """Return a list of error strings; empty means valid. Raises SchemaError first."""
    audit(schema)
    errors = []
    check(manifest, schema, schema, "$", errors)
    cross_references(manifest, errors)
    conversions(manifest, errors)
    return errors


def calibration_order(document, errors):
    """Calibration points must be strictly increasing in IAS (no duplicates, interpolable)."""
    series = document.get("airspeed_calibration")
    if not isinstance(series, dict):
        return
    for name, item in series.items():
        points = item.get("points") if isinstance(item, dict) else None
        if not isinstance(points, list):
            continue
        speeds = [point.get("ias", {}).get("original_value") if isinstance(point, dict)
                  and isinstance(point.get("ias"), dict) else None for point in points]
        if not all(type_matches(speed, "number") for speed in speeds):
            continue
        for index in range(1, len(speeds)):
            if speeds[index] <= speeds[index - 1]:
                errors.append(f"$.airspeed_calibration.{name}.points[{index}]: IAS "
                              f"{speeds[index]} not above previous {speeds[index - 1]}")


POH_GROUPS = ("stall_speeds", "takeoff_distance", "landing_distance", "climb")
PERFORMANCE_GROUPS = ("engine_ratings", "glide")
KEY_REFERENCES = {"_ias": "IAS", "_cas": "CAS", "_tas": "TAS"}


def key_references(document, errors, groups=POH_GROUPS):
    """A quantity named ..._ias/_cas/_tas must carry the matching reference."""
    for group in groups:
        quantities = document.get(group)
        if not isinstance(quantities, dict):
            continue
        for name, quantity in quantities.items():
            for suffix, reference in KEY_REFERENCES.items():
                if name.endswith(suffix) and isinstance(quantity, dict) \
                        and quantity.get("reference") != reference:
                    errors.append(f"$.{group}.{name}: key suffix {suffix!r} needs reference "
                                  f"{reference!r}, got {quantity.get('reference')!r}")


def series_order(document, errors, groups=("engine_sea_level", "engine_fuel", "cruise")):
    """Series points must be strictly increasing by engine speed, then manifold pressure/power."""
    for group in groups:
        series = document.get(group)
        if not isinstance(series, dict):
            continue
        for name, item in series.items():
            points = item.get("points") if isinstance(item, dict) else None
            if not isinstance(points, list):
                continue
            keys = []
            for point in points:
                key = []
                for field in ("engine_speed", "manifold_pressure", "power"):
                    measure = point.get(field) if isinstance(point, dict) else None
                    if isinstance(measure, dict):
                        key.append(measure.get("original_value"))
                if not key or not all(type_matches(part, "number") for part in key):
                    keys = None
                    break
                keys.append(tuple(key))
            if not keys:
                continue
            for index in range(1, len(keys)):
                if keys[index] <= keys[index - 1]:
                    errors.append(f"$.{group}.{name}.points[{index}]: {keys[index]} not above "
                                  f"previous {keys[index - 1]} (engine speed, then manifold "
                                  f"pressure and power)")


def validate_poh_values(document, schema, manifest, manifest_sha256=None):
    """Validate a POH value file against its schema and the named manifest's sources.

    Returns a list of error strings; empty means valid. Raises SchemaError first.
    """
    errors = sibling_checks(document, schema, manifest, manifest_sha256)
    calibration_order(document, errors)
    if isinstance(document, dict):
        key_references(document, errors)
    return errors


def validate_performance_values(document, schema, manifest, manifest_sha256=None):
    """Validate a performance value file against its schema and the named manifest's sources.

    Returns a list of error strings; empty means valid. Raises SchemaError first.
    """
    errors = sibling_checks(document, schema, manifest, manifest_sha256)
    if isinstance(document, dict):
        series_order(document, errors)
        key_references(document, errors, PERFORMANCE_GROUPS)
    return errors


def validate_indication_values(document, schema, manifest, manifest_sha256=None):
    """Validate an indication/sample-loading value file against its schema and manifest sources.

    Returns a list of error strings; empty means valid. Raises SchemaError first.
    """
    errors = sibling_checks(document, schema, manifest, manifest_sha256)
    if isinstance(document, dict):
        marking_units(document, errors)
        governing_conflicts(document, errors)
        derived_arm(document, errors)
    return errors


def marking_units(document, errors):
    """Markings and scale use the indication's unit pair; arcs and scales need lower < upper."""
    indications = document.get("indications")
    if not isinstance(indications, dict):
        return
    for name, item in indications.items():
        if not isinstance(item, dict):
            continue
        parts = [(f"$.indications.{name}.scale", item.get("scale"))]
        markings = item.get("markings")
        if isinstance(markings, list):
            parts += [(f"$.indications.{name}.markings[{i}]", m) for i, m in enumerate(markings)]
        for path, part in parts:
            if not isinstance(part, dict):
                continue
            for field in ("lower", "upper", "at"):
                measure = part.get(field)
                if not isinstance(measure, dict):
                    continue
                if measure.get("unit") != item.get("unit"):
                    errors.append(f"{path}.{field}.unit: {measure.get('unit')!r} differs from "
                                  f"indication unit {item.get('unit')!r}")
                if "original_unit" in item and measure.get("original_unit") != item["original_unit"]:
                    errors.append(f"{path}.{field}.original_unit: {measure.get('original_unit')!r} "
                                  f"differs from indication original_unit {item['original_unit']!r}")
            lower, upper = part.get("lower"), part.get("upper")
            if isinstance(lower, dict) and isinstance(upper, dict):
                low, high = lower.get("value"), upper.get("value")
                if type_matches(low, "number") and type_matches(high, "number") and not low < high:
                    errors.append(f"{path}: lower {low} is not below upper {high}")
        red = {}
        for marking in markings if isinstance(markings, list) else []:
            if isinstance(marking, dict) and marking.get("kind") in ("red_line_min", "red_line_max") \
                    and isinstance(marking.get("at"), dict) \
                    and type_matches(marking["at"].get("value"), "number"):
                red.setdefault(marking["kind"], []).append(marking["at"]["value"])
        for low in red.get("red_line_min", []):
            for high in red.get("red_line_max", []):
                if not low < high:
                    errors.append(f"$.indications.{name}.markings: red_line_min {low} is not "
                                  f"below red_line_max {high}")


def governing_conflicts(document, errors):
    """A marking with governs: true must belong to an indication listed in a conflict's fields."""
    conflicts = document.get("conflicts")
    listed = set()
    for conflict in conflicts if isinstance(conflicts, list) else []:
        fields = conflict.get("fields") if isinstance(conflict, dict) else None
        if isinstance(fields, list):
            listed.update(field for field in fields if isinstance(field, str))
    indications = document.get("indications")
    for name, item in indications.items() if isinstance(indications, dict) else []:
        markings = item.get("markings") if isinstance(item, dict) else None
        for index, marking in enumerate(markings if isinstance(markings, list) else []):
            if isinstance(marking, dict) and marking.get("governs") is True and name not in listed:
                errors.append(f"$.indications.{name}.markings[{index}]: governs is true but no "
                              f"conflicts entry lists {name!r} in fields")


ARM_UNCERTAINTY_CAP = 0.005  # uncertainty_si may not exceed 0.5 % of the derived arm


def derived_arm(document, errors):
    """The derived basic empty arm must equal moment / mass within its stated uncertainty_si."""
    sample = document.get("sample_loading")
    values = sample.get("values") if isinstance(sample, dict) else None
    if not isinstance(values, dict):
        return
    arm, moment, mass = (values.get(key) for key in
                         ("basic_empty_arm", "basic_empty_moment", "basic_empty_mass"))
    if not all(isinstance(item, dict) for item in (arm, moment, mass)):
        if isinstance(arm, dict):
            errors.append("$.sample_loading.values.basic_empty_arm: needs basic_empty_moment "
                          "and basic_empty_mass to recompute it")
        return
    units = (arm.get("unit"), moment.get("unit"), mass.get("unit"))
    if units != ("m", "kg*m", "kg"):
        errors.append(f"$.sample_loading.values: arm/moment/mass units {units} are not "
                      f"('m', 'kg*m', 'kg')")
        return
    numbers = (arm.get("value"), moment.get("value"), mass.get("value"), arm.get("uncertainty_si"))
    if not all(type_matches(item, "number") for item in numbers) or not mass["value"] > 0:
        errors.append("$.sample_loading.values.basic_empty_arm: arm, moment, mass and "
                      "uncertainty_si must be numbers with a positive mass")
        return
    if not arm["uncertainty_si"] > 0:
        errors.append(f"$.sample_loading.values.basic_empty_arm.uncertainty_si: "
                      f"{arm['uncertainty_si']} must be positive")
        return
    if arm["uncertainty_si"] > ARM_UNCERTAINTY_CAP * abs(arm["value"]):
        errors.append(f"$.sample_loading.values.basic_empty_arm.uncertainty_si: "
                      f"{arm['uncertainty_si']} exceeds {ARM_UNCERTAINTY_CAP:.1%} of the arm "
                      f"{arm['value']}")
        return
    expected = moment["value"] / mass["value"]
    if abs(arm["value"] - expected) > arm["uncertainty_si"]:
        errors.append(f"$.sample_loading.values.basic_empty_arm: {arm['value']} m differs from "
                      f"moment/mass {expected:.5f} m by more than uncertainty_si "
                      f"{arm['uncertainty_si']}")


def sibling_checks(document, schema, manifest, manifest_sha256=None):
    """Schema, manifest-pin, citation and conversion checks shared by value files.

    The pin is manifest_id, manifest_version and manifest_sha256, the SHA-256 of the
    manifest file's exact bytes (not a canonical JSON form). The caller supplies the
    digest of the bytes it loaded; without it the pin cannot be verified, which is an error.
    """
    audit(schema)
    errors = []
    check(document, schema, schema, "$", errors)
    reference = document.get("manifest") if isinstance(document, dict) else None
    expected_id = reference.get("manifest_id") if isinstance(reference, dict) else None
    if not isinstance(manifest, dict) or manifest.get("manifest_id") != expected_id:
        got = manifest.get("manifest_id") if isinstance(manifest, dict) else None
        errors.append(f"$.manifest.manifest_id: {expected_id!r} does not match the loaded "
                      f"manifest {got!r}")
        sources = []
    else:
        sources = manifest.get("sources")
        pin = reference if isinstance(reference, dict) else {}
        if pin.get("manifest_version") != manifest.get("manifest_version"):
            errors.append(f"$.manifest.manifest_version: {pin.get('manifest_version')!r} does not "
                          f"match the loaded manifest {manifest.get('manifest_version')!r}")
        if manifest_sha256 is None:
            errors.append("$.manifest.manifest_sha256: manifest file digest not supplied; "
                          "the pin is unverified")
        elif pin.get("manifest_sha256") != manifest_sha256:
            errors.append(f"$.manifest.manifest_sha256: {pin.get('manifest_sha256')!r} does not "
                          f"match the SHA-256 of the manifest file {manifest_sha256!r}")
    cross_references(document, errors, sources if isinstance(sources, list) else [])
    conversions(document, errors)
    return errors


def load_poh_values(path, schema, manifest_schema, validator=None):
    """Load a value file (POH or performance) and its sibling manifest; validate both.

    The manifest is schema-validated too, so a file checked alone cannot rely on an
    invalid source register. Manifest errors are reported with a 'manifest' prefix.
    """
    document = load_json(path)
    reference = document.get("manifest") if isinstance(document, dict) else None
    name = reference.get("path") if isinstance(reference, dict) else None
    # Schema restricts the name; re-check here so a bad file cannot escape the directory.
    if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*\.json", name):
        return [f"$.manifest.path: invalid manifest file name {name!r}"]
    manifest_path = Path(path).parent / name
    manifest = load_json(manifest_path)
    errors = [f"manifest {name}: {error}" for error in validate(manifest, manifest_schema)]
    return errors + (validator or validate_poh_values)(document, schema, manifest,
                                                       file_sha256(manifest_path))


def file_sha256(path):
    """SHA-256 hex digest of a file's exact bytes (the manifest pin definition)."""
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def reject_duplicate_keys(pairs):
    """object_pairs_hook: a repeated key would silently keep only the last value."""
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON object key {key!r}")
        result[key] = value
    return result


def load_json(path):
    with Path(path).open(encoding="utf-8") as stream:
        return json.load(stream, object_pairs_hook=reject_duplicate_keys,
                         parse_constant=lambda name: (_ for _ in ()).throw(
                             ValueError(f"non-finite number {name} is not JSON")))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("manifests", nargs="*", type=Path,
                        help=f"manifest files, or {POH_VALUES_NAME} / {PERFORMANCE_VALUES_NAME} / "
                             f"{INDICATION_VALUES_NAME} files (default: {DEFAULT_MANIFESTS}, "
                             f"{DEFAULT_POH_VALUES}, {DEFAULT_PERFORMANCE_VALUES} and "
                             f"{DEFAULT_INDICATION_VALUES})")
    parser.add_argument("--schema", type=Path, default=SCHEMA)
    parser.add_argument("--poh-schema", type=Path, default=POH_SCHEMA)
    parser.add_argument("--performance-schema", type=Path, default=PERFORMANCE_SCHEMA)
    parser.add_argument("--indication-schema", type=Path, default=INDICATION_SCHEMA)
    args = parser.parse_args(argv)
    paths = args.manifests or (sorted(ROOT.glob(DEFAULT_MANIFESTS))
                               + sorted(ROOT.glob(DEFAULT_POH_VALUES))
                               + sorted(ROOT.glob(DEFAULT_PERFORMANCE_VALUES))
                               + sorted(ROOT.glob(DEFAULT_INDICATION_VALUES)))
    if not paths:
        print("ERROR: no manifests found.", file=sys.stderr)
        return 1
    schemas = {}
    for key, schema_path in (("manifest", args.schema), ("poh", args.poh_schema),
                             ("performance", args.performance_schema),
                             ("indication", args.indication_schema)):
        try:
            schemas[key] = load_json(schema_path)
        except (OSError, ValueError) as error:
            print(f"ERROR: cannot read schema {schema_path}: {error}", file=sys.stderr)
            return 1
    failed = False
    for path in paths:
        try:
            if Path(path).name == POH_VALUES_NAME:
                errors = load_poh_values(path, schemas["poh"], schemas["manifest"])
            elif Path(path).name == PERFORMANCE_VALUES_NAME:
                errors = load_poh_values(path, schemas["performance"], schemas["manifest"],
                                         validate_performance_values)
            elif Path(path).name == INDICATION_VALUES_NAME:
                errors = load_poh_values(path, schemas["indication"], schemas["manifest"],
                                         validate_indication_values)
            else:
                errors = validate(load_json(path), schemas["manifest"])
        except (OSError, ValueError) as error:
            errors = [f"cannot read: {error}"]
        except SchemaError as error:
            print(f"ERROR: schema: {error}", file=sys.stderr)
            return 1
        for error in errors:
            print(f"ERROR: {path}: {error}", file=sys.stderr)
        failed = failed or bool(errors)
        print(f"{path}: {'FAILED' if errors else 'valid'}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
