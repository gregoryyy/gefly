import type { FlightState } from './types';

// Original visual geometry, metres in glTF axes: +X nose, +Y up, +Z right.
// These hinge positions are illustrative; native actuator angles stay authoritative.
export const AIRCRAFT_CONTROL_SURFACES = [
  { name: 'aileron_left', field: 'aileron_rad', hinge: [-.06, .825, -3.965], axis: [0, 0, 1], sign: 1, chord: .41, span: 1.87 },
  { name: 'aileron_right', field: 'right_aileron_rad', hinge: [-.06, .825, 3.965], axis: [0, 0, 1], sign: 1, chord: .41, span: 1.87 },
  { name: 'flap_left', field: 'flap_rad', hinge: [-.06, .825, -1.825], axis: [0, 0, 1], sign: 1, chord: .41, span: 2.35 },
  { name: 'flap_right', field: 'flap_rad', hinge: [-.06, .825, 1.825], axis: [0, 0, 1], sign: 1, chord: .41, span: 2.35 },
  { name: 'elevator_left', field: 'elevator_rad', hinge: [-2.97, .135, -.96], axis: [0, 0, 1], sign: 1, chord: .30, span: 1.30 },
  { name: 'elevator_right', field: 'elevator_rad', hinge: [-2.97, .135, .96], axis: [0, 0, 1], sign: 1, chord: .30, span: 1.30 },
  // Positive native rudder yaws left: its trailing edge moves to visual -Z.
  { name: 'rudder', field: 'rudder_rad', hinge: [-3.13, .17, 0], axis: [.12, 1.50, 0], sign: -1, chord: 0, span: 0 },
] as const;

export function controlSurfaceAngle(state: Readonly<FlightState>, surface: typeof AIRCRAFT_CONTROL_SURFACES[number]): number {
  const angle = state[surface.field];
  // Missing older recordings reset to neutral instead of retaining a live pose.
  return typeof angle === 'number' && Number.isFinite(angle) ? surface.sign * angle : 0;
}
