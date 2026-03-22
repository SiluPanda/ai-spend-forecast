"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mean = exports.sum = void 0;
exports.computeOls = computeOls;
exports.fitOls = fitOls;
const descriptive_js_1 = require("../stats/descriptive.js");
Object.defineProperty(exports, "mean", { enumerable: true, get: function () { return descriptive_js_1.mean; } });
Object.defineProperty(exports, "sum", { enumerable: true, get: function () { return descriptive_js_1.sum; } });
const confidence_js_1 = require("../stats/confidence.js");
/**
 * Ordinary Least Squares linear regression forecast.
 * Fits y = a + b*x to the data and extrapolates into the future.
 * Prediction intervals widen with forecast distance.
 */
function computeOls(input) {
    const { costs, horizon, confidenceLevels, dates, floor } = input;
    const n = input.window ? Math.min(input.window, costs.length) : costs.length;
    const y = costs.slice(-n);
    const x = Array.from({ length: n }, (_, i) => i);
    const fit = fitOls(x, y);
    const predictions = [];
    for (let i = 0; i < horizon; i++) {
        const forecastX = n + i;
        const predicted = Math.max(floor, fit.intercept + fit.slope * forecastX);
        const bounds = confidenceLevels.map(level => {
            const { lower, upper } = (0, confidence_js_1.regressionPredictionBounds)(predicted, fit.standardError, n, fit.meanX, fit.ssX, forecastX, level, floor);
            return { level, lower, upper };
        });
        predictions.push({ date: dates[i], predicted, bounds });
    }
    return {
        predictions,
        fit: {
            intercept: fit.intercept,
            slope: fit.slope,
            rSquared: fit.rSquared,
            standardError: fit.standardError,
            slopeStandardError: fit.slopeStandardError,
            dataPoints: n,
            degreesOfFreedom: n - 2,
        },
    };
}
/** Fit OLS regression to x, y arrays. */
function fitOls(x, y) {
    const n = x.length;
    const meanX = (0, descriptive_js_1.mean)(x);
    const meanY = (0, descriptive_js_1.mean)(y);
    let ssX = 0;
    let ssXY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        ssX += dx * dx;
        ssXY += dx * (y[i] - meanY);
    }
    const slope = ssX === 0 ? 0 : ssXY / ssX;
    const intercept = meanY - slope * meanX;
    // Compute R-squared
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * x[i];
        ssRes += (y[i] - predicted) ** 2;
        ssTot += (y[i] - meanY) ** 2;
    }
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    // Standard error of the regression
    const df = n - 2;
    const standardError = df <= 0 ? 0 : Math.sqrt(ssRes / df);
    // Standard error of the slope
    const slopeStandardError = ssX === 0 || df <= 0 ? 0 : standardError / Math.sqrt(ssX);
    return {
        intercept,
        slope,
        rSquared,
        standardError,
        slopeStandardError,
        meanX,
        ssX,
    };
}
//# sourceMappingURL=ols.js.map