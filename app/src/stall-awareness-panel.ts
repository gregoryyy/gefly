import type { FlightState } from './types';
import { spatialStallAwareness, STALL_STATIONS, SPATIAL_STALL_LIMITATIONS, SPATIAL_STALL_SOURCE_URL } from './spatial-stall';
import './stall-awareness-panel.css';

interface StallAwarenessOptions { container: HTMLElement; onClose: () => void }
const DEG_PER_RAD = 180 / Math.PI;
const LABELS = {
  'below-reference': 'BELOW REF',
  'near-reference': 'NEAR REF',
  'at-or-above-reference': 'AT REF',
  unavailable: 'UNKNOWN',
} as const;
const REASONS = { 'missing-data': 'Model airflow telemetry unavailable', 'reverse-flow': 'Forward-flow estimate unavailable in reverse flow',
  'low-airspeed': 'Forward-flow estimate unavailable below 1 m/s local longitudinal airflow', 'numerical-range': 'Model airflow calculation out of range' } as const;
const REGION_SHAPES = {
  'left-inner': { points: '152,97 215,94 215,146 152,143', x: 184, name: 'INNER' },
  'left-mid': { points: '92,100 152,97 152,143 92,140', x: 122, name: 'MID' },
  'left-outer': { points: '32,103 92,100 92,140 32,136', x: 62, name: 'OUTER' },
  'right-inner': { points: '265,94 328,97 328,143 265,146', x: 296, name: 'INNER' },
  'right-mid': { points: '328,97 388,100 388,140 328,143', x: 358, name: 'MID' },
  'right-outer': { points: '388,100 448,103 448,136 388,140', x: 418, name: 'OUTER' },
} as const;
const degrees = (radians: number | null): string => radians === null ? '—' : `${(radians * DEG_PER_RAD).toFixed(1).replace('-0.0', '0.0')}°`;

