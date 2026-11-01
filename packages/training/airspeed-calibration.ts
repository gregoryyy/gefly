import type {
  AirspeedCalibration, AirspeedCalibrationAdaptResult, AirspeedCalibrationPoint,
  AirspeedCalibrationTable, AirspeedCitation, AirspeedSourceIdentity, AirspeedTableId,
} from "../contracts/assessment-airspeed.ts";

// This adapter consumes CI-validated repository data. The caller binds the supplied
// hash to the exact file bytes; format validation here does not verify that binding.
class InvalidField {
  readonly path: string;
  readonly message: string;
  constructor(path: string, message: string) { this.path = path; this.message = message; }
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidField(path, "Expected an object");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidField(path, "Expected a nonempty string");
  }
  return value;
}

function exact<T extends string | number>(value: unknown, expected: T, path: string): T {
  if (value !== expected) throw new InvalidField(path, `Expected ${expected}`);
  return expected;
}

function speed(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new InvalidField(path, "Expected a finite nonnegative number");
  }
  return value;
}

function citation(value: unknown, path: string): AirspeedCitation {
  const entry = object(value, path);
  const result: AirspeedCitation = {
    source_id: text(entry.source_id, `${path}.source_id`),
    revision: text(entry.revision, `${path}.revision`),
    page: text(entry.page, `${path}.page`),
    ...(entry.section === undefined ? {} : { section: text(entry.section, `${path}.section`) }),
  };
  return Object.freeze(result);
}

function quantity(value: unknown, path: string, reference: "IAS" | "CAS"): [number, number] {
  const entry = object(value, path);
  exact(entry.unit, "m/s", `${path}.unit`);
  exact(entry.reference, reference, `${path}.reference`);
  exact(entry.original_unit, "kt", `${path}.original_unit`);
  return [speed(entry.value, `${path}.value`), speed(entry.original_value, `${path}.original_value`)];
}

function table(value: unknown, id: AirspeedTableId, degrees: 0 | 10 | 30, count: number): AirspeedCalibrationTable {
  const path = `airspeed_calibration.${id}`;
  const entry = object(value, path);
  exact(entry.flaps_deg, degrees, `${path}.flaps_deg`);
  exact(entry.static_source, "normal", `${path}.static_source`);
  exact(entry.status, "sourced", `${path}.status`);
  exact(entry.reading, "tabulated", `${path}.reading`);
  const condition = text(entry.condition, `${path}.condition`);
  const selection = text(entry.selection, `${path}.selection`);
  const conversion = text(entry.conversion, `${path}.conversion`);
  const uncertainty = text(entry.uncertainty, `${path}.uncertainty`);
  if (!Array.isArray(entry.citations) || entry.citations.length === 0) {
    throw new InvalidField(`${path}.citations`, "Expected a nonempty citation array");
  }
  const citations = Object.freeze(Array.from(entry.citations, (item, i) => citation(item, `${path}.citations[${i}]`)));
  if (!Array.isArray(entry.points) || entry.points.length !== count) {
    throw new InvalidField(`${path}.points`, `Expected ${count} points`);
  }
  const points: AirspeedCalibrationPoint[] = [];
  for (let i = 0; i < entry.points.length; i++) {
    const item = entry.points[i];
    const pointPath = `${path}.points[${i}]`;
    const point = object(item, pointPath);
    const [ias_mps, original_ias_kt] = quantity(point.ias, `${pointPath}.ias`, "IAS");
    const [cas_mps, original_cas_kt] = quantity(point.cas, `${pointPath}.cas`, "CAS");
    const previous = points[i - 1];
    if (previous && ias_mps <= previous.ias_mps) throw new InvalidField(`${pointPath}.ias.value`, "Expected strictly increasing IAS");
    if (previous && cas_mps <= previous.cas_mps) throw new InvalidField(`${pointPath}.cas.value`, "Expected strictly increasing CAS");
    points.push(Object.freeze({ ias_mps, cas_mps, original_ias_kt, original_cas_kt }));
  }
  return Object.freeze({ table_id: id, flaps_deg: degrees, static_source: "normal", status: "sourced", condition, citations, reading: "tabulated", selection, conversion, uncertainty, points: Object.freeze(points) });
}

export function adaptAirspeedCalibration(value: unknown, source_sha256: string): AirspeedCalibrationAdaptResult {
  try {
    if (typeof source_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(source_sha256)) {
      throw new InvalidField("source_sha256", "Expected a lowercase SHA-256 hexadecimal string");
    }
    const root = object(value, "$");
    exact(root.schema_version, "1.0.0", "schema_version");
    exact(root.values_id, "gefly.aircraft.c172s-classic.poh-values", "values_id");
    const version = text(root.values_version, "values_version");
    // SemVer 2.0: numeric identifiers cannot have leading zeroes.
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/.test(version)) {
      throw new InvalidField("values_version", "Expected a semantic version");
    }
    if (root.status !== "draft" && root.status !== "reviewed" && root.status !== "superseded") {
      throw new InvalidField("status", "Expected draft, reviewed or superseded");
    }
    exact(root.fidelity, "not validated", "fidelity");
    const manifest = object(root.manifest, "manifest");
    const source: AirspeedSourceIdentity = Object.freeze({
      schema_version: "1.0.0", values_id: "gefly.aircraft.c172s-classic.poh-values", values_version: version,
      source_sha256, status: root.status, fidelity: "not validated",
      manifest: Object.freeze({ path: text(manifest.path, "manifest.path"), manifest_id: text(manifest.manifest_id, "manifest.manifest_id") }),
    });
    const inputTables = object(root.airspeed_calibration, "airspeed_calibration");
    const tables = Object.freeze({
      normal_flaps_0: table(inputTables.normal_flaps_0, "normal_flaps_0", 0, 7),
      normal_flaps_10: table(inputTables.normal_flaps_10, "normal_flaps_10", 10, 5),
      normal_flaps_30: table(inputTables.normal_flaps_30, "normal_flaps_30", 30, 4),
    });
    const calibration: AirspeedCalibration = Object.freeze({ source, tables });
    return { ok: true, calibration };
  } catch (error) {
    if (error instanceof InvalidField) return { ok: false, issue: { path: error.path, message: error.message } };
    throw error;
  }
}
