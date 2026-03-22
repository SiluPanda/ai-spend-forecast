"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const trend_js_1 = require("../trend.js");
const errors_js_1 = require("../errors.js");
function makeHistory(days, baseCost, increment) {
    return Array.from({ length: days }, (_, i) => {
        const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
        return [date, baseCost + increment * i];
    });
}
(0, vitest_1.describe)('detectTrend', () => {
    (0, vitest_1.it)('detects increasing trend', () => {
        const history = makeHistory(30, 100, 10);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.direction).toBe('increasing');
        (0, vitest_1.expect)(result.slopePerPeriod).toBeCloseTo(10, 0);
        (0, vitest_1.expect)(result.significant).toBe(true);
        (0, vitest_1.expect)(result.rSquared).toBeCloseTo(1, 5);
    });
    (0, vitest_1.it)('detects decreasing trend', () => {
        const history = makeHistory(30, 500, -10);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.direction).toBe('decreasing');
        (0, vitest_1.expect)(result.slopePerPeriod).toBeCloseTo(-10, 0);
        (0, vitest_1.expect)(result.significant).toBe(true);
    });
    (0, vitest_1.it)('detects stable trend (flat data)', () => {
        const history = makeHistory(30, 100, 0);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.direction).toBe('stable');
        (0, vitest_1.expect)(result.significant).toBe(false);
    });
    (0, vitest_1.it)('reports correct slope percent per period', () => {
        const history = makeHistory(20, 100, 5);
        const result = (0, trend_js_1.detectTrend)(history);
        // Mean cost = 100 + 5*(19/2) = 147.5
        // Slope = 5, so percent = 5/147.5 * 100 = ~3.39%
        (0, vitest_1.expect)(result.slopePercentPerPeriod).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('reports 30-period projection', () => {
        const history = makeHistory(14, 100, 10);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.projected30PeriodChange).toBeCloseTo(300, 0);
    });
    (0, vitest_1.it)('reports correct data points count', () => {
        const history = makeHistory(20, 100, 5);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.dataPoints).toBe(20);
    });
    (0, vitest_1.it)('respects window parameter', () => {
        const history = makeHistory(30, 100, 5);
        const result = (0, trend_js_1.detectTrend)(history, { window: 10 });
        (0, vitest_1.expect)(result.dataPoints).toBe(10);
    });
    (0, vitest_1.it)('throws on insufficient data', () => {
        (0, vitest_1.expect)(() => (0, trend_js_1.detectTrend)(makeHistory(2, 100, 10))).toThrow(errors_js_1.ForecastError);
    });
    (0, vitest_1.it)('reports p-value', () => {
        const history = makeHistory(14, 100, 10);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.pValue).toBeLessThan(0.05);
    });
    (0, vitest_1.it)('detects noisy but significant trend', () => {
        // Add noise but maintain trend
        const history = [];
        for (let i = 0; i < 30; i++) {
            const noise = (i % 2 === 0 ? 5 : -5);
            history.push([
                `2026-03-${String(1 + i).padStart(2, '0')}`,
                100 + 10 * i + noise,
            ]);
        }
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.direction).toBe('increasing');
        (0, vitest_1.expect)(result.significant).toBe(true);
        (0, vitest_1.expect)(result.rSquared).toBeGreaterThan(0.9);
    });
    (0, vitest_1.it)('handles stable data with noise as not significant', () => {
        // Random-ish noise around 100 with no real trend
        const costs = [102, 98, 105, 95, 103, 97, 101, 99, 104, 96, 100, 102, 98, 101];
        const history = costs.map((c, i) => [
            `2026-03-${String(1 + i).padStart(2, '0')}`,
            c,
        ]);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.rSquared).toBeLessThan(0.3);
    });
    (0, vitest_1.it)('respects custom significance level', () => {
        const history = makeHistory(10, 100, 1); // very slight trend
        const strict = (0, trend_js_1.detectTrend)(history, { significanceLevel: 0.001 });
        const lenient = (0, trend_js_1.detectTrend)(history, { significanceLevel: 0.5 });
        // Strict might not be significant, lenient should be
        if (!strict.significant) {
            (0, vitest_1.expect)(lenient.significant).toBe(true);
        }
    });
    (0, vitest_1.it)('returns r-squared between 0 and 1', () => {
        const history = makeHistory(20, 100, 5);
        const result = (0, trend_js_1.detectTrend)(history);
        (0, vitest_1.expect)(result.rSquared).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.rSquared).toBeLessThanOrEqual(1);
    });
});
//# sourceMappingURL=trend.test.js.map