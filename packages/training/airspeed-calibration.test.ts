import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { adaptAirspeedCalibration } from "./airspeed-calibration.ts";

const bytes = readFileSync(new URL("../../data/aircraft/c172s-classic/poh-values.json", import.meta.url));
const hash = createHash("sha256").update(bytes).digest("hex");
const fixture = () => JSON.parse(bytes.toString("utf8"));

function assertFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) assertFrozen(child);
  }
}

test("AA-T1: real source identity, points, provenance and detached frozen data", () => {
  const input = fixture();
  const result = adaptAirspeedCalibration(input, hash);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const { source, tables } = result.calibration;
  assert.deepEqual(source, {
    schema_version: "1.0.0", values_id: "gefly.aircraft.c172s-classic.poh-values",
    values_version: "0.1.0", source_sha256: hash, status: "draft", fidelity: "not validated",
    manifest: { path: "manifest.json", manifest_id: "gefly.aircraft.c172s-classic" },
  });
  assert.deepEqual(Object.values(tables).map(t => [t.table_id, t.flaps_deg, t.points.length]), [
    ["normal_flaps_0", 0, 7], ["normal_flaps_10", 10, 5], ["normal_flaps_30", 30, 4],
  ]);
  for (const t of Object.values(tables)) {
    const original = input.airspeed_calibration[t.table_id];
    assert.equal(t.condition, original.condition);
    assert.deepEqual(t.citations, original.citations);
    assert.equal(t.citations[0].source_id, "S17");
    assert.equal(t.selection, original.selection);
    assert.equal(t.conversion, original.conversion);
    assert.equal(t.uncertainty, original.uncertainty);
    assert.equal(t.reading, "tabulated");
    for (const [i, point] of t.points.entries()) {
      assert.deepEqual(point, { ias_mps: original.points[i].ias.value, cas_mps: original.points[i].cas.value,
        original_ias_kt: original.points[i].ias.original_value, original_cas_kt: original.points[i].cas.original_value });
    }
  }
  assertFrozen(result.calibration);
  input.manifest.path = "changed";
  input.airspeed_calibration.normal_flaps_0.citations[0].page = "changed";
  input.airspeed_calibration.normal_flaps_0.points[0].ias.value = 0;
  assert.equal(source.manifest.path, "manifest.json");
  assert.equal(tables.normal_flaps_0.citations[0].page, "5-9");
  assert.equal(tables.normal_flaps_0.points[0].ias_mps, 25.7222);
});

