import type { ForecastPoint } from '../types.js';
export interface EmaInput {
    costs: number[];
    window: number;
    horizon: number;
    confidenceLevels: number[];
    dates: string[];
    alpha?: number;
    floor: number;
}
/**
 * Exponential Moving Average forecast.
 * Initializes with SMA of the first `window` values, then applies exponential smoothing.
 * Forecast is a flat line at the final EMA value.
 */
export declare function computeEma(input: EmaInput): {
    predictions: ForecastPoint[];
    emaValue: number;
};
//# sourceMappingURL=ema.d.ts.map