"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEma = computeEma;
const descriptive_js_1 = require("../stats/descriptive.js");
const confidence_js_1 = require("../stats/confidence.js");
/**
 * Exponential Moving Average forecast.
 * Initializes with SMA of the first `window` values, then applies exponential smoothing.
 * Forecast is a flat line at the final EMA value.
 */
function computeEma(input) {
    const { costs, window, horizon, confidenceLevels, dates, floor } = input;
    const alpha = input.alpha ?? 2 / (window + 1);
    // Initialize EMA with SMA of first `window` values
    const initValues = costs.slice(0, window);
    let ema = (0, descriptive_js_1.mean)(initValues);
    // Compute EMA for remaining values
    const residuals = [];
    for (let i = window; i < costs.length; i++) {
        ema = alpha * costs[i] + (1 - alpha) * ema;
        residuals.push(costs[i] - ema);
    }
    // If no residuals (history == window), compute from window values
    if (residuals.length === 0) {
        // Compute EMA across all values starting from index 0
        ema = costs[0];
        for (let i = 1; i < costs.length; i++) {
            ema = alpha * costs[i] + (1 - alpha) * ema;
            residuals.push(costs[i] - ema);
        }
    }
    const emaValue = Math.max(floor, ema);
    const stdDev = residuals.length > 1 ? (0, descriptive_js_1.standardDeviation)(residuals, false) : (0, descriptive_js_1.standardDeviation)(costs.slice(-window), false);
    const predictions = [];
    for (let i = 0; i < horizon; i++) {
        const bounds = confidenceLevels.map(level => {
            const { lower, upper } = (0, confidence_js_1.maConfidenceBounds)(emaValue, stdDev, level, floor);
            return { level, lower, upper };
        });
        predictions.push({
            date: dates[i],
            predicted: emaValue,
            bounds,
        });
    }
    return { predictions, emaValue };
}
//# sourceMappingURL=ema.js.map