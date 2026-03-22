"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const t_distribution_js_1 = require("../stats/t-distribution.js");
(0, vitest_1.describe)('t-distribution', () => {
    (0, vitest_1.describe)('tCritical', () => {
        (0, vitest_1.it)('returns correct value for df=10, 95% confidence', () => {
            // Two-tailed alpha = 0.05, t(10, 0.05) = 2.228
            (0, vitest_1.expect)((0, t_distribution_js_1.tCritical)(10, 0.95)).toBeCloseTo(2.228, 2);
        });
        (0, vitest_1.it)('returns correct value for df=5, 80% confidence', () => {
            // Two-tailed alpha = 0.20, t(5, 0.20) = 1.476
            (0, vitest_1.expect)((0, t_distribution_js_1.tCritical)(5, 0.80)).toBeCloseTo(1.476, 2);
        });
        (0, vitest_1.it)('returns correct value for df=20, 95% confidence', () => {
            (0, vitest_1.expect)((0, t_distribution_js_1.tCritical)(20, 0.95)).toBeCloseTo(2.086, 2);
        });
        (0, vitest_1.it)('returns z-score approximation for large df', () => {
            // For df=9999 (infinity), 95% confidence = 1.96
            (0, vitest_1.expect)((0, t_distribution_js_1.tCritical)(9999, 0.95)).toBeCloseTo(1.96, 1);
        });
        (0, vitest_1.it)('returns correct value for df=1, 95% confidence', () => {
            (0, vitest_1.expect)((0, t_distribution_js_1.tCritical)(1, 0.95)).toBeCloseTo(12.706, 1);
        });
        (0, vitest_1.it)('interpolates between known df values', () => {
            // df=15 is in the table: 2.131 for 95%
            const t15 = (0, t_distribution_js_1.tCritical)(15, 0.95);
            (0, vitest_1.expect)(t15).toBeCloseTo(2.131, 2);
            // df=22 should interpolate between 20 (2.086) and 25 (2.060)
            const t22 = (0, t_distribution_js_1.tCritical)(22, 0.95);
            (0, vitest_1.expect)(t22).toBeGreaterThan(2.060);
            (0, vitest_1.expect)(t22).toBeLessThan(2.086);
        });
        (0, vitest_1.it)('handles df=2', () => {
            (0, vitest_1.expect)((0, t_distribution_js_1.tCritical)(2, 0.95)).toBeCloseTo(4.303, 2);
        });
        (0, vitest_1.it)('returns higher value for higher confidence', () => {
            const t80 = (0, t_distribution_js_1.tCritical)(10, 0.80);
            const t95 = (0, t_distribution_js_1.tCritical)(10, 0.95);
            const t99 = (0, t_distribution_js_1.tCritical)(10, 0.99);
            (0, vitest_1.expect)(t80).toBeLessThan(t95);
            (0, vitest_1.expect)(t95).toBeLessThan(t99);
        });
    });
    (0, vitest_1.describe)('tPValue', () => {
        (0, vitest_1.it)('returns ~1 for t=0', () => {
            const p = (0, t_distribution_js_1.tPValue)(0, 10);
            (0, vitest_1.expect)(p).toBeCloseTo(1, 1);
        });
        (0, vitest_1.it)('returns small p for large t-statistic', () => {
            const p = (0, t_distribution_js_1.tPValue)(5, 10);
            (0, vitest_1.expect)(p).toBeLessThan(0.01);
        });
        (0, vitest_1.it)('returns ~0.05 for t-critical at 95% with df=10', () => {
            // t-critical for df=10 at alpha=0.05 is 2.228
            const p = (0, t_distribution_js_1.tPValue)(2.228, 10);
            (0, vitest_1.expect)(p).toBeCloseTo(0.05, 1);
        });
        (0, vitest_1.it)('returns higher p for smaller t', () => {
            const p1 = (0, t_distribution_js_1.tPValue)(1.0, 10);
            const p2 = (0, t_distribution_js_1.tPValue)(3.0, 10);
            (0, vitest_1.expect)(p1).toBeGreaterThan(p2);
        });
    });
});
//# sourceMappingURL=t-distribution.test.js.map