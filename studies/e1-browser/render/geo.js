// WGS-84 geodetic <-> ECEF <-> local ENU (east-north-up) conversions.
// Units: metres and radians throughout. Heights are ellipsoidal (WGS-84);
// the study treats contract `alt_msl_m` as ellipsoidal height and ignores the
// geoid undulation (a few tens of metres near Frankfurt). Study code only.
// Classic script: attaches `GeoWGS84` to the global object so it can be used
// from a page (<script src>) and from a classic worker (importScripts).
(function (root) {
  "use strict";
  const A_M = 6378137.0;                 // semi-major axis
  const F = 1 / 298.257223563;           // flattening
  const E2 = F * (2 - F);                // first eccentricity squared
  const B_M = A_M * (1 - F);             // semi-minor axis
  const EP2 = (A_M * A_M - B_M * B_M) / (B_M * B_M);

  function finite(...values) {
    for (const v of values) {
      if (!Number.isFinite(v)) throw new RangeError("non-finite geodetic input");
    }
  }

  function geodeticToEcef(lat_rad, lon_rad, h_m) {
    finite(lat_rad, lon_rad, h_m);
    const sLat = Math.sin(lat_rad), cLat = Math.cos(lat_rad);
    const n_m = A_M / Math.sqrt(1 - E2 * sLat * sLat);
    return [
      (n_m + h_m) * cLat * Math.cos(lon_rad),
      (n_m + h_m) * cLat * Math.sin(lon_rad),
      (n_m * (1 - E2) + h_m) * sLat,
    ];
  }

  // Bowring's method with two refinement passes; sub-millimetre near the surface.
  function ecefToGeodetic(x_m, y_m, z_m) {
    finite(x_m, y_m, z_m);
    const lon_rad = Math.atan2(y_m, x_m);
    const p_m = Math.hypot(x_m, y_m);
    let beta = Math.atan2(z_m, p_m * (1 - F));
    let lat_rad = 0;
    for (let i = 0; i < 3; i++) {
      lat_rad = Math.atan2(z_m + EP2 * B_M * Math.sin(beta) ** 3,
                           p_m - E2 * A_M * Math.cos(beta) ** 3);
      beta = Math.atan2((1 - F) * Math.sin(lat_rad), Math.cos(lat_rad));
    }
    const sLat = Math.sin(lat_rad);
    const n_m = A_M / Math.sqrt(1 - E2 * sLat * sLat);
    const h_m = p_m * Math.cos(lat_rad) + z_m * sLat - A_M * A_M / n_m;
    return [lat_rad, lon_rad, h_m];
  }

  // A local tangent plane anchored at a geodetic origin.
  function makeEnuFrame(lat0_rad, lon0_rad, h0_m) {
    const o = geodeticToEcef(lat0_rad, lon0_rad, h0_m);
    const sLat = Math.sin(lat0_rad), cLat = Math.cos(lat0_rad);
    const sLon = Math.sin(lon0_rad), cLon = Math.cos(lon0_rad);
    // Rows: east, north, up unit vectors in ECEF.
    const R = [
      [-sLon, cLon, 0],
      [-sLat * cLon, -sLat * sLon, cLat],
      [cLat * cLon, cLat * sLon, sLat],
    ];
    return {
      origin: { lat_rad: lat0_rad, lon_rad: lon0_rad, h_m: h0_m },
      geodeticToEnu(lat_rad, lon_rad, h_m) {
        const p = geodeticToEcef(lat_rad, lon_rad, h_m);
        const d = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
        return R.map((r) => r[0] * d[0] + r[1] * d[1] + r[2] * d[2]);
      },
      enuToGeodetic(e_m, n_m, u_m) {
        finite(e_m, n_m, u_m);
        const x = o[0] + R[0][0] * e_m + R[1][0] * n_m + R[2][0] * u_m;
        const y = o[1] + R[0][1] * e_m + R[1][1] * n_m + R[2][1] * u_m;
        const z = o[2] + R[0][2] * e_m + R[1][2] * n_m + R[2][2] * u_m;
        return ecefToGeodetic(x, y, z);
      },
    };
  }

  root.GeoWGS84 = { A_M, F, E2, geodeticToEcef, ecefToGeodetic, makeEnuFrame };
})(typeof self !== "undefined" ? self : globalThis);
