import type { KapSnapshot } from './kap140.js';
import type { NavigationConfig } from './navigation.js';
export interface AutopilotReload {
  readonly version: 1;
  readonly kap: Readonly<KapSnapshot>;
  readonly navigation: Readonly<Required<NavigationConfig>>;
}
export function captureAutopilotReload(state: object): AutopilotReload | null;
export function validAutopilotReload(value: unknown): value is AutopilotReload;
export function copyAutopilotReload(value: AutopilotReload): AutopilotReload;
