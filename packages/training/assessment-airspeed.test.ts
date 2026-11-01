import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AirspeedCalibration, AirspeedTableId, AssessmentAirspeedInput } from "../contracts/assessment-airspeed.ts";
import { mapAssessmentAirspeed } from "./assessment-airspeed.ts";

// Build a trusted fixture directly from the read-only repository source, independently
// of the adapter under concurrent development. The adapter owns source validation.
const raw = JSON.parse(readFileSync(new URL("../../data/aircraft/c172s-classic/poh-values.json", import.meta.url), "utf8"));
const ids: AirspeedTableId[] = ["normal_flaps_0", "normal_flaps_10", "normal_flaps_30"];
const tables = Object.fromEntries(ids.map((id) => {
  const table = raw.airspeed_calibration[id];
  return [id, { ...table, table_id: id, points: table.points.map((point: any) => ({
    ias_mps: point.ias.value, cas_mps: point.cas.value,
    original_ias_kt: point.ias.original_value, original_cas_kt: point.cas.original_value,
  })) }];
}));
const calibration: AirspeedCalibration = {
  source: { schema_version: raw.schema_version, values_id: raw.values_id, values_version: raw.values_version,
    source_sha256: "a".repeat(64), status: raw.status, fidelity: raw.fidelity, manifest: raw.manifest },
  tables: tables as AirspeedCalibration["tables"],
};
const radians = (degrees: number) => degrees * Math.PI / 180;
const map = (cas_mps: number, flap_rad: number) => mapAssessmentAirspeed(calibration, { cas_mps, flap_rad });

// Adjacent IEEE-754 values, including across zero.
function next(value: number, up: boolean): number {
  if (value === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  let bits = view.getBigUint64(0);
  bits = (up === (value > 0)) ? bits + 1n : bits - 1n;
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}

test("AA-T2: all 16 source anchors and endpoints map exactly", () => {
  let count = 0;
  for (const id of ids) {
    const table = calibration.tables[id];
    for (const point of table.points) {
      const result = map(point.cas_mps, radians(table.flaps_deg));
      assert.equal(result.status, "mapped");
      if (result.status !== "mapped") throw new Error("expected mapped");
      assert.equal(result.cal_ias_mps, point.ias_mps);
      assert.equal(result.table, table);
      count++;
    }
  }
  assert.equal(count, 16);
  assert.notEqual(map(32.41, radians(0)).cal_ias_mps, map(32.41, radians(30)).cal_ias_mps);
});

test("AA-T3: independent midpoint and quarter-point interpolation", () => {
  for (const [cas, flap, expected] of [[30.35225, 0, 28.29445], [33.5675, 30, 32.1528]]) {
    const result = map(cas, radians(flap));
    assert.equal(result.status, "mapped");
    if (result.status !== "mapped") throw new Error("expected mapped");
    assert.ok(Math.abs(result.cal_ias_mps - expected) < 1e-12);
  }
});

test("AA-T4: all direct detent limits and immediate neighbours", () => {
  for (const deg of [0, 10, 30]) {
    for (const lower of [true, false]) {
      const bound = (deg + (lower ? -0.5 : 0.5)) * Math.PI / 180;
      for (const value of [bound, next(bound, lower)]) {
        const result = map(35, value);
        assert.notEqual(result.status, "unavailable", `${deg} ${value}`);
        if (result.status !== "unavailable") assert.equal(result.table.flaps_deg, deg);
      }
      const outside = map(35, next(bound, !lower));
      assert.equal(outside.status, "unavailable");
      if (outside.status === "unavailable") assert.equal(outside.reason, "no_calibration_table");
    }
  }
  for (const value of [radians(20), radians(5), radians(25), 10, 30]) {
    const result = map(35, value);
    assert.equal(result.status, "unavailable");
    if (result.status === "unavailable") assert.equal(result.reason, "no_calibration_table");
  }
});

test("AA-T5: source boundaries and adjacent outside values never extrapolate", () => {
  for (const id of ids) {
    const table = calibration.tables[id];
    for (const lower of [true, false]) {
      const boundary = table.points[lower ? 0 : table.points.length - 1];
      assert.equal(map(boundary.cas_mps, radians(table.flaps_deg)).status, "mapped");
      for (const cas of [next(boundary.cas_mps, !lower), boundary.cas_mps + (lower ? -1 : 1)]) {
        const result = map(cas, radians(table.flaps_deg));
        assert.equal(result.status, lower ? "below_range" : "above_range");
        assert.equal(result.cal_ias_valid, false);
        assert.equal(result.cal_ias_mps, null);
        if (result.status === "below_range" || result.status === "above_range") {
          assert.equal(result.boundary, boundary);
          assert.equal(result.table, table);
        }
      }
    }
  }
});

test("AA-T6: invalid measurements, no coercion, and CAS-first precedence", () => {
  for (const cas of [NaN, Infinity, -Infinity, -1, "35", null]) {
    const result = mapAssessmentAirspeed(calibration, { cas_mps: cas, flap_rad: NaN } as AssessmentAirspeedInput);
    assert.equal(result.status, "unavailable");
    if (result.status === "unavailable") assert.equal(result.reason, "invalid_cas");
    assert.equal(result.cal_ias_mps, null);
  }
  for (const flap of [NaN, Infinity, -Infinity, "0", null]) {
    const result = mapAssessmentAirspeed(calibration, { cas_mps: 35, flap_rad: flap } as AssessmentAirspeedInput);
    assert.equal(result.status, "unavailable");
    if (result.status === "unavailable") assert.equal(result.reason, "invalid_flap");
    assert.equal(result.cal_ias_mps, null);
  }
});

test("AA-T8: every result preserves provenance, is deterministic, and leaves inputs unchanged", () => {
  const before = JSON.stringify(calibration);
  for (const input of [{ cas_mps: 35, flap_rad: 0 }, { cas_mps: 1, flap_rad: 0 },
    { cas_mps: 100, flap_rad: 0 }, { cas_mps: NaN, flap_rad: 0 }, { cas_mps: 35, flap_rad: 1 }]) {
    const inputBefore = { ...input };
    const result = mapAssessmentAirspeed(calibration, input);
    assert.deepEqual(result, mapAssessmentAirspeed(calibration, input));
    assert.deepEqual(input, inputBefore);
    assert.deepEqual(result.source, calibration.source);
    assert.equal(result.source.status, "draft");
    assert.equal(result.source.fidelity, "not validated");
    assert.equal(result.mapping_id, "gefly.assessment-airspeed.normal-static-linear");
    assert.equal(result.mapping_version, "1.0.0");
  }
  assert.equal(JSON.stringify(calibration), before);
});
