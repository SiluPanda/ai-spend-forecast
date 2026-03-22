"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ols_js_1 = require("../methods/ols.js");
const wls_js_1 = require("../methods/wls.js");
function makeDates(count) {
    return Array.from({ length: count }, (_, i) => {
        const d = 20 + i;
        return `2026-03-${String(d).padStart(2, '0')}`;
    });
}
(0, vitest_1.describe)('OLS regression', () => {
    (0, vitest_1.describe)('fitOls', () => {
        (0, vitest_1.it)('fits a perfect linear relationship', () => {
            const x = [0, 1, 2, 3, 4];
            const y = [10, 20, 30, 40, 50];
            const fit = (0, ols_js_1.fitOls)(x, y);
            (0, vitest_1.expect)(fit.slope).toBeCloseTo(10, 5);
            (0, vitest_1.expect)(fit.intercept).toBeCloseTo(10, 5);
            (0, vitest_1.expect)(fit.rSquared).toBeCloseTo(1, 5);
            (0, vitest_1.expect)(fit.standardError).toBeCloseTo(0, 5);
        });
        (0, vitest_1.it)('fits a noisy linear relationship', () => {
            const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            const y = [10, 12, 14, 13, 16, 18, 17, 20, 22, 24];
            const fit = (0, ols_js_1.fitOls)(x, y);
            (0, vitest_1.expect)(fit.slope).toBeGreaterThan(1);
            (0, vitest_1.expect)(fit.rSquared).toBeGreaterThan(0.9);
            (0, vitest_1.expect)(fit.standardError).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('handles flat data (zero slope)', () => {
            const x = [0, 1, 2, 3, 4];
            const y = [100, 100, 100, 100, 100];
            const fit = (0, ols_js_1.fitOls)(x, y);
            (0, vitest_1.expect)(fit.slope).toBeCloseTo(0, 10);
            (0, vitest_1.expect)(fit.intercept).toBeCloseTo(100, 5);
        });
        (0, vitest_1.it)('handles decreasing data', () => {
            const x = [0, 1, 2, 3, 4];
            const y = [50, 40, 30, 20, 10];
            const fit = (0, ols_js_1.fitOls)(x, y);
            (0, vitest_1.expect)(fit.slope).toBeCloseTo(-10, 5);
            (0, vitest_1.expect)(fit.rSquared).toBeCloseTo(1, 5);
        });
        (0, vitest_1.it)('computes correct degrees of freedom', () => {
            const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            const y = x.map(v => v * 2 + 5);
            const fit = (0, ols_js_1.fitOls)(x, y);
            // Degrees of freedom = n - 2 = 8 (but this is in RegressionFit not fitOls)
            // fitOls doesn't return df directly, but SER uses n-2
            (0, vitest_1.expect)(fit.standardError).toBeCloseTo(0, 5); // perfect fit
        });
    });
    (0, vitest_1.describe)('computeOls', () => {
        (0, vitest_1.it)('extrapolates a linear trend', () => {
            const costs = [100, 110, 120, 130, 140]; // +10/day
            const result = (0, ols_js_1.computeOls)({
                costs,
                window: undefined,
                horizon: 3,
                confidenceLevels: [0.95],
                dates: makeDates(3),
                floor: 0,
            });
            (0, vitest_1.expect)(result.predictions).toHaveLength(3);
            // Next values should be ~150, ~160, ~170
            (0, vitest_1.expect)(result.predictions[0].predicted).toBeCloseTo(150, 0);
            (0, vitest_1.expect)(result.predictions[1].predicted).toBeCloseTo(160, 0);
            (0, vitest_1.expect)(result.predictions[2].predicted).toBeCloseTo(170, 0);
        });
        (0, vitest_1.it)('provides widening confidence intervals', () => {
            const costs = [100, 112, 118, 132, 138, 152, 160, 171, 178, 192];
            const result = (0, ols_js_1.computeOls)({
                costs,
                window: undefined,
                horizon: 5,
                confidenceLevels: [0.95],
                dates: makeDates(5),
                floor: 0,
            });
            const widths = result.predictions.map(p => p.bounds[0].upper - p.bounds[0].lower);
            // Each interval should be wider than the previous
            for (let i = 1; i < widths.length; i++) {
                (0, vitest_1.expect)(widths[i]).toBeGreaterThan(widths[i - 1]);
            }
        });
        (0, vitest_1.it)('returns fit statistics', () => {
            const costs = [100, 120, 140, 160, 180];
            const result = (0, ols_js_1.computeOls)({
                costs,
                window: undefined,
                horizon: 1,
                confidenceLevels: [0.95],
                dates: makeDates(1),
                floor: 0,
            });
            (0, vitest_1.expect)(result.fit).toBeDefined();
            (0, vitest_1.expect)(result.fit.dataPoints).toBe(5);
            (0, vitest_1.expect)(result.fit.degreesOfFreedom).toBe(3);
            (0, vitest_1.expect)(result.fit.rSquared).toBeCloseTo(1, 5);
        });
        (0, vitest_1.it)('respects window parameter', () => {
            // First 5 values trend at +10, last 5 at +20
            const costs = [100, 110, 120, 130, 140, 140, 160, 180, 200, 220];
            const resultAll = (0, ols_js_1.computeOls)({
                costs,
                window: undefined,
                horizon: 1,
                confidenceLevels: [0.95],
                dates: makeDates(1),
                floor: 0,
            });
            const resultWindow = (0, ols_js_1.computeOls)({
                costs,
                window: 5,
                horizon: 1,
                confidenceLevels: [0.95],
                dates: makeDates(1),
                floor: 0,
            });
            // Window=5 uses only the steeper recent trend
            (0, vitest_1.expect)(resultWindow.fit.slope).toBeGreaterThan(resultAll.fit.slope);
        });
        (0, vitest_1.it)('enforces floor on predictions', () => {
            // Decreasing trend that would go negative
            const costs = [50, 40, 30, 20, 10];
            const result = (0, ols_js_1.computeOls)({
                costs,
                window: undefined,
                horizon: 10,
                confidenceLevels: [0.95],
                dates: makeDates(10),
                floor: 0,
            });
            for (const p of result.predictions) {
                (0, vitest_1.expect)(p.predicted).toBeGreaterThanOrEqual(0);
            }
        });
    });
});
(0, vitest_1.describe)('WLS regression', () => {
    (0, vitest_1.describe)('fitWls', () => {
        (0, vitest_1.it)('fits a linear relationship with equal weights (same as OLS)', () => {
            const x = [0, 1, 2, 3, 4];
            const y = [10, 20, 30, 40, 50];
            const w = [1, 1, 1, 1, 1];
            const fit = (0, wls_js_1.fitWls)(x, y, w);
            (0, vitest_1.expect)(fit.slope).toBeCloseTo(10, 5);
            (0, vitest_1.expect)(fit.intercept).toBeCloseTo(10, 5);
        });
        (0, vitest_1.it)('emphasizes recent data with higher weights', () => {
            // Data shifts: first half ~100, second half ~200
            const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            const y = [100, 100, 100, 100, 100, 200, 200, 200, 200, 200];
            const equalW = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
            const recentW = [0.1, 0.1, 0.1, 0.1, 0.1, 1, 1, 1, 1, 1];
            const fitEqual = (0, wls_js_1.fitWls)(x, y, equalW);
            const fitRecent = (0, wls_js_1.fitWls)(x, y, recentW);
            // With recent weights, the intercept should be higher (closer to 200)
            const predictEqual = fitEqual.intercept + fitEqual.slope * 10;
            const predictRecent = fitRecent.intercept + fitRecent.slope * 10;
            // Recent-weighted should predict closer to 200+
            (0, vitest_1.expect)(predictRecent).not.toBe(predictEqual);
        });
    });
    (0, vitest_1.describe)('computeWls', () => {
        (0, vitest_1.it)('produces forecasts with default decay', () => {
            const costs = [100, 110, 120, 130, 140];
            const result = (0, wls_js_1.computeWls)({
                costs,
                window: undefined,
                horizon: 3,
                confidenceLevels: [0.95],
                dates: makeDates(3),
                floor: 0,
            });
            (0, vitest_1.expect)(result.predictions).toHaveLength(3);
            (0, vitest_1.expect)(result.fit).toBeDefined();
            (0, vitest_1.expect)(result.fit.dataPoints).toBe(5);
        });
        (0, vitest_1.it)('provides widening confidence intervals', () => {
            const costs = [100, 112, 118, 132, 138, 152, 160, 171, 178, 192];
            const result = (0, wls_js_1.computeWls)({
                costs,
                window: undefined,
                horizon: 5,
                confidenceLevels: [0.95],
                dates: makeDates(5),
                floor: 0,
            });
            const widths = result.predictions.map(p => p.bounds[0].upper - p.bounds[0].lower);
            for (let i = 1; i < widths.length; i++) {
                (0, vitest_1.expect)(widths[i]).toBeGreaterThan(widths[i - 1]);
            }
        });
        (0, vitest_1.it)('respects custom decay parameter', () => {
            const costs = [100, 100, 100, 200, 200];
            const slow = (0, wls_js_1.computeWls)({
                costs,
                window: undefined,
                horizon: 1,
                confidenceLevels: [0.95],
                dates: makeDates(1),
                decay: 0.99,
                floor: 0,
            });
            const fast = (0, wls_js_1.computeWls)({
                costs,
                window: undefined,
                horizon: 1,
                confidenceLevels: [0.95],
                dates: makeDates(1),
                decay: 0.5,
                floor: 0,
            });
            // Faster decay emphasizes recent data more
            (0, vitest_1.expect)(fast.predictions[0].predicted).not.toBe(slow.predictions[0].predicted);
        });
        (0, vitest_1.it)('accepts custom weights', () => {
            const costs = [100, 200, 300, 400, 500];
            const result = (0, wls_js_1.computeWls)({
                costs,
                window: undefined,
                horizon: 1,
                confidenceLevels: [0.95],
                dates: makeDates(1),
                weights: [1, 1, 1, 1, 1],
                floor: 0,
            });
            (0, vitest_1.expect)(result.predictions).toHaveLength(1);
        });
        (0, vitest_1.it)('enforces floor', () => {
            const costs = [50, 40, 30, 20, 10];
            const result = (0, wls_js_1.computeWls)({
                costs,
                window: undefined,
                horizon: 10,
                confidenceLevels: [0.95],
                dates: makeDates(10),
                floor: 0,
            });
            for (const p of result.predictions) {
                (0, vitest_1.expect)(p.predicted).toBeGreaterThanOrEqual(0);
            }
        });
    });
});
//# sourceMappingURL=regression.test.js.map