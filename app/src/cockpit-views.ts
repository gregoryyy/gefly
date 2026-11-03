import type { FlightState } from './types';

/** Pure view models for the inline cockpit units; DOM modules only render them. */

export interface RequestedEngineCommand { mixture_norm: number; mixture_auto: boolean; engine_running?: boolean }

/**
 * A mixture selection changes only mixture fields. A staged engine selection
 * stays independent (R-ENG-1), so Model auto cannot drop a pending ENG OFF.
 */
export function requestMixture(requested: RequestedEngineCommand | null, mixture_norm: number, mixture_auto: boolean): RequestedEngineCommand {
  return { ...(requested?.engine_running === undefined ? {} : { engine_running: requested.engine_running }), mixture_norm, mixture_auto };
}

export interface EngineSwitchView { available: boolean; selectedOn: boolean; label: string; running: 'RUN' | 'STOP' | '—' }

/** The switch shows a staged live selection first, otherwise the applied command. Review shows only recorded state. */
export function engineSwitchView(state: Readonly<Partial<Pick<FlightState, 'engine_running' | 'engine_command_on'>>> | null,
  reviewing: boolean, requested: RequestedEngineCommand | null): EngineSwitchView {
  const available = !!state && (state.engine_running === 0 || state.engine_running === 1)
    && (state.engine_command_on === 0 || state.engine_command_on === 1);
  const selectedOn = !reviewing && requested?.engine_running !== undefined ? requested.engine_running : state?.engine_command_on === 1;
  return { available, selectedOn: available && selectedOn, label: available ? `ENG ${selectedOn ? 'ON' : 'OFF'} · E` : 'ENG INOP',
    running: available ? state!.engine_running === 1 ? 'RUN' : 'STOP' : '—' };
}

/** Explanatory dialog note: never claims flight continues while the simulation is paused. */
export function flightNote(reviewing: boolean, flying: boolean, recordedText: string): string {
  return reviewing ? recordedText : flying ? 'Flight continues while this panel is open.' : 'Flight is paused.';
}

const validTrim = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= -1 && value <= 1;
/** Positive normalized trim command is nose down in the generic model; the slider shows nose up as positive percent. */
export const trimDirection = (norm: number) => norm === 0 ? 'neutral' : `${Math.abs(norm * 100).toFixed(1)}% nose ${norm < 0 ? 'up' : 'down'}`;

export interface PitchTrimView {
  canControl: boolean; canRestore: boolean; actual: string; note: string; initialTitle: string;
  /** Slider value in percent, positive nose up, i.e. -100 × command. */
  slider_percent: number; valueText: string;
}

export function pitchTrimView(state: Readonly<Partial<Pick<FlightState, 'pitch_trim_norm' | 'pitch_trim_initial_norm'>>> | null,
  recorded: boolean, controllable: boolean, target: number | null): PitchTrimView {
  const available = validTrim(state?.pitch_trim_norm);
  const hasInitial = validTrim(state?.pitch_trim_initial_norm);
  const canControl = available && controllable && !recorded;
  const command = !recorded && validTrim(target) ? target : available ? state!.pitch_trim_norm! : 0;
  return {
    canControl, canRestore: canControl && hasInitial,
    actual: available ? `${trimDirection(state!.pitch_trim_norm!)} · ${recorded ? 'recorded' : 'actual'}` : 'Unavailable',
    note: available ? 'Normalized command · not wheel/tab position' : 'Trim unavailable · rebuild flight engine',
    initialTitle: hasInitial ? `Restore startup ${trimDirection(state!.pitch_trim_initial_norm!)}` : 'Startup trim unavailable',
    slider_percent: -command * 100,
    valueText: available || (!recorded && validTrim(target)) ? `${trimDirection(command)} command` : 'Trim command unavailable',
  };
}

/** Slider value (positive percent nose up) to the normalized command, or null when out of range. */
export function trimCommandFromSlider(percent: number): number | null {
  const norm = -percent / 100;
  return validTrim(norm) ? norm : null;
}

type Wheel = 'nose' | 'left' | 'right';
export interface GroundReactionView {
  visible: boolean; mode: 'RECORDED' | 'LIVE'; motion: string;
  wheels: { wheel: Wheel; contact: boolean; label: string; load: string; compression: string; slip: string }[];
  contact: string; structureContact: boolean;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const fixed = (value: unknown, digits: number, scale = 1, unit = '') => finite(value) ? `${(value * scale).toFixed(digits)}${unit}` : '—';

/** Ground-reaction readouts below 50 m AGL. Missing per-wheel fields show '—', never a zero load. */
export function groundReactionView(state: Readonly<FlightState> | null, recorded: boolean): GroundReactionView {
  const visible = !!state && finite(state.ground_agl_m) && state.ground_agl_m <= 50;
  const wheels = (['nose', 'left', 'right'] as const).map(wheel => {
    const contact = state?.[`gear_${wheel}_wow`] === 1;
    return { wheel, contact, label: `${contact ? '●' : '○'} ${wheel.toUpperCase()}`,
      load: fixed(state?.[`gear_${wheel}_load_n`], 1, 1 / 1000, ' kN'),
      compression: fixed(state?.[`gear_${wheel}_compression_m`], 0, 1000, ' mm'),
      slip: fixed(state?.[`gear_${wheel}_slip_rad`], 1, 180 / Math.PI, '°') };
  });
  const mask = state?.structure_contact_mask;
  const contacts = finite(mask) ? [mask & 1 ? 'TAIL' : '', mask & 2 ? 'LEFT WINGTIP' : '', mask & 4 ? 'RIGHT WINGTIP' : ''].filter(Boolean) : [];
  return {
    visible, mode: recorded ? 'RECORDED' : 'LIVE',
    motion: visible ? `CG ${state!.ground_agl_m!.toFixed(1)} m AGL · ↓ ${fixed(state!.ground_down_mps, 1)} m/s · side ${fixed(state!.ground_side_mps, 1)} m/s` : '',
    wheels,
    contact: !finite(mask) ? 'Structure contact unavailable' : contacts.length ? `STRUCTURE CONTACT: ${contacts.join(', ')}` : 'Wheels, tyre friction and spring/damper forces',
    structureContact: finite(mask) && mask !== 0,
  };
}
