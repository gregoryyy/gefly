import './aircraft-handbook.css';
import { C172P_CAS_SPEEDS } from './airspeed-markings';
import { C172P_CG_ENVELOPE, C172P_GEAR_LAYOUT, C172P_FLIGHT_ENVELOPE_REFERENCES } from './aircraft-handbook-data';

interface AircraftHandbookOptions {
  buttonContainer: HTMLElement;
  onOpen: () => void;
  onClose: () => void;
}

const escape = (value: string | number): string => String(value).replace(/[&<>"']/g,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const sourceLink = (url: string, label: string): string => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Handbook sources require HTTPS');
  return `<a href="${escape(parsed.href)}" target="_blank" rel="noreferrer">${escape(label)}</a>`;
};

function cgFigure(): string {
  const data = C172P_CG_ENVELOPE;
  const points = data.normal;
  if (!points.length) return '<figure class="handbook-figure"><h3>Loading and centre of gravity</h3><p>Verified C172P reference unavailable.</p></figure>';
  const xMin = Math.floor((Math.min(...points.map(p => p.arm_in)) - 1) / 2) * 2;
  const xMax = Math.ceil((Math.max(...points.map(p => p.arm_in)) + 1) / 2) * 2;
  const yMin = Math.floor((Math.min(...points.map(p => p.weight_lb)) - 100) / 200) * 200;
  const yMax = Math.ceil((Math.max(...points.map(p => p.weight_lb)) + 100) / 200) * 200;
  const x = (arm_in: number) => 60 + (arm_in - xMin) / (xMax - xMin) * 310;
  const y = (weight_lb: number) => 235 - (weight_lb - yMin) / (yMax - yMin) * 200;
  const grid: string[] = [];
  for (let weight = yMin; weight <= yMax; weight += 200) grid.push(`<path class="handbook-grid" d="M60 ${y(weight)}H370"/><text x="51" y="${y(weight) + 4}" text-anchor="end" font-size="10">${weight}</text>`);
  for (let arm = xMin; arm <= xMax; arm += 2) grid.push(`<path class="handbook-grid" d="M${x(arm)} 35V235"/><text x="${x(arm)}" y="252" text-anchor="middle" font-size="10">${arm}</text>`);
  return `<figure class="handbook-figure" id="handbook-cg-figure">
    <h3>Loading and centre of gravity</h3><p>${escape(data.label)}</p>
    <svg viewBox="0 0 400 286" role="img" aria-labelledby="handbook-cg-title handbook-cg-desc">
      <title id="handbook-cg-title">1982 C172P normal-category centre-of-gravity envelope</title>
      <desc id="handbook-cg-desc">Weight in pounds versus centre-of-gravity arm in inches aft of datum. Boundary coordinates are listed in the accompanying table. No current aircraft loading point is displayed.</desc>
      ${grid.join('')}<path class="handbook-axis" d="M60 35V235H370" fill="none"/>
      <polygon class="handbook-normal" points="${points.map(p => `${x(p.arm_in)},${y(p.weight_lb)}`).join(' ')}"/>
      ${points.map(p => `<circle cx="${x(p.arm_in)}" cy="${y(p.weight_lb)}" r="3" fill="#a6e2c8"/>`).join('')}
      <text x="65" y="22" font-size="11">WEIGHT · lb</text><text x="215" y="275" text-anchor="middle" font-size="11">CG ARM · in AFT OF DATUM</text>
    </svg>
    <table class="handbook-table"><caption>Normal-category boundary vertices</caption><thead><tr><th scope="col">Arm · in</th><th scope="col">Weight · lb</th></tr></thead><tbody>${points.map(p => `<tr><td>${p.arm_in}</td><td>${p.weight_lb}</td></tr>`).join('')}</tbody></table>
    <figcaption>${escape(data.limitations)} No current loading point or loading calculator. ${sourceLink(data.source.url, `Manufacturer POH · ${data.source.figure} · printed ${data.source.printed_page}, PDF page ${data.source.pdf_page}`)}.</figcaption>
  </figure>`;
}

function speedFigure(): string {
  const speeds = C172P_CAS_SPEEDS;
  const rows = [
    ['VS0', speeds.vs0_kcas, 'Landing-configuration stall reference'],
    ['VS1', speeds.vs1_kcas, 'Flaps-up stall reference'],
    ['VFE', speeds.vfe_kcas, 'Maximum flap-extended, 10–30°'],
    ['VFE10', speeds.vfe10_kcas, 'Maximum flap-extended, 10° only'],
    ['VNO', speeds.vno_kcas, 'Maximum structural cruising'],
    ['VNE', speeds.vne_kcas, 'Never-exceed reference'],
  ] as const;
  const x = (knots: number) => 55 + knots / 180 * 310;
  const colors = ['#f2f2e8', '#72bf87', '#f2f2e8', '#c4d9e6', '#efcc66', '#f18672'];
  return `<figure class="handbook-figure" id="handbook-speed-figure">
    <h3>Airspeed references</h3><p>Fixed 1982 C172P calibrated airspeed · KCAS</p>
    <svg viewBox="0 0 400 286" role="img" aria-labelledby="handbook-speed-title handbook-speed-desc">
      <title id="handbook-speed-title">C172P calibrated airspeed reference values</title>
      <desc id="handbook-speed-desc">VS0 46, VS1 52, VFE 84, VFE10 108, VNO 123 and VNE 152 knots calibrated airspeed. These are fixed handbook values, not dynamic stall predictions or installed indicated airspeed markings.</desc>
      ${Array.from({ length: 10 }, (_, i) => `<path class="handbook-grid" d="M${x(i * 20)} 24V244"/><text x="${x(i * 20)}" y="260" text-anchor="middle" font-size="10">${i * 20}</text>`).join('')}
      ${rows.map(([name, knots], i) => { const y = 43 + i * 36; return `<text x="46" y="${y + 4}" text-anchor="end" font-size="10">${name}</text><path d="M55 ${y}H${x(knots)}" stroke="${colors[i]}" stroke-width="5"/><circle cx="${x(knots)}" cy="${y}" r="4" fill="${colors[i]}"/><text x="${x(knots) + 8}" y="${y + 4}" font-size="11">${knots}</text>`; }).join('')}
      <text x="210" y="280" text-anchor="middle" font-size="11">CALIBRATED AIRSPEED · knots</text>
    </svg>
    <table class="handbook-table"><caption>Fixed KCAS values</caption><thead><tr><th scope="col">Reference</th><th scope="col">KCAS</th><th scope="col">Meaning</th></tr></thead><tbody>${rows.map(([name, knots, meaning]) => `<tr><td>${name}</td><td>${knots}</td><td>${meaning}</td></tr>`).join('')}</tbody></table>
    <figcaption>Stall reference: 2400 lb, most forward CG, power off, zero bank. These CAS references differ from installed KIAS markings and are not validated JSBSim limits. ${sourceLink(C172P_CG_ENVELOPE.source.url, 'Manufacturer POH · Figure 2-1, printed 2-4 · stall table printed 5-12')}.</figcaption>
  </figure>`;
}

function gearFigure(): string {
  const data = C172P_GEAR_LAYOUT;
  const contacts = data.contacts;
  if (!contacts.length) return '<figure class="handbook-figure"><h3>Model ground contacts</h3><p>Verified model coordinates unavailable.</p></figure>';
  const xMin = Math.min(...contacts.map(p => p.y_in)) - 35;
  const xMax = Math.max(...contacts.map(p => p.y_in)) + 35;
  const yMin = Math.min(...contacts.map(p => p.x_in)) - 30;
  const yMax = Math.max(...contacts.map(p => p.x_in)) + 30;
  const scale = Math.min(320 / (xMax - xMin), 190 / (yMax - yMin));
  const x = (right_in: number) => 200 + (right_in - (xMin + xMax) / 2) * scale;
  const y = (aft_in: number) => 145 + (aft_in - (yMin + yMax) / 2) * scale;
  return `<figure class="handbook-figure" id="handbook-gear-figure">
    <h3>Model ground contacts</h3><p>Top view · nose toward the top · model contact locations</p>
    <svg viewBox="0 0 400 286" role="img" aria-labelledby="handbook-gear-title handbook-gear-desc">
      <title id="handbook-gear-title">Generic c172x wheel and structure contact schematic</title>
      <desc id="handbook-gear-desc">Original top-view diagram of the pinned simulation model contact coordinates. Circles identify wheels; diamonds identify structure contacts. Numbered positions and all three structural-frame coordinates appear in the table.</desc>
      <path d="M200 33V248M40 145H360" class="handbook-grid"/>
      <text x="200" y="22" text-anchor="middle" font-size="11">NOSE / FORWARD</text>
      ${contacts.map((p, i) => { const cx = x(p.y_in), cy = y(p.x_in); return p.kind === 'wheel'
        ? `<circle cx="${cx}" cy="${cy}" r="7" fill="#8fd3b6"/><text x="${cx + 12}" y="${cy + 4}" font-size="12">${i + 1}</text>`
        : `<path d="M${cx} ${cy - 8}l8 8-8 8-8-8Z" fill="#e2bd74"/><text x="${cx + 12}" y="${cy + 4}" font-size="12">${i + 1}</text>`; }).join('')}
      <text x="200" y="275" text-anchor="middle" font-size="11">LEFT ← AIRCRAFT → RIGHT</text>
    </svg>
    <div class="handbook-legend"><span class="normal">● Wheel contact</span><span class="utility">◆ Structure contact</span></div>
    <table class="handbook-table"><caption>Model structural-frame coordinates · inches</caption><thead><tr><th scope="col">Contact</th><th scope="col">X aft</th><th scope="col">Y right</th><th scope="col">Z up</th></tr></thead><tbody>${contacts.map((p, i) => `<tr><td>${i + 1}. ${escape(p.name)}</td><td>${p.x_in}</td><td>${p.y_in}</td><td>${p.z_in}</td></tr>`).join('')}</tbody></table>
    <figcaption>${escape(data.frame)} ${escape(data.limitations)} ${sourceLink(data.source.url, 'Pinned JSBSim c172x model · ground_reactions')}.</figcaption>
  </figure>`;
}

function flightEnvelopeFigure(): string {
  const data = C172P_FLIGHT_ENVELOPE_REFERENCES;
  const normal = data.normal;
  const maxWeightVa = data.maneuvering.find(row => row.weight_lb === normal.max_weight_lb);
  const x = (knots: number) => 60 + knots / 180 * 310;
  const y = (load_g: number) => 245 - (load_g + 2) / 6.5 * 220;
  const guides = [
    ...(maxWeightVa ? [{ label: 'VA', value: maxWeightVa.va_kcas, color: '#9ac7ff' }] : []),
    { label: 'VFE', value: data.speeds.vfe_kcas, color: '#f2f2e8' },
    { label: 'VNO', value: data.speeds.vno_kcas, color: '#efcc66' },
    { label: 'VNE', value: data.speeds.vne_kcas, color: '#f18672' },
  ];
  const limits = [
    { value: normal.flaps_up.positive_g, label: 'Flaps up · positive', color: '#8fd3b6' },
    { value: normal.flaps_up.negative_g, label: 'Flaps up · negative', color: '#8fd3b6' },
    { value: normal.flaps_down.positive_g, label: 'Flaps down · positive', color: '#e2bd74' },
  ];
  return `<figure class="handbook-figure" id="handbook-envelope-figure">
    <h3>Flight-envelope limits</h3><p>Normal category · ${normal.max_weight_lb} lb maximum · KCAS reference guides</p>
    <svg viewBox="0 0 400 300" role="img" aria-labelledby="handbook-envelope-title handbook-envelope-desc">
      <title id="handbook-envelope-title">Published normal-category C172P load-factor and speed references</title>
      <desc id="handbook-envelope-desc">Reference guides only. Flaps-up load-factor limits are plus ${normal.flaps_up.positive_g} and ${normal.flaps_up.negative_g} g; flaps-down positive limit is plus ${normal.flaps_down.positive_g} g. Speed and weight-dependent maneuvering values appear in the table and legend. No stall curves, gust boundaries, filled operating region, negative flaps-down limit or current load point are established.</desc>
      ${Array.from({ length: 7 }, (_, i) => i - 2).map(g => `<path class="handbook-grid" d="M60 ${y(g)}H370"/><text x="49" y="${y(g) + 4}" text-anchor="end" font-size="10">${g > 0 ? '+' : ''}${g}</text>`).join('')}
      ${Array.from({ length: 10 }, (_, i) => i * 20).map(knots => `<text x="${x(knots)}" y="264" text-anchor="middle" font-size="10">${knots}</text>`).join('')}
      <path class="handbook-axis" d="M60 25V245M60 ${y(0)}H370" fill="none"/>
      ${guides.map(guide => `<path d="M${x(guide.value)} 25V245" stroke="${guide.color}" stroke-width="1.5" stroke-dasharray="3 6"/>`).join('')}
      ${limits.map(limit => `<path d="M60 ${y(limit.value)}H370" stroke="${limit.color}" stroke-width="2" stroke-dasharray="7 4"/>`).join('')}
      <text x="65" y="16" font-size="10">LOAD FACTOR · g</text>
      <text x="215" y="119" text-anchor="middle" font-size="11">REFERENCE GUIDES ONLY</text>
      <text x="215" y="138" text-anchor="middle" font-size="9">Stall / gust boundaries not established</text>
      <text x="215" y="286" text-anchor="middle" font-size="11">CALIBRATED AIRSPEED · knots</text>
    </svg>
    <div class="handbook-legend">${guides.map(guide => `<span style="color:${guide.color}">${guide.label} ${guide.value} KCAS${guide.label === 'VA' ? ` at ${normal.max_weight_lb} lb` : ''}</span>`).join('')}</div>
    <table class="handbook-table"><caption>Published normal-category load-factor limits</caption><thead><tr><th scope="col">Configuration</th><th scope="col">Limit · g</th></tr></thead><tbody>${limits.map(limit => `<tr><td>${limit.label}</td><td>${limit.value > 0 ? '+' : ''}${limit.value.toFixed(2)}</td></tr>`).join('')}</tbody></table>
    <table class="handbook-table"><caption>Weight-dependent maneuvering speed · VA</caption><thead><tr><th scope="col">Weight · lb</th><th scope="col">KCAS</th><th scope="col">KIAS</th></tr></thead><tbody>${data.maneuvering.map(row => `<tr><td>${row.weight_lb}</td><td>${row.va_kcas}</td><td>${row.va_kias}</td></tr>`).join('')}</tbody></table>
    <figcaption>${escape(data.limitations)} Published reference limits; complete stall/gust envelope not established. Dashed guides do not enclose or certify an operating region. ${sourceLink(data.source.url, `Manufacturer POH · load factors printed ${data.source.loadfactor_printed_page} (PDF ${data.source.loadfactor_pdf_page}); speeds printed ${data.source.speed_printed_page} (PDF ${data.source.speed_pdf_page})`)}.</figcaption>
  </figure>`;
}

/** Static local reference figures; no simulation controls or current-loading inference. */
export function createAircraftHandbook(options: AircraftHandbookOptions): {
  open(): void;
  isOpen(): boolean;
  dispose(): void;
} {
  let disposed = false;
  let returnFocus: HTMLElement | null = null;
  const button = document.createElement('button');
  button.id = 'handbook-open'; button.type = 'button'; button.textContent = 'Aircraft handbook';
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'aircraft-handbook');
  options.buttonContainer.append(button);
  const dialog = document.createElement('dialog');
  dialog.id = 'aircraft-handbook'; dialog.className = 'handbook-dialog';
  dialog.setAttribute('aria-labelledby', 'handbook-title');
  dialog.setAttribute('aria-describedby', 'handbook-scope');
  dialog.innerHTML = `<header class="handbook-header"><div><span class="eyebrow">1982 C172P · RESEARCH AIRCRAFT</span><h2 id="handbook-title">Aircraft handbook</h2><p>Reference diagrams · flight remains paused until Resume</p></div><button id="handbook-close" class="handbook-close" type="button" autofocus>Done</button></header>
    <p id="handbook-scope" class="handbook-scope">The active simulator uses a generic JSBSim C172P. These source-backed reference diagrams do not describe the planned C172S, a particular aircraft’s current loading or an approved operating handbook.</p>
    <div class="handbook-figures">${cgFigure()}${flightEnvelopeFigure()}${speedFigure()}${gearFigure()}</div>
    <p class="handbook-source-note">Original vector drawings based on the cited numeric facts. No manual page images are copied. References are packaged locally; source documents open only when you follow a link. Aircraft-specific amendments and validated training fidelity remain outside this prototype.</p>`;
  document.body.append(dialog);
  const closeButton = dialog.querySelector<HTMLButtonElement>('#handbook-close')!;
  function open(): void {
    if (disposed || dialog.open) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    options.onOpen();
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  function close(): void { if (!disposed && dialog.open) dialog.close(); }
  function closed(): void {
    if (disposed) return;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    options.onClose();
  }
  button.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', closed);
  return {
    open, isOpen: () => dialog.open,
    dispose() {
      if (disposed) return;
      disposed = true;
      button.removeEventListener('click', open);
      closeButton.removeEventListener('click', close);
      dialog.removeEventListener('close', closed);
      if (dialog.open) dialog.close();
      dialog.remove(); button.remove();
    },
  };
}
