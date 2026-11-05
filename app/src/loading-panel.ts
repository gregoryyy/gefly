import {
  FLIGHT_DEFAULT_LOADING, LOAD_STATIONS, EMPTY_MASS_KG, FUEL_CAPACITY_M3, FUEL_DENSITY_KGPM3,
  validLoading, validLoadingState, type LoadingConfiguration,
} from '../../studies/e1-browser/sim/loading.js';
import type { FlightState } from './types';
import './loading-panel.css';

export function createLoadingPanel(options: {
  buttonContainer: HTMLElement;
  onApply(config: LoadingConfiguration): void;
  onOpen(): void;
  onClose(): void;
}): { update(state: Readonly<FlightState> | null, reviewing: boolean): void; setConfiguration(config: LoadingConfiguration): void; dispose(): void } {
  let configuration = { ...FLIGHT_DEFAULT_LOADING }, draft = { ...configuration };
  let latest: Readonly<FlightState> | null = null, reviewing = false, disposed = false;
  const button = document.createElement('button'); button.id = 'loading-open'; button.type = 'button';
  button.textContent = 'Weight & fuel'; button.setAttribute('aria-haspopup', 'dialog');
  options.buttonContainer.append(button);
  const dialog = document.createElement('dialog'); dialog.id = 'loading-dialog'; dialog.className = 'loading-dialog';
  dialog.setAttribute('aria-labelledby', 'loading-title');
  dialog.innerHTML = `<form id="loading-form">
    <div class="loading-heading"><div><h2 id="loading-title">Weight & fuel</h2><p>Generic 172 research model</p></div><button type="button" id="loading-close" aria-label="Close weight and fuel">×</button></div>
    <div class="loading-inputs"></div>
    <dl class="loading-readouts">
      <div><dt>Empty mass</dt><dd id="loading-empty">—</dd></div><div><dt>Takeoff mass</dt><dd id="loading-takeoff">—</dd></div>
      <div><dt>Current mass</dt><dd id="loading-current">—</dd></div><div><dt>Fuel remaining</dt><dd id="loading-remaining">—</dd></div>
      <div><dt>Fuel used</dt><dd id="loading-used">—</dd></div><div><dt>Fuel flow</dt><dd id="loading-flow">—</dd></div>
    </dl>
    <button type="submit" id="loading-apply" class="primary">Apply and restart flight</button>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector<HTMLFormElement>('form')!, inputs = dialog.querySelector<HTMLElement>('.loading-inputs')!;
  const close = dialog.querySelector<HTMLButtonElement>('#loading-close')!, apply = dialog.querySelector<HTMLButtonElement>('#loading-apply')!;
  const controls = new Map<keyof LoadingConfiguration, HTMLInputElement>();
  const addInput = (key: keyof LoadingConfiguration, label: string, unit: string, maximum: number): void => {
    const row = document.createElement('label'); row.className = 'loading-row';
    const name = document.createElement('span'); name.textContent = `${label} · ${unit}`;
    const input = document.createElement('input'); input.id = `loading-${key.replace(/_(kg|m3)$/, '')}`;
    input.type = 'number'; input.min = '0'; input.max = String(maximum); input.step = 'any'; input.required = true;
    input.dataset.key = key; input.setAttribute('aria-label', `${label} in ${unit}`);
    if (key === 'external_kg') input.title = 'Legacy external station, 12 ft right of the aircraft centreline; normally unloaded';
    row.append(name, input); inputs.append(row); controls.set(key, input);
  };
  for (const station of LOAD_STATIONS) addInput(station.id, station.id === 'external_kg' ? 'External load · 12 ft right' : station.label, 'kg', station.max_kg);
  addInput('fuel_left_m3', 'Left fuel', 'L', FUEL_CAPACITY_M3 * 1000);
  addInput('fuel_right_m3', 'Right fuel', 'L', FUEL_CAPACITY_M3 * 1000);
  const text = (id: string, value: string): void => { const element=dialog.querySelector<HTMLElement>(`#${id}`)!; if(element.textContent!==value)element.textContent=value; };
  const amount = (value: number | undefined, unit: string): string => value !== undefined && Number.isFinite(value) ? `${value.toFixed(1)} ${unit}` : '—';
  function fill(): void { for (const [key,input] of controls) input.value = (key.startsWith('fuel_') ? draft[key]*1000 : draft[key]).toFixed(key.startsWith('fuel_') ? 2 : 1); }
  function render(): void {
    const actual = latest && validLoadingState(latest) && latest.mass_total_kg !== undefined ? latest : null;
    const valid = validLoading(draft);
    text('loading-empty', amount(actual?.mass_empty_kg, 'kg'));
    text('loading-takeoff', valid ? amount(EMPTY_MASS_KG + LOAD_STATIONS.reduce((sum,station)=>sum+draft[station.id],0) + (draft.fuel_left_m3+draft.fuel_right_m3)*FUEL_DENSITY_KGPM3,'kg') : '—');
    text('loading-current', amount(actual?.mass_total_kg,'kg'));
    const remaining = latest && Number.isFinite(latest.fuel_left_m3) && Number.isFinite(latest.fuel_right_m3) ? latest.fuel_left_m3!+latest.fuel_right_m3! : undefined;
    text('loading-remaining', amount(remaining === undefined ? undefined : remaining*1000,'L'));
    text('loading-used', amount(actual?.loading_initial_fuel_m3 !== undefined && remaining !== undefined ? Math.max(0,actual.loading_initial_fuel_m3-remaining)*1000 : undefined,'L'));
    text('loading-flow', amount(latest?.fuel_flow_m3ps === undefined ? undefined : latest.fuel_flow_m3ps*3600000,'L/h'));
    button.disabled = reviewing;
    for (const input of controls.values()) input.disabled = reviewing;
    apply.disabled = reviewing || !valid || !actual;
  }
  function open(): void { if(disposed||reviewing||dialog.open)return; draft={...configuration};fill();options.onOpen();render();dialog.showModal(); }
  function finish(): void { dialog.close(); }
  function closed(): void { if(!disposed)options.onClose(); }
  function change(event: Event): void {
    const input=event.target;if(!(input instanceof HTMLInputElement))return;
    const key=input.dataset.key as keyof LoadingConfiguration;
    if(!controls.has(key))return;draft={...draft,[key]:input.valueAsNumber/(key.startsWith('fuel_')?1000:1)};render();
  }
  function submit(event: SubmitEvent): void {
    event.preventDefault();if(disposed||reviewing||apply.disabled||!form.reportValidity()||!validLoading(draft))return;
    configuration={...draft};options.onApply({...configuration});dialog.close();
  }
  fill();render();button.addEventListener('click',open);close.addEventListener('click',finish);dialog.addEventListener('close',closed);form.addEventListener('input',change);form.addEventListener('submit',submit);
  return {
    update(state,inReview){if(disposed)return;latest=state;reviewing=inReview;render();},
    setConfiguration(config){if(disposed||!validLoading(config))return;configuration={...config};draft={...config};fill();render();},
    dispose(){if(disposed)return;disposed=true;button.removeEventListener('click',open);close.removeEventListener('click',finish);dialog.removeEventListener('close',closed);form.removeEventListener('input',change);form.removeEventListener('submit',submit);if(dialog.open)dialog.close();dialog.remove();button.remove();},
  };
}
