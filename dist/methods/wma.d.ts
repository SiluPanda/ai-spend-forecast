import type { ForecastPoint } from '../types.js';
export interface WmaInput {
    costs: number[];
    window: number;
    horizon: number;
    confidenceLevels: number[];
    dates: string[];
    weights?: number[];
    dayOfWeekWeights?: Partial<Record<number, number>>;
    floor: number;
}
/**
 * Weighted Moving Average forecast.
 * Assigns linearly increasing weights (or custom weights) within the window.
 * Optionally applies day-of-week multipliers to the forecast.
 */
export declare function computeWma(input: WmaInput): ForecastPoint[];
//# sourceMappingURL=wma.d.ts.map