"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sma_js_1 = require("../methods/sma.js");
const ema_js_1 = require("../methods/ema.js");
const wma_js_1 = require("../methods/wma.js");
function makeDates(count) {
    return Array.from({ length: count }, (_, i) => {
        return `2026-03-${String(20 + i).padStart(2, '0')}`;
    });
}
(0, vitest_1.describe)('SMA', () => {
    const costs = [100, 110, 120, 130, 140, 150, 160];
    const dates = makeDates(3);
    (0, vitest_1.it)('computes flat-line forecast at window mean', () => {
        const predictions = (0, sma_js_1.computeSma)({
            costs,
            window: 7,
            horizon: 3,
            confidenceLevels: [0.95],
            dates,
            floor: 0,
        });
        (0, vitest_1.expect)(predictions).toHaveLength(3);
        // Mean of [100..160] = 130
        (0, vitest_1.expect)(predictions[0].predicted).toBeCloseTo(130, 0);
        (0, vitest_1.expect)(predictions[1].predicted).toBeCloseTo(130, 0);
        (0, vitest_1.expect)(predictions[2].predicted).toBeCloseTo(130, 0);
    });
    (0, vitest_1.it)('uses only last window values', () => {
        const predictions = (0, sma_js_1.computeSma)({
            costs: [50, 60, ...costs], // extra values before window
            window: 3,
            horizon: 2,
            confidenceLevels: [0.95],
            dates: makeDates(2),
            floor: 0,
        });
        // Mean of last 3: [140, 150, 160] = 150
        (0, vitest_1.expect)(predictions[0].predicted).toBeCloseTo(150, 0);
    });
    (0, vitest_1.it)('produces confidence bounds', () => {
        const predictions = (0, sma_js_1.computeSma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.80, 0.95],
            dates: makeDates(1),
            floor: 0,
        });
        (0, vitest_1.expect)(predictions[0].bounds).toHaveLength(2);
        const b80 = predictions[0].bounds.find(b => b.level === 0.80);
        const b95 = predictions[0].bounds.find(b => b.level === 0.95);
        (0, vitest_1.expect)(b80.lower).toBeLessThan(predictions[0].predicted);
        (0, vitest_1.expect)(b80.upper).toBeGreaterThan(predictions[0].predicted);
        (0, vitest_1.expect)(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
    });
    (0, vitest_1.it)('enforces floor on predicted value', () => {
        const predictions = (0, sma_js_1.computeSma)({
            costs: [0, 0, 0],
            window: 3,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            floor: 0,
        });
        (0, vitest_1.expect)(predictions[0].predicted).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(predictions[0].bounds[0].lower).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)('produces constant-width confidence intervals across horizon', () => {
        const predictions = (0, sma_js_1.computeSma)({
            costs,
            window: 7,
            horizon: 5,
            confidenceLevels: [0.95],
            dates: makeDates(5),
            floor: 0,
        });
        const widths = predictions.map(p => p.bounds[0].upper - p.bounds[0].lower);
        // All widths should be equal for SMA
        for (let i = 1; i < widths.length; i++) {
            (0, vitest_1.expect)(widths[i]).toBeCloseTo(widths[0], 5);
        }
    });
});
(0, vitest_1.describe)('EMA', () => {
    const costs = [100, 110, 120, 130, 140, 150, 160];
    const dates = makeDates(3);
    (0, vitest_1.it)('computes flat-line forecast at final EMA value', () => {
        const { predictions, emaValue } = (0, ema_js_1.computeEma)({
            costs,
            window: 7,
            horizon: 3,
            confidenceLevels: [0.95],
            dates,
            floor: 0,
        });
        (0, vitest_1.expect)(predictions).toHaveLength(3);
        // All predictions should be the same EMA value
        (0, vitest_1.expect)(predictions[0].predicted).toBe(emaValue);
        (0, vitest_1.expect)(predictions[1].predicted).toBe(emaValue);
        (0, vitest_1.expect)(predictions[2].predicted).toBe(emaValue);
    });
    (0, vitest_1.it)('is more responsive to recent data than SMA', () => {
        // Costs with a recent increase
        const trendingCosts = [100, 100, 100, 100, 100, 100, 200];
        const smaResult = (0, sma_js_1.computeSma)({
            costs: trendingCosts,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            floor: 0,
        });
        const { predictions: emaResult } = (0, ema_js_1.computeEma)({
            costs: trendingCosts,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            floor: 0,
        });
        // EMA should be higher than SMA because it weights recent 200 more
        // SMA = (100*6 + 200) / 7 = 114.28
        // EMA gives more weight to the 200
        (0, vitest_1.expect)(emaResult[0].predicted).toBeGreaterThan(smaResult[0].predicted);
    });
    (0, vitest_1.it)('respects custom alpha', () => {
        const { emaValue: lowAlpha } = (0, ema_js_1.computeEma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            alpha: 0.1,
            floor: 0,
        });
        const { emaValue: highAlpha } = (0, ema_js_1.computeEma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            alpha: 0.9,
            floor: 0,
        });
        // Higher alpha makes EMA closer to the most recent value (160)
        (0, vitest_1.expect)(highAlpha).toBeGreaterThan(lowAlpha);
    });
    (0, vitest_1.it)('produces confidence bounds', () => {
        const { predictions } = (0, ema_js_1.computeEma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.80, 0.95],
            dates: makeDates(1),
            floor: 0,
        });
        (0, vitest_1.expect)(predictions[0].bounds).toHaveLength(2);
    });
});
(0, vitest_1.describe)('WMA', () => {
    const costs = [100, 110, 120, 130, 140, 150, 160];
    (0, vitest_1.it)('gives more weight to recent values than SMA', () => {
        const smaResult = (0, sma_js_1.computeSma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            floor: 0,
        });
        const wmaResult = (0, wma_js_1.computeWma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            floor: 0,
        });
        // WMA with linearly increasing weights should be > SMA for ascending data
        (0, vitest_1.expect)(wmaResult[0].predicted).toBeGreaterThan(smaResult[0].predicted);
    });
    (0, vitest_1.it)('accepts custom weights', () => {
        const predictions = (0, wma_js_1.computeWma)({
            costs: [10, 20, 30],
            window: 3,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            weights: [1, 1, 1], // Equal weights = SMA
            floor: 0,
        });
        (0, vitest_1.expect)(predictions[0].predicted).toBeCloseTo(20, 5);
    });
    (0, vitest_1.it)('applies day-of-week weights', () => {
        // March 20, 2026 is a Friday (day 5)
        const noDow = (0, wma_js_1.computeWma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: ['2026-03-21'], // Saturday (day 6)
            floor: 0,
        });
        const withDow = (0, wma_js_1.computeWma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: ['2026-03-21'], // Saturday
            dayOfWeekWeights: { 6: 0.5 }, // Saturday at 50%
            floor: 0,
        });
        (0, vitest_1.expect)(withDow[0].predicted).toBeCloseTo(noDow[0].predicted * 0.5, 0);
    });
    (0, vitest_1.it)('produces confidence bounds', () => {
        const predictions = (0, wma_js_1.computeWma)({
            costs,
            window: 7,
            horizon: 1,
            confidenceLevels: [0.80, 0.95],
            dates: makeDates(1),
            floor: 0,
        });
        (0, vitest_1.expect)(predictions[0].bounds).toHaveLength(2);
    });
    (0, vitest_1.it)('enforces floor', () => {
        const predictions = (0, wma_js_1.computeWma)({
            costs: [0, 0, 0],
            window: 3,
            horizon: 1,
            confidenceLevels: [0.95],
            dates: makeDates(1),
            floor: 0,
        });
        (0, vitest_1.expect)(predictions[0].predicted).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=moving-average.test.js.map