import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bearingDistanceIndication, DEFAULT_RADIO_NAV, DEMO_NAV, navigationIndication, RADIO_NAV_FIELDS, setObs,
  swapRadio, tuneStandby, validFrequency, validRadioNavSnapshot } from './radio-nav.ts';

const DEG = Math.PI / 180;
const demo = { ...DEFAULT_RADIO_NAV, radio_demo_enabled: 1 };
// Independent cardinal fixtures around an equatorial station are unnecessary:
// meridian offsets at the declared station have exact north/south bearings.
const north = { lat_rad: (DEMO_NAV.latitude_deg + .1) * DEG, lon_rad: DEMO_NAV.longitude_deg * DEG, alt_msl_m: 1000 };
const south = { ...north, lat_rad: (DEMO_NAV.latitude_deg - .1) * DEG };

test('direct true bearing to LAB is independent of OBS and CDI TO/FROM ambiguity', () => {
  const inbound = bearingDistanceIndication(demo, north);
  assert(inbound.valid); assert.equal(inbound.bearing_true_deg, 180);
  assert.equal(bearingDistanceIndication(demo, south).bearing_true_deg, 0);
  assert.equal(bearingDistanceIndication(setObs(demo, 90), north).bearing_true_deg, 180);
  assert.equal(navigationIndication(setObs(demo, 90), north).valid, false);
  assert.equal(bearingDistanceIndication(setObs(demo, 90), north).dme_nm, inbound.dme_nm);
  assert(!bearingDistanceIndication(DEFAULT_RADIO_NAV, north).valid);
  assert(!bearingDistanceIndication({ ...demo, radio_nav_active_khz: 114000 }, north).valid);
  assert(!bearingDistanceIndication(demo, { ...north, lat_rad: north.lat_rad + 2 * DEG }).valid);
});

test('spherical inbound bearing is not a reciprocal outbound radial and retains geometric DME at passage', () => {
  const east = { ...north, lat_rad: DEMO_NAV.latitude_deg * DEG, lon_rad: (DEMO_NAV.longitude_deg + .5) * DEG };
  const inbound = bearingDistanceIndication(demo, east);
  const outbound = navigationIndication(demo, east);
  assert(inbound.valid); assert(outbound.radial_true_deg !== null);
  assert(Math.abs(inbound.bearing_true_deg! - ((outbound.radial_true_deg + 180) % 360)) > .3,
    'initial great-circle bearings at opposite ends differ from a flat reciprocal');
  // Same-latitude route begins slightly north of west, not exactly 270 degrees.
  assert(inbound.bearing_true_deg! > 270 && inbound.bearing_true_deg! < 271);
  const overhead = bearingDistanceIndication(demo, { lat_rad: DEMO_NAV.latitude_deg * DEG,
    lon_rad: DEMO_NAV.longitude_deg * DEG, alt_msl_m: 1852 });
  assert.equal(overhead.valid, false); assert.equal(overhead.bearing_true_deg, null); assert.equal(overhead.dme_nm, 1);
  for (const invalid of [null, { ...north, alt_msl_m: Infinity }, { ...north, lat_rad: NaN }]) assert(!bearingDistanceIndication(demo, invalid).valid);
});

test('legacy channel boundaries, spacing, swap and immutable snapshots', () => {
  for (const frequency of [118000, 121500, 136975]) assert(validFrequency('com', frequency));
  for (const frequency of [108000, 108050, 113800, 117950]) assert(validFrequency('nav', frequency));
  for (const frequency of [117975, 136980, 137000, NaN, Infinity, 118001]) assert(!validFrequency('com', frequency));
  for (const frequency of [107950, 117975, 118000, NaN, 113825]) assert(!validFrequency('nav', frequency));
  const tuned = tuneStandby(DEFAULT_RADIO_NAV, 'com', 122800);
  const swapped = swapRadio(tuned, 'com');
  assert.equal(swapped.radio_com_active_khz, 122800); assert.equal(swapped.radio_com_standby_khz, 118000);
  assert.equal(DEFAULT_RADIO_NAV.radio_com_standby_khz, 121500);
  assert.equal(swapRadio(DEFAULT_RADIO_NAV, 'nav').radio_nav_active_khz, 114000);
  assert.throws(() => tuneStandby(demo, 'nav', 113825), RangeError);
});

test('configuration groups reject partial, non-finite and invalid recorded values', () => {
  assert(validRadioNavSnapshot(DEFAULT_RADIO_NAV));
  for (const key of RADIO_NAV_FIELDS) {
    const partial = { ...demo }; delete partial[key]; assert(!validRadioNavSnapshot(partial));
    assert(!validRadioNavSnapshot({ ...demo, [key]: NaN }));
  }
  for (const degrees of [-1, 360, .5]) assert(!validRadioNavSnapshot({ ...demo, radio_obs_deg: degrees }));
  assert(!validRadioNavSnapshot({ ...demo, radio_demo_enabled: 2 }));
  assert.equal(setObs(demo, -1).radio_obs_deg, 359); assert.equal(setObs(demo, 360).radio_obs_deg, 0);
  assert.throws(() => setObs(demo, Infinity), RangeError);
});

