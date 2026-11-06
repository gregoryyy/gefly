#!/usr/bin/env python3
"""Compile the pinned public-domain OurAirports snapshot into discovery packages.

Source CSVs are supplied separately; this program makes no network requests.
Coordinates are WGS84 degrees; source feet/kHz/MHz and true headings stay explicit.
These packages do not define receiver signals, procedures or physical terrain.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime
import decimal
import gzip
import hashlib
import io
import json
import math
import pathlib
import re

COMMIT = "c483a76d30ee903114b777bf099de0fae1761294"
SOURCE_HASHES = {
    "airports.csv": "e2e65a3ddaf76170c0e2c373cb8b68597bdf3b59d243c4d6db454d48498ba6d7",
    "runways.csv": "b0bac6ad2a802eba770d57b3e42c191c888f3d334e42780f3d12ff5930650d07",
    "airport-frequencies.csv": "c1b1f04b42040cdb50c470ce75962459ee9d168c27843046c0c66d540fd1f171",
    "navaids.csv": "d7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1",
}
SOURCE = "OurAirports community data, public domain; not a navigation chart"
KINDS = ("airports", "runways", "com", "navaids")
LIMITS = {"airports": 20000, "runways": 30000, "com": 30000, "navaids": 10000}
AIRPORT_TYPES = {"small_airport", "medium_airport", "large_airport", "heliport", "seaplane_base", "balloonport", "closed"}
NAVAID_TYPES = {"DME", "NDB", "NDB-DME", "TACAN", "VOR", "VOR-DME", "VORTAC"}
HEADERS = {
    "airports.csv": ("id", "ident", "type", "name", "latitude_deg", "longitude_deg", "elevation_ft", "iso_country", "iso_region", "icao_code", "iata_code", "gps_code", "local_code"),
    "runways.csv": ("id", "airport_ident", "length_ft", "width_ft", "surface", "lighted", "closed", *tuple(f"{end}_{field}" for end in ("le", "he") for field in ("ident", "latitude_deg", "longitude_deg", "elevation_ft", "heading_degT", "displaced_threshold_ft"))),
    "airport-frequencies.csv": ("id", "airport_ident", "type", "description", "frequency_mhz"),
    "navaids.csv": ("id", "ident", "name", "type", "frequency_khz", "latitude_deg", "longitude_deg", "elevation_ft", "iso_country", "associated_airport"),
}


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def cell_id(lat: float, lon: float) -> str:
    """Half-open5degree ownership; +180 shares -180, and +90 is in the last row."""
    if not math.isfinite(lat) or not math.isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise ValueError("Coordinate outside finite WGS84 degrees")
    x = int(math.floor((((lon + 180) % 360)) / 5))
    y = min(35, int(math.floor((lat + 90) / 5)))
    return f"{x}-{y}"


def text(value: str, *, required: bool = False, limit: int = 200) -> str:
    if not isinstance(value, str) or len(value) > limit or (required and not value):
        raise ValueError("Invalid bounded source text")
    # Keep source descriptions inert and readable, without control characters.
    normalized = " ".join(value.split())
    if required and not normalized:
        raise ValueError("Empty required source text")
    return normalized


def source_id(value: str) -> str:
    if not re.fullmatch(r"[0-9]{1,12}", value):
        raise ValueError("Invalid numeric source identifier")
    return value


def optional_number(value: str, low: float, high: float, key: str, rejected: collections.Counter, *, low_open: bool = False) -> float | None:
    if value == "":
        return None
    try:
        number = float(value)
        if not math.isfinite(number) or not low <= number <= high or (low_open and number == low):
            raise ValueError("Out of range")
        return number
    except (TypeError, ValueError, OverflowError):
        rejected[key] += 1
        return None


def coordinate(row: dict[str, str]) -> tuple[float, float]:
    lat, lon = float(row["latitude_deg"]), float(row["longitude_deg"])
    cell_id(lat, lon)  # Reject non-finite or out-of-world source positions.
    return lat, lon


def country(value: str) -> str:
    if not re.fullmatch(r"[A-Z]{2}", value):
        raise ValueError("Invalid source country")
    return value


def read_source(name: str, raw: bytes, expected: str) -> list[dict[str, str]]:
    if len(raw) > 25000000 or digest(raw) != expected:
        raise ValueError(f"Pinned source size/hash mismatch: {name}")
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
    if reader.fieldnames is None or len(set(reader.fieldnames)) != len(reader.fieldnames) or not set(HEADERS[name]) <= set(reader.fieldnames):
        raise ValueError(f"Invalid source columns: {name}")
    rows = []
    ids = set()
    for row in reader:
        if len(rows) >= 250000 or None in row or any(v is None for v in row.values()):
            raise ValueError(f"Invalid/oversized source rows: {name}")
        identity = source_id(row["id"])
        if identity in ids:
            raise ValueError(f"Duplicate source identifier: {name}/{identity}")
        ids.add(identity)
        rows.append(row)
    return rows


def compile_sources(raw_sources: dict[str, bytes], retrieved: str, *, expected_hashes: dict[str, str] | None = None) -> tuple[dict, dict[str, bytes]]:
    """Return validated manifest and relative-path bytes, without filesystem writes."""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", retrieved):
        raise ValueError("Retrieval date must be ISO date")
    datetime.date.fromisoformat(retrieved)
    expected = SOURCE_HASHES if expected_hashes is None else expected_hashes
    if set(raw_sources) != set(SOURCE_HASHES) or set(expected) != set(SOURCE_HASHES):
        raise ValueError("Exactly four source files are required")
    rows = {name: read_source(name, raw_sources[name], expected[name]) for name in SOURCE_HASHES}
    source_files = {name: {"bytes": len(raw_sources[name]), "sha256": digest(raw_sources[name]), "rows": len(rows[name])} for name in SOURCE_HASHES}
    rejected = collections.Counter()
    cells: dict[str, dict] = {}

    def cell(identity: str) -> dict:
        if identity not in cells:
            cells[identity] = {"schema": 1, "id": identity, **{kind: [] for kind in KINDS}}
        return cells[identity]

    airports: dict[str, tuple[dict, str]] = {}
    search = []
    for row in rows["airports.csv"]:
        try:
            ident = text(row["ident"], required=True)
            if ident in airports or row["type"] not in AIRPORT_TYPES:
                raise ValueError("Duplicate identity or unknown airport type")
            lat, lon = coordinate(row)
            value = {
                "id": ident, "source_id": row["id"], "name": text(row["name"], required=True),
                "type": row["type"], "icao": text(row["icao_code"]), "local": text(row["local_code"]),
                "lat": lat, "lon": lon, "elevation_ft": optional_number(row["elevation_ft"], -29999, 29999, "airports.elevation_ft", rejected),
                "iso_region": text(row["iso_region"], required=True), "iso_country": country(row["iso_country"]),
            }
            identity = cell_id(lat, lon)
            airports[ident] = (value, identity)
            cell(identity)["airports"].append(value)
            codes = " ".join(dict.fromkeys(text(row[field]) for field in ("ident", "icao_code", "iata_code", "local_code", "gps_code") if row[field]))
            search.append({"kind": "airport", "id": ident, "name": value["name"], "codes": codes, "type": value["type"], "lat": lat, "lon": lon, "iso_country": value["iso_country"], "cell": identity})
        except (ValueError, KeyError) as error:
            # A malformed primary airport cannot silently disappear from a complete inventory.
            raise ValueError(f"Invalid primary airport {row['id']}: {error}") from error

    for row in rows["runways.csv"]:
        parent = airports.get(row["airport_ident"])
        if parent is None:
            rejected["runways.unknown_airport"] += 1
            continue
        try:
            ends = {}
            for end in ("le", "he"):
                ends[end] = {"ident": text(row[f"{end}_ident"])}
                for source_field, target, low, high in (("latitude_deg", "lat", -90, 90), ("longitude_deg", "lon", -180, 180), ("elevation_ft", "elevation_ft", -29999, 29999), ("heading_degT", "heading_degT", 0, 360), ("displaced_threshold_ft", "displaced_threshold_ft", 0, 100000)):
                    ends[end][target] = optional_number(row[f"{end}_{source_field}"], low, high, f"runways.{end}_{source_field}", rejected)
            if row["lighted"] not in ("0", "1") or row["closed"] not in ("0", "1"):
                raise ValueError("Invalid runway boolean")
            runway = {
                "id": f"oa-rwy-{row['id']}", "source_id": row["id"], "airport_id": row["airport_ident"],
                "length_ft": optional_number(row["length_ft"], 0, 100000, "runways.length_ft", rejected, low_open=True),
                "width_ft": optional_number(row["width_ft"], 0, 100000, "runways.width_ft", rejected, low_open=True),
                "surface": text(row["surface"]), "lighted": row["lighted"] == "1", "closed": row["closed"] == "1", **ends,
            }
            cell(parent[1])["runways"].append(runway)
        except ValueError:
            rejected["runways.invalid_record"] += 1

    for row in rows["airport-frequencies.csv"]:
        parent = airports.get(row["airport_ident"])
        if parent is None:
            rejected["com.unknown_airport"] += 1
            continue
        try:
            frequency = row["frequency_mhz"]
            if not re.fullmatch(r"\d{1,4}(\.\d{1,6})?", frequency):
                raise ValueError("Invalid COM source frequency")
            khz = decimal.Decimal(frequency) * 1000
            if khz != khz.to_integral_value() or not 0 <= khz <= 10000000:
                raise ValueError("Unrepresentable COM source frequency")
            station = {"id": row["id"], "airport_id": row["airport_ident"], "service": text(row["type"]), "description": text(row["description"]), "channel_khz": int(khz), "source_frequency_mhz": frequency}
            cell(parent[1])["com"].append(station)
        except (ValueError, decimal.InvalidOperation):
            rejected["com.invalid_record"] += 1

    for row in rows["navaids.csv"]:
        try:
            if row["type"] not in NAVAID_TYPES:
                raise ValueError("Unknown navaid type")
            lat, lon = coordinate(row)
            value = {
                "id": f"oa-nav-{row['id']}", "source_id": row["id"], "ident": text(row["ident"], required=True), "name": text(row["name"], required=True), "type": row["type"],
                "lat": lat, "lon": lon, "elevation_ft": optional_number(row["elevation_ft"], -29999, 29999, "navaids.elevation_ft", rejected),
                "iso_country": country(row["iso_country"]), "frequency_khz": optional_number(row["frequency_khz"], 0, 10000000, "navaids.frequency_khz", rejected, low_open=True), "associated_airport": text(row["associated_airport"]),
            }
            identity = cell_id(lat, lon)
            cell(identity)["navaids"].append(value)
            search.append({"kind": "navaid", "id": value["id"], "name": value["name"], "codes": value["ident"], "type": value["type"], "lat": lat, "lon": lon, "iso_country": value["iso_country"], "cell": identity})
        except ValueError:
            rejected["navaids.invalid_record"] += 1

    files = {}
    entries = {}
    totals = collections.Counter({kind: 0 for kind in KINDS})
    for identity in sorted(cells, key=lambda value: tuple(map(int, value.split("-")))):
        value = cells[identity]
        for kind in KINDS:
            value[kind].sort(key=lambda item: item["id"])
        counts = {kind: len(value[kind]) for kind in KINDS}
        if any(counts[kind] > LIMITS[kind] for kind in KINDS):
            raise ValueError(f"Cell record budget exceeded: {identity}")
        data = encode(value)
        if len(data) > 4194304:
            raise ValueError(f"Cell byte budget exceeded: {identity}")
        files[f"cells/{identity}.bin"] = data
        entries[identity] = {"bytes": len(data), "sha256": digest(data), "counts": counts}
        totals.update(counts)
    search.sort(key=lambda item: (item["kind"], item["id"]))
    expanded = encode({"schema": 1, "entries": search})
    buffer = io.BytesIO()
    # GzipFile fixes the filename/time/OS header across supported Python platforms.
    with gzip.GzipFile(filename="", mode="wb", fileobj=buffer, compresslevel=9, mtime=0) as compressor:
        compressor.write(expanded)
    compressed = buffer.getvalue()
    if len(search) > 150000 or len(expanded) > 25165824 or len(compressed) > 4194304:
        raise ValueError("Global search budget exceeded")
    files["search.bin"] = compressed
    manifest = {"schema": 1, "id": "ourairports-world-v1", "cell_degrees": 5,
                "source_commit": COMMIT, "retrieved": retrieved, "source": SOURCE,
                "source_url": f"https://github.com/davidmegginson/ourairports-data/tree/{COMMIT}", "source_terms": "https://ourairports.com/data/",
                "source_files": source_files, "counts": dict(totals), "rejections": dict(sorted(rejected.items())),
                "search": {"path": "search.bin", "bytes": len(compressed), "sha256": digest(compressed), "expanded_bytes": len(expanded), "expanded_sha256": digest(expanded), "count": len(search)}, "cells": entries}
    if len(encode(manifest)) > 1048576:
        raise ValueError("Manifest byte budget exceeded")
    files["catalogue.bin"] = encode(manifest)
    files["manifest.json"] = encode({"schema": 1, "id": "ourairports-world-catalogue-v1", "path": "catalogue.bin", "bytes": len(files["catalogue.bin"]), "sha256": digest(files["catalogue.bin"])})
    return manifest, files


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--retrieved", required=True)
    args = parser.parse_args()
    manifest, files = compile_sources({name: (args.source_dir / name).read_bytes() for name in SOURCE_HASHES}, args.retrieved)
    # Fully validate before writing any accepted output; source/runtime paths stay separate.
    for relative, data in files.items():
        target = args.output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print(json.dumps({"source_commit": COMMIT, "counts": manifest["counts"], "rejections": manifest["rejections"], "cells": len(manifest["cells"]), "search": manifest["search"], "total_bytes": sum(map(len, files.values())), "max_cell_bytes": max(entry["bytes"] for entry in manifest["cells"].values())}, indent=2))


if __name__ == "__main__":
    main()
