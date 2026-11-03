/**
 * R-NAV-4 "same source data": the UI instruments and the worker/AP must use the
 * same navigation package bytes. Each side reports the lowercase hex SHA-256 of
 * the exact package bytes it loaded (the UI via crypto.subtle in
 * loadNavigationPackage, the worker in its init/ready reply as `navdata_sha256`,
 * with `navdata_error` on failure). Any failure or mismatch is shown, never swallowed.
 */
export interface NavdataSide { settled: boolean; sha256: string | null; error: string | null }
export type NavdataCheck =
  | { status: 'pending' }
  | { status: 'match'; sha256: string }
  | { status: 'error'; message: string };

const HEX64 = /^[0-9a-f]{64}$/;

/** Normalize the worker's reply fields; anything malformed is an error, not a pass. */
export function workerNavdata(reply: { navdata_sha256?: unknown; navdata_error?: unknown } | null | undefined): NavdataSide {
  // undefined fields mean an older worker that cannot attest its package: fail closed.
  if (!reply || (reply.navdata_sha256 === undefined && reply.navdata_error === undefined)) {
    return { settled: true, sha256: null, error: 'flight engine did not report its navigation data identity; rebuild the local runtime' };
  }
  const error = typeof reply.navdata_error === 'string' && reply.navdata_error ? reply.navdata_error
    : reply.navdata_error === null || reply.navdata_error === undefined ? null : 'invalid navigation error report';
  const sha256 = typeof reply.navdata_sha256 === 'string' && HEX64.test(reply.navdata_sha256) ? reply.navdata_sha256 : null;
  if (!error && sha256 === null && reply.navdata_sha256 !== null) return { settled: true, sha256: null, error: 'invalid navigation data hash report' };
  return { settled: true, sha256, error };
}

export function checkNavdata(ui: NavdataSide, worker: NavdataSide): NavdataCheck {
  if (ui.settled && ui.error) return { status: 'error', message: `Navigation data could not be loaded for the instruments: ${ui.error}` };
  if (worker.settled && worker.error) return { status: 'error', message: `Navigation data unavailable in the flight engine: ${worker.error}` };
  if (!ui.settled || !worker.settled) return { status: 'pending' };
  if (ui.sha256 === null && worker.sha256 === null) return { status: 'error', message: 'Navigation data unavailable to instruments and flight engine.' };
  if (ui.sha256 === null || worker.sha256 === null || !HEX64.test(ui.sha256) || ui.sha256 !== worker.sha256) {
    return { status: 'error', message: 'Navigation data mismatch between instruments and flight engine; regional guidance is disabled.' };
  }
  return { status: 'match', sha256: ui.sha256 };
}
