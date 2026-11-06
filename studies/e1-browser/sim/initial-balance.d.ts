export const INITIAL_BALANCE_FIELDS: readonly ['initial_balance_profile', 'roll_trim_norm', 'yaw_trim_norm'];
export interface InitialBalanceState {
  initial_balance_profile: 0 | 1;
  roll_trim_norm: number;
  yaw_trim_norm: number;
}
export function validInitialBalanceState(state: unknown): boolean;
export function initialBalanceFields(values: ArrayLike<number> | null | undefined): Partial<InitialBalanceState>;
export function initialBalanceProfile(state: unknown): 0 | 1 | null;
export function equalInitialBalance(a: unknown, b: unknown): boolean;