/** Six reference-span kinematic estimates, never a simulated flow-separation model. */
export function createStallAwarenessPanel(options: StallAwarenessOptions): {
  update(state: Readonly<FlightState> | null, recorded: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  let disposed = false;
  container.classList.add('stall-awareness-panel');
  container.setAttribute('role', 'region'); container.setAttribute('aria-labelledby', 'stall-awareness-title');
  container.setAttribute('aria-describedby', 'stall-awareness-description'); container.tabIndex = 0;
  container.innerHTML = `<header class="stall-awareness-heading"><h2 id="stall-awareness-title">Local AoA estimate</h2><button id="stall-awareness-close" type="button" aria-label="Close local airflow estimate">×</button></header>
    <div class="stall-awareness-mode"><span id="stall-awareness-mode">LIVE</span><span>KINEMATIC ESTIMATE</span></div>
    <dl class="stall-awareness-reference"><div><dt>Global AoA</dt><dd><output id="stall-global-alpha">—</output></dd></div><div><dt>Shared α max</dt><dd><output id="stall-alpha-reference">—</output></dd></div><div><dt>Model warning · raw</dt><dd><output id="stall-model-warning">—</output></dd></div></dl>
    <svg class="stall-awareness-diagram" viewBox="0 0 480 270" role="img" aria-labelledby="stall-diagram-title stall-diagram-description">
      <title id="stall-diagram-title">Wing reference-span angle-of-attack estimates</title><desc id="stall-diagram-description">Six left and right wing span regions show local kinematic AoA compared with one shared model wing reference. Tail and fuselage are unknown. This is not measured flow separation. All numerical values and status labels appear in the table.</desc>
      <defs><pattern id="stall-unknown-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="7" height="7" fill="#263740"/><path d="M0 0V7" stroke="#71858d" stroke-width="2"/></pattern></defs>
      <path d="M240 23V255" stroke="#718d9738" stroke-dasharray="3 5"/><text x="240" y="18" text-anchor="middle" font-size="10">NOSE ↑</text>
      <text x="115" y="58" text-anchor="middle" font-size="11">LEFT WING</text><text x="365" y="58" text-anchor="middle" font-size="11">RIGHT WING</text>
      ${STALL_STATIONS.map(station => { const shape = REGION_SHAPES[station.id]; return `<g data-stall-region="${station.id}" data-status="unavailable"><title>${station.label}: unavailable</title><polygon class="stall-station-shape" points="${shape.points}"/><text class="stall-station-name" x="${shape.x}" y="84">${shape.name}</text><text class="stall-station-value" x="${shape.x}" y="124">—</text></g>`; }).join('')}
      <path d="M231 39Q240 19 249 39L250 153L245 231L240 252L235 231L230 153Z" fill="url(#stall-unknown-hatch)" stroke="#8ba1a9"/>
      <path d="M181 215L233 208H247L299 215V227H181Z" fill="url(#stall-unknown-hatch)" stroke="#8ba1a9"/>
      <text x="240" y="119" text-anchor="middle" font-size="14">?</text><text x="240" y="181" text-anchor="middle" font-size="10">FUSELAGE UNKNOWN</text><text x="240" y="246" text-anchor="middle" font-size="10">TAIL UNKNOWN</text><text x="240" y="265" text-anchor="middle" font-size="8">REFERENCE-SPAN STATIONS · SCHEMATIC ONLY</text>
    </svg>
    <div class="stall-awareness-legend"><span>Below ref</span><span class="near">Near ref</span><span class="at">At ref</span><span class="unknown">Unknown</span></div>
    <table class="stall-awareness-table"><caption>Local AoA / shared-reference margin · degrees</caption><thead><tr><th scope="col">Wing region</th><th scope="col">AoA</th><th scope="col">Margin</th><th scope="col">Estimate</th></tr></thead><tbody>${STALL_STATIONS.map(station => `<tr data-stall-row="${station.id}" data-status="unavailable"><th scope="row">${station.label}</th><td data-stall-alpha>—</td><td data-stall-margin>—</td><td data-stall-status>UNKNOWN</td></tr>`).join('')}</tbody></table>
    <p id="stall-awareness-status" class="stall-awareness-status"></p>
    <p id="stall-awareness-description" class="stall-awareness-limit">Positive AoA reference only. Not measured separation; tail and fuselage behavior unknown.</p>
    <details class="stall-awareness-details"><summary>Estimate, model and source</summary><p id="stall-awareness-limitations"></p><p>Near ref starts at 85% of the shared α max, following the model’s global warning transition. At ref means at or above that shared value. Negative-angle and local-section stall boundaries are not established. These colors do not establish local stall onset or a safe flight margin.</p><p>Model hysteresis state: <output id="stall-model-hysteresis">—</output> · raw model value, not local separation.</p><a id="stall-awareness-source" target="_blank" rel="noreferrer">Pinned JSBSim model reference</a></details>`;
  const element = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!;
  element('stall-awareness-limitations').textContent = SPATIAL_STALL_LIMITATIONS;
  const source = container.querySelector<HTMLAnchorElement>('#stall-awareness-source')!;
  source.href = SPATIAL_STALL_SOURCE_URL;
  const close = element('stall-awareness-close');
  function closePanel(): void { if (!disposed) options.onClose(); }
  function keydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.code === 'Escape') { event.preventDefault(); closePanel(); }
  }
  close.addEventListener('click', closePanel); container.addEventListener('keydown', keydown);
  function update(state: Readonly<FlightState> | null, recorded: boolean): void {
    if (disposed) return;
    const result = spatialStallAwareness(state);
    container.dataset.recorded = String(recorded); container.dataset.step = state ? String(state.step) : '';
    container.dataset.status = result.status;
    element('stall-awareness-mode').textContent = recorded ? 'RECORDED' : 'LIVE';
    element('stall-global-alpha').textContent = degrees(result.globalAlpha_rad);
    element('stall-alpha-reference').textContent = degrees(result.commonAlphaMax_rad);
    element('stall-model-warning').textContent = result.stallWarning_norm === null ? '—' : result.stallWarning_norm.toFixed(2);
    element('stall-model-hysteresis').textContent = result.stallHysteresis_norm === null ? '—' : result.stallHysteresis_norm.toFixed(2);
    const reasons = new Set<string>();
    for (const reading of result.stations) {
      const id = reading.station.id;
      const region = container.querySelector<SVGGElement>(`[data-stall-region="${id}"]`)!;
      const row = container.querySelector<HTMLTableRowElement>(`[data-stall-row="${id}"]`)!;
      region.dataset.status = row.dataset.status = reading.status;
      const local = degrees(reading.localAlpha_rad), margin = degrees(reading.referenceMargin_rad);
      region.querySelector('title')!.textContent = `${reading.station.label}: ${LABELS[reading.status]}, local AoA ${local}, shared-reference margin ${margin}`;
      region.querySelector('.stall-station-value')!.textContent = local;
      row.querySelector<HTMLElement>('[data-stall-alpha]')!.textContent = local;
      row.querySelector<HTMLElement>('[data-stall-margin]')!.textContent = margin;
      row.querySelector<HTMLElement>('[data-stall-status]')!.textContent = LABELS[reading.status];
      row.dataset.localAlphaRad = reading.localAlpha_rad === null ? '' : String(reading.localAlpha_rad);
      row.dataset.referenceMarginRad = reading.referenceMargin_rad === null ? '' : String(reading.referenceMargin_rad);
      row.title = reading.unavailableReason ? REASONS[reading.unavailableReason] : 'Reference comparison, not a local stall detector';
      if (reading.unavailableReason) reasons.add(REASONS[reading.unavailableReason]);
    }
    element('stall-awareness-status').textContent = [...reasons].join(' · ');
  }
  update(null, false);
  return { update, dispose() { if (disposed) return; disposed = true; close.removeEventListener('click', closePanel);
    container.removeEventListener('keydown', keydown); container.replaceChildren(); } };
}
