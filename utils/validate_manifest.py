#!/usr/bin/env python3
"""Validate Gefly aircraft manifests without third-party packages (R-AIR-1, R-DATA-1, R-DATA-2).

Implements the JSON Schema 2020-12 keywords used by data/schema/aircraft-manifest.schema.json.
The whole schema is audited before validation and any other keyword or unresolvable $ref
is an error, so a schema change cannot silently weaken validation. Then
applies rules that JSON Schema cannot express: every citation names a registered source
with the same revision, sourced/derived values cite only sources that were actually read,
and each SI value matches its published value through a fixed conversion-factor table.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "data" / "schema" / "aircraft-manifest.schema.json"
DEFAULT_MANIFESTS = "data/aircraft/*/manifest.json"
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
}
CONVERSION_TOLERANCE = 0.5e-4  # relative to max(1, |SI value|): manifests round to 4 decimals


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


def cross_references(manifest, errors):
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
        factor = CONVERSIONS.get((node["original_unit"], node["unit"]))
        if factor is None:
            errors.append(f"{path}: no conversion factor for {node['original_unit']!r} "
                          f"-> {node['unit']!r}")
            continue
        expected = original * factor
        if abs(value - expected) > CONVERSION_TOLERANCE * max(1.0, abs(value)):
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


def load_json(path):
    with Path(path).open(encoding="utf-8") as stream:
        return json.load(stream, parse_constant=lambda name: (_ for _ in ()).throw(
            ValueError(f"non-finite number {name} is not JSON")))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("manifests", nargs="*", type=Path,
                        help=f"manifest files (default: {DEFAULT_MANIFESTS})")
    parser.add_argument("--schema", type=Path, default=SCHEMA)
    args = parser.parse_args(argv)
    paths = args.manifests or sorted(ROOT.glob(DEFAULT_MANIFESTS))
    if not paths:
        print("ERROR: no manifests found.", file=sys.stderr)
        return 1
    try:
        schema = load_json(args.schema)
    except (OSError, ValueError) as error:
        print(f"ERROR: cannot read schema {args.schema}: {error}", file=sys.stderr)
        return 1
    failed = False
    for path in paths:
        try:
            errors = validate(load_json(path), schema)
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
