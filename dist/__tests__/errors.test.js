"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const errors_js_1 = require("../errors.js");
(0, vitest_1.describe)('ForecastError', () => {
    (0, vitest_1.it)('creates error with code and message', () => {
        const err = new errors_js_1.ForecastError('INSUFFICIENT_DATA', 'Not enough data');
        (0, vitest_1.expect)(err.code).toBe('INSUFFICIENT_DATA');
        (0, vitest_1.expect)(err.message).toBe('Not enough data');
        (0, vitest_1.expect)(err.name).toBe('ForecastError');
    });
    (0, vitest_1.it)('is an instance of Error', () => {
        const err = new errors_js_1.ForecastError('INVALID_OPTIONS', 'Bad options');
        (0, vitest_1.expect)(err).toBeInstanceOf(Error);
        (0, vitest_1.expect)(err).toBeInstanceOf(errors_js_1.ForecastError);
    });
    (0, vitest_1.it)('supports all error codes', () => {
        const codes = [
            'INSUFFICIENT_DATA',
            'INVALID_HISTORY',
            'INVALID_OPTIONS',
            'INVALID_BUDGET',
            'MISSING_COST',
            'COMPUTATION_ERROR',
        ];
        for (const code of codes) {
            const err = new errors_js_1.ForecastError(code, `Test: ${code}`);
            (0, vitest_1.expect)(err.code).toBe(code);
        }
    });
    (0, vitest_1.it)('has readonly code property', () => {
        const err = new errors_js_1.ForecastError('INVALID_HISTORY', 'test');
        (0, vitest_1.expect)(err.code).toBe('INVALID_HISTORY');
        // TypeScript enforces readonly at compile time
    });
});
//# sourceMappingURL=errors.test.js.map