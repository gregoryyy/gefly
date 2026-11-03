/** Visible imagery availability text (R-WORLD-4). Pure: the scene supplies the observations. */
export interface ImageryObservations {
  settled: boolean; slow: boolean;
  detailLoaded: boolean; overviewLoaded: boolean; airportLoaded: boolean;
  insideDetail: boolean; insideOverview: boolean; insideAirport: boolean;
  /** 'loading' until the regional manifest settles; 'failed' when the whole pyramid is unavailable. */
  regional: 'loading' | 'failed' | 'ready';
  /** Finest regional level covering the aircraft, or null outside coverage. */
  regionalLevel: number | null;
  regionalFailedTiles: number;
  tilesLoaded: boolean;
  /** Optional streamed regional photography/map fallback, separate from the bundled pyramid. */
  liveImagery?: 'loading' | 'ready' | 'degraded';
}
export type ImageryOutcome = 'loading' | 'ready' | 'degraded' | 'error' | 'outside-coverage';

export const REGIONAL_UNAVAILABLE_TEXT = 'Regional detail imagery unavailable; coarse starter imagery and relief shown.';

export function imageryStatusText(o: Readonly<ImageryObservations>): { outcome: ImageryOutcome; text: string } {
  const base = starterStatus(o);
  if (o.regional !== 'failed' || !o.settled) return base;
  // A whole-package failure is always announced, whatever the starter coverage says.
  const notice = o.liveImagery
    ? 'Bundled regional detail imagery unavailable; live imagery/map fallback shown.'
    : REGIONAL_UNAVAILABLE_TEXT;
  return { outcome: base.outcome === 'ready' ? 'degraded' : base.outcome, text: base.text ? `${notice} ${base.text}` : notice };
}

function starterStatus(o: Readonly<ImageryObservations>): { outcome: ImageryOutcome; text: string } {
  const regional = o.regional === 'ready' ? o.regionalLevel : null;
  if (!o.settled) return { outcome: 'loading', text: o.slow ? 'Aerial imagery is taking longer to load. Controls remain available.' : 'Loading the local Egelsbach aerial photograph…' };
  if (regional === null && !o.detailLoaded && !o.overviewLoaded && !o.airportLoaded) return { outcome: 'error', text: 'Starter photographs unavailable. Reload to retry; flight controls still work.' };
  if (regional === null && o.liveImagery === 'degraded') return { outcome: 'degraded', text: 'Live photography unavailable or incomplete · map fallback' };
  if (regional === null && o.liveImagery) return { outcome: 'ready', text: o.liveImagery === 'ready' ? 'Live photography / map fallback · capture dates unknown' : 'Loading live regional scenery…' };
  if (regional === null && !(o.airportLoaded && o.insideAirport) && !(o.detailLoaded && o.insideDetail) && !(o.overviewLoaded && o.insideOverview)) return { outcome: 'outside-coverage', text: 'Outside this starter imagery area. No photographic ground coverage here.' };
  if (o.airportLoaded && o.insideAirport) return { outcome: 'ready', text: '' };
  if (regional !== null) {
    if (o.regionalFailedTiles) return { outcome: 'degraded', text: 'Some regional imagery is unavailable; lower detail may be shown.' };
    return { outcome: 'ready', text: o.tilesLoaded ? '' : 'Loading regional detail for this view…' };
  }
  if (!o.detailLoaded) return { outcome: 'degraded', text: 'Starter detail unavailable; coarse overview only.' };
  if (!o.insideDetail) return { outcome: 'ready', text: 'Regional overview · outside detailed starter area' };
  if (!o.airportLoaded && o.insideAirport) return { outcome: 'degraded', text: 'Airport detail unavailable; starter photograph only.' };
  if (!o.overviewLoaded) return { outcome: 'degraded', text: 'Starter detail loaded; surrounding overview unavailable.' };
  return { outcome: 'ready', text: '' };
}
