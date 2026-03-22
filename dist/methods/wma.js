"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeWma = computeWma;
const descriptive_js_1 = require("../stats/descriptive.js");
const confidence_js_1 = require("../stats/confidence.js");
/**
 * Weighted Moving Average forecast.
 * Assigns linearly increasing weights (or custom weights) within the window.
 * Optionally applies day-of-week multipliers to the forecast.
 */
function computeWma(input) {
    const { costs, window, horizon, confidenceLevels, dates, floor } = input;
    const windowValues = costs.slice(-window);
    // Default: linearly increasing weights [1, 2, 3, ..., n]
    const weights = input.weights ?? Array.from({ length: window }, (_, i) => i + 1);
    // Compute WMA
    let weightSum = 0;
    let weightedSum = 0;
    for (let i = 0; i < windowValues.length; i++) {
        weightedSum += windowValues[i] * weights[i];
        weightSum += weights[i];
    }
    const wmaValue = weightSum === 0 ? 0 : weightedSum / weightSum;
    // Compute residuals for confidence interval
    const residuals = [];
    for (let i = window; i < costs.length; i++) {
        const slice = costs.slice(i - window, i);
        let ws = 0;
        let wv = 0;
        for (let j = 0; j < slice.length; j++) {
            wv += slice[j] * weights[j];
            ws += weights[j];
        }
        const predicted = ws === 0 ? 0 : wv / ws;
        residuals.push(costs[i] - predicted);
    }
    const stdDev = residuals.length > 1
        ? (0, descriptive_js_1.standardDeviation)(residuals, false)
        : (0, descriptive_js_1.standardDeviation)(windowValues, false);
    const predictions = [];
    for (let i = 0; i < horizon; i++) {
        let predicted = wmaValue;
        // Apply day-of-week weights if provided
        let effectiveStdDev = stdDev;
        if (input.dayOfWeekWeights) {
            const dateObj = new Date(dates[i]);
            const dow = dateObj.getUTCDay();
            const dowWeight = input.dayOfWeekWeights[dow];
            if (dowWeight !== undefined) {
                predicted *= dowWeight;
                effectiveStdDev *= Math.abs(dowWeight);
            }
        }
        predicted = Math.max(floor, predicted);
        const bounds = confidenceLevels.map(level => {
            const { lower, upper } = (0, confidence_js_1.maConfidenceBounds)(predicted, effectiveStdDev, level, floor);
            return { level, lower, upper };
        });
        predictions.push({
            date: dates[i],
            predicted,
            bounds,
        });
    }
    return predictions;
}
//# sourceMappingURL=wma.js.map