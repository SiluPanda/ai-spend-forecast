import type { HistoryInput, TrendOptions, TrendResult } from './types.js';
/**
 * Detect trend in historical spend data.
 * Fits OLS regression and evaluates the slope for statistical significance.
 */
export declare function detectTrend(history: HistoryInput, options?: TrendOptions): TrendResult;
//# sourceMappingURL=trend.d.ts.map