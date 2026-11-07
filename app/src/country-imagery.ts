/** Fixed official photo sources. Bounds are service envelopes, not coverage claims. */
export const COUNTRY_IMAGERY = Object.freeze([
  Object.freeze({ id: 'ch' as const, name: 'Switzerland', bounds: [5.14, 45.39, 11.48, 48.24] as const,
    attribution: '©<a href="https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices">swisstopo</a> · Includes material © (2016-2018) Planet. All rights reserved',
  }),
  Object.freeze({ id: 'at' as const, name: 'Austria', bounds: [8.78, 46.35, 17.5, 49.04] as const,
    attribution: 'Datenquelle: <a href="https://basemap.at/">basemap.at</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · masked near borders',
  }),
]);

export type PhotoCountry = typeof COUNTRY_IMAGERY[number]['id'];
export const COUNTRY_PHOTO_MIN_LEVEL = 0;
export const COUNTRY_PHOTO_MAX_LEVEL = 20;
export const COUNTRY_PHOTO_DETAIL_MIN_LEVEL = 7;
export const countryPhotoUrl = (country: PhotoCountry): string => `/scenery/photo-country/${country}/{z}/{x}/{y}.png`;

/** A request candidate only: the server's alpha, not its bounding rectangle, defines usable coverage. */
export function countryPhotoCandidates(lat_deg: number, lon_deg: number): readonly PhotoCountry[] {
  if (!Number.isFinite(lat_deg) || !Number.isFinite(lon_deg)) return [];
  return COUNTRY_IMAGERY.filter(({ bounds: [west, south, east, north] }) =>
    lon_deg >= west && lon_deg <= east && lat_deg >= south && lat_deg <= north).map(({ id }) => id);
}
