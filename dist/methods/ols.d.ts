import type { ForecastPoint, RegressionFit } from '../types.js';
import { mean, sum } from '../stats/descriptive.js';
export interface OlsInput {
    costs: number[];
    window: number | undefined;
    horizon: number;
    confidenceLevels: number[];
    dates: string[];
    floor: number;
}
export interface OlsResult {
    predictions: ForecastPoint[];
    fit: RegressionFit;
}
/**
 * Ordinary Least Squares linear regression forecast.
 * Fits y = a + b*x to the data and extrapolates into the future.
 * Prediction intervals widen with forecast distance.
 */
export declare function computeOls(input: OlsInput): OlsResult;
export interface OlsFitResult {
    intercept: number;
    slope: number;
    rSquared: number;
    standardError: number;
    slopeStandardError: number;
    meanX: number;
    ssX: number;
}
/** Fit OLS regression to x, y arrays. */
export declare function fitOls(x: number[], y: number[]): OlsFitResult;
/** Sum of array values. Re-export for convenience. */
export { sum, mean };
//# sourceMappingURL=ols.d.ts.map