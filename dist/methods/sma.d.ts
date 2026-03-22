import type { ForecastPoint } from '../types.js';
export interface SmaInput {
    costs: number[];
    window: number;
    horizon: number;
    confidenceLevels: number[];
    dates: string[];
    floor: number;
}
/**
 * Simple Moving Average forecast.
 * Produces a flat-line forecast at the mean of the last `window` values.
 */
export declare function computeSma(input: SmaInput): ForecastPoint[];
//# sourceMappingURL=sma.d.ts.map