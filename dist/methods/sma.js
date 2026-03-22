"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSma = computeSma;
const descriptive_js_1 = require("../stats/descriptive.js");
const confidence_js_1 = require("../stats/confidence.js");
/**
 * Simple Moving Average forecast.
 * Produces a flat-line forecast at the mean of the last `window` values.
 */
function computeSma(input) {
    const { costs, window, horizon, confidenceLevels, dates, floor } = input;
    const windowValues = costs.slice(-window);
    const smaValue = Math.max(floor, (0, descriptive_js_1.mean)(windowValues));
    const stdDev = (0, descriptive_js_1.standardDeviation)(windowValues, false);
    const predictions = [];
    for (let i = 0; i < horizon; i++) {
        const bounds = confidenceLevels.map(level => {
            const { lower, upper } = (0, confidence_js_1.maConfidenceBounds)(smaValue, stdDev, level, floor);
            return { level, lower, upper };
        });
        predictions.push({
            date: dates[i],
            predicted: smaValue,
            bounds,
        });
    }
    return predictions;
}
//# sourceMappingURL=sma.js.map