test("AA-T7: malformed consumed fields report paths without changing the input", () => {
  const cases: Array<[string, (data: any) => void, string]> = [
    ["schema", d => d.schema_version = "2.0.0", "schema_version"],
    ["values identity", d => d.values_id = "other", "values_id"],
    ["version", d => d.values_version = "1.02.0", "values_version"],
    ["status", d => d.status = "accepted", "status"],
    ["fidelity", d => d.fidelity = "validated", "fidelity"],
    ["manifest path", d => d.manifest.path = " ", "manifest.path"],
    ["manifest id", d => delete d.manifest.manifest_id, "manifest.manifest_id"],
    ["table missing", d => delete d.airspeed_calibration.normal_flaps_10, "airspeed_calibration.normal_flaps_10"],
    ["flap identity", d => d.airspeed_calibration.normal_flaps_0.flaps_deg = 10, "airspeed_calibration.normal_flaps_0.flaps_deg"],
    ["static source", d => d.airspeed_calibration.normal_flaps_0.static_source = "alternate", "airspeed_calibration.normal_flaps_0.static_source"],
    ["table status", d => d.airspeed_calibration.normal_flaps_0.status = "draft", "airspeed_calibration.normal_flaps_0.status"],
    ["reading", d => d.airspeed_calibration.normal_flaps_0.reading = "interpolated", "airspeed_calibration.normal_flaps_0.reading"],
    ...["condition", "selection", "conversion", "uncertainty"].map((key): [string, (data: any) => void, string] => [key, d => d.airspeed_calibration.normal_flaps_0[key] = "", `airspeed_calibration.normal_flaps_0.${key}`]),
    ["citations", d => d.airspeed_calibration.normal_flaps_0.citations = [], "airspeed_calibration.normal_flaps_0.citations"],
    ["citation hole", d => delete d.airspeed_calibration.normal_flaps_0.citations[0], "airspeed_calibration.normal_flaps_0.citations[0]"],
    ["point hole", d => delete d.airspeed_calibration.normal_flaps_0.points[2], "airspeed_calibration.normal_flaps_0.points[2]"],
    ["all point holes", d => d.airspeed_calibration.normal_flaps_0.points = new Array(7), "airspeed_calibration.normal_flaps_0.points[0]"],
    ...["source_id", "revision", "page", "section"].map((key): [string, (data: any) => void, string] => [key, d => d.airspeed_calibration.normal_flaps_0.citations[0][key] = " ", `airspeed_calibration.normal_flaps_0.citations[0].${key}`]),
    ["count", d => d.airspeed_calibration.normal_flaps_30.points.pop(), "airspeed_calibration.normal_flaps_30.points"],
    ["units", d => d.airspeed_calibration.normal_flaps_0.points[0].ias.unit = "kt", "airspeed_calibration.normal_flaps_0.points[0].ias.unit"],
    ["reference", d => d.airspeed_calibration.normal_flaps_0.points[0].cas.reference = "IAS", "airspeed_calibration.normal_flaps_0.points[0].cas.reference"],
    ["original unit", d => d.airspeed_calibration.normal_flaps_0.points[0].cas.original_unit = "m/s", "airspeed_calibration.normal_flaps_0.points[0].cas.original_unit"],
    ["nonfinite", d => d.airspeed_calibration.normal_flaps_0.points[0].ias.value = Infinity, "airspeed_calibration.normal_flaps_0.points[0].ias.value"],
    ["negative original", d => d.airspeed_calibration.normal_flaps_0.points[0].cas.original_value = -1, "airspeed_calibration.normal_flaps_0.points[0].cas.original_value"],
    ["string number", d => d.airspeed_calibration.normal_flaps_0.points[0].cas.value = "1", "airspeed_calibration.normal_flaps_0.points[0].cas.value"],
    ["duplicate IAS", d => d.airspeed_calibration.normal_flaps_0.points[1].ias.value = d.airspeed_calibration.normal_flaps_0.points[0].ias.value, "airspeed_calibration.normal_flaps_0.points[1].ias.value"],
    ["reversed CAS", d => d.airspeed_calibration.normal_flaps_0.points[1].cas.value = 1, "airspeed_calibration.normal_flaps_0.points[1].cas.value"],
  ];
  for (const [name, mutate, path] of cases) {
    const data = fixture(); mutate(data);
    const before = structuredClone(data);
    const result = adaptAirspeedCalibration(data, hash);
    assert.equal(result.ok, false, name);
    if (!result.ok) { assert.equal(result.issue.path, path, name); assert.ok(result.issue.message, name); }
    assert.deepEqual(data, before, name);
  }
  for (const bad of ["", "a".repeat(63), "A".repeat(64), "g".repeat(64)]) {
    const result = adaptAirspeedCalibration(fixture(), bad);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.issue.path, "source_sha256");
  }
  const root = adaptAirspeedCalibration(null, hash);
  assert.equal(root.ok, false);
  if (!root.ok) assert.equal(root.issue.path, "$");
});

test("AA1: optional citation section and declared source status are preserved", () => {
  const data = fixture();
  delete data.airspeed_calibration.normal_flaps_0.citations[0].section;
  data.status = "reviewed";
  data.values_version = "1.2.3-rc.1+build.5";
  const result = adaptAirspeedCalibration(data, hash);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.calibration.source.status, "reviewed");
    assert.equal(result.calibration.source.fidelity, "not validated");
    assert.equal("section" in result.calibration.tables.normal_flaps_0.citations[0], false);
  }
});
