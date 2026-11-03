/** C172-style electrical teaching model, separate from native aircraft physics.
 * 24 V battery / 28 V alternator topology: UND C172S electrical trainer.
 * Circuit currents below are explicit generic estimates, NOT breaker ratings.
 * No battery depletion, recharge transient, RF/electrical failures or icing model.
 */
export const SYSTEM_SWITCHES = [
  { id: 'battery', label: 'BAT', amps: 0 },
  { id: 'alternator', label: 'ALT', amps: 0 },
  { id: 'avionics', label: 'AVIONICS', amps: 8 },
  { id: 'beacon', label: 'BEACON', amps: 2 },
  { id: 'nav', label: 'NAV LTS', amps: 3 },
  { id: 'strobe', label: 'STROBE', amps: 3 },
  { id: 'taxi', label: 'TAXI', amps: 5 },
  { id: 'landing', label: 'LAND', amps: 8 },
  { id: 'pitot', label: 'PITOT HT', amps: 4 },
  { id: 'panel', label: 'PANEL', amps: 1 },
] as const;
export const DEFAULT_SYSTEM_SWITCH_MASK = 15;
export function validSystemsMask(mask: unknown): mask is number {
  return typeof mask === 'number' && Number.isInteger(mask) && mask >= 0 && mask < 2 ** SYSTEM_SWITCHES.length
    && (!(mask & 2) || !!(mask & 1));
}
export function toggleSystemSwitch(mask: number, index: number): number {
  if (!validSystemsMask(mask) || !Number.isInteger(index) || index < 0 || index >= SYSTEM_SWITCHES.length) throw new RangeError('Invalid systems switch');
  let next = mask ^ (1 << index);
  if (index === 0 && !(next & 1)) next &= ~2;
  if (index === 1 && (next & 2)) next |= 1;
  return next;
}
export function electricalReadings(mask: number | undefined, engineRunning: number | undefined) {
  if (!validSystemsMask(mask)) return null;
  if (!(mask & 1)) return { volts: 0, batteryAmps: 0, loadAmps: 0, powered: false };
  if ((mask & 2) && ![0, 1].includes(engineRunning!)) return null;
  const generated = !!(mask & 2) && engineRunning === 1;
  const loadAmps = 2 + SYSTEM_SWITCHES.reduce((total, item, i) => total + ((mask & (1 << i)) ? item.amps : 0), 0);
  return { volts: generated ? 28 : 24, batteryAmps: generated ? 0 : -loadAmps, loadAmps, powered: true };
}
