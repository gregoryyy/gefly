import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { adaptAirspeedCalibration } from "./airspeed-calibration.ts";
import { mapAssessmentAirspeed } from "./assessment-airspeed.ts";

const bytes = readFileSync(new URL("../../data/aircraft/c172s-classic/poh-values.json", import.meta.url));
const hash = createHash("sha256").update(bytes).digest("hex");

test("AA integrated: bound source bytes feed every anchor through both public modules", () => {
  const source = JSON.parse(bytes.toString("utf8"));
  const before = JSON.stringify(source);
  const adapted = adaptAirspeedCalibration(source, hash);
  if (!adapted.ok) throw new Error(adapted.issue.message);
  const calibration = adapted.calibration;
  let anchors = 0;
  for (const table of Object.values(calibration.tables)) {
    for (const point of table.points) {
      const input = Object.freeze({
        cas_mps: point.cas_mps,
        flap_rad: table.flaps_deg * Math.PI / 180,
        get ind(): never { throw new Error("Evaluator must not read cockpit indications"); },
      });
      const result = mapAssessmentAirspeed(calibration, input);
      assert.equal(result.status, "mapped");
      assert.equal(result.cal_ias_mps, point.ias_mps);
      assert.equal(result.cal_ias_valid, true);
      assert.equal(result.source.source_sha256, hash);
      assert.equal(result.source.status, "draft");
      assert.equal(result.source.fidelity, "not validated");
      assert.equal(result.mapping_version, "1.0.0");
      assert.equal("ind" in result, false);
      assert.deepEqual(result, mapAssessmentAirspeed(calibration, input));
      anchors++;
    }
  }
  assert.equal(anchors, 16);
  assert.equal(JSON.stringify(source), before);
});

test("AA integrated: unavailable and range outcomes retain source limits without inferred IAS", () => {
  const adapted = adaptAirspeedCalibration(JSON.parse(bytes.toString("utf8")), hash);
  if (!adapted.ok) throw new Error(adapted.issue.message);
  for (const [cas_mps, degrees, status] of [[35, 20, "unavailable"], [0, 0, "below_range"], [100, 30, "above_range"]] as const) {
    const result = mapAssessmentAirspeed(adapted.calibration, { cas_mps, flap_rad: degrees * Math.PI / 180 });
    assert.equal(result.status, status);
    assert.equal(result.cal_ias_valid, false);
    assert.equal(result.cal_ias_mps, null);
    assert.equal(result.source.source_sha256, hash);
    assert.equal(result.source.status, "draft");
    if (result.status === "unavailable") assert.equal(result.reason, "no_calibration_table");
    else if (result.status === "below_range" || result.status === "above_range") {
      assert.equal(result.table.static_source, "normal");
      assert.equal(result.boundary.original_ias_kt, status === "below_range" ? 50 : 80);
    }
  }
});
