"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const confidence_js_1 = require("../stats/confidence.js");
(0, vitest_1.describe)('confidence intervals', () => {
    (0, vitest_1.describe)('zScore', () => {
        (0, vitest_1.it)('returns 1.282 for 80% confidence', () => {
            (0, vitest_1.expect)((0, confidence_js_1.zScore)(0.80)).toBeCloseTo(1.282, 2);
        });
        (0, vitest_1.it)('returns 1.645 for 90% confidence', () => {
            (0, vitest_1.expect)((0, confidence_js_1.zScore)(0.90)).toBeCloseTo(1.645, 2);
        });
        (0, vitest_1.it)('returns 1.960 for 95% confidence', () => {
            (0, vitest_1.expect)((0, confidence_js_1.zScore)(0.95)).toBeCloseTo(1.960, 2);
        });
        (0, vitest_1.it)('returns 2.576 for 99% confidence', () => {
            (0, vitest_1.expect)((0, confidence_js_1.zScore)(0.99)).toBeCloseTo(2.576, 2);
        });
        (0, vitest_1.it)('approximates for non-standard levels', () => {
            const z = (0, confidence_js_1.zScore)(0.85);
            (0, vitest_1.expect)(z).toBeGreaterThan(1.282); // > 80%
            (0, vitest_1.expect)(z).toBeLessThan(1.645); // < 90%
        });
    });
    (0, vitest_1.describe)('maConfidenceBounds', () => {
        (0, vitest_1.it)('computes symmetric bounds at 95%', () => {
            const { lower, upper } = (0, confidence_js_1.maConfidenceBounds)(100, 10, 0.95);
            (0, vitest_1.expect)(lower).toBeCloseTo(80.4, 0);
            (0, vitest_1.expect)(upper).toBeCloseTo(119.6, 0);
        });
        (0, vitest_1.it)('enforces floor on lower bound', () => {
            const { lower, upper } = (0, confidence_js_1.maConfidenceBounds)(5, 10, 0.95, 0);
            (0, vitest_1.expect)(lower).toBe(0);
            (0, vitest_1.expect)(upper).toBeCloseTo(24.6, 0);
        });
        (0, vitest_1.it)('uses custom floor', () => {
            const { lower } = (0, confidence_js_1.maConfidenceBounds)(50, 30, 0.95, 10);
            (0, vitest_1.expect)(lower).toBeGreaterThanOrEqual(10);
        });
        (0, vitest_1.it)('produces wider bounds at higher confidence', () => {
            const b80 = (0, confidence_js_1.maConfidenceBounds)(100, 10, 0.80);
            const b95 = (0, confidence_js_1.maConfidenceBounds)(100, 10, 0.95);
            (0, vitest_1.expect)(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
        });
        (0, vitest_1.it)('produces zero-width bounds when stdDev is 0', () => {
            const { lower, upper } = (0, confidence_js_1.maConfidenceBounds)(100, 0, 0.95);
            (0, vitest_1.expect)(lower).toBe(100);
            (0, vitest_1.expect)(upper).toBe(100);
        });
    });
    (0, vitest_1.describe)('regressionPredictionBounds', () => {
        (0, vitest_1.it)('produces bounds that widen with forecast distance', () => {
            const meanX = 5;
            const ssX = 100;
            const ser = 10;
            const n = 20;
            const near = (0, confidence_js_1.regressionPredictionBounds)(100, ser, n, meanX, ssX, 11, 0.95);
            const far = (0, confidence_js_1.regressionPredictionBounds)(100, ser, n, meanX, ssX, 20, 0.95);
            const nearWidth = near.upper - near.lower;
            const farWidth = far.upper - far.lower;
            (0, vitest_1.expect)(farWidth).toBeGreaterThan(nearWidth);
        });
        (0, vitest_1.it)('enforces floor on lower bound', () => {
            const { lower } = (0, confidence_js_1.regressionPredictionBounds)(5, 20, 10, 5, 100, 11, 0.95, 0);
            (0, vitest_1.expect)(lower).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('produces wider bounds at higher confidence', () => {
            const b80 = (0, confidence_js_1.regressionPredictionBounds)(100, 10, 20, 5, 100, 11, 0.80);
            const b95 = (0, confidence_js_1.regressionPredictionBounds)(100, 10, 20, 5, 100, 11, 0.95);
            (0, vitest_1.expect)(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
        });
    });
});
//# sourceMappingURL=confidence.test.js.map