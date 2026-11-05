/** Airborne scenery demonstrations: approximate viewpoints, not airport procedures.
 * Altitudes are metres MSL; heading is true degrees. */
export const REGIONAL_FLIGHTS = {
  darmstadt: { label: 'Darmstadt', state: 'HE', lat: 49.87, lon: 8.65, altitude: 900, heading: 170 },
  odenwald: { label: 'Odenwald ridge', state: 'HE', lat: 49.65, lon: 8.85, altitude: 1300, heading: 90 },
  spessart: { label: 'Spessart', state: 'BY', lat: 50, lon: 9.5, altitude: 1300, heading: 270 },
  westerwald: { label: 'Westerwald', state: 'RP', lat: 50.45, lon: 7.8, altitude: 1500, heading: 90 },
  marburg: { label: 'Marburg / Lahn', state: 'HE', lat: 50.8, lon: 8.77, altitude: 1500, heading: 0 },
  kassel: { label: 'Kassel', state: 'HE', lat: 51.3, lon: 9.4, altitude: 1500, heading: 90 },
  stuttgart: { label: 'Stuttgart', state: 'BW', lat: 48.78, lon: 9.18, altitude: 1700, heading: 180 },
  munich: { label: 'Munich', state: 'BY', lat: 48.14, lon: 11.58, altitude: 1800, heading: 180 },
  alps: { label: 'Bavarian Alps', state: 'BY', lat: 47.58, lon: 11, altitude: 3500, heading: 180 },
  saarbruecken: { label: 'Saarbrücken', state: 'SL', lat: 49.24, lon: 7, altitude: 1500, heading: 90 },
  koblenz: { label: 'Koblenz / Rhine', state: 'RP', lat: 50.36, lon: 7.6, altitude: 1500, heading: 180 },
} as const;
export const isRegionalFlight = (site: string): site is keyof typeof REGIONAL_FLIGHTS => Object.hasOwn(REGIONAL_FLIGHTS, site);
