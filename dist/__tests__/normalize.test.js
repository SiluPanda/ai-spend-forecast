"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const normalize_js_1 = require("../normalize.js");
const errors_js_1 = require("../errors.js");
(0, vitest_1.describe)('normalizeHistory', () => {
    (0, vitest_1.it)('normalizes tuple input', () => {
        const result = (0, normalize_js_1.normalizeHistory)([
            ['2026-03-01', 100],
            ['2026-03-02', 150],
        ]);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0].date).toBe('2026-03-01');
        (0, vitest_1.expect)(result[0].cost).toBe(100);
        (0, vitest_1.expect)(result[1].cost).toBe(150);
    });
    (0, vitest_1.it)('normalizes object array input', () => {
        const result = (0, normalize_js_1.normalizeHistory)([
            { date: '2026-03-01', cost: 100 },
            { date: '2026-03-02', cost: 200 },
        ]);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0].cost).toBe(100);
    });
    (0, vitest_1.it)('normalizes date-cost map input', () => {
        const result = (0, normalize_js_1.normalizeHistory)({
            '2026-03-01': 100,
            '2026-03-02': 200,
        });
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0].date).toBe('2026-03-01');
        (0, vitest_1.expect)(result[1].date).toBe('2026-03-02');
    });
    (0, vitest_1.it)('throws on empty array', () => {
        (0, vitest_1.expect)(() => (0, normalize_js_1.normalizeHistory)([])).toThrow(errors_js_1.ForecastError);
    });
    (0, vitest_1.it)('throws on empty object', () => {
        (0, vitest_1.expect)(() => (0, normalize_js_1.normalizeHistory)({})).toThrow(errors_js_1.ForecastError);
    });
    (0, vitest_1.it)('throws on missing cost and tokenUsage', () => {
        (0, vitest_1.expect)(() => (0, normalize_js_1.normalizeHistory)([
            { date: '2026-03-01' },
        ])).toThrow(errors_js_1.ForecastError);
    });
    (0, vitest_1.it)('allows tokenUsage without cost', () => {
        const result = (0, normalize_js_1.normalizeHistory)([
            {
                date: '2026-03-01',
                tokenUsage: { provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 },
            },
        ]);
        (0, vitest_1.expect)(result).toHaveLength(1);
    });
    (0, vitest_1.it)('throws on unsorted dates', () => {
        (0, vitest_1.expect)(() => (0, normalize_js_1.normalizeHistory)([
            ['2026-03-03', 100],
            ['2026-03-01', 200],
        ])).toThrow(errors_js_1.ForecastError);
    });
    (0, vitest_1.it)('preserves metadata in object input', () => {
        const result = (0, normalize_js_1.normalizeHistory)([
            { date: '2026-03-01', cost: 100, metadata: { team: 'search' } },
        ]);
        (0, vitest_1.expect)(result[0].metadata?.team).toBe('search');
    });
    (0, vitest_1.it)('handles sorted date-cost map with non-alphabetical keys', () => {
        const result = (0, normalize_js_1.normalizeHistory)({
            '2026-01-10': 50,
            '2026-01-01': 100,
            '2026-01-05': 75,
        });
        // Keys are sorted alphabetically, which matches chronological for ISO dates
        (0, vitest_1.expect)(result[0].date).toBe('2026-01-01');
        (0, vitest_1.expect)(result[1].date).toBe('2026-01-05');
        (0, vitest_1.expect)(result[2].date).toBe('2026-01-10');
    });
});
(0, vitest_1.describe)('extractCosts', () => {
    (0, vitest_1.it)('extracts cost values from records', () => {
        const records = [
            { date: '2026-03-01', cost: 100 },
            { date: '2026-03-02', cost: 200 },
        ];
        (0, vitest_1.expect)((0, normalize_js_1.extractCosts)(records)).toEqual([100, 200]);
    });
    (0, vitest_1.it)('returns 0 for missing cost', () => {
        const records = [
            { date: '2026-03-01' },
        ];
        (0, vitest_1.expect)((0, normalize_js_1.extractCosts)(records)).toEqual([0]);
    });
});
(0, vitest_1.describe)('getNextDates', () => {
    (0, vitest_1.it)('generates daily dates', () => {
        const dates = (0, normalize_js_1.getNextDates)('2026-03-01', 3);
        (0, vitest_1.expect)(dates).toEqual(['2026-03-02', '2026-03-03', '2026-03-04']);
    });
    (0, vitest_1.it)('handles month boundaries', () => {
        const dates = (0, normalize_js_1.getNextDates)('2026-03-30', 3);
        (0, vitest_1.expect)(dates).toEqual(['2026-03-31', '2026-04-01', '2026-04-02']);
    });
    (0, vitest_1.it)('handles year boundaries', () => {
        const dates = (0, normalize_js_1.getNextDates)('2026-12-30', 3);
        (0, vitest_1.expect)(dates).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
    });
    (0, vitest_1.it)('generates single date', () => {
        const dates = (0, normalize_js_1.getNextDates)('2026-03-15', 1);
        (0, vitest_1.expect)(dates).toEqual(['2026-03-16']);
    });
});
(0, vitest_1.describe)('formatDateOnly', () => {
    (0, vitest_1.it)('formats date as YYYY-MM-DD', () => {
        const d = new Date(2026, 2, 5); // March 5, 2026
        (0, vitest_1.expect)((0, normalize_js_1.formatDateOnly)(d)).toBe('2026-03-05');
    });
    (0, vitest_1.it)('pads month and day', () => {
        const d = new Date(2026, 0, 1); // Jan 1, 2026
        (0, vitest_1.expect)((0, normalize_js_1.formatDateOnly)(d)).toBe('2026-01-01');
    });
});
//# sourceMappingURL=normalize.test.js.map