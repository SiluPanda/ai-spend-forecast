/**
 * T-distribution critical value lookup table.
 * Keys: degrees of freedom. Values: map of two-tailed alpha to critical value.
 * For prediction intervals, we need one-tailed alpha = (1 - confidenceLevel) / 2.
 */
/**
 * Get the t-critical value for a given degrees of freedom and confidence level.
 * @param df Degrees of freedom
 * @param confidenceLevel Confidence level (e.g. 0.80, 0.95, 0.99)
 * @returns The t-critical value
 */
export declare function tCritical(df: number, confidenceLevel: number): number;
/**
 * Approximate the p-value for a given t-statistic and degrees of freedom.
 * Uses a numerical approximation of the incomplete beta function.
 */
export declare function tPValue(tStat: number, df: number): number;
//# sourceMappingURL=t-distribution.d.ts.map