// Frozen assessment-airspeed API, integrated by the orchestrator.
// API only. See docs/design/ASSESSMENT-AIRSPEED.md AA1–AA6.

export type AirspeedTableId =
  | "normal_flaps_0"
  | "normal_flaps_10"
  | "normal_flaps_30";

export interface AirspeedCitation {
  readonly source_id: string;
  readonly revision: string;
  readonly page: string;
  readonly section?: string;
}

export interface AirspeedSourceIdentity {
  readonly schema_version: "1.0.0";
  readonly values_id: "gefly.aircraft.c172s-classic.poh-values";
  readonly values_version: string;
  // Caller-provided lowercase SHA-256 of exact source UTF-8 bytes, not verified here.
  readonly source_sha256: string;
  readonly status: "draft" | "reviewed" | "superseded";
  readonly fidelity: "not validated";
  readonly manifest: {
    readonly path: string;
    readonly manifest_id: string;
  };
}

export interface AirspeedCalibrationPoint {
  readonly ias_mps: number;
  readonly cas_mps: number;
  readonly original_ias_kt: number;
  readonly original_cas_kt: number;
}

export interface AirspeedCalibrationTable {
  readonly table_id: AirspeedTableId;
  readonly flaps_deg: 0 | 10 | 30;
  readonly static_source: "normal";
  readonly status: "sourced";
  readonly condition: string;
  readonly citations: readonly AirspeedCitation[];
  readonly reading: "tabulated";
  readonly selection: string;
  readonly conversion: string;
  readonly uncertainty: string;
  readonly points: readonly AirspeedCalibrationPoint[];
}

export interface AirspeedCalibration {
  readonly source: AirspeedSourceIdentity;
  readonly tables: Readonly<Record<AirspeedTableId, AirspeedCalibrationTable>>;
}

export type AirspeedCalibrationAdaptResult =
  | { readonly ok: true; readonly calibration: AirspeedCalibration }
  | {
      readonly ok: false;
      readonly issue: {
        readonly path: string;
        readonly message: string;
      };
    };

// Implemented function in packages/training/airspeed-calibration.ts:
// adaptAirspeedCalibration(value: unknown, source_sha256: string):
//   AirspeedCalibrationAdaptResult

export interface AssessmentAirspeedInput {
  readonly cas_mps: number;
  readonly flap_rad: number;
}

export interface AssessmentAirspeedProvenance {
  readonly source: AirspeedSourceIdentity;
  readonly mapping_id: "gefly.assessment-airspeed.normal-static-linear";
  readonly mapping_version: "1.0.0";
}

export type AssessmentAirspeedResult = AssessmentAirspeedProvenance &
  (
    | {
        readonly status: "mapped";
        readonly cal_ias_valid: true;
        readonly cal_ias_mps: number;
        readonly table: AirspeedCalibrationTable;
      }
    | {
        readonly status: "below_range" | "above_range";
        readonly cal_ias_valid: false;
        readonly cal_ias_mps: null;
        readonly table: AirspeedCalibrationTable;
        readonly boundary: AirspeedCalibrationPoint;
      }
    | {
        readonly status: "unavailable";
        readonly reason: "invalid_cas" | "invalid_flap" | "no_calibration_table";
        readonly cal_ias_valid: false;
        readonly cal_ias_mps: null;
        readonly table: null;
      }
  );

// Implemented function in packages/training/assessment-airspeed.ts:
// mapAssessmentAirspeed(calibration: AirspeedCalibration,
//   input: AssessmentAirspeedInput): AssessmentAirspeedResult
