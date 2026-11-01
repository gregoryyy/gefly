import type {
  AirspeedCalibration,
  AirspeedCalibrationTable,
  AssessmentAirspeedInput,
  AssessmentAirspeedResult,
} from "../contracts/assessment-airspeed.ts";

/** Evaluator-only inverse calibration; the input bundle is trusted adapter output. */
export function mapAssessmentAirspeed(
  calibration: AirspeedCalibration,
  input: AssessmentAirspeedInput,
): AssessmentAirspeedResult {
  const provenance = {
    source: calibration.source,
    mapping_id: "gefly.assessment-airspeed.normal-static-linear" as const,
    mapping_version: "1.0.0" as const,
  };
  const unavailable = (reason: "invalid_cas" | "invalid_flap" | "no_calibration_table"): AssessmentAirspeedResult => ({
    ...provenance, status: "unavailable", reason, cal_ias_valid: false,
    cal_ias_mps: null, table: null,
  });

  if (!Number.isFinite(input.cas_mps) || input.cas_mps < 0) return unavailable("invalid_cas");
  if (!Number.isFinite(input.flap_rad)) return unavailable("invalid_flap");

  const tables: readonly AirspeedCalibrationTable[] = [
    calibration.tables.normal_flaps_0,
    calibration.tables.normal_flaps_10,
    calibration.tables.normal_flaps_30,
  ];
  const table = tables.find(({ flaps_deg }) =>
    input.flap_rad >= (flaps_deg - 0.5) * Math.PI / 180 &&
    input.flap_rad <= (flaps_deg + 0.5) * Math.PI / 180,
  );
  if (!table) return unavailable("no_calibration_table");

  const points = table.points;
  const first = points[0];
  const last = points[points.length - 1];
  if (input.cas_mps < first.cas_mps) {
    return { ...provenance, status: "below_range", cal_ias_valid: false, cal_ias_mps: null, table, boundary: first };
  }
  if (input.cas_mps > last.cas_mps) {
    return { ...provenance, status: "above_range", cal_ias_valid: false, cal_ias_mps: null, table, boundary: last };
  }
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (input.cas_mps === point.cas_mps) {
      return { ...provenance, status: "mapped", cal_ias_valid: true, cal_ias_mps: point.ias_mps, table };
    }
    if (input.cas_mps < point.cas_mps) {
      const previous = points[i - 1];
      const ias = previous.ias_mps + (input.cas_mps - previous.cas_mps) /
        (point.cas_mps - previous.cas_mps) * (point.ias_mps - previous.ias_mps);
      return { ...provenance, status: "mapped", cal_ias_valid: true, cal_ias_mps: ias, table };
    }
  }
  // Validated, ordered points and the inclusive range make this unreachable.
  throw new Error("Invalid trusted airspeed calibration");
}
