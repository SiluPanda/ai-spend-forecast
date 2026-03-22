import type { ForecastPoint, RegressionFit } from '../types.js';
export interface WlsInput {
    costs: number[];
    window: number | undefined;
    horizon: number;
    confidenceLevels: number[];
    dates: string[];
    weights?: number[];
    decay?: number;
    floor: number;
}
export interface WlsResult {
    predictions: ForecastPoint[];
    fit: RegressionFit;
}
/**
 * Weighted Least Squares linear regression forecast.
 * Fits y = a + b*x with weights that can emphasize recent data.
 * Default: exponentially decaying weights (decay^(n-1-i)).
 */
export declare function computeWls(input: WlsInput): WlsResult;
export interface WlsFitResult {
    intercept: number;
    slope: number;
    rSquared: number;
    standardError: number;
    slopeStandardError: number;
    meanX: number;
    ssX: number;
}
/** Fit Weighted Least Squares regression. */
export declare function fitWls(x: number[], y: number[], w: number[]): WlsFitResult;
//# sourceMappingURL=wls.d.ts.map