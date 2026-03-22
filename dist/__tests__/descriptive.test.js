"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const descriptive_js_1 = require("../stats/descriptive.js");
(0, vitest_1.describe)('descriptive statistics', () => {
    (0, vitest_1.describe)('sum', () => {
        (0, vitest_1.it)('sums an array of numbers', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.sum)([1, 2, 3, 4, 5])).toBe(15);
        });
        (0, vitest_1.it)('returns 0 for empty array', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.sum)([])).toBe(0);
        });
        (0, vitest_1.it)('handles single element', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.sum)([42])).toBe(42);
        });
        (0, vitest_1.it)('handles negative numbers', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.sum)([-1, -2, 3])).toBe(0);
        });
    });
    (0, vitest_1.describe)('mean', () => {
        (0, vitest_1.it)('computes arithmetic mean', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.mean)([2, 4, 6])).toBe(4);
        });
        (0, vitest_1.it)('returns 0 for empty array', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.mean)([])).toBe(0);
        });
        (0, vitest_1.it)('handles single element', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.mean)([10])).toBe(10);
        });
        (0, vitest_1.it)('handles decimal values', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.mean)([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
        });
    });
    (0, vitest_1.describe)('variance', () => {
        (0, vitest_1.it)('computes population variance', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.variance)([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4, 5);
        });
        (0, vitest_1.it)('computes sample variance', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.variance)([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(4.571, 2);
        });
        (0, vitest_1.it)('returns 0 for single element', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.variance)([5])).toBe(0);
        });
        (0, vitest_1.it)('returns 0 for empty array', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.variance)([])).toBe(0);
        });
        (0, vitest_1.it)('returns 0 for identical values', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.variance)([3, 3, 3])).toBe(0);
        });
    });
    (0, vitest_1.describe)('standardDeviation', () => {
        (0, vitest_1.it)('computes population standard deviation', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.standardDeviation)([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
        });
        (0, vitest_1.it)('computes sample standard deviation', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.standardDeviation)([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(2.138, 2);
        });
        (0, vitest_1.it)('returns 0 for empty array', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.standardDeviation)([])).toBe(0);
        });
    });
    (0, vitest_1.describe)('covariance', () => {
        (0, vitest_1.it)('computes population covariance', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [2, 4, 6, 8, 10];
            (0, vitest_1.expect)((0, descriptive_js_1.covariance)(x, y)).toBeCloseTo(4, 5);
        });
        (0, vitest_1.it)('computes sample covariance', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [2, 4, 6, 8, 10];
            (0, vitest_1.expect)((0, descriptive_js_1.covariance)(x, y, false)).toBeCloseTo(5, 5);
        });
        (0, vitest_1.it)('returns 0 for mismatched lengths', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.covariance)([1, 2], [1])).toBe(0);
        });
        (0, vitest_1.it)('returns 0 for single element arrays', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.covariance)([1], [2])).toBe(0);
        });
    });
    (0, vitest_1.describe)('weightedMean', () => {
        (0, vitest_1.it)('computes weighted mean', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.weightedMean)([10, 20, 30], [1, 2, 3])).toBeCloseTo(23.333, 2);
        });
        (0, vitest_1.it)('returns 0 for empty arrays', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.weightedMean)([], [])).toBe(0);
        });
        (0, vitest_1.it)('handles equal weights (same as arithmetic mean)', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.weightedMean)([2, 4, 6], [1, 1, 1])).toBe(4);
        });
        (0, vitest_1.it)('returns 0 for zero weights', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.weightedMean)([10, 20], [0, 0])).toBe(0);
        });
        (0, vitest_1.it)('handles single value with weight', () => {
            (0, vitest_1.expect)((0, descriptive_js_1.weightedMean)([42], [5])).toBe(42);
        });
    });
});
//# sourceMappingURL=descriptive.test.js.map