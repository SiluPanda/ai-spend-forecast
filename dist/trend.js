"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectTrend = detectTrend;
const errors_js_1 = require("./errors.js");
const normalize_js_1 = require("./normalize.js");
const ols_js_1 = require("./methods/ols.js");
const descriptive_js_1 = require("./stats/descriptive.js");
const t_distribution_js_1 = require("./stats/t-distribution.js");
/**
 * Detect trend in historical spend data.
 * Fits OLS regression and evaluates the slope for statistical significance.
 */
function detectTrend(history, options) {
    const records = (0, normalize_js_1.normalizeHistory)(history);
    const allCosts = (0, normalize_js_1.extractCosts)(records);
    const significanceLevel = options?.significanceLevel ?? 0.05;
    const n = options?.window ? Math.min(options.window, allCosts.length) : allCosts.length;
    const costs = allCosts.slice(-n);
    if (costs.length < 3) {
        throw new errors_js_1.ForecastError('INSUFFICIENT_DATA', `Trend detection requires at least 3 data points, got ${costs.length}`);
    }
    const x = Array.from({ length: n }, (_, i) => i);
    const fit = (0, ols_js_1.fitOls)(x, costs);
    // t-test on the slope
    const df = n - 2;
    let tStat;
    let pValue;
    if (fit.slopeStandardError === 0) {
        // Perfect fit: if slope is non-zero, it is infinitely significant
        if (fit.slope !== 0) {
            tStat = Infinity;
            pValue = 0;
        }
        else {
            tStat = 0;
            pValue = 1;
        }
    }
    else {
        tStat = fit.slope / fit.slopeStandardError;
        pValue = (0, t_distribution_js_1.tPValue)(Math.abs(tStat), df);
    }
    // Determine significance
    const significant = pValue < significanceLevel;
    // Direction
    let direction;
    if (!significant) {
        direction = 'stable';
    }
    else {
        direction = fit.slope > 0 ? 'increasing' : 'decreasing';
    }
    const meanCost = (0, descriptive_js_1.mean)(costs);
    const slopePercentPerPeriod = meanCost === 0 ? 0 : (fit.slope / meanCost) * 100;
    return {
        direction,
        slopePerPeriod: fit.slope,
        slopePercentPerPeriod,
        projected30PeriodChange: fit.slope * 30,
        significant,
        pValue,
        rSquared: fit.rSquared,
        dataPoints: n,
    };
}
//# sourceMappingURL=trend.js.map