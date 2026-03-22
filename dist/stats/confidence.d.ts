/**
 * Get the z-score for a given confidence level.
 * Uses exact values for common levels, approximates for others.
 */
export declare function zScore(confidenceLevel: number): number;
/**
 * Compute moving average confidence bounds (constant width).
 * @param predicted The point forecast
 * @param stdDev Standard deviation of residuals or values
 * @param confidenceLevel The confidence level (0-1)
 * @param floor Minimum allowed value
 * @returns { lower, upper }
 */
export declare function maConfidenceBounds(predicted: number, stdDev: number, confidenceLevel: number, floor?: number): {
    lower: number;
    upper: number;
};
/**
 * Compute regression prediction interval bounds (widening with distance).
 * @param predicted The point forecast
 * @param ser Standard error of the regression
 * @param n Number of data points used in fit
 * @param meanX Mean of x values used in fit
 * @param ssX Sum of squares of (x - meanX) for fit data
 * @param forecastX The x value being forecasted
 * @param confidenceLevel The confidence level (0-1)
 * @param floor Minimum allowed value
 * @returns { lower, upper }
 */
export declare function regressionPredictionBounds(predicted: number, ser: number, n: number, meanX: number, ssX: number, forecastX: number, confidenceLevel: number, floor?: number): {
    lower: number;
    upper: number;
};
//# sourceMappingURL=confidence.d.ts.map