test('demo is opt-in; unknown, ILS, out-of-radius and invalid positions remain flagged', () => {
  assert(!navigationIndication(DEFAULT_RADIO_NAV, north).valid);
  assert(!navigationIndication({ ...demo, radio_nav_active_khz: 114000 }, north).valid);
  assert.match(navigationIndication({ ...demo, radio_nav_active_khz: 108100 }, north).reason, /LAB/);
  assert(!navigationIndication(demo, { ...north, lat_rad: north.lat_rad + 2 * DEG }).valid);
  for (const value of [NaN, Infinity, 4]) assert(!navigationIndication(demo, { ...north, lat_rad: value }).valid);
  assert(!navigationIndication(demo, null).valid);
});

test('north/south radials and OBS distinguish TO/FROM without depending on heading', () => {
  const outbound = navigationIndication(demo, north), inbound = navigationIndication(setObs(demo, 180), north);
  assert(outbound.valid); assert.equal(outbound.to_from, 'FROM'); assert.equal(outbound.radial_true_deg, 0);
  assert(Math.abs(outbound.cdi_norm) < 1e-12);
  assert.equal(inbound.to_from, 'TO'); assert(Math.abs(inbound.cdi_norm) < 1e-12);
  assert.equal(navigationIndication(demo, south).to_from, 'TO');
  assert(!navigationIndication(setObs(demo, 90), north).valid);
});

test('CDI sign reverses on reciprocal OBS and limits at the generic ten-degree scale', () => {
  const left = navigationIndication(setObs(demo, 5), north);
  assert(Math.abs(left.cdi_norm - .5) < 1e-12);
  assert(Math.abs(navigationIndication(setObs(demo, 185), north).cdi_norm + .5) < 1e-12);
  assert.equal(navigationIndication(setObs(demo, 20), north).cdi_norm, 1);
  assert.equal(navigationIndication(setObs(demo, 340), north).cdi_norm, -1);
});

test('geometric DME retains altitude overhead; recorded config controls derived readings', () => {
  const overhead = navigationIndication(demo, { lat_rad: DEMO_NAV.latitude_deg * DEG,
    lon_rad: DEMO_NAV.longitude_deg * DEG, alt_msl_m: 1852 });
  assert(!overhead.valid); assert.match(overhead.reason, /passage/); assert.equal(overhead.dme_nm, 1);
  const range = navigationIndication(demo, north).dme_nm;
  assert(range > 6 && range < 6.1);
  const recorded = { ...demo, radio_obs_deg: 180 };
  const changedLive = setObs(demo, 0);
  assert.equal(navigationIndication(recorded, north).to_from, 'TO');
  assert.equal(navigationIndication(changedLive, north).to_from, 'FROM');
  assert.equal(recorded.radio_obs_deg, 180);
});

test('second COM/NAV receiver tunes, swaps and selects OBS independently', () => {
  let config = tuneStandby(demo, 'com', 136975, 2);
  config = swapRadio(config, 'com', 2);
  assert.equal(config.radio_com2_active_khz, 136975);
  assert.equal(config.radio_com2_standby_khz, 121500);
  assert.equal(config.radio_com_active_khz, demo.radio_com_active_khz);
  config = swapRadio(config, 'nav', 2);
  assert.equal(config.radio_nav2_active_khz, 113800);
  assert.equal(config.radio_nav_active_khz, demo.radio_nav_active_khz);
  config = setObs(config, 180, 2);
  assert.equal(config.radio_obs_deg, 0); assert.equal(config.radio_obs2_deg, 180);
  assert.equal(navigationIndication(config, north, 1).to_from, 'FROM');
  assert.equal(navigationIndication(config, north, 2).to_from, 'TO');
  const recorded = { ...config };
  config = setObs(config, -1, 2);
  assert.equal(config.radio_obs2_deg, 359); assert.equal(recorded.radio_obs2_deg, 180);
  assert.equal(navigationIndication(recorded, north, 2).to_from, 'TO');
  assert.throws(() => tuneStandby(config, 'com', 136980, 2), RangeError);
  assert.throws(() => tuneStandby(config, 'nav', 117975, 2), RangeError);
  assert(!validRadioNavSnapshot({ ...config, radio_obs2_deg: 360 }));
  assert(!validRadioNavSnapshot({ ...config, radio_nav2_active_khz: 113825 }));
  assert.equal(RADIO_NAV_FIELDS.length, 11);
});
