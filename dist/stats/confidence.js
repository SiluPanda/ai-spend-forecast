"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zScore = zScore;
exports.maConfidenceBounds = maConfidenceBounds;
exports.regressionPredictionBounds = regressionPredictionBounds;
const t_distribution_js_1 = require("./t-distribution.js");
/** Z-score lookup for common confidence levels. */
const Z_SCORES = {
    0.80: 1.282,
    0.90: 1.645,
    0.95: 1.960,
    0.99: 2.576,
};
/**
 * Get the z-score for a given confidence level.
 * Uses exact values for common levels, approximates for others.
 */
function zScore(confidenceLevel) {
    if (Z_SCORES[confidenceLevel] !== undefined)
        return Z_SCORES[confidenceLevel];
    // Approximate using the inverse normal CDF (Abramowitz & Stegun)
    const alpha = (1 - confidenceLevel) / 2;
    const t = Math.sqrt(-2 * Math.log(alpha));
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}
/**
 * Compute moving average confidence bounds (constant width).
 * @param predicted The point forecast
 * @param stdDev Standard deviation of residuals or values
 * @param confidenceLevel The confidence level (0-1)
 * @param floor Minimum allowed value
 * @returns { lower, upper }
 */
function maConfidenceBounds(predicted, stdDev, confidenceLevel, floor = 0) {
    const z = zScore(confidenceLevel);
    const margin = z * stdDev;
    return {
        lower: Math.max(floor, predicted - margin),
        upper: predicted + margin,
    };
}
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
function regressionPredictionBounds(predicted, ser, n, meanX, ssX, forecastX, confidenceLevel, floor = 0) {
    const df = n - 2;
    const tc = (0, t_distribution_js_1.tCritical)(df, confidenceLevel);
    // SE of forecast includes prediction uncertainty
    const leverage = ssX === 0 ? 1 + 1 / n : 1 + 1 / n + (forecastX - meanX) ** 2 / ssX;
    const seForecast = ser * Math.sqrt(leverage);
    const margin = tc * seForecast;
    return {
        lower: Math.max(floor, predicted - margin),
        upper: predicted + margin,
    };
}
//# sourceMappingURL=confidence.js.map