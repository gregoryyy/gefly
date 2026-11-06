export interface CopernicusCell { readonly col: number; readonly row: number; readonly physical_m: Float32Array; readonly sha256: string; readonly source: 'Copernicus-GLO30-Public-COG-2021' }
export function readCopernicusCell(col: number, row: number, fetcher?: typeof fetch, signal?: AbortSignal): Promise<Readonly<CopernicusCell>>